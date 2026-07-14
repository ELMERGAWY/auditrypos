-- ============================================================
-- HARDEN ORDER IDEMPOTENCY (prevent duplicate orders on retry)
-- ============================================================
-- Root cause: retries generate NEW order_number via Date.now(),
-- so UNIQUE(order_number) alone does not stop duplicates.
-- Fix: enforce unique client_order_id + clean near-duplicates.
-- ============================================================

BEGIN;

-- 1) Ensure unique partial index on client_order_id (idempotency key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id
  ON public.orders (client_order_id)
  WHERE client_order_id IS NOT NULL;

-- 2) Drop bidirectional paid_amount sync (can zero out paid_amount)
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;
DROP FUNCTION IF EXISTS public.sync_order_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_invoice_paid_amount() CASCADE;

-- 3) Drop remaining autopost / journal-on-order triggers if still present
DROP TRIGGER IF EXISTS trg_autopost_orders_sale ON public.orders;
DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders;
DROP TRIGGER IF EXISTS trg_create_order_journal ON public.orders;

-- 4) Clean near-duplicates: same restaurant + same total + same second + same last-4 display
--    Keep the row with payment / voucher; delete the unpaid shell.
WITH ranked AS (
  SELECT
    id,
    restaurant_id,
    total,
    paid_amount,
    receipt_voucher_ids,
    date_trunc('second', created_at) AS created_sec,
    right(order_number, 4) AS display_num,
    ROW_NUMBER() OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
      ORDER BY
        CASE
          WHEN COALESCE(paid_amount, 0) > 0 THEN 0
          WHEN receipt_voucher_ids IS NOT NULL AND cardinality(receipt_voucher_ids) > 0 THEN 1
          ELSE 2
        END,
        created_at ASC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
    ) AS grp_cnt
  FROM public.orders
)
DELETE FROM public.order_items
WHERE order_id IN (SELECT id FROM ranked WHERE grp_cnt > 1 AND rn > 1);

WITH ranked AS (
  SELECT
    id,
    restaurant_id,
    total,
    paid_amount,
    receipt_voucher_ids,
    date_trunc('second', created_at) AS created_sec,
    right(order_number, 4) AS display_num,
    ROW_NUMBER() OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
      ORDER BY
        CASE
          WHEN COALESCE(paid_amount, 0) > 0 THEN 0
          WHEN receipt_voucher_ids IS NOT NULL AND cardinality(receipt_voucher_ids) > 0 THEN 1
          ELSE 2
        END,
        created_at ASC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
    ) AS grp_cnt
  FROM public.orders
)
DELETE FROM public.order_taxes
WHERE order_id IN (SELECT id FROM ranked WHERE grp_cnt > 1 AND rn > 1);

WITH ranked AS (
  SELECT
    id,
    restaurant_id,
    total,
    paid_amount,
    receipt_voucher_ids,
    date_trunc('second', created_at) AS created_sec,
    right(order_number, 4) AS display_num,
    ROW_NUMBER() OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
      ORDER BY
        CASE
          WHEN COALESCE(paid_amount, 0) > 0 THEN 0
          WHEN receipt_voucher_ids IS NOT NULL AND cardinality(receipt_voucher_ids) > 0 THEN 1
          ELSE 2
        END,
        created_at ASC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY restaurant_id, total, date_trunc('second', created_at), right(order_number, 4)
    ) AS grp_cnt
  FROM public.orders
)
DELETE FROM public.orders
WHERE id IN (SELECT id FROM ranked WHERE grp_cnt > 1 AND rn > 1);

-- 5) Ensure order_number unique (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_order_number_key'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Could not add orders_order_number_key — resolve remaining duplicates first';
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'ORDER IDEMPOTENCY HARDENED';
  RAISE NOTICE '1. Unique client_order_id enforced';
  RAISE NOTICE '2. Paid-amount sync triggers removed';
  RAISE NOTICE '3. Near-duplicate unpaid shells cleaned';
  RAISE NOTICE '============================================================';
END $$;
