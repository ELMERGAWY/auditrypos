-- ============================================================
-- AUDITRY POS: Permissions & SuperAdmin Fixes
-- ============================================================

BEGIN;

-- 1. Fix role_permissions policy to allow owners to manage them
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage permissions" ON public.role_permissions;
CREATE POLICY "Owners can manage permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- 2. Allow super admins to see EVERYTHING
DROP POLICY IF EXISTS "SuperAdmins see all restaurants" ON public.restaurants;
CREATE POLICY "SuperAdmins see all restaurants" ON public.restaurants
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() OR 
    (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "SuperAdmins see all permissions" ON public.role_permissions;
CREATE POLICY "SuperAdmins see all permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR
    (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()) = true
  );

-- 3. Cleanup: If a super admin has a restaurant, decouple it or delete if requested
-- (We will handle the deletion safely via code or manual UI)

COMMIT;
