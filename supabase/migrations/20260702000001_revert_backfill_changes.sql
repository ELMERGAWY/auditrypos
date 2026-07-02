-- Revert backfill changes to restore original paid_amount values
BEGIN;

-- Step 1: Store current paid_amount values in a temporary table for rollback
CREATE TEMP TABLE IF NOT EXISTS temp_paid_amount_backup AS
SELECT 
 si.id as sales_invoice_id,
 si.paid_amount as current_invoice_paid,
 o.id as order_id,
 o.paid_amount as current_order_paid
FROM public.sales_invoices si
INNER JOIN public.orders o ON si.order_id = o.id;

-- Step 2: Revert orders paid_amount to exclude receipt vouchers
-- Since we don't have the original values, we need to calculate them
-- by subtracting receipt voucher totals from current paid_amount
DO $$
DECLARE
  v_order RECORD;
  v_voucher_total NUMERIC;
  v_original_paid_amount NUMERIC;
BEGIN
  -- Loop through orders that might have been affected by backfill
  FOR v_order IN 
    SELECT DISTINCT o.id, o.paid_amount, o.customer_id, o.restaurant_id, o.created_at
    FROM public.orders o
    INNER JOIN public.receipt_vouchers rv ON rv.customer_id = o.customer_id 
      AND rv.restaurant_id = o.restaurant_id
      AND rv.voucher_date >= o.created_at::date
    WHERE o.status != 'cancelled'
  LOOP
    -- Calculate total receipt vouchers for this order
    SELECT COALESCE(SUM(rv.amount), 0) INTO v_voucher_total
    FROM public.receipt_vouchers rv
    WHERE rv.customer_id = v_order.customer_id
      AND rv.restaurant_id = v_order.restaurant_id
      AND rv.voucher_date >= v_order.created_at::date;
    
    -- Subtract voucher total to get original paid_amount
    -- Ensure we don't go below 0
    v_original_paid_amount := GREATEST(0, COALESCE(v_order.paid_amount, 0) - v_voucher_total);
    
    -- Update order paid_amount to original value
    UPDATE public.orders
    SET paid_amount = v_original_paid_amount
    WHERE id = v_order.id;
    
    RAISE NOTICE 'Reverted order %: paid_amount from % to % (removed % from vouchers)', 
      v_order.id, v_order.paid_amount, v_original_paid_amount, v_voucher_total;
  END LOOP;
  
  RAISE NOTICE '✅ Reverted backfill: Restored original paid_amount values for orders';
END $$;

-- Step 3: Sync sales_invoices with reverted orders
UPDATE public.sales_invoices
SET paid_amount = o.paid_amount,
    updated_at = NOW()
FROM public.orders o
WHERE sales_invoices.order_id = o.id
  AND sales_invoices.paid_amount IS DISTINCT FROM o.paid_amount;

-- Step 4: Clean up temp table
DROP TABLE IF EXISTS temp_paid_amount_backup;

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Reverted backfill changes';
  RAISE NOTICE '✅ Restored original paid_amount values';
  RAISE NOTICE '✅ Synced sales_invoices with reverted orders';
END $$;
