-- ================================================================
-- Add Super Admin role to specific user
-- User ID: a7cb2ec4-e2f2-4b58-941b-dc294de163a7
-- ================================================================

BEGIN;

-- Insert super_admin role for the specified user
INSERT INTO public.user_roles (user_id, role)
VALUES ('a7cb2ec4-e2f2-4b58-941b-dc294de163a7', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;

SELECT 'Super Admin role added to user a7cb2ec4-e2f2-4b58-941b-dc294de163a7' AS status;
