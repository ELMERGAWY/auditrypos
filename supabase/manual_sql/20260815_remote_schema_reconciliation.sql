-- AuditryPOS remote schema reconciliation
-- Manual execution only: Supabase SQL Editor
-- Safe properties: additive, idempotent, no DROP TABLE, no TRUNCATE,
-- no DELETE/UPDATE of customer or transaction data, and no migration-history changes.

BEGIN;

-- 1) Missing audit table. Existing rows are not touched.
CREATE TABLE IF NOT EXISTS public.operation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount NUMERIC(15,4),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant
  ON public.operation_audit_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.operation_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation
  ON public.operation_audit_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.operation_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.operation_audit_log(created_at DESC);

ALTER TABLE public.operation_audit_log ENABLE ROW LEVEL SECURITY;

-- Add the policy only when the existing ownership helper is available.
DO $$
BEGIN
  IF to_regprocedure('public.is_restaurant_owner(uuid,uuid)') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'operation_audit_log'
         AND policyname = 'Audit log owner access'
     ) THEN
    EXECUTE $policy$
      CREATE POLICY "Audit log owner access"
      ON public.operation_audit_log
      FOR ALL TO authenticated
      USING (public.is_restaurant_owner(auth.uid(), restaurant_id))
      WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id))
    $policy$;
  END IF;
END $$;

-- 2) Missing views. Create only when their source tables exist.
DO $$
BEGIN
  IF to_regclass('public.supplier_transactions') IS NOT NULL
     AND to_regclass('public.v_supplier_statement') IS NULL THEN
    EXECUTE $view$
      CREATE VIEW public.v_supplier_statement
      WITH (security_invoker = on) AS
      SELECT * FROM public.supplier_transactions
    $view$;
  END IF;

  IF to_regclass('public.inventory_audit_sessions') IS NOT NULL
     AND to_regclass('public.v_audit_log_financial') IS NULL THEN
    EXECUTE $view$
      CREATE VIEW public.v_audit_log_financial
      WITH (security_invoker = on) AS
      SELECT * FROM public.inventory_audit_sessions
    $view$;
  END IF;
END $$;

COMMIT;

-- Verification (read-only result set):
SELECT
  to_regclass('public.operation_audit_log') AS operation_audit_log,
  to_regclass('public.v_supplier_statement') AS v_supplier_statement,
  to_regclass('public.v_audit_log_financial') AS v_audit_log_financial;

-- This file intentionally does not insert a row into
-- supabase_migrations.schema_migrations. Keep migration history unchanged
-- until a separate baseline/reconciliation project is reviewed.
