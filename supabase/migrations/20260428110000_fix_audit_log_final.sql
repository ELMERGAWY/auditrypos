-- Fix for audit_log RLS and trigger security
-- This ensures that logs can be inserted even if the user doesn't have direct insert permissions,
-- and also adds an explicit policy for safety.

BEGIN;

-- 1. Ensure the trigger function is SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, changed_by)
    VALUES (OLD.restaurant_id, TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Add an explicit INSERT policy for authenticated users just in case
-- This allows the insert to succeed even if SECURITY DEFINER behaves unexpectedly in some contexts.
DROP POLICY IF EXISTS "Enable insert for authenticated users on audit_log" ON public.audit_log;
CREATE POLICY "Enable insert for authenticated users on audit_log"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- 3. Ensure SELECT policy is also correct
DROP POLICY IF EXISTS "Owners can only view their own restaurant audit logs" ON public.audit_log;
CREATE POLICY "Owners can only view their own restaurant audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

COMMIT;
