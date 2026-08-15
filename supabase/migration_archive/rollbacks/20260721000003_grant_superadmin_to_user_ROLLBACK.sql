-- ============================================================
-- ROLLBACK: GRANT SUPERADMIN ROLE TO SPECIFIC USER
-- ============================================================
-- This rollback removes the super_admin role from user a7cb2ec4-e2f2-4b58-941b-dc294de163a7
-- ============================================================

BEGIN;

-- Remove super_admin role from the specific user
DELETE FROM public.user_roles
WHERE user_id = 'a7cb2ec4-e2f2-4b58-941b-dc294de163a7'
AND role = 'super_admin';

-- Verify the role was removed
DO $$
BEGIN
  RAISE NOTICE 'Superadmin role removed from user a7cb2ec4-e2f2-4b58-941b-dc294de163a7';
END $$;

COMMIT;
