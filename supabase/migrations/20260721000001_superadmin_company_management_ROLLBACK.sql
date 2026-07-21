-- ============================================================
-- ROLLBACK: SUPERADMIN COMPANY MANAGEMENT
-- ============================================================
-- This rollback removes superadmin company management functions
-- ============================================================

BEGIN;

-- Drop superadmin company management function
DROP FUNCTION IF EXISTS public.superadmin_delete_company(p_company_id UUID);

-- Restore normal RLS policies for companies (revert to granular permissions)
DROP POLICY IF EXISTS superadmin_companies_all ON public.companies;
DROP POLICY IF EXISTS superadmin_company_users_all ON public.company_users;

COMMIT;
