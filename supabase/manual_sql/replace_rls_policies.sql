-- ================================================================
-- MANUAL SQL: Replace existing RLS policies with Super Admin support
-- Run this in Supabase SQL Editor to fix the policies
-- ================================================================

-- Drop ALL existing restaurant policies first
DROP POLICY IF EXISTS "Company members and Super Admin can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and Super Admin can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restrict restaurant access to owners and employees" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and super admins can manage restaurants" ON public.restaurants;

-- Create comprehensive restaurant RLS policies WITH Super Admin support
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

SELECT 'RLS policies replaced successfully with Super Admin support!' AS status;
