-- ================================================================
-- MANUAL SQL: Complete RLS fix - Drop ALL policies first
-- Run this in Supabase SQL Editor
-- ================================================================

-- Drop ALL existing policies for user_roles
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', policy_record.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies for company_users
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_users'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.company_users', policy_record.policyname);
  END LOOP;
END $$;

-- Drop ALL existing policies for restaurants
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurants'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.restaurants', policy_record.policyname);
  END LOOP;
END $$;

-- Create SECURITY DEFINER function to check super admin status
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

-- Create SECURITY DEFINER function to check company admin status
CREATE OR REPLACE FUNCTION public.is_company_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.user_id = is_company_admin.user_id
      AND company_users.role IN ('owner', 'admin', 'manager')
      AND company_users.is_active = true
  );
END;
$$;

-- Create SECURITY DEFINER function to check if user can manage company
CREATE OR REPLACE FUNCTION public.can_manage_company(user_id UUID, company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.user_id = can_manage_company.user_id
      AND company_users.company_id = can_manage_company.company_id
      AND company_users.role IN ('owner', 'admin')
      AND company_users.is_active = true
  );
END;
$$;

-- Create user_roles RLS policies
CREATE POLICY "Users read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Create restaurants RLS policies with Super Admin support
CREATE POLICY "Company members and Super Admin can view restaurants"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR owner_id = auth.uid()
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
    public.is_super_admin(auth.uid())
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR owner_id = auth.uid()
  );

-- Create company_users RLS policies using functions to avoid recursion
CREATE POLICY "Users and Super Admin can view company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.is_company_admin(auth.uid())
  );

CREATE POLICY "Super Admin and Company Admins can manage memberships"
  ON public.company_users
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.can_manage_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.can_manage_company(auth.uid(), company_id)
  );

SELECT 'Complete RLS fix applied successfully!' AS status;
