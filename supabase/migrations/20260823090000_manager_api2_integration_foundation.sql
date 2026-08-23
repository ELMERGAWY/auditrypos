-- AuditryPOS Manager API2 integration foundation.
-- Additive-only: no drops, truncation, or changes to operational amounts.
-- Secrets are never stored in this schema; token_secret_ref points to a
-- server-side secret or vault entry.

BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'manager',
  api_base_url text NOT NULL DEFAULT 'https://auditry.fra.manager.cloud/api2',
  token_secret_ref text NOT NULL DEFAULT 'MANAGER_API_TOKEN',
  enabled boolean NOT NULL DEFAULT false,
  sync_mode text NOT NULL DEFAULT 'outbox' CHECK (sync_mode IN ('disabled','dry_run','outbox','live')),
  default_currency text NOT NULL DEFAULT 'EGP',
  last_health_check_at timestamptz,
  last_health_status text CHECK (last_health_status IS NULL OR last_health_status IN ('ok','failed')),
  last_health_error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS public.manager_entity_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.manager_integrations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN (
    'customer','supplier','inventory_item','sales_invoice','purchase_invoice',
    'receipt','payment','journal_entry','inventory_transfer','goods_receipt',
    'bank_account','division','tax_code','account'
  )),
  local_table text NOT NULL,
  local_id uuid NOT NULL,
  manager_key text NOT NULL,
  manager_name text,
  sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending','synced','failed','conflict','ignored')),
  source_hash text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, entity_type, local_id),
  UNIQUE (integration_id, entity_type, manager_key)
);

CREATE TABLE IF NOT EXISTS public.manager_sync_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.manager_integrations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('upsert','delete','reconcile','health_check')),
  source_table text NOT NULL,
  source_id uuid,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','posted','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  manager_key text,
  response_status integer,
  response_body jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_manager_sync_outbox_ready
  ON public.manager_sync_outbox(status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_manager_sync_outbox_tenant
  ON public.manager_sync_outbox(restaurant_id, workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manager_entity_mappings_local
  ON public.manager_entity_mappings(restaurant_id, workspace_id, entity_type, local_id);

CREATE TABLE IF NOT EXISTS public.manager_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.manager_integrations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  run_type text NOT NULL CHECK (run_type IN ('health_check','bootstrap','incremental','reconcile')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  processed_count integer NOT NULL DEFAULT 0,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

ALTER TABLE public.manager_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_entity_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_sync_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manager_integrations' AND policyname='manager_integrations_read') THEN
    CREATE POLICY manager_integrations_read ON public.manager_integrations FOR SELECT USING (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manager_integrations' AND policyname='manager_integrations_manage') THEN
    CREATE POLICY manager_integrations_manage ON public.manager_integrations FOR ALL USING (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_restaurant_owner(auth.uid(), restaurant_id)
    ) WITH CHECK (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_restaurant_owner(auth.uid(), restaurant_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manager_entity_mappings' AND policyname='manager_entity_mappings_read') THEN
    CREATE POLICY manager_entity_mappings_read ON public.manager_entity_mappings FOR SELECT USING (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manager_sync_outbox' AND policyname='manager_sync_outbox_read') THEN
    CREATE POLICY manager_sync_outbox_read ON public.manager_sync_outbox FOR SELECT USING (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manager_sync_runs' AND policyname='manager_sync_runs_read') THEN
    CREATE POLICY manager_sync_runs_read ON public.manager_sync_runs FOR SELECT USING (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR restaurant_id IN (SELECT public.auth_restaurant_ids())
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_manager_sync_event(
  p_integration_id uuid,
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_entity_type text,
  p_operation text,
  p_source_table text,
  p_source_id uuid,
  p_idempotency_key text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR p_restaurant_id IN (SELECT public.auth_restaurant_ids())
  ) THEN
    RAISE EXCEPTION 'not authorized for Manager integration event';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.manager_integrations i
    WHERE i.id = p_integration_id
      AND i.restaurant_id = p_restaurant_id
      AND i.enabled = true
      AND i.sync_mode IN ('dry_run','outbox','live')
  ) THEN
    RAISE EXCEPTION 'Manager integration is not enabled';
  END IF;

  INSERT INTO public.manager_sync_outbox (
    integration_id, restaurant_id, workspace_id, entity_type, operation,
    source_table, source_id, idempotency_key, payload
  ) VALUES (
    p_integration_id, p_restaurant_id, p_workspace_id, p_entity_type, p_operation,
    p_source_table, p_source_id, p_idempotency_key, COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (integration_id, idempotency_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = now(),
        available_at = CASE
          WHEN public.manager_sync_outbox.status IN ('failed','cancelled') THEN now()
          ELSE public.manager_sync_outbox.available_at
        END,
        status = CASE
          WHEN public.manager_sync_outbox.status IN ('failed','cancelled') THEN 'pending'
          ELSE public.manager_sync_outbox.status
        END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT SELECT ON public.manager_integrations TO authenticated;
GRANT SELECT ON public.manager_entity_mappings TO authenticated;
GRANT SELECT ON public.manager_sync_outbox TO authenticated;
GRANT SELECT ON public.manager_sync_runs TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_manager_sync_event(uuid,uuid,uuid,text,text,text,uuid,text,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_manager_sync_outbox(p_limit integer DEFAULT 25)
RETURNS SETOF public.manager_sync_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.manager_sync_outbox;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service role required';
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.manager_sync_outbox
    WHERE status = 'pending'
      AND available_at <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  LOOP
    UPDATE public.manager_sync_outbox
       SET status = 'processing', locked_at = now(), attempts = attempts + 1, updated_at = now()
     WHERE id = v_row.id
     RETURNING * INTO v_row;
    RETURN NEXT v_row;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_manager_sync_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_manager_sync_outbox(integer) TO service_role;

COMMENT ON TABLE public.manager_integrations IS 'Manager API2 connection metadata. Tokens are referenced by secret name and never stored here.';
COMMENT ON TABLE public.manager_entity_mappings IS 'Idempotent mapping between AuditryPOS UUIDs and Manager API2 keys.';
COMMENT ON TABLE public.manager_sync_outbox IS 'Server-side Manager API2 delivery queue. Network calls must not run inside database transactions.';

COMMIT;
