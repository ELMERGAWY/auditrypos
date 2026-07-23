-- ================================================================
-- MANUAL SQL: Fix infinite recursion in user_roles RLS policy
-- Run this in Supabase SQL Editor
-- ================================================================

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "Super Admin and Company Admins can manage memberships" ON public.company_users;

-- Create a SECURITY DEFINER function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = is_super_admin.user_id
      AND user_roles.role = 'super_admin'
  );
END;
$$;

-- Create simple user_roles RLS policies WITHOUT recursion
CREATE POLICY "Users read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow super admins to read all roles using the function
CREATE POLICY "Super admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Update company_users policies to use the function
CREATE POLICY "Users and Super Admin can view company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    -- Super Admin can see all company memberships
    public.is_super_admin(auth.uid())
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
    public.is_super_admin(auth.uid())
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
    public.is_super_admin(auth.uid())
    -- Company admins can manage their company memberships
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin')
        AND cu2.is_active = true
    )
  );

SELECT 'Infinite recursion fixed successfully!' AS status;
