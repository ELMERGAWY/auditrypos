-- ============================================================
-- EMERGENCY SECURITY PATCH: SECURE AUDIT LOGS
-- Resolves: Massive data leakage in public audit_log table
-- ============================================================

BEGIN;

-- 1. Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing unsafe public policies
DROP POLICY IF EXISTS "Public can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.audit_log;

-- 3. Create SECURE policy for Owners
-- Note: We use the is_owner(uuid) function we created in previous security patches
CREATE POLICY "Owners can only view their own restaurant audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- 4. Restrict all other operations
CREATE POLICY "No one can modify audit logs"
ON public.audit_log
FOR ALL
TO public
USING (false)
WITH CHECK (false);

COMMIT;
