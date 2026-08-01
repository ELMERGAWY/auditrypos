-- Fix warehouse_stock duplicates and ensure proper product-warehouse assignment
BEGIN;

-- 1. Check for duplicate product-warehouse assignments
-- This query identifies products that exist in multiple warehouses
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT product_id, COUNT(*)
        FROM public.warehouse_stock
        GROUP BY product_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % products in multiple warehouses', duplicate_count;
END $$;

-- 2. Remove duplicate warehouse_stock records
-- Keep only the first record for each product-warehouse combination
DELETE FROM public.warehouse_stock
WHERE id NOT IN (
    SELECT MIN(id)
    FROM public.warehouse_stock
    GROUP BY warehouse_id, product_id
);

-- 3. Ensure unique constraint exists
-- The table should already have UNIQUE(warehouse_id, product_id) but let's verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warehouse_stock_warehouse_id_product_id_key'
    ) THEN
        ALTER TABLE public.warehouse_stock
        ADD CONSTRAINT warehouse_stock_warehouse_id_product_id_key 
        UNIQUE (warehouse_id, product_id);
        RAISE NOTICE 'Added unique constraint on (warehouse_id, product_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on (warehouse_id, product_id)';
    END IF;
END $$;

-- 4. Clean up products.warehouse_id to avoid confusion
-- This field should not be used for assignment, only warehouse_stock should be used
DO $$
BEGIN
    UPDATE public.products
    SET warehouse_id = NULL
    WHERE warehouse_id IS NOT NULL;
    
    RAISE NOTICE 'Cleared products.warehouse_id to prevent confusion with warehouse_stock';
END $$;

COMMIT;
