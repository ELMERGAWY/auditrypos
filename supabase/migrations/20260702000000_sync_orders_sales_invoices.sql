-- Sync orders with sales_invoices and show receipt voucher payments
BEGIN;

-- Step 1: Add order_id column to sales_invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_invoices' 
    AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.sales_invoices 
    ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_order_id ON public.sales_invoices(order_id);
  END IF;
END $$;

-- Step 2: Create function to sync paid_amount from orders to sales_invoices
CREATE OR REPLACE FUNCTION public.sync_order_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sales_invoices when order paid_amount changes
  UPDATE public.sales_invoices
  SET paid_amount = NEW.paid_amount,
      updated_at = NOW()
  WHERE order_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for orders paid_amount updates
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
CREATE TRIGGER trigger_sync_order_paid_amount
AFTER UPDATE OF paid_amount ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_paid_amount();

-- Step 4: Create function to sync from sales_invoices to orders
CREATE OR REPLACE FUNCTION public.sync_invoice_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update orders when sales_invoice paid_amount changes
  UPDATE public.orders
  SET paid_amount = NEW.paid_amount
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for sales_invoices paid_amount updates
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;
CREATE TRIGGER trigger_sync_invoice_paid_amount
AFTER UPDATE OF paid_amount ON public.sales_invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_paid_amount();

-- Step 6: Link existing sales_invoices to orders via source_reference_id
UPDATE public.sales_invoices
SET order_id = source_reference_id
WHERE source_type = 'pos' 
  AND source_reference_id IS NOT NULL
  AND order_id IS NULL;

-- Step 7: BACKFILL HISTORICAL DATA - Sync receipt vouchers with orders
-- Update orders paid_amount to include receipt voucher payments
DO $$
DECLARE
  v_order RECORD;
  v_voucher_total NUMERIC;
  v_new_paid_amount NUMERIC;
BEGIN
  -- Loop through all orders that have receipt vouchers
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
    
    -- Update order paid_amount to include receipt vouchers
    v_new_paid_amount := COALESCE(v_order.paid_amount, 0) + v_voucher_total;
    
    UPDATE public.orders
    SET paid_amount = v_new_paid_amount
    WHERE id = v_order.id;
    
    RAISE NOTICE 'Updated order %: paid_amount from % to % (including % from vouchers)', 
      v_order.id, v_order.paid_amount, v_new_paid_amount, v_voucher_total;
  END LOOP;
  
  RAISE NOTICE '✅ Backfilled historical data: Updated orders with receipt voucher payments';
END $$;

-- Step 8: Sync sales_invoices paid_amount with orders
UPDATE public.sales_invoices
SET paid_amount = o.paid_amount,
    updated_at = NOW()
FROM public.orders o
WHERE sales_invoices.order_id = o.id
  AND sales_invoices.paid_amount IS DISTINCT FROM o.paid_amount;

-- Step 9: Create function to calculate total paid from receipt vouchers
CREATE OR REPLACE FUNCTION public.get_order_total_paid(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_paid NUMERIC := 0;
BEGIN
  -- Get paid_amount from order (already includes receipt vouchers after backfill)
  SELECT COALESCE(paid_amount, 0) INTO v_total_paid
  FROM public.orders
  WHERE id = p_order_id;
  
  RETURN v_total_paid;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create view to show order with all receipt voucher payments
CREATE OR REPLACE VIEW public.v_order_payments AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.total as order_total,
  o.paid_amount as direct_paid,
  COALESCE(SUM(rv.amount), 0) as receipt_voucher_total,
  COALESCE(o.paid_amount, 0) + COALESCE(SUM(rv.amount), 0) as total_paid,
  o.total - (COALESCE(o.paid_amount, 0) + COALESCE(SUM(rv.amount), 0)) as remaining_balance
FROM public.orders o
LEFT JOIN public.receipt_vouchers rv ON rv.customer_id = o.customer_id
  AND rv.restaurant_id = o.restaurant_id
  AND rv.voucher_date >= o.created_at
GROUP BY o.id, o.order_number, o.total, o.paid_amount;

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Created sync between orders and sales_invoices';
  RAISE NOTICE '✅ Added order_id column to sales_invoices';
  RAISE NOTICE '✅ Created triggers for paid_amount sync';
  RAISE NOTICE '✅ Backfilled historical data with receipt voucher payments';
  RAISE NOTICE '✅ Synced sales_invoices with orders';
  RAISE NOTICE '✅ Created view v_order_payments for payment history';
END $$;
