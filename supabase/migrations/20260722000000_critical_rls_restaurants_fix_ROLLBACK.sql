-- ================================================================
-- ROLLBACK: Critical RLS Fix for Restaurants
-- ================================================================

BEGIN;

-- Restore previous policies (or drop the new ones)
DROP POLICY IF EXISTS "Restrict restaurant access to owners and employees" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and super admins can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;
DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_users;

-- Recreate the basic policy that was there before (if needed)
CREATE POLICY "Public can view basic info" 
ON public.restaurants FOR SELECT 
USING (status = 'active');

COMMIT;

SELECT 'RLS FIX ROLLED BACK' AS status;
