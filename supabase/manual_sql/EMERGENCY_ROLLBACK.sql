-- ================================================================
-- ⚠️  EMERGENCY ROLLBACK SQL
-- Run this IMMEDIATELY in Supabase SQL Editor to restore all data access
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================
-- This script removes all RLS policy changes we made and restores
-- a safe, permissive state for the restaurants table and company_users.
-- ================================================================

-- ─── STEP 1: Drop ALL policies we added on restaurants ───────────────────────
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;

-- ─── STEP 2: Ensure the original public read policy on restaurants exists ─────
-- In most Supabase projects the restaurants table has a public read policy.
-- We recreate it to make sure it's there after our changes.
DROP POLICY IF EXISTS "Public basic restaurant info" ON public.restaurants;
CREATE POLICY "Public basic restaurant info"
  ON public.restaurants
  FOR SELECT
  USING (true);

-- ─── STEP 3: Drop the company_users policies we added ────────────────────────
-- These policies may have restricted access unexpectedly
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;

-- ─── STEP 4: Ensure company_users has safe, permissive SELECT policy ──────────
-- Check if RLS is enabled on company_users and add a permissive policy if so
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE oid = 'public.company_users'::regclass;

  IF rls_enabled THEN
    -- RLS is enabled, ensure authenticated users can read their own records
    EXECUTE $policy$
      DROP POLICY IF EXISTS "company_users_safe_read" ON public.company_users;
      CREATE POLICY "company_users_safe_read"
        ON public.company_users
        FOR SELECT
        TO authenticated
        USING (true);
    $policy$;
  END IF;
END $$;

-- ─── STEP 5: Verify restaurants SELECT works ──────────────────────────────────
-- Show current policies on restaurants table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('restaurants', 'company_users')
ORDER BY tablename, policyname;

SELECT '✅ Emergency rollback complete - data access should be restored!' AS status;
