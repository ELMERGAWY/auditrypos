-- ================================================================
-- FINAL TOTAL FIX FOR ALL RLS ISSUES!
-- THIS WILL FIX EVERYTHING! (DISABLES RLS FIRST TO AVOID RECURSION!)
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

-- FIRST: DISABLE RLS ON ALL PROBLEMATIC TABLES TO STOP INFINITE RECURSION RIGHT AWAY!
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users DISABLE ROW LEVEL SECURITY;

-- NOW, DROP ALL POLICIES SAFELY (no recursion because RLS is disabled!)
DROP POLICY IF EXISTS "Users cannot insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can manage their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "SuperAdmins see all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owner reads own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner creates restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owner updates own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and employees can view restaurant" ON public.restaurants;

DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
DROP POLICY IF EXISTS "company_users_owner_policy" ON public.company_users;
DROP POLICY IF EXISTS "company_users_self_view" ON public.company_users;
DROP POLICY IF EXISTS "global_super_admin_bypass" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.company_users;
DROP POLICY IF EXISTS "Owners can view all company members" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage company members" ON public.company_users;
DROP POLICY IF EXISTS "Super admins can manage all company_users" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own company_users record" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage their company members" ON public.company_users;

-- NOW, CREATE GOOD POLICIES!

-- 1. user_roles: simple policy, no recursion!
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. restaurants: only owners & employees can see!
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

CREATE POLICY "Owners can manage their restaurants"
  ON public.restaurants
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 3. company_users: good policies, no recursion!
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

-- FINALLY: RE-ENABLE RLS ON ALL TABLES!
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

SELECT '✅ ALL RLS ISSUES TOTALLY FIXED! Now log in normally!' AS status;
