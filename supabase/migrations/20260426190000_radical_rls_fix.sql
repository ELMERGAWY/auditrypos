-- ============================================================
-- RADICAL FIX: ELIMINATE ALL INFINITE RECURSION IN RLS
-- ============================================================

BEGIN;

-- 1. Create a Helper Function to check ownership (Bypasses table-based recursion)
CREATE OR REPLACE FUNCTION public.is_owner(cid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = cid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop all problematic policies on company_users
DROP POLICY IF EXISTS "Users can view members of their own company" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage their company members" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.company_users;
DROP POLICY IF EXISTS "Owners can view all company members" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage company members" ON public.company_users;
DROP POLICY IF EXISTS "Super admins can manage all company_users" ON public.company_users;

-- 3. Apply Clean, Function-Based Policies to company_users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_users_select_policy" ON public.company_users
FOR SELECT USING (user_id = auth.uid() OR is_owner(company_id));

CREATE POLICY "company_users_all_policy" ON public.company_users
FOR ALL USING (is_owner(company_id));

-- 4. Fix sales_returns (Ensure it's not being blocked by a recursive check)
DROP POLICY IF EXISTS "Owners can manage sales returns" ON public.sales_returns;
CREATE POLICY "Owners can manage sales returns" ON public.sales_returns
FOR ALL USING (is_owner(restaurant_id));

-- 5. Bypass for SuperAdmins (Using direct user_roles check, no functions)
CREATE POLICY "super_admin_all_bypass" ON public.company_users
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'super_admin'
);

COMMIT;
