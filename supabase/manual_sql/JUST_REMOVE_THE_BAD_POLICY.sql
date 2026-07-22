-- ================================================================
-- SUPER SIMPLE FIX: REMOVE THE BAD POLICY AND KEEP EVERYTHING ELSE!
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

-- Step 1: REMOVE ONLY THE BAD POLICY THAT CAUSED THE PROBLEM!
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;

-- Step 2: Make sure all the original GOOD policies exist (from your existing fix_employee_access_rls.sql)
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
CREATE POLICY "Company members can view their company restaurant"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR company_id IN (
      SELECT cu.company_id
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
CREATE POLICY "Admins can view company members"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid() AND cu2.role IN ('owner', 'admin', 'manager') AND cu2.is_active = true
    )
  );

-- Step 3: Also make sure owners can manage their restaurants
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
CREATE POLICY "Owners can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

SELECT '✅ BAD POLICY REMOVED! Now you can log in normally!' AS status;
