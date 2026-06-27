-- ============================================================
-- RESTORE WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script restores the deleted warehouses for Nour Shop
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, let's find the restaurant ID for Nour Shop
-- Replace 'Nour Shop' with the actual restaurant name if different

-- Step 1: Find the restaurant ID
-- SELECT id, name FROM restaurants WHERE name ILIKE '%nour%';

-- Step 2: List deleted warehouses for this restaurant
-- SELECT public.list_deleted_warehouses('restaurant_id_here');

-- Step 3: Restore all warehouses for the restaurant
-- Uncomment and replace with actual restaurant_id:
-- SELECT public.restore_restaurant_warehouses('restaurant_id_here');

-- Step 4: Verify restoration
-- SELECT id, code, name, name_ar, type, deleted_at 
-- FROM warehouses 
-- WHERE restaurant_id = 'restaurant_id_here' 
-- ORDER BY created_at DESC;

-- ============================================================
-- ALTERNATIVE: Restore specific warehouse by ID
-- ============================================================
-- If you know the warehouse IDs, restore them individually:
-- SELECT public.restore_warehouse('warehouse_id_1');
-- SELECT public.restore_warehouse('warehouse_id_2');

-- ============================================================
-- EXAMPLE USAGE
-- ============================================================
-- If the restaurant ID is '123e4567-e89b-12d3-a456-426614174000':
-- SELECT public.restore_restaurant_warehouses('123e4567-e89b-12d3-a456-426614174000');
