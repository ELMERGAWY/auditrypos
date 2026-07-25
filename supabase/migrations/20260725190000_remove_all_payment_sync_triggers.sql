-- Remove all payment sync triggers and functions to prevent auto-updating paid_amount
-- This ensures paid_amount remains as the direct payment entered by user only

BEGIN;

-- 1. Drop all payment sync triggers on orders table
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_with_allocations ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON public.sales_orders;

-- 2. Drop all payment sync triggers on sales_invoices table
DROP TRIGGER IF EXISTS trigger_sync_invoice_paid_amount ON public.sales_invoices;

-- 3. Drop all payment sync functions
DROP FUNCTION IF EXISTS public.sync_order_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_invoice_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_paid_amount_with_allocations() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_to_sales_order() CASCADE;
DROP FUNCTION IF EXISTS public.sync_sales_order_to_order() CASCADE;

-- 4. Notify Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Removed all payment sync triggers and functions';
  RAISE NOTICE '✅ paid_amount will now remain as direct user input only';
END $$;
