
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

-- 2) Reaffirm strict owner-only policies only for salary tables installed in this schema.
DO $salary_policy_guard$
DECLARE
  v_table TEXT;
  v_policy TEXT;
BEGIN
  FOR v_table, v_policy IN
    SELECT * FROM (VALUES
      ('staff', 'owner_only_staff'),
      ('restaurant_staff', 'restaurant_staff_owner_only')
    ) AS salary_tables(table_name, policy_name)
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, v_table);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
         USING (restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()))
         WITH CHECK (restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid()))',
        v_policy, v_table
      );
    ELSE
      RAISE NOTICE '% is not installed; skipped salary policy', v_table;
    END IF;
  END LOOP;
END;
$salary_policy_guard$;

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
