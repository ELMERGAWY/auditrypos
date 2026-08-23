-- ============================================================
-- DEBUG CUSTOMER BALANCES - CHECK ACTUAL TRANSACTIONS
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

-- This will show us what's actually in customer_transactions vs customer balances

-- 1. Check a specific customer's transactions and balance
SELECT 
  c.id,
  c.name,
  c.balance as current_balance,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.customer_transactions
    WHERE customer_id = c.id
  ) as total_transactions_amount,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions
    WHERE customer_id = c.id
  ) as transaction_count
FROM public.customers c
ORDER BY c.balance DESC
LIMIT 10;

-- 2. Show all transaction types for a sample customer
SELECT 
  type,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total_amount
FROM public.customer_transactions
GROUP BY type
ORDER BY type;

-- 3. Check optional sales sources without making the migration depend on them.
DO $diagnostics$
DECLARE
  v_table TEXT;
  v_reference_type TEXT;
  v_total BIGINT;
  v_with_transactions BIGINT;
BEGIN
  FOR v_table, v_reference_type IN
    SELECT * FROM (VALUES
      ('sales_orders', 'sales_order'),
      ('sales_invoices', 'sales_invoice'),
      ('sales_returns', 'sales_return'),
      ('receipt_vouchers', 'receipt_voucher')
    ) AS sources(table_name, reference_type)
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_total;
      SELECT COUNT(*) INTO v_with_transactions
      FROM public.customer_transactions
      WHERE reference_type = v_reference_type;
      RAISE NOTICE '%: total=%, with_transactions=%', v_table, v_total, v_with_transactions;
    ELSE
      RAISE NOTICE '% is not installed; skipped diagnostic check', v_table;
    END IF;
  END LOOP;
END;
$diagnostics$;

-- 4. Show customers with balance but no transactions
SELECT 
  c.id,
  c.name,
  c.balance,
  0 as transaction_count
FROM public.customers c
WHERE c.balance != 0
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_transactions ct WHERE ct.customer_id = c.id
  );
