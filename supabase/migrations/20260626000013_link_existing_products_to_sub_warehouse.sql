-- ============================================================
-- LINK EXISTING PRODUCTS TO SUB-WAREHOUSE
-- ============================================================
-- This migration links all existing products to the default sub-warehouse
-- ============================================================

-- First, ensure we have a sub-warehouse for the main warehouse
-- This will create a default sub-warehouse if it doesn't exist
DO $$
DECLARE
  v_warehouse_id UUID;
  v_sub_warehouse_id UUID;
  v_restaurant_id UUID := 'f050ea01-4938-475d-ad3a-711bfc58e451'; -- Nour Shop restaurant ID
BEGIN
  -- Get the main warehouse for this restaurant
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE restaurant_id = v_restaurant_id 
    AND type = 'MAIN' 
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    RAISE NOTICE 'No main warehouse found for restaurant';
    RETURN;
  END IF;

  -- Check if a sub-warehouse already exists
  SELECT id INTO v_sub_warehouse_id
  FROM public.sub_warehouses
  WHERE warehouse_id = v_warehouse_id
  LIMIT 1;

  -- If no sub-warehouse exists, create one
  IF v_sub_warehouse_id IS NULL THEN
    INSERT INTO public.sub_warehouses (
      warehouse_id,
      name,
      name_ar,
      code,
      location,
      is_active
    ) VALUES (
      v_warehouse_id,
      'Default Sub-Warehouse',
      'المخزن الفرعي الافتراضي',
      'DEFAULT-SUB',
      'الموقع الافتراضي',
      true
    ) RETURNING id INTO v_sub_warehouse_id;

    RAISE NOTICE 'Created default sub-warehouse: %', v_sub_warehouse_id;
  END IF;

  -- Now link all existing products to this sub-warehouse
  INSERT INTO public.item_warehouse_assignments (
    item_id,
    sub_warehouse_id,
    costing_method,
    accounting_standard,
    inventory_valuation_rule,
    is_primary,
    min_stock_level,
    low_stock_alert,
    overstock_alert
  )
  SELECT 
    p.id as item_id,
    v_sub_warehouse_id,
    'AVERAGE',
    'IFRS',
    'IAS2_AVERAGE',
    true,
    0,
    true,
    false
  FROM public.products p
  WHERE p.restaurant_id = v_restaurant_id
    AND NOT EXISTS (
      SELECT 1 FROM public.item_warehouse_assignments iwa
      WHERE iwa.item_id = p.id
    );

  RAISE NOTICE 'Linked existing products to sub-warehouse';
END $$;

-- Verify the assignments
SELECT 
  COUNT(*) as total_assignments,
  (SELECT COUNT(*) FROM public.products WHERE restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451') as total_products
FROM public.item_warehouse_assignments iwa
JOIN public.sub_warehouses sw ON iwa.sub_warehouse_id = sw.id
JOIN public.warehouses w ON sw.warehouse_id = w.id
WHERE w.restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451';
