-- ============================================================
-- CREATE SUB-WAREHOUSES FOR NOUR SHOP
-- ============================================================
-- This script creates sub-warehouses for existing warehouses in Nour Shop
-- Restaurant ID: f050ea01-4938-475d-ad3a-711bfc58e451
-- Existing warehouses:
-- - المحل (MAIN) - ID: fb758896-2f83-492b-9460-59f121be4e38
-- - مخزن 2 (SUB) - ID: a3877396-c559-41ba-9b43-88ced8725159
-- ============================================================

-- Create sub-warehouses only when the referenced parent warehouses exist.
DO $$
DECLARE
  v_main_wh_id UUID := 'fb758896-2f83-492b-9460-59f121be4e38';
  v_wh2_id UUID := 'a3877396-c559-41ba-9b43-88ced8725159';
  v_created INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.warehouses WHERE id = v_main_wh_id) THEN
    INSERT INTO public.sub_warehouses (
      id, warehouse_id, code, name, name_ar, is_active, is_default, created_at
    )
    SELECT gen_random_uuid(), v_main_wh_id, 'SW-001', 'Main Store Floor', 'أرضية المحل', true, true, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sub_warehouses
      WHERE warehouse_id = v_main_wh_id AND code = 'SW-001'
    );
    v_created := v_created + 1;
  ELSE
    RAISE NOTICE 'Nour Shop main warehouse is absent; skipped SW-001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.warehouses WHERE id = v_wh2_id) THEN
    INSERT INTO public.sub_warehouses (
      id, warehouse_id, code, name, name_ar, is_active, is_default, created_at
    )
    SELECT gen_random_uuid(), v_wh2_id, 'SW-002', 'Warehouse 2 Storage', 'مخزن 2', true, true, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sub_warehouses
      WHERE warehouse_id = v_wh2_id AND code = 'SW-002'
    );
    v_created := v_created + 1;
  ELSE
    RAISE NOTICE 'Nour Shop secondary warehouse is absent; skipped SW-002';
  END IF;

  RAISE NOTICE 'Nour Shop sub-warehouse migration completed; candidate rows=%', v_created;
END $$;

-- Verify creation
SELECT sw.id, sw.code, sw.name, sw.name_ar, sw.warehouse_id, sw.is_active,
       w.name as warehouse_name
FROM sub_warehouses sw
LEFT JOIN warehouses w ON sw.warehouse_id = w.id
WHERE w.restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451'
ORDER BY sw.name_ar;
