-- ============================================================
-- FIX BALANCE CALCULATION - AMOUNTS ALREADY HAVE CORRECT SIGNS
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

BEGIN;

-- The transactions already have the correct signs:
-- - sale/invoice: positive (customer owes us)
-- - payment/receipt: negative (customer paid us)
-- - sales_return: negative (we owe customer)

-- So we just need to SUM them as-is, no conversion needed
UPDATE public.customers c
SET balance = (
  SELECT COALESCE(SUM(ct.amount), 0)
  FROM public.customer_transactions ct
  WHERE ct.customer_id = c.id
),
updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Recalculated all customer balances using correct logic (sum as-is)';
END $$;

-- Show the results
DO $$
DECLARE
  v_customer RECORD;
BEGIN
  RAISE NOTICE '=== CUSTOMER BALANCES AFTER CORRECT RECALCULATION ===';
  FOR v_customer IN
    SELECT id, name, balance
    FROM public.customers
    WHERE balance != 0
    ORDER BY balance DESC
    LIMIT 10
  LOOP
    RAISE NOTICE 'Customer: %, Balance: %', v_customer.name, v_customer.balance;
  END LOOP;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ All customer balances recalculated with correct logic';
END
$$;
