-- ============================================================
-- ADD UNIQUE CONSTRAINT ON ORDER_NUMBER
-- ============================================================
-- This migration adds a unique constraint on order_number
-- to prevent duplicate orders from being created
-- ============================================================
-- NOTE: Run 20260714000005_resolve_duplicate_orders.sql first
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADD UNIQUE CONSTRAINT ON ORDER_NUMBER
-- ============================================================

-- Add unique constraint (assumes duplicates are already resolved)
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
  RAISE NOTICE '3. Duplicates should be resolved by migration 20260714000005';
  RAISE NOTICE '============================================================';
END $$;
