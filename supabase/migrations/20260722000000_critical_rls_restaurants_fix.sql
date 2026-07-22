-- ================================================================
-- CRITICAL SECURITY FIX: Proper RLS for restaurants and related tables
-- This prevents users from accessing restaurants/companies they don't own or aren't employed by
-- ================================================================

BEGIN;

-- 1. First, fix the restaurants table RLS completely
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;

-- Create proper RLS policies for restaurants table
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
    -- Super admin access
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Owners and super admins can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 2. Fix company_users RLS to be stricter
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;

CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage members"
  ON public.company_users
  FOR ALL
  TO authenticated
  USING (
    -- Super admin
    public.has_role(auth.uid(), 'super_admin')
    -- Company owner/admin
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin')
        AND cu2.is_active = true
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin')
        AND cu2.is_active = true
    )
  );

-- 3. Also ensure that RLS is enabled on restaurants (it should be already, but just in case)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'CRITICAL RLS FIX APPLIED SUCCESSFULLY!' AS status;
