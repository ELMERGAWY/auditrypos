-- ============================================================
-- CREATE MISSING CUSTOMER TRANSACTIONS
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

BEGIN;

-- 1. Create missing sales-return transactions only when that optional source exists.
DO $sales_return_backfill$
BEGIN
  IF to_regclass('public.sales_returns') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.customer_transactions (
        restaurant_id, customer_id, type, amount, description,
        reference_type, reference_id, created_at
      )
      SELECT sr.restaurant_id, sr.customer_id, 'sales_return', sr.total_amount,
             'مردود مبيعات - ' || sr.return_number, 'sales_return', sr.id, sr.return_date
      FROM public.sales_returns sr
      WHERE sr.customer_id IS NOT NULL
        AND sr.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM public.customer_transactions ct
          WHERE ct.reference_type = 'sales_return' AND ct.reference_id = sr.id
        )
    $sql$;
  ELSE
    RAISE NOTICE 'sales_returns is not installed; skipped sales-return backfill';
  END IF;
END;
$sales_return_backfill$;

-- 2. Create missing receipt transactions only when that optional source exists.
DO $receipt_backfill$
BEGIN
  IF to_regclass('public.receipt_vouchers') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.customer_transactions (
        restaurant_id, customer_id, type, amount, description,
        reference_type, reference_id, created_at
      )
      SELECT rv.restaurant_id, rv.customer_id, 'receipt_voucher', rv.amount,
             'سند قبض - ' || rv.voucher_number, 'receipt_voucher', rv.id, rv.voucher_date
      FROM public.receipt_vouchers rv
      WHERE rv.customer_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.customer_transactions ct
          WHERE ct.reference_type = 'receipt_voucher' AND ct.reference_id = rv.id
        )
    $sql$;
  ELSE
    RAISE NOTICE 'receipt_vouchers is not installed; skipped receipt backfill';
  END IF;
END;
$receipt_backfill$;

-- 3. Show how many transactions were created
DO $$
DECLARE
  v_sales_returns_created INT;
  v_receipt_vouchers_created INT;
BEGIN
  -- Count sales returns transactions created (this session)
  SELECT COUNT(*) INTO v_sales_returns_created
  FROM public.customer_transactions
  WHERE reference_type = 'sales_return'
    AND created_at > NOW() - INTERVAL '1 minute';
    
  -- Count receipt vouchers transactions created (this session)
  SELECT COUNT(*) INTO v_receipt_vouchers_created
  FROM public.customer_transactions
  WHERE reference_type = 'receipt_voucher'
    AND created_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Created % sales return transactions', v_sales_returns_created;
  RAISE NOTICE 'Created % receipt voucher transactions', v_receipt_vouchers_created;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Missing customer transactions created';
END
$$;
