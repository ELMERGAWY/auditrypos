-- ================================================================
-- FIX: Warehouse RLS + Assign Products to Default Warehouse
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Allow authenticated users to read warehouses (fix RLS blocking)
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouses_read_all" ON public.warehouses;
CREATE POLICY "warehouses_read_all" ON public.warehouses
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "warehouses_write_own" ON public.warehouses;
CREATE POLICY "warehouses_write_own" ON public.warehouses
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Also allow reading warehouse_stock
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouse_stock_read_all" ON public.warehouse_stock;
CREATE POLICY "warehouse_stock_read_all" ON public.warehouse_stock
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "warehouse_stock_write_all" ON public.warehouse_stock;
CREATE POLICY "warehouse_stock_write_all" ON public.warehouse_stock
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Assign all products that don't have a warehouse_id to the main warehouse
-- (only for the restaurant that uses this system)
DO $$
DECLARE
  r RECORD;
  v_warehouse_id UUID;
BEGIN
  FOR r IN SELECT DISTINCT restaurant_id FROM public.products WHERE warehouse_id IS NULL LOOP
    -- Get main warehouse for this restaurant
    SELECT id INTO v_warehouse_id
    FROM public.warehouses
    WHERE restaurant_id = r.restaurant_id
      AND (deleted_at IS NULL OR deleted_at > NOW())
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;

    IF v_warehouse_id IS NOT NULL THEN
      UPDATE public.products
      SET warehouse_id = v_warehouse_id
      WHERE restaurant_id = r.restaurant_id
        AND warehouse_id IS NULL;
        
      RAISE NOTICE 'Assigned products for restaurant % to warehouse %', r.restaurant_id, v_warehouse_id;
    END IF;
  END LOOP;
END $$;

-- 4. Make sure warehouse_stock has entries for each product+warehouse combo
-- (using the existing warehouse_stock INSERT logic from the RPC)
INSERT INTO public.warehouse_stock (restaurant_id, warehouse_id, product_id, quantity)
SELECT 
  p.restaurant_id,
  p.warehouse_id,
  p.id,
  COALESCE(p.quantity, 0)
FROM public.products p
WHERE p.warehouse_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.warehouse_stock ws
    WHERE ws.warehouse_id = p.warehouse_id
      AND ws.product_id = p.id
  )
ON CONFLICT DO NOTHING;

SELECT 'Warehouse RLS and product assignments fixed successfully' AS status;
