-- ============================================================
-- FORCE RESET ALL CUSTOMER BALANCES TO ZERO THEN RECALCULATE
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

BEGIN;

-- 1. First, reset all customer balances to 0
UPDATE public.customers
SET balance = 0,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Reset all customer balances to 0';
END $$;

-- 2. Now calculate balance from transactions correctly
-- Sales/Invoices: INCREASE balance (customer owes us)
-- Payments/Receipts/Returns: DECREASE balance (customer pays us or we owe them)
UPDATE public.customers c
SET balance = (
  SELECT COALESCE(SUM(
    CASE
      WHEN ct.type IN ('sale', 'sales_order', 'invoice') THEN ct.amount
      WHEN ct.type IN ('payment', 'receipt_voucher', 'sales_return') THEN -ct.amount
      ELSE 0
    END
  ), 0)
  FROM public.customer_transactions ct
  WHERE ct.customer_id = c.id
),
updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'Recalculated all customer balances from transactions';
END $$;

-- 3. Show the results
DO $$
DECLARE
  v_customer RECORD;
BEGIN
  RAISE NOTICE '=== CUSTOMER BALANCES AFTER RECALCULATION ===';
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
  RAISE NOTICE '✅ All customer balances force-reset and recalculated';
END
$$;
