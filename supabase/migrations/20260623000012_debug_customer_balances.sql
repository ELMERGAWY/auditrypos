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

-- 3. Check if there are any sales orders or invoices that don't have corresponding transactions
SELECT 
  'sales_orders' as source,
  COUNT(*) as total,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions ct
    WHERE ct.reference_type = 'sales_order'
  ) as with_transactions
FROM public.sales_orders
UNION ALL
SELECT 
  'sales_invoices' as source,
  COUNT(*) as total,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions ct
    WHERE ct.reference_type = 'sales_invoice'
  ) as with_transactions
FROM public.sales_invoices
UNION ALL
SELECT 
  'sales_returns' as source,
  COUNT(*) as total,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions ct
    WHERE ct.reference_type = 'sales_return'
  ) as with_transactions
FROM public.sales_returns
UNION ALL
SELECT 
  'receipt_vouchers' as source,
  COUNT(*) as total,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions ct
    WHERE ct.reference_type = 'receipt_voucher'
  ) as with_transactions
FROM public.receipt_vouchers;

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
