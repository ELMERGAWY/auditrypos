-- ================================================================
-- CRITICAL SECURITY FIX: Proper RLS for restaurants and related tables
-- This prevents users from accessing restaurants/companies they don't own or aren't employed by
-- ================================================================

BEGIN;

-- 1. First, fix the restaurants table RLS completely
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Restrict restaurant access to owners and employees" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and super admins can manage restaurants" ON public.restaurants;

-- Create proper RLS policies for restaurants table (WITHOUT relying on missing has_role function)
CREATE POLICY "Restrict restaurant access to owners and employees"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    -- Owner always has access
    owner_id = auth.uid()
    -- Active company employees can access
    OR company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.is_active = true
    )
  );

CREATE POLICY "Owners can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2. Fix company_users RLS to be stricter (matching the existing working fix)
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_users;

-- First: Users can always view their own memberships
CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Second: Allow company members to view restaurant linked to their company (and admins to manage)
CREATE POLICY "Admins can view company members"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    -- User always sees their own memberships
    user_id = auth.uid()
    -- Company admin/owner sees members of their companies
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin', 'manager')
        AND cu2.is_active = true
    )
  );

-- 3. Also ensure that RLS is enabled on both tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'CRITICAL RLS FIX APPLIED SUCCESSFULLY!' AS status;
