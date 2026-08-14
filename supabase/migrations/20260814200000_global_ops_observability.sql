-- AuditryPOS global operational observability and reconciliation
-- Additive only. This migration records diagnostics and health snapshots;
-- it never rewrites orders, invoices, stock, or journal entries automatically.

BEGIN;

-- ============================================================
-- 1. Workspace-aware audit and reconciliation run history
-- ============================================================
ALTER TABLE IF EXISTS public.operation_audit_log
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operation_audit_log_workspace_created
  ON public.operation_audit_log(workspace_id, created_at DESC);

UPDATE public.operation_audit_log l
SET workspace_id = COALESCE(
  (SELECT o.workspace_id FROM public.orders o WHERE l.entity_type = 'order' AND o.id = l.entity_id),
  (SELECT j.workspace_id FROM public.journal_entries j WHERE l.entity_type = 'journal_entry' AND j.id = l.entity_id)
)
WHERE l.workspace_id IS NULL;

CREATE TABLE IF NOT EXISTS public.ops_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  run_type text NOT NULL DEFAULT 'full' CHECK (run_type IN ('full','orders_invoices','inventory','accounting')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_ops_reconciliation_runs_scope
  ON public.ops_reconciliation_runs(restaurant_id, workspace_id, started_at DESC);

ALTER TABLE public.ops_reconciliation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_reconciliation_runs_read ON public.ops_reconciliation_runs;
CREATE POLICY ops_reconciliation_runs_read ON public.ops_reconciliation_runs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR workspace_id IN (SELECT public.auth_workspace_ids())
  OR restaurant_id IN (SELECT public.auth_restaurant_ids())
);

-- ============================================================
-- 2. Read-oriented anomaly views
-- ============================================================
CREATE OR REPLACE VIEW public.v_stock_scope_reconciliation
WITH (security_invoker = on)
AS
SELECT
  ws.id AS warehouse_stock_id,
  ws.restaurant_id,
  ws.workspace_id AS stock_workspace_id,
  ws.warehouse_id,
  w.workspace_id AS warehouse_workspace_id,
  ws.product_id,
  p.workspace_id AS product_workspace_id,
  ws.quantity,
  CASE
    WHEN ws.warehouse_id IS NULL THEN 'missing_warehouse'
    WHEN w.id IS NULL THEN 'warehouse_not_found'
    WHEN ws.workspace_id IS NULL THEN 'missing_stock_workspace'
    WHEN w.workspace_id IS DISTINCT FROM ws.workspace_id THEN 'stock_warehouse_workspace_mismatch'
    WHEN p.id IS NULL THEN 'product_not_found'
    WHEN p.workspace_id IS DISTINCT FROM ws.workspace_id THEN 'stock_product_workspace_mismatch'
    ELSE 'ok'
  END AS reconciliation_state
FROM public.warehouse_stock ws
LEFT JOIN public.warehouses w ON w.id = ws.warehouse_id
LEFT JOIN public.products p ON p.id = ws.product_id;

CREATE OR REPLACE VIEW public.v_ops_health_dashboard
WITH (security_invoker = on)
AS
SELECT
  w.id AS workspace_id,
  w.restaurant_id,
  w.name AS workspace_name,
  w.code AS workspace_code,
  COALESCE((SELECT COUNT(*) FROM public.accounting_posting_outbox o
    WHERE o.workspace_id = w.id AND o.status IN ('pending','processing')), 0)::bigint AS outbox_open_count,
  COALESCE((SELECT COUNT(*) FROM public.accounting_posting_outbox o
    WHERE o.workspace_id = w.id AND o.status = 'failed'), 0)::bigint AS outbox_failed_count,
  COALESCE((SELECT MAX(EXTRACT(EPOCH FROM (now() - o.created_at))/60)::int
    FROM public.accounting_posting_outbox o
    WHERE o.workspace_id = w.id AND o.status IN ('pending','processing','failed')), 0)::int AS outbox_oldest_age_minutes,
  COALESCE((SELECT COUNT(*) FROM public.gl_posting_failures f
    WHERE f.workspace_id = w.id AND f.status IN ('pending','retrying')), 0)::bigint AS posting_failures_open_count,
  COALESCE((SELECT COUNT(*) FROM public.v_order_invoice_reconciliation r
    WHERE r.workspace_id = w.id AND r.reconciliation_state <> 'linked'), 0)::bigint AS order_invoice_anomaly_count,
  COALESCE((SELECT COUNT(*) FROM public.v_stock_scope_reconciliation s
    WHERE s.stock_workspace_id = w.id AND s.reconciliation_state <> 'ok'), 0)::bigint AS stock_scope_anomaly_count,
  CASE WHEN
    COALESCE((SELECT COUNT(*) FROM public.accounting_posting_outbox o
      WHERE o.workspace_id = w.id AND o.status IN ('pending','processing','failed')), 0) = 0
    AND COALESCE((SELECT COUNT(*) FROM public.gl_posting_failures f
      WHERE f.workspace_id = w.id AND f.status IN ('pending','retrying')), 0) = 0
    AND COALESCE((SELECT COUNT(*) FROM public.v_order_invoice_reconciliation r
      WHERE r.workspace_id = w.id AND r.reconciliation_state <> 'linked'), 0) = 0
    AND COALESCE((SELECT COUNT(*) FROM public.v_stock_scope_reconciliation s
      WHERE s.stock_workspace_id = w.id AND s.reconciliation_state <> 'ok'), 0) = 0
  THEN 'healthy' ELSE 'attention_required' END AS health_status,
  now() AS measured_at
FROM public.workspaces w
WHERE COALESCE(w.is_active, true) = true;

GRANT SELECT ON public.v_stock_scope_reconciliation TO authenticated;
GRANT SELECT ON public.v_ops_health_dashboard TO authenticated;

-- ============================================================
-- 3. Safe reconciliation runner: diagnostics + immutable run record
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_ops_reconciliation(
  p_restaurant_id uuid,
  p_workspace_id uuid DEFAULT NULL,
  p_run_type text DEFAULT 'full'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_orders_without_invoice bigint := 0;
  v_invoices_without_order bigint := 0;
  v_invoice_amount_mismatch bigint := 0;
  v_stock_scope_anomaly bigint := 0;
  v_outbox_open bigint := 0;
  v_outbox_failed bigint := 0;
  v_posting_failures_open bigint := 0;
  v_summary jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR p_restaurant_id IN (SELECT public.auth_restaurant_ids())
    OR (p_workspace_id IS NOT NULL AND p_workspace_id IN (SELECT public.auth_workspace_ids()))
  ) THEN
    RAISE EXCEPTION 'not authorized for this restaurant/workspace';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = p_restaurant_id) THEN
    RAISE EXCEPTION 'restaurant not found';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'workspace does not belong to restaurant';
  END IF;
  IF p_run_type NOT IN ('full','orders_invoices','inventory','accounting') THEN
    RAISE EXCEPTION 'invalid reconciliation run type';
  END IF;

  INSERT INTO public.ops_reconciliation_runs (restaurant_id, workspace_id, run_type, status, created_by)
  VALUES (p_restaurant_id, p_workspace_id, p_run_type, 'running', auth.uid())
  RETURNING id INTO v_run_id;

  IF p_run_type IN ('full','orders_invoices') THEN
    SELECT COUNT(*) INTO v_orders_without_invoice
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR o.workspace_id = p_workspace_id)
      AND o.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM public.sales_invoices si
        WHERE si.order_id = o.id OR si.source_reference_id = o.id
      );

    SELECT COUNT(*) INTO v_invoices_without_order
    FROM public.sales_invoices si
    WHERE si.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR si.workspace_id = p_workspace_id)
      AND si.status NOT IN ('cancelled','void')
      AND si.order_id IS NULL
      AND si.source_reference_id IS NULL;

    SELECT COUNT(*) INTO v_invoice_amount_mismatch
    FROM public.sales_invoices si
    JOIN public.orders o ON o.id = si.order_id
    WHERE si.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR si.workspace_id = p_workspace_id)
      AND ABS(COALESCE(si.total_amount,0) - COALESCE(o.total,0)) > 0.01;
  END IF;

  IF p_run_type IN ('full','inventory') THEN
    SELECT COUNT(*) INTO v_stock_scope_anomaly
    FROM public.v_stock_scope_reconciliation s
    WHERE s.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR s.stock_workspace_id = p_workspace_id)
      AND s.reconciliation_state <> 'ok';
  END IF;

  IF p_run_type IN ('full','accounting') THEN
    SELECT COUNT(*) INTO v_outbox_open
    FROM public.accounting_posting_outbox o
    WHERE o.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR o.workspace_id = p_workspace_id)
      AND o.status IN ('pending','processing');

    SELECT COUNT(*) INTO v_outbox_failed
    FROM public.accounting_posting_outbox o
    WHERE o.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR o.workspace_id = p_workspace_id)
      AND o.status = 'failed';

    SELECT COUNT(*) INTO v_posting_failures_open
    FROM public.gl_posting_failures f
    WHERE f.restaurant_id = p_restaurant_id
      AND (p_workspace_id IS NULL OR f.workspace_id = p_workspace_id)
      AND f.status IN ('pending','retrying');
  END IF;

  v_summary := jsonb_build_object(
    'orders_without_invoice', v_orders_without_invoice,
    'invoices_without_order_link', v_invoices_without_order,
    'invoice_amount_mismatch', v_invoice_amount_mismatch,
    'stock_scope_anomaly', v_stock_scope_anomaly,
    'outbox_open', v_outbox_open,
    'outbox_failed', v_outbox_failed,
    'posting_failures_open', v_posting_failures_open,
    'safe_mode', true,
    'data_mutated', false
  );

  UPDATE public.ops_reconciliation_runs
  SET status = 'completed', summary = v_summary, completed_at = now()
  WHERE id = v_run_id;

  RETURN jsonb_build_object('run_id', v_run_id, 'restaurant_id', p_restaurant_id, 'workspace_id', p_workspace_id, 'summary', v_summary);
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.ops_reconciliation_runs SET status='failed', error_message=left(SQLERRM,2000), completed_at=now() WHERE id=v_run_id;
  END IF;
  RAISE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.run_ops_reconciliation(uuid,uuid,text) TO authenticated, service_role;

-- A single explicit entry point for operators to process the outbox after a health check.
CREATE OR REPLACE FUNCTION public.run_ops_health_cycle(p_batch_size integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed integer := 0;
BEGIN
  v_processed := public.process_accounting_posting_outbox(GREATEST(1, LEAST(COALESCE(p_batch_size,25),100)));
  RETURN jsonb_build_object('processed_outbox', v_processed, 'completed_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.process_accounting_posting_outbox(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_accounting_posting_outbox(integer) TO service_role;
REVOKE ALL ON FUNCTION public.run_ops_health_cycle(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.run_ops_health_cycle(integer) TO service_role;

-- Optional scheduler: only install when pg_cron is already enabled.
DO $$
DECLARE
  v_job_exists boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'auditrypos_ops_health_cycle'
    ) INTO v_job_exists;
    IF NOT v_job_exists THEN
      PERFORM cron.schedule('auditrypos_ops_health_cycle', '*/5 * * * *', $cmd$SELECT public.run_ops_health_cycle(25);$cmd$);
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auditrypos health scheduler not installed: %', SQLERRM;
END;
$$;

COMMIT;
