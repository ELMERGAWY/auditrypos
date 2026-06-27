-- ============================================================
-- RESTORE WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script restores the deleted warehouses for Nour Shop
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Find the restaurant ID
-- ============================================================
-- Run this query first to get the restaurant_id:
SELECT id, name FROM restaurants WHERE name ILIKE '%nour%';
-- Copy the ID from the result (it looks like: 123e4567-e89b-12d3-a456-426614174000)

-- ============================================================
-- STEP 2: Restore all warehouses for the restaurant
-- ============================================================
-- Replace 'YOUR_RESTAURANT_ID_HERE' with the actual ID from Step 1
-- Then run this query:
SELECT public.restore_restaurant_warehouses('YOUR_RESTAURANT_ID_HERE');

-- ============================================================
-- STEP 3: Verify restoration
-- ============================================================
-- Replace 'YOUR_RESTAURANT_ID_HERE' with the actual ID
SELECT id, code, name, name_ar, type, deleted_at
FROM warehouses
WHERE restaurant_id = 'YOUR_RESTAURANT_ID_HERE'
ORDER BY created_at DESC;

-- ============================================================
-- ALTERNATIVE: List deleted warehouses first
-- ============================================================
-- Replace 'YOUR_RESTAURANT_ID_HERE' with the actual ID
SELECT public.list_deleted_warehouses('YOUR_RESTAURANT_ID_HERE');

-- ============================================================
-- ALTERNATIVE: Restore specific warehouse by ID
-- ============================================================
-- If you know the warehouse IDs, restore them individually:
-- SELECT public.restore_warehouse('WAREHOUSE_ID_1');
-- SELECT public.restore_warehouse('WAREHOUSE_ID_2');
