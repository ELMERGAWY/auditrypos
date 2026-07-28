-- ============================================================
-- FIX: Multi-Warehouse Stock Data Alignment
-- ============================================================
-- This migration fixes the mismatch between stock_movements and warehouse_stock
-- by adding warehouse_id to stock_movements and re-aligning historical data
-- ============================================================

BEGIN;

-- 1. Add warehouse_id column to stock_movements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' 
    AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE public.stock_movements ADD COLUMN warehouse_id UUID;
  END IF;
END $$;

-- 2. Add foreign key constraint for warehouse_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_movements_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.stock_movements 
    ADD CONSTRAINT stock_movements_warehouse_id_fkey 
    FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add index on warehouse_id for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id 
ON public.stock_movements(warehouse_id);

-- 4. Update historical stock_movements to align with product's current warehouse_id
-- This re-assigns old movements to the product's currently assigned warehouse
UPDATE public.stock_movements sm
SET warehouse_id = p.warehouse_id
FROM public.products p
WHERE sm.product_id = p.id 
  AND sm.warehouse_id IS NULL
  AND p.warehouse_id IS NOT NULL;

-- 5. For stock_movements that still don't have a warehouse_id (products without assignment),
-- assign them to the first available warehouse for that restaurant
UPDATE public.stock_movements sm
SET warehouse_id = (
  SELECT w.id 
  FROM public.warehouses w
  WHERE w.restaurant_id = sm.restaurant_id
    AND w.is_active = true
  ORDER BY w.type = 'main' DESC, w.created_at ASC
  LIMIT 1
)
WHERE sm.warehouse_id IS NULL
  AND sm.restaurant_id IS NOT NULL;

-- 6. Update warehouse_stock to match stock_movements totals
-- This recalculates warehouse_stock based on aligned stock_movements
WITH stock_totals AS (
  SELECT 
    warehouse_id,
    product_id,
    restaurant_id,
    SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END) as net_quantity
  FROM public.stock_movements
  WHERE warehouse_id IS NOT NULL
  GROUP BY warehouse_id, product_id, restaurant_id
)
UPDATE public.warehouse_stock ws
SET quantity = COALESCE(st.net_quantity, 0)
FROM stock_totals st
WHERE ws.warehouse_id = st.warehouse_id
  AND ws.product_id = st.product_id
  AND ws.restaurant_id = st.restaurant_id;

-- 7. Create warehouse_stock records for products that don't have them yet
INSERT INTO public.warehouse_stock (restaurant_id, warehouse_id, product_id, quantity)
SELECT 
  p.restaurant_id,
  p.warehouse_id,
  p.id,
  COALESCE(
    (SELECT SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END)
     FROM public.stock_movements sm
     WHERE sm.product_id = p.id 
       AND sm.warehouse_id = p.warehouse_id
     GROUP BY sm.product_id, sm.warehouse_id),
    0
  )
FROM public.products p
WHERE p.warehouse_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.warehouse_stock ws
    WHERE ws.warehouse_id = p.warehouse_id
      AND ws.product_id = p.id
  );

-- 8. Update RLS policies for stock_movements to include warehouse_id
DROP POLICY IF EXISTS "Owner manages stock_movements" ON public.stock_movements;

CREATE POLICY "Owner manages stock_movements" ON public.stock_movements
FOR ALL TO authenticated
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = warehouse_id
      AND w.restaurant_id IN (
        SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      )
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = warehouse_id
      AND w.restaurant_id IN (
        SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      )
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 9. Update stock movement logging function to include warehouse_id
CREATE OR REPLACE FUNCTION public.log_stock_movement(
  p_product_id UUID,
  p_restaurant_id UUID,
  p_quantity NUMERIC,
  p_movement_type TEXT,
  p_reason TEXT DEFAULT '',
  p_reference_id TEXT DEFAULT '',
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
  v_product_warehouse_id UUID;
BEGIN
  -- If warehouse_id is not provided, use the product's assigned warehouse_id
  IF p_warehouse_id IS NULL THEN
    SELECT warehouse_id INTO v_product_warehouse_id
    FROM public.products
    WHERE id = p_product_id;
    
    p_warehouse_id := v_product_warehouse_id;
  END IF;

  -- Log movement with warehouse_id
  INSERT INTO public.stock_movements (
    product_id, 
    restaurant_id, 
    quantity, 
    type, 
    reason, 
    reference_id,
    warehouse_id
  )
  VALUES (
    p_product_id, 
    p_restaurant_id, 
    ABS(p_quantity), 
    p_movement_type, 
    p_reason, 
    p_reference_id,
    p_warehouse_id
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Add trigger to automatically set warehouse_id from product on insert/update
CREATE OR REPLACE FUNCTION public.set_stock_movement_warehouse_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If warehouse_id is not set, get it from the product
  IF NEW.warehouse_id IS NULL THEN
    SELECT warehouse_id INTO NEW.warehouse_id
    FROM public.products
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_stock_movement_warehouse_id ON public.stock_movements;
CREATE TRIGGER trg_set_stock_movement_warehouse_id
BEFORE INSERT OR UPDATE OF product_id, warehouse_id ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.set_stock_movement_warehouse_id();

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the fix:

-- Check stock_movements with warehouse_id
-- SELECT COUNT(*) as total, COUNT(warehouse_id) as with_warehouse_id 
-- FROM public.stock_movements;

-- Check warehouse_stock alignment
-- SELECT ws.warehouse_id, ws.product_id, ws.quantity,
--        (SELECT SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END)
--         FROM public.stock_movements sm
--         WHERE sm.product_id = ws.product_id AND sm.warehouse_id = ws.warehouse_id) as calculated_quantity
-- FROM public.warehouse_stock ws
-- WHERE ws.quantity != (SELECT SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END)
--                       FROM public.stock_movements sm
--                       WHERE sm.product_id = ws.product_id AND sm.warehouse_id = ws.warehouse_id);

-- Check products without warehouse assignment
-- SELECT id, name, warehouse_id FROM public.products WHERE warehouse_id IS NULL;
