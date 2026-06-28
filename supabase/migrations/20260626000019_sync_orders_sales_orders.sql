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

-- Add a foreign key column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'sales_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN sales_order_id UUID REFERENCES sales_orders(id);
    RAISE NOTICE 'Added sales_order_id column to orders';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_orders' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN order_id UUID REFERENCES orders(id);
    RAISE NOTICE 'Added order_id column to sales_orders';
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
      total = NEW.total,
      paid_amount = NEW.paid_amount,
      discount = NEW.discount,
      notes = NEW.notes,
      payment_method = NEW.payment_method,
      status = NEW.status,
      updated_at = NOW()
    WHERE id = NEW.sales_order_id;
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
      total = NEW.total,
      paid_amount = NEW.paid_amount,
      discount = NEW.discount,
      notes = NEW.notes,
      payment_method = NEW.payment_method,
      status = NEW.status,
      updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON orders;
CREATE TRIGGER trigger_sync_order_to_sales_order
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_to_sales_order();

DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON sales_orders;
CREATE TRIGGER trigger_sync_sales_order_to_order
  AFTER UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_sales_order_to_order();

COMMIT;

-- Verify triggers were created
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync%'
ORDER BY event_object_table;
