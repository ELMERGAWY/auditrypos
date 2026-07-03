
-- 1) Fix employee_chat_messages weak identity match
DROP POLICY IF EXISTS chat_messages_access ON public.employee_chat_messages;
CREATE POLICY chat_messages_access ON public.employee_chat_messages
FOR ALL
USING (
  restaurant_id IN (
    SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()
    UNION
    SELECT sp.restaurant_id FROM public.staff_profiles sp
      WHERE sp.email IS NOT NULL AND sp.email = auth.email()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()
    UNION
    SELECT sp.restaurant_id FROM public.staff_profiles sp
      WHERE sp.email IS NOT NULL AND sp.email = auth.email()
  )
);

-- 2) Reaffirm strict owner-only policies for salary tables (drop super_admin bypass to guarantee salary/commission stays with true owner)
DROP POLICY IF EXISTS owner_only_staff ON public.staff;
CREATE POLICY owner_only_staff ON public.staff
FOR ALL
USING (
  restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
)
WITH CHECK (
  restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
);

DROP POLICY IF EXISTS restaurant_staff_owner_only ON public.restaurant_staff;
CREATE POLICY restaurant_staff_owner_only ON public.restaurant_staff
FOR ALL
USING (
  restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
)
WITH CHECK (
  restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
);

-- 3) Set fixed search_path on all public functions currently missing one
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proconfig IS NULL
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 4) Revoke EXECUTE from anon on all SECURITY DEFINER functions in public schema
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', r.sig);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
