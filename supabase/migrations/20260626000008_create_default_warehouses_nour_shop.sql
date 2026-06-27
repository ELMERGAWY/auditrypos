-- ============================================================
-- CREATE SUB-WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script creates sub-warehouses for existing warehouses in Nour Shop
-- Restaurant ID: f050ea01-4938-475d-ad3a-711bfc58e451
-- Existing warehouses:
-- - المحل (MAIN) - ID: fb758896-2f83-492b-9460-59f121be4e38
-- - مخزن 2 (SUB) - ID: a3877396-c559-41ba-9b43-88ced8725159
-- ============================================================

-- Create sub-warehouses for existing warehouses
DO $$
DECLARE
  v_main_wh_id UUID := 'fb758896-2f83-492b-9460-59f121be4e38';
  v_wh2_id UUID := 'a3877396-c559-41ba-9b43-88ced8725159';
BEGIN
  -- Create sub-warehouse "أرضية المحل" for main store
  INSERT INTO public.sub_warehouses (
    id,
    warehouse_id,
    code,
    name,
    name_ar,
    is_active,
    is_default,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_main_wh_id,
    'SW-001',
    'Main Store Floor',
    'أرضية المحل',
    true,
    true,
    NOW()
  );

  -- Create sub-warehouse "مخزن 2" for second warehouse
  INSERT INTO public.sub_warehouses (
    id,
    warehouse_id,
    code,
    name,
    name_ar,
    is_active,
    is_default,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_wh2_id,
    'SW-002',
    'Warehouse 2 Storage',
    'مخزن 2',
    true,
    true,
    NOW()
  );

  RAISE NOTICE '✅ Sub-warehouses created for Nour Shop';
END $$;

-- Verify creation
SELECT sw.id, sw.code, sw.name, sw.name_ar, sw.warehouse_id, sw.is_active,
       w.name as warehouse_name
FROM sub_warehouses sw
LEFT JOIN warehouses w ON sw.warehouse_id = w.id
WHERE w.restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451'
ORDER BY sw.name_ar;
