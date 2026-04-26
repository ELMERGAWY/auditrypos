-- ============================================================
-- AUDITRY POS: Permissions & SuperAdmin Fixes (CORRECTED)
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

-- 2. Allow super admins to see EVERYTHING (Using user_roles table)
DROP POLICY IF EXISTS "SuperAdmins see all restaurants" ON public.restaurants;
CREATE POLICY "SuperAdmins see all restaurants" ON public.restaurants
  FOR ALL TO authenticated
  USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "SuperAdmins see all permissions" ON public.role_permissions;
CREATE POLICY "SuperAdmins see all permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    company_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

COMMIT;
