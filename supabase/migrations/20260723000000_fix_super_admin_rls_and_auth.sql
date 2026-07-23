-- ================================================================
-- CRITICAL FIX: Add Super Admin access to RLS policies and auth flow
-- This fixes the cross-contamination and Super Admin company selection issues
-- ================================================================

BEGIN;

-- 1. Drop existing restaurant RLS policies to rebuild with Super Admin support
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;

-- 2. Create comprehensive restaurant RLS policies WITH Super Admin support
CREATE POLICY "Company members and Super Admin can view restaurants"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    -- Super Admin can see all restaurants
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- Owner always has access
    OR owner_id = auth.uid()
    -- Active company employees can access
    OR company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.is_active = true
    )
  );

CREATE POLICY "Owners and Super Admin can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (
    -- Super Admin can manage all restaurants
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- Owner can manage their own restaurants
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    -- Super Admin can manage all restaurants
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- Owner can manage their own restaurants
    OR owner_id = auth.uid()
  );

-- 3. Update company_users RLS to include Super Admin
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;

CREATE POLICY "Users and Super Admin can view company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    -- Super Admin can see all company memberships
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- User always sees their own memberships
    OR user_id = auth.uid()
    -- Company admin/owner sees members of their companies
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin', 'manager')
        AND cu2.is_active = true
    )
  );

CREATE POLICY "Super Admin and Company Admins can manage memberships"
  ON public.company_users
  FOR ALL
  TO authenticated
  USING (
    -- Super Admin can manage all memberships
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- Company admins can manage their company memberships
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin')
        AND cu2.is_active = true
    )
  )
  WITH CHECK (
    -- Super Admin can manage all memberships
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
    -- Company admins can manage their company memberships
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin')
        AND cu2.is_active = true
    )
  );

-- 4. Ensure RLS is enabled
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'SUPER ADMIN RLS FIX APPLIED SUCCESSFULLY!' AS status;
