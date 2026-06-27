-- ============================================================
-- RESTORE WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script restores the deleted warehouses for Nour Shop
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Restore all warehouses for Nour Shop
-- ============================================================
-- Restaurant ID for Nour Shop: 7eb31553-ac26-43d3-bec8-5b2659410dd9
-- Run this query to restore all deleted warehouses:
SELECT public.restore_restaurant_warehouses('7eb31553-ac26-43d3-bec8-5b2659410dd9');

-- ============================================================
-- STEP 2: Verify restoration
-- ============================================================
-- Run this query to verify the warehouses were restored:
SELECT id, code, name, name_ar, type, deleted_at
FROM warehouses
WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9'
ORDER BY created_at DESC;

-- ============================================================
-- ALTERNATIVE: List deleted warehouses first
-- ============================================================
-- Run this to see which warehouses are deleted:
SELECT public.list_deleted_warehouses('7eb31553-ac26-43d3-bec8-5b2659410dd9');

-- ============================================================
-- ALTERNATIVE: Restore specific warehouse by ID
-- ============================================================
-- If you know the warehouse IDs, restore them individually:
-- SELECT public.restore_warehouse('WAREHOUSE_ID_1');
-- SELECT public.restore_warehouse('WAREHOUSE_ID_2');
