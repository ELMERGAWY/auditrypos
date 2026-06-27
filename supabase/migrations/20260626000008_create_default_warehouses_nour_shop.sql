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

-- Create sub-warehouses for the main warehouse
-- Get the warehouse ID first
DO $$
DECLARE
  v_main_wh_id UUID;
BEGIN
  -- Get the main warehouse ID
  SELECT id INTO v_main_wh_id
  FROM warehouses
  WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9' AND code = 'WH-001';

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

  -- Create sub-warehouse "مخزن 2" for main store
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
    'SW-002',
    'Warehouse 2',
    'مخزن 2',
    true,
    false,
    NOW()
  );

  RAISE NOTICE '✅ Default warehouse and sub-warehouses created for Nour Shop';
END $$;

-- Verify creation
SELECT id, code, name, name_ar, type, is_active, is_default
FROM warehouses
WHERE restaurant_id = '7eb31553-ac26-43d3-bec8-5b2659410dd9'
ORDER BY code;
