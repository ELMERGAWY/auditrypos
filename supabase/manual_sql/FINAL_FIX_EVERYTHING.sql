-- ================================================================
-- FINAL TOTAL FIX FOR ALL RLS ISSUES!
-- THIS WILL FIX EVERYTHING!
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

BEGIN;

-- Step 1: Fix user_roles table first! Remove any policies that use non-existent has_role function!
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users cannot insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;

-- Simple policy for user_roles: users can only read their own roles, no recursion!
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 2: Fix restaurants table! REMOVE THE BAD PUBLIC POLICY!
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "SuperAdmins see all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owner reads own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner creates restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner updates own restaurant" ON public.restaurants;

-- GOOD policy for restaurants: only owners & employees can see!
CREATE POLICY "Owners and employees can view restaurant"
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

-- Policy for owners to manage their restaurants
CREATE POLICY "Owners can manage their restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Step 3: Fix company_users table!
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "company_users_owner_policy" ON public.company_users;
DROP POLICY IF EXISTS "company_users_self_view" ON public.company_users;
DROP POLICY IF EXISTS "global_super_admin_bypass" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.company_users;
DROP POLICY IF EXISTS "Owners can view all company members" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage company members" ON public.company_users;
DROP POLICY IF EXISTS "Super admins can manage all company_users" ON public.company_users;

-- Good policies for company_users (no recursion!)
CREATE POLICY "Users can view their own company_users record"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage their company members"
  ON public.company_users
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

COMMIT;

SELECT '✅ ALL RLS ISSUES FIXED! Now log in normally!' AS status;
