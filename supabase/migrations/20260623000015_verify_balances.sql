-- ============================================================
-- VERIFY ACTUAL BALANCES IN DATABASE
-- COPY TO SUPABASE SQL EDITOR
-- ============================================================

-- This will show us what's actually in the database now

-- 1. Show all customers with their balances
SELECT 
  id,
  name,
  balance,
  updated_at
FROM public.customers
ORDER BY balance DESC
LIMIT 20;

-- 2. Show customer transactions for each customer
SELECT 
  c.id,
  c.name,
  c.balance as customer_balance,
  (
    SELECT COALESCE(SUM(
      CASE 
        WHEN ct.type IN ('sale', 'sales_order', 'invoice') THEN ct.amount
        WHEN ct.type IN ('payment', 'receipt_voucher', 'sales_return') THEN -ct.amount
        ELSE 0
      END
    ), 0)
    FROM public.customer_transactions ct
    WHERE ct.customer_id = c.id
  ) as calculated_balance,
  (
    SELECT COUNT(*)
    FROM public.customer_transactions ct
    WHERE ct.customer_id = c.id
  ) as transaction_count
FROM public.customers c
ORDER BY c.balance DESC
LIMIT 20;
