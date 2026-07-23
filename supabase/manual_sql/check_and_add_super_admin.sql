-- ================================================================
-- MANUAL SQL: Check and add Super Admin role to user
-- Run this in Supabase SQL Editor to fix Super Admin access
-- ================================================================

-- 1. Check current user roles
SELECT * FROM public.user_roles;

-- 2. Check if your user has super_admin role (replace YOUR_USER_ID with actual UUID)
-- SELECT * FROM public.user_roles WHERE user_id = 'YOUR_USER_ID' AND role = 'super_admin';

-- 3. Add super_admin role to a user (replace YOUR_USER_ID with actual UUID)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR_USER_ID', 'super_admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 4. View all users with their roles
SELECT 
  u.id,
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.email;
