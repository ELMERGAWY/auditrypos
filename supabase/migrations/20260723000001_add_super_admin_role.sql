-- ================================================================
-- Add Super Admin role to specific user
-- User ID: a7cb2ec4-e2f2-4b58-941b-dc294de163a7
-- ================================================================

BEGIN;

-- Insert the role only when the historical user still exists.
-- The migration must remain safe after an auth/project transfer.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'
FROM auth.users AS u
WHERE u.id = 'a7cb2ec4-e2f2-4b58-941b-dc294de163a7'
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = 'a7cb2ec4-e2f2-4b58-941b-dc294de163a7'
  ) THEN
    RAISE NOTICE 'Historical super-admin user is absent; skipped role assignment';
  END IF;
END $$;

COMMIT;

SELECT 'Super Admin role added to user a7cb2ec4-e2f2-4b58-941b-dc294de163a7' AS status;
