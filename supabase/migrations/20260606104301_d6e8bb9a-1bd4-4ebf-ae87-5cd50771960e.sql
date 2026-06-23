
-- 1) Restrict crm_platform_configs to actual restaurant owners only
DROP POLICY IF EXISTS owner_all_platform_configs ON public.crm_platform_configs;
CREATE POLICY crm_platform_configs_owner_only
  ON public.crm_platform_configs
  FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 2) Restrict restaurant_staff (incl. pin column) to true owners only; provide sanitized view
DROP POLICY IF EXISTS "Owner manages staff" ON public.restaurant_staff;
CREATE POLICY restaurant_staff_owner_only
  ON public.restaurant_staff
  FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE OR REPLACE VIEW public.restaurant_staff_safe
WITH (security_invoker = on) AS
  SELECT id, restaurant_id, name, role, phone, is_active, created_at
  FROM public.restaurant_staff;
GRANT SELECT ON public.restaurant_staff_safe TO authenticated;

-- 3) Fix mutable search_path on check_staff_permission
CREATE OR REPLACE FUNCTION public.check_staff_permission(p_staff_id uuid, p_permission_code character varying)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role VARCHAR(50);
  v_restaurant_id UUID;
  v_is_allowed BOOLEAN;
BEGIN
  SELECT role, restaurant_id INTO v_role, v_restaurant_id
  FROM public.restaurant_staff WHERE id = p_staff_id LIMIT 1;
  IF v_role IS NULL THEN RETURN false; END IF;
  SELECT is_allowed INTO v_is_allowed
  FROM public.role_permissions
  WHERE (company_id = v_restaurant_id OR company_id IS NULL)
    AND role = v_role AND permission_code = p_permission_code
  LIMIT 1;
  IF v_is_allowed IS NOT NULL THEN RETURN v_is_allowed; END IF;
  IF v_role IN ('manager', 'branch_manager') THEN RETURN true; END IF;
  RETURN false;
END;
$function$;

-- 4) Revoke anon execute on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_restaurant_owner(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.check_staff_permission(uuid, character varying) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_staff_permission(uuid, character varying) TO authenticated, service_role;

-- 5) Deny client-side writes to user_roles (only service_role edge function may mutate)
DROP POLICY IF EXISTS "Users cannot insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot delete roles" ON public.user_roles;
CREATE POLICY "Users cannot insert roles" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Users cannot update roles" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Users cannot delete roles" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);

-- 6) Tighten all public-role policies on public schema to authenticated only
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, c.relname, p.polname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND p.polroles = '{0}'::oid[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.polname, r.nspname, r.relname);
  END LOOP;
END$$;
