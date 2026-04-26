-- ============================================================
-- FINAL FIX: ELIMINATE RECURSION IN SALES RETURNS & COMPANY USERS
-- ============================================================

BEGIN;

-- 1. Disable and Re-enable RLS to clear any cached policy loops
ALTER TABLE public.sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop problematic recursive policies
DROP POLICY IF EXISTS "Owners can manage sales returns" ON public.sales_returns;
DROP POLICY IF EXISTS "Owners manage sales returns" ON public.sales_returns;
DROP POLICY IF EXISTS "Owners can manage company members" ON public.company_users;
DROP POLICY IF EXISTS "Owners manage company users" ON public.company_users;
DROP POLICY IF EXISTS "company_users_select_policy" ON public.company_users;
DROP POLICY IF EXISTS "company_users_all_policy" ON public.company_users;

-- 3. Create non-recursive policies based directly on the restaurants (owner_id)
-- This avoids checking company_users to see if a user is in company_users

-- Policy for sales_returns
CREATE POLICY "sales_returns_owner_policy" ON public.sales_returns
FOR ALL USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- Policy for company_users
CREATE POLICY "company_users_owner_policy" ON public.company_users
FOR ALL USING (
  company_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- 4. Allow users to see their own records (Direct UID check, no recursion)
CREATE POLICY "company_users_self_view" ON public.company_users
FOR SELECT USING (user_id = auth.uid());

-- 5. Bypass for SuperAdmins (Direct role check)
CREATE POLICY "global_super_admin_bypass" ON public.company_users
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

COMMIT;
