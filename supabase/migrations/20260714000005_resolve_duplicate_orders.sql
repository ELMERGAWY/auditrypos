-- ============================================================
-- RESOLVE DUPLICATE ORDERS BEFORE ADDING UNIQUE CONSTRAINT
-- ============================================================
-- This migration resolves duplicate orders by keeping the one with payment
-- and deleting the one without payment
-- ============================================================

BEGIN;

-- ============================================================
-- 1. IDENTIFY AND RESOLVE DUPLICATES
-- ============================================================

-- Create a temporary table to track which orders to keep
CREATE TEMP TABLE orders_to_keep AS
WITH ranked_orders AS (
  SELECT
    id,
    order_number,
    paid_amount,
    created_at,
    receipt_voucher_ids,
    ROW_NUMBER() OVER (
      PARTITION BY order_number
      ORDER BY
        CASE
          WHEN paid_amount > 0 THEN 0
          WHEN receipt_voucher_ids IS NOT NULL AND cardinality(receipt_voucher_ids) > 0 THEN 1
          ELSE 2
        END,
        created_at ASC
    ) as rn
  FROM public.orders
)
SELECT id, order_number
FROM ranked_orders
WHERE rn = 1;

-- Delete orders that are NOT in the keep list (duplicates)
DELETE FROM public.order_items
WHERE order_id IN (
  SELECT o.id 
  FROM public.orders o
  WHERE o.order_number IN (SELECT order_number FROM orders_to_keep)
  AND o.id NOT IN (SELECT id FROM orders_to_keep)
);

DELETE FROM public.order_taxes
WHERE order_id IN (
  SELECT o.id 
  FROM public.orders o
  WHERE o.order_number IN (SELECT order_number FROM orders_to_keep)
  AND o.id NOT IN (SELECT id FROM orders_to_keep)
);

DELETE FROM public.orders
WHERE order_number IN (SELECT order_number FROM orders_to_keep)
AND id NOT IN (SELECT id FROM orders_to_keep);

-- Drop temp table
DROP TABLE orders_to_keep;

COMMIT;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DUPLICATE ORDERS RESOLVED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Kept orders with payments (correct orders)';
  RAISE NOTICE '2. Deleted orders without payments (duplicates)';
  RAISE NOTICE '3. You can now safely add unique constraint';
  RAISE NOTICE '============================================================';
END $$;
