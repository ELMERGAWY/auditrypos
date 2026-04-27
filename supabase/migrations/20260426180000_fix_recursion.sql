-- ============================================================
-- FIX: INFINITE RECURSION IN RLS POLICIES
-- ============================================================

BEGIN;

-- 1. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view members of their own company" ON public.company_users;
DROP POLICY IF EXISTS "Owners can manage their company members" ON public.company_users;

-- 2. Create simplified, non-recursive policies
-- Use a subquery that doesn't reference the table itself recursively for the same operation

-- Allow users to see their own membership
CREATE POLICY "Users can view their own membership"
ON public.company_users
FOR SELECT
USING (user_id = auth.uid());

-- Allow owners to see all members of their companies
-- This is safe because we check the 'restaurants' table, not 'company_users' itself
CREATE POLICY "Owners can view all company members"
ON public.company_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = public.company_users.company_id
    AND owner_id = auth.uid()
  )
);

-- Allow owners to manage members
CREATE POLICY "Owners can manage company members"
ON public.company_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = public.company_users.company_id
    AND owner_id = auth.uid()
  )
);

-- 3. Global bypass for super_admin (using the profiles check to avoid company_users recursion)
CREATE POLICY "Super admins can manage all company_users"
ON public.company_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

COMMIT;
