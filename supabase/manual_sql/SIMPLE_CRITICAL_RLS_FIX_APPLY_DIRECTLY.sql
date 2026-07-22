-- ================================================================
-- SIMPLE & WORKING CRITICAL FIX: Apply this directly in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

-- STEP 0: FIRST, REMOVE ALL EXISTING POLICIES on both tables!
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restrict restaurant access to owners and employees" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and super admins can manage restaurants" ON public.restaurants;
-- Also drop ALL policies for company_users
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_users;

-- STEP 1: Apply the WORKING SELECT policy for restaurants
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

-- STEP 2: Apply policy for owners to manage restaurants
CREATE POLICY "Owners can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- STEP 3: Fix company_users RLS
CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

SELECT '✅ ALL RLS POLICIES RESET & FIXED SUCCESSFULLY! Now try logging in again!' AS status;
