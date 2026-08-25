-- Fix production RLS recursion on restaurants and company_users.
-- Additive and data-preserving: no rows are deleted or changed.

CREATE OR REPLACE FUNCTION public.is_active_company_member(
  _user_id UUID,
  _company_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.company_users AS cu
      WHERE cu.user_id = _user_id
        AND cu.company_id = _company_id
        AND cu.is_active = true
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company_users(
  _user_id UUID,
  _company_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.company_users AS cu
      WHERE cu.user_id = _user_id
        AND cu.company_id = _company_id
        AND cu.is_active = true
        AND cu.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = _company_id
        AND r.owner_id = _user_id
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_company_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company_users(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_company_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_company_users(UUID, UUID) TO authenticated, service_role;

-- Remove every known overlapping/recursive policy from the two affected tables.
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Restrict restaurant access to owners and employees" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and super admins can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Company members and Super Admin can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and Super Admin can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated reads own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner creates restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner updates own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Admin deletes restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage their restaurant" ON public.restaurants;

DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_users;
DROP POLICY IF EXISTS "Users and Super Admin can view company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Super Admin and Company Admins can manage memberships" ON public.company_users;
DROP POLICY IF EXISTS company_users_members_can_read ON public.company_users;
DROP POLICY IF EXISTS company_users_owner_policy ON public.company_users;
DROP POLICY IF EXISTS company_users_owners_admins_can_write ON public.company_users;
DROP POLICY IF EXISTS company_users_self_view ON public.company_users;
DROP POLICY IF EXISTS global_super_admin_bypass ON public.company_users;
DROP POLICY IF EXISTS super_admin_all_bypass ON public.company_users;
DROP POLICY IF EXISTS super_admin_all_company_users ON public.company_users;

CREATE POLICY restaurants_select_scoped
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.is_active_company_member(auth.uid(), company_id)
  );

CREATE POLICY restaurants_insert_scoped
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY restaurants_update_scoped
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY restaurants_delete_scoped
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY company_users_select_scoped
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.can_manage_company_users(auth.uid(), company_id)
  );

CREATE POLICY company_users_insert_scoped
  ON public.company_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company_users(auth.uid(), company_id));

CREATE POLICY company_users_update_scoped
  ON public.company_users
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company_users(auth.uid(), company_id))
  WITH CHECK (public.can_manage_company_users(auth.uid(), company_id));

CREATE POLICY company_users_delete_scoped
  ON public.company_users
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company_users(auth.uid(), company_id));

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
