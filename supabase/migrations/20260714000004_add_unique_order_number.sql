-- ============================================================
-- ADD UNIQUE CONSTRAINT ON ORDER_NUMBER
-- ============================================================
-- This migration adds a unique constraint on order_number
-- to prevent duplicate orders from being created
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADD UNIQUE CONSTRAINT ON ORDER_NUMBER
-- ============================================================

-- First, remove any existing duplicates
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    -- Find and log duplicates
    FOR duplicate_record IN 
        SELECT order_number, COUNT(*) as count
        FROM public.orders
        GROUP BY order_number
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found duplicate order_number: % (count: %)', 
            duplicate_record.order_number, duplicate_record.count;
    END LOOP;
END $$;

-- Add unique constraint (will fail if duplicates exist)
-- If it fails, you need to manually resolve duplicates first
ALTER TABLE public.orders
ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'UNIQUE CONSTRAINT ADDED ON ORDER_NUMBER';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Added unique constraint on orders.order_number';
  RAISE NOTICE '2. This will prevent duplicate orders from being created';
  RAISE NOTICE '3. If the migration failed, resolve duplicates manually first';
  RAISE NOTICE '============================================================';
END $$;
