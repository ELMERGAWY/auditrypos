-- ============================================================
-- ADD WAREHOUSE_ID COLUMN TO PRODUCTS
-- ============================================================
-- This adds a direct warehouse_id column to products for simpler assignment
-- ============================================================

BEGIN;

-- Add warehouse_id column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN warehouse_id UUID;
    RAISE NOTICE 'Added warehouse_id column to products';
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT products_warehouse_id_fkey 
    FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added foreign key constraint for warehouse_id';
  END IF;
END $$;

COMMIT;

-- Link all existing products to the main warehouse
DO $$
DECLARE
  v_warehouse_id UUID;
  v_restaurant_id UUID := 'f050ea01-4938-475d-ad3a-711bfc58e451'; -- Nour Shop restaurant ID
BEGIN
  -- Get the main warehouse for this restaurant
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE restaurant_id = v_restaurant_id 
    AND type = 'MAIN' 
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_warehouse_id IS NOT NULL THEN
    -- Update all products that don't have a warehouse_id
    UPDATE public.products 
    SET warehouse_id = v_warehouse_id
    WHERE restaurant_id = v_restaurant_id 
      AND warehouse_id IS NULL;
    
    RAISE NOTICE 'Linked % products to main warehouse', 
      (SELECT COUNT(*) FROM public.products WHERE restaurant_id = v_restaurant_id AND warehouse_id = v_warehouse_id);
  END IF;
END $$;

-- Verify the assignments
SELECT 
  COUNT(*) as products_with_warehouse,
  (SELECT COUNT(*) FROM public.products WHERE restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451') as total_products
FROM public.products 
WHERE restaurant_id = 'f050ea01-4938-475d-ad3a-711bfc58e451' 
  AND warehouse_id IS NOT NULL;
