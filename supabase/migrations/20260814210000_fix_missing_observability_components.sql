-- AuditryPOS additive repair for the partially-applied observability migration.
-- Safe to run after 20260814190000; it does not replay that migration and does not
-- update orders, invoices, stock, journal entries, or customer transactions.
-- It recreates only missing observability objects and is intentionally idempotent.

BEGIN;

-- The outbox table is expected to exist from 20260814190000. This guarded definition
-- also makes the repair safe if only the table portion was applied previously.
CREATE TABLE IF NOT EXISTS public.accounting_posting_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','posted','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  posted_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_accounting_posting_outbox_ready
  ON public.accounting_posting_outbox(status, available_at, created_at);

ALTER TABLE IF EXISTS public.operation_audit_log
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_operation_audit_log_workspace_created
  ON public.operation_audit_log(workspace_id, created_at DESC);

-- Do not fail this repair if an accounting helper is unavailable. The worker will
-- record a failed outbox item at runtime and retain it for a later retry.
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regprocedure('public.get_cash_account(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'get_cash_account(uuid)');
  END IF;
  IF to_regprocedure('public.get_accounts_receivable(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'get_accounts_receivable(uuid)');
  END IF;
  IF to_regprocedure('public.get_sales_account(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'get_sales_account(uuid)');
  END IF;
  IF to_regprocedure('public.get_cogs_account(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'get_cogs_account(uuid)');
  END IF;
  IF to_regprocedure('public.get_inventory_account(uuid)') IS NULL THEN
    v_missing := array_append(v_missing, 'get_inventory_account(uuid)');
  END IF;
  IF to_regprocedure('public._get_or_create_account(uuid,text,text,text,text,text,text,boolean,boolean)') IS NULL THEN
    v_missing := array_append(v_missing, '_get_or_create_account(uuid,text,text,text,text,text,text,boolean,boolean)');
  END IF;
  IF to_regprocedure('public.fn_upsert_doc_journal(uuid,text,uuid,date,text,text,jsonb)') IS NULL THEN
    v_missing := array_append(v_missing, 'fn_upsert_doc_journal(uuid,text,uuid,date,text,text,jsonb)');
  END IF;
  IF COALESCE(array_length(v_missing, 1), 0) > 0 THEN
    RAISE NOTICE 'Accounting helper functions not found during observability repair: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

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

-- Recreate the prerequisite order/invoice view if the first migration created only
-- the outbox table before failing.
CREATE OR REPLACE VIEW public.v_order_invoice_reconciliation AS
SELECT
  o.id AS order_id,
  o.restaurant_id,
  o.workspace_id,
  o.order_number,
  o.created_at AS order_created_at,
  o.status AS order_status,
  o.total AS order_total,
  o.journal_entry_id AS order_journal_entry_id,
  si.id AS sales_invoice_id,
  si.invoice_number,
  si.order_id AS invoice_order_id,
  si.source_reference_id,
  si.total_amount AS invoice_total,
  si.journal_entry_id AS invoice_journal_entry_id,
  CASE
    WHEN si.id IS NULL THEN 'order_without_invoice'
    WHEN si.order_id IS NULL AND si.source_reference_id IS NULL THEN 'invoice_without_order_link'
    WHEN si.order_id IS NULL AND si.source_reference_id = o.id THEN 'linked_by_source_reference'
    WHEN si.order_id = o.id AND si.total_amount IS DISTINCT FROM o.total THEN 'amount_mismatch'
    ELSE 'linked'
  END AS reconciliation_state
FROM public.orders o
FULL OUTER JOIN public.sales_invoices si
  ON si.order_id = o.id OR si.source_reference_id = o.id;

-- Read-only inventory scope diagnostics.
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
GRANT SELECT ON public.v_stock_scope_reconciliation TO authenticated;

-- The outbox worker must be created before the health-cycle function and before any
-- permission statements that reference its signature.
CREATE OR REPLACE FUNCTION public.process_accounting_posting_outbox(p_batch_size integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_order public.orders%ROWTYPE;
  v_transfer public.inventory_transfers%ROWTYPE;
  v_lines jsonb;
  v_entry uuid;
  v_tax numeric;
  v_paid numeric;
  v_credit numeric;
  v_cost numeric;
  v_processed integer := 0;
  v_cash uuid;
  v_ar uuid;
  v_sales uuid;
  v_tax_account uuid;
  v_cogs uuid;
  v_inventory uuid;
  v_amount numeric;
BEGIN
  FOR v_row IN
    SELECT * FROM public.accounting_posting_outbox
    WHERE status IN ('pending','failed') AND available_at <= now()
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_batch_size,25), 100))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.accounting_posting_outbox
    SET status='processing', attempts=attempts+1, locked_at=now(), updated_at=now()
    WHERE id=v_row.id;
    BEGIN
      IF v_row.source_table = 'orders' AND v_row.event_type = 'sale_completed' THEN
        SELECT * INTO v_order FROM public.orders WHERE id=v_row.source_id FOR UPDATE;
        IF v_order.id IS NULL THEN RAISE EXCEPTION 'order % not found', v_row.source_id; END IF;
        v_tax := COALESCE((SELECT SUM(tax_amount) FROM public.order_taxes WHERE order_id=v_order.id), 0);
        v_paid := LEAST(COALESCE(v_order.total,0), GREATEST(COALESCE(v_order.paid_amount,0), COALESCE(v_order.direct_paid_amount,0)));
        v_credit := GREATEST(COALESCE(v_order.total,0)-v_paid,0);
        v_cash := public.get_cash_account(v_order.restaurant_id);
        v_ar := public.get_accounts_receivable(v_order.restaurant_id);
        v_sales := public.get_sales_account(v_order.restaurant_id);
        v_lines := '[]'::jsonb;
        IF v_paid > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_cash,'debit',v_paid,'credit',0,'description','تحصيل طلب '||v_order.order_number); END IF;
        IF v_credit > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_ar,'debit',v_credit,'credit',0,'description','آجل طلب '||v_order.order_number); END IF;
        IF v_tax > 0 THEN
          v_tax_account := public._get_or_create_account(v_order.restaurant_id,'2100','ضريبة القيمة المضافة المستحقة','liability','current_liability','vat_payable','credit',false,false);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_sales,'debit',0,'credit',ROUND(v_order.total-v_tax,2),'description','مبيعات طلب '||v_order.order_number)
            || jsonb_build_object('account_id',v_tax_account,'debit',0,'credit',v_tax,'description','ضريبة طلب '||v_order.order_number);
        ELSE
          v_lines := v_lines || jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_order.total,'description','مبيعات طلب '||v_order.order_number);
        END IF;
        v_cost := COALESCE((v_row.payload->>'inventory_cost')::numeric, v_order.total_cost, 0);
        IF v_cost > 0 THEN
          v_cogs := public.get_cogs_account(v_order.restaurant_id);
          v_inventory := public.get_inventory_account(v_order.restaurant_id);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_cogs,'debit',v_cost,'credit',0,'description','تكلفة مبيعات '||v_order.order_number)
            || jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_cost,'description','صرف مخزون '||v_order.order_number);
        END IF;
        v_entry := public.fn_upsert_doc_journal(v_order.restaurant_id,'order',v_order.id,COALESCE(v_order.created_at::date,current_date),'قيد مبيعات - طلب رقم '||v_order.order_number,'sales',v_lines);
        UPDATE public.orders SET journal_entry_id=v_entry, updated_at=now() WHERE id=v_order.id;
      ELSIF v_row.source_table = 'inventory_transfers' AND v_row.event_type = 'inventory_transfer' THEN
        SELECT * INTO v_transfer FROM public.inventory_transfers WHERE id=v_row.source_id FOR UPDATE;
        IF v_transfer.id IS NULL THEN RAISE EXCEPTION 'transfer % not found', v_row.source_id; END IF;
        v_amount := COALESCE((v_row.payload->>'amount')::numeric,0);
        v_inventory := public.get_inventory_account(v_transfer.restaurant_id);
        v_lines := jsonb_build_array(
          jsonb_build_object('account_id',v_inventory,'debit',v_amount,'credit',0,'description','استلام تحويل مخزون'),
          jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_amount,'description','إرسال تحويل مخزون')
        );
        v_entry := public.fn_upsert_doc_journal(v_transfer.restaurant_id,'inventory_transfer',v_transfer.id,current_date,'قيد تحويل مخزون','inventory',v_lines);
        UPDATE public.inventory_transfers SET accounting_entry_id=v_entry WHERE id=v_transfer.id;
      ELSE
        RAISE EXCEPTION 'unsupported outbox event %.%', v_row.source_table, v_row.event_type;
      END IF;
      UPDATE public.accounting_posting_outbox SET status='posted', posted_entry_id=v_entry, last_error=NULL, updated_at=now() WHERE id=v_row.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.accounting_posting_outbox
      SET status='failed', last_error=left(SQLERRM,2000), available_at=now() + make_interval(secs => LEAST(3600, GREATEST(30, attempts*60))), updated_at=now()
      WHERE id=v_row.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_accounting_posting_outbox(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_process_accounting_posting_outbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.process_accounting_posting_outbox(25);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_process_accounting_posting_outbox ON public.accounting_posting_outbox;
CREATE TRIGGER trg_process_accounting_posting_outbox
AFTER INSERT ON public.accounting_posting_outbox
FOR EACH STATEMENT EXECUTE FUNCTION public.trg_process_accounting_posting_outbox();

-- Workspace health dashboard depends on both reconciliation views above.
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

-- Safe diagnostics runner: it records only a run summary and does not mutate
-- orders, invoices, stock, or journal entries.
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

-- Scheduler installation is intentionally omitted from this corrective patch.
-- Enable a cron job only after the objects and accounting helper functions have
-- been verified in the customer's environment.

COMMIT;
