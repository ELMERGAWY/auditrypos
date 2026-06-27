-- ============================================================
-- CREATE DEFAULT WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script creates the default warehouses for Nour Shop
-- Restaurant ID: 7eb31553-ac26-43d3-bec8-5b2659410dd9
-- ============================================================

-- Insert main warehouse "المحل"
INSERT INTO public.warehouses (
  id,
  restaurant_id,
  code,
  name,
  name_ar,
  type,
  warehouse_category,
  country,
  currency,
  accounting_standard,
  is_active,
  is_default,
  created_at
) VALUES (
  gen_random_uuid(),
  '7eb31553-ac26-43d3-bec8-5b2659410dd9',
  'WH-001',
  'Main Store',
  'المحل',
  'main',
  'retail',
  'Egypt',
  'EGP',
  'EAS',
  true,
  true,
  NOW()
);

-- Insert second warehouse "مخزن 2"
INSERT INTO public.warehouses (
  id,
  restaurant_id,
  code,
  name,
  name_ar,
  type,
  warehouse_category,
  country,
  currency,
  accounting_standard,
  is_active,
  is_default,
  created_at
) VALUES (
  gen_random_uuid(),
  '7eb31553-ac26-43d3-bec8-5b2659410dd9',
  'WH-002',
  'Warehouse 2',
  'مخزن 2',
  'storage',
  'warehouse',
  'Egypt',
  'EGP',
  'EAS',
  true,
  false,
  NOW()
);

-- Create sub-warehouses for each main warehouse
-- Get the warehouse IDs first
DO $$
DECLARE
  v_main_wh_id UUID;
  v_wh2_id UUID;
BEGIN
  -- Get the main warehouse ID
  SELECT id INTO v_main_wh_id 
  FROM warehouses 
  WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9' AND code = 'WH-001';
  
  -- Get the second warehouse ID
  SELECT id INTO v_wh2_id 
  FROM warehouses 
  WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9' AND code = 'WH-002';
  
  -- Create sub-warehouse for main store
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
  
  -- Create sub-warehouse for warehouse 2
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
    'مخزن 2 تخزين',
    true,
    true,
    NOW()
  );
  
  RAISE NOTICE '✅ Default warehouses and sub-warehouses created for Nour Shop';
END $$;

-- Verify creation
SELECT id, code, name, name_ar, type, is_active, is_default
FROM warehouses
WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9'
ORDER BY code;
