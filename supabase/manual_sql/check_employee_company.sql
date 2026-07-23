-- ================================================================
-- MANUAL SQL: Check company_users for employee 2342006aya@gmail.com
-- User ID: 9a646d33-315b-4936-b44e-0e6129ae0b7d
-- ================================================================

-- 1. Check if user has company membership
SELECT * FROM public.company_users
WHERE user_id = '9a646d33-315b-4936-b44e-0e6129ae0b7d';

-- 2. Check all companies and their restaurants
SELECT 
  c.id as company_id,
  c.name as company_name,
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.owner_id
FROM public.companies c
LEFT JOIN public.restaurants r ON r.company_id = c.id;

-- 3. Check user's role in user_roles
SELECT * FROM public.user_roles
WHERE user_id = '9a646d33-315b-4936-b44e-0e6129ae0b7d';
