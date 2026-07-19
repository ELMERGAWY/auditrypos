-- ================================================================
-- CRITICAL HOTFIX: Allow company members to read their restaurant
-- Apply this in Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/nmkjyweoagbblkbqavdz/sql
-- ================================================================

-- 1. Ensure company_users table has correct RLS so employees can read their own company memberships
-- (Without this, the frontend query on company_users returns empty even for active members)
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
CREATE POLICY "Users can view their own company memberships"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Allow company members to read the restaurant linked to their company
DROP POLICY IF EXISTS "Company members can view their company restaurant" ON public.restaurants;
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
    -- Super admin sees all
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 3. Also ensure company_users is readable for admins checking their staff
DROP POLICY IF EXISTS "Admins can view company members" ON public.company_users;
CREATE POLICY "Admins can view company members"
  ON public.company_users
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin sees all
    public.has_role(auth.uid(), 'super_admin')
    -- Company admin/owner sees members of their companies
    OR company_id IN (
      SELECT cu2.company_id
      FROM public.company_users cu2
      WHERE cu2.user_id = auth.uid()
        AND cu2.role IN ('owner', 'admin', 'manager')
        AND cu2.is_active = true
    )
    -- User always sees their own memberships
    OR user_id = auth.uid()
  );

SELECT 'RLS policies applied successfully!' AS status;
