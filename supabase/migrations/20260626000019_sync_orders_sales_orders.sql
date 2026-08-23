-- ============================================================
-- SYNC ORDERS AND SALES_ORDERS
-- ============================================================
-- This creates triggers to sync changes between orders and sales_orders
-- When an order is updated, the corresponding sales_order is updated
-- When a sales_order is updated, the corresponding order is updated
-- ============================================================

BEGIN;

-- First, check if there's a relationship column between the tables
-- If not, we'll need to create one based on some criteria

-- Add relationship columns only when both sides of the optional link exist.
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND to_regclass('public.sales_orders') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'sales_order_id'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN sales_order_id UUID REFERENCES public.sales_orders(id);
      RAISE NOTICE 'Added sales_order_id column to orders';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'order_id'
    ) THEN
      ALTER TABLE public.sales_orders ADD COLUMN order_id UUID REFERENCES public.orders(id);
      RAISE NOTICE 'Added order_id column to sales_orders';
    END IF;
  ELSE
    RAISE NOTICE 'orders or sales_orders is not installed; skipped optional relationship columns';
  END IF;
END $$;

-- Function to sync order to sales_order
CREATE OR REPLACE FUNCTION sync_order_to_sales_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If this order has a linked sales_order, update it
  IF NEW.sales_order_id IS NOT NULL THEN
    UPDATE sales_orders
    SET 
      customer_name = NEW.customer_name,
      customer_ref = NEW.customer_ref,
      total_amount = NEW.total,  -- sales_orders uses total_amount
      paid_amount = NEW.paid_amount,
      discount = NEW.discount,
      notes = NEW.notes,
      payment_method = NEW.payment_method,
      status = NEW.status,
      updated_at = NOW()
    WHERE id = NEW.sales_order_id;
    
    RAISE NOTICE 'Synced order % to sales_order %', NEW.id, NEW.sales_order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync sales_order to order
CREATE OR REPLACE FUNCTION sync_sales_order_to_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If this sales_order has a linked order, update it
  IF NEW.order_id IS NOT NULL THEN
    UPDATE orders
    SET 
      customer_name = NEW.customer_name,
      customer_ref = NEW.customer_ref,
      total = NEW.total_amount,  -- orders uses total
      paid_amount = NEW.paid_amount,
      discount = NEW.discount,
      notes = NEW.notes,
      payment_method = NEW.payment_method,
      status = NEW.status,
      updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RAISE NOTICE 'Synced sales_order % to order %', NEW.id, NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only when both tables exist.
DO $trigger_setup$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND to_regclass('public.sales_orders') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders';
    EXECUTE 'CREATE TRIGGER trigger_sync_order_to_sales_order
      AFTER UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.sync_order_to_sales_order()';

    EXECUTE 'DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON public.sales_orders';
    EXECUTE 'CREATE TRIGGER trigger_sync_sales_order_to_order
      AFTER UPDATE ON public.sales_orders
      FOR EACH ROW EXECUTE FUNCTION public.sync_sales_order_to_order()';
  ELSE
    RAISE NOTICE 'orders or sales_orders is not installed; skipped synchronization triggers';
  END IF;
END;
$trigger_setup$;

COMMIT;

-- Verify triggers were created
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync%'
ORDER BY event_object_table;
