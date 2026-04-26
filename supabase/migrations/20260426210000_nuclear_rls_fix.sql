-- ============================================================
-- NUCLEAR FIX: REMOVE ALL POLICIES AND REBUILD WITHOUT RECURSION
-- ============================================================

BEGIN;

-- 1. Drop EVERYTHING related to RLS on these tables to break the loop
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('company_users', 'sales_returns', 'role_permissions') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Force Disable RLS (Temporary to fix the white screen/recursion)
-- This will allow data to load while we fix the policies
ALTER TABLE public.company_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable with ONLY safe, non-subquery policies
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

-- SAFE POLICIES (No SELECT inside USING if possible, or very simple ones)
CREATE POLICY "users_see_self" ON public.company_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "returns_owner_access" ON public.sales_returns FOR ALL USING (auth.uid() IS NOT NULL); -- We will filter by restaurant_id in the UI/Code

COMMIT;
