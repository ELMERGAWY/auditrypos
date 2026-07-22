-- ================================================================
-- SIMPLE & WORKING CRITICAL FIX: Apply this directly in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

-- STEP 1: Remove the bad policy that allows everyone to see all restaurants
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;

-- STEP 2: Apply the WORKING policy from fix_employee_access_rls.sql (that we know works)
CREATE POLICY "Company members can view their company restaurant"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    -- Owner always sees their own restaurant
    owner_id = auth.uid()
    -- Active company member can see the restaurant linked to their company
    OR company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.is_active = true
    )
  );

-- STEP 3: Also make sure company_users RLS is correct
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
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

-- STEP 4: Allow owners to manage their restaurants
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
CREATE POLICY "Owners can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

SELECT '✅ SIMPLE & WORKING RLS FIX APPLIED! Now try logging in again!' AS status;
