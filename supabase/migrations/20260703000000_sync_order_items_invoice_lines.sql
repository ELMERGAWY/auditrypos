-- Sync order_items with sales_invoice_lines for bidirectional updates
BEGIN;

-- Step 1: Create function to sync order_items to sales_invoice_lines
CREATE OR REPLACE FUNCTION public.sync_order_item_to_invoice_line()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sales_invoice_lines when order_items change
  -- This syncs from orders to invoices
  UPDATE public.sales_invoice_lines
  SET
    quantity = NEW.quantity,
    unit_price = NEW.price,
    line_total = NEW.quantity * NEW.price,
    description = NEW.menu_item_name,
    variables = NEW.variables
  FROM public.sales_invoices si
  WHERE si.order_id = NEW.order_id
    AND sales_invoice_lines.invoice_id = si.id
    -- Try to match by product_id or menu_item_name
    AND (sales_invoice_lines.product_id = NEW.product_id
         OR sales_invoice_lines.description = NEW.menu_item_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to sync sales_invoice_lines to order_items
CREATE OR REPLACE FUNCTION public.sync_invoice_line_to_order_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order_items when sales_invoice_lines change
  -- This syncs from invoices to orders
  UPDATE public.order_items
  SET
    quantity = NEW.quantity,
    price = NEW.unit_price,
    menu_item_name = NEW.description,
    line_total = NEW.line_total,
    variables = NEW.variables
  FROM public.sales_invoices si
  WHERE si.id = NEW.invoice_id
    AND order_items.order_id = si.order_id
    -- Try to match by product_id or menu_item_name
    AND (order_items.product_id = NEW.product_id
         OR order_items.menu_item_name = NEW.description);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to sync order total from items
CREATE OR REPLACE FUNCTION public.sync_order_total_from_items()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric(12,2);
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(COALESCE(line_total, quantity * price)), 0)
  INTO v_total
  FROM public.order_items
  WHERE order_id = v_order_id;

  UPDATE public.orders
  SET total = ROUND(v_total, 2)
  WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 4: Create function to sync invoice total from lines
CREATE OR REPLACE FUNCTION public.sync_invoice_total_from_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid;
  v_total numeric(15,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(COALESCE(line_total, quantity * unit_price)), 0)
  INTO v_total
  FROM public.sales_invoice_lines
  WHERE invoice_id = v_invoice_id;

  UPDATE public.sales_invoices
  SET total_amount = ROUND(v_total, 2)
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 5: Create triggers for order_items updates
DROP TRIGGER IF EXISTS trigger_sync_order_item_to_invoice_line ON public.order_items;
CREATE TRIGGER trigger_sync_order_item_to_invoice_line
AFTER UPDATE OF quantity, price, menu_item_name, product_id ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_to_invoice_line();

-- Also sync on INSERT
DROP TRIGGER IF EXISTS trigger_sync_order_item_to_invoice_line_insert ON public.order_items;
CREATE TRIGGER trigger_sync_order_item_to_invoice_line_insert
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_to_invoice_line();

-- Sync on DELETE
DROP TRIGGER IF EXISTS trigger_sync_order_item_to_invoice_line_delete ON public.order_items;
CREATE TRIGGER trigger_sync_order_item_to_invoice_line_delete
AFTER DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_to_invoice_line();

-- Step 6: Create triggers for order total sync
DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_ins ON public.order_items;
DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_upd ON public.order_items;
DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_del ON public.order_items;

CREATE TRIGGER trg_sync_order_total_from_items_ins
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

CREATE TRIGGER trg_sync_order_total_from_items_upd
AFTER UPDATE OF quantity, price, line_total ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

CREATE TRIGGER trg_sync_order_total_from_items_del
AFTER DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

-- Step 7: Create triggers for sales_invoice_lines updates
DROP TRIGGER IF EXISTS trigger_sync_invoice_line_to_order_item ON public.sales_invoice_lines;
CREATE TRIGGER trigger_sync_invoice_line_to_order_item
AFTER UPDATE OF quantity, unit_price, description, product_id ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_line_to_order_item();

-- Also sync on INSERT
DROP TRIGGER IF EXISTS trigger_sync_invoice_line_to_order_item_insert ON public.sales_invoice_lines;
CREATE TRIGGER trigger_sync_invoice_line_to_order_item_insert
AFTER INSERT ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_line_to_order_item();

-- Sync on DELETE
DROP TRIGGER IF EXISTS trigger_sync_invoice_line_to_order_item_delete ON public.sales_invoice_lines;
CREATE TRIGGER trigger_sync_invoice_line_to_order_item_delete
AFTER DELETE ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_line_to_order_item();

-- Step 8: Create triggers for invoice total sync
DROP TRIGGER IF EXISTS trg_sync_invoice_total_from_lines_ins ON public.sales_invoice_lines;
DROP TRIGGER IF EXISTS trg_sync_invoice_total_from_lines_upd ON public.sales_invoice_lines;
DROP TRIGGER IF EXISTS trg_sync_invoice_total_from_lines_del ON public.sales_invoice_lines;

CREATE TRIGGER trg_sync_invoice_total_from_lines_ins
AFTER INSERT ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_total_from_lines();

CREATE TRIGGER trg_sync_invoice_total_from_lines_upd
AFTER UPDATE OF quantity, unit_price, line_total ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_total_from_lines();

CREATE TRIGGER trg_sync_invoice_total_from_lines_del
AFTER DELETE ON public.sales_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_total_from_lines();

-- Step 9: Backfill existing data
-- Sync order_items to sales_invoice_lines
UPDATE public.sales_invoice_lines sil
SET 
  quantity = oi.quantity,
  unit_price = oi.price,
  line_total = oi.quantity * oi.price,
  description = oi.menu_item_name
FROM public.order_items oi
JOIN public.sales_invoices si ON si.order_id = oi.order_id
WHERE sil.invoice_id = si.id
  AND (sil.product_id = oi.product_id OR sil.description = oi.menu_item_name)
  AND (sil.quantity IS DISTINCT FROM oi.quantity 
       OR sil.unit_price IS DISTINCT FROM oi.price
       OR sil.description IS DISTINCT FROM oi.menu_item_name);

-- Backfill order totals
UPDATE public.orders o
SET total = (
  SELECT COALESCE(SUM(COALESCE(oi.line_total, oi.quantity * oi.price)), 0)
  FROM public.order_items oi
  WHERE oi.order_id = o.id
)
WHERE o.total IS DISTINCT FROM (
  SELECT COALESCE(SUM(COALESCE(oi.line_total, oi.quantity * oi.price)), 0)
  FROM public.order_items oi
  WHERE oi.order_id = o.id
);

-- Backfill invoice totals
UPDATE public.sales_invoices si
SET total_amount = (
  SELECT COALESCE(SUM(COALESCE(sil.line_total, sil.quantity * sil.unit_price)), 0)
  FROM public.sales_invoice_lines sil
  WHERE sil.invoice_id = si.id
)
WHERE si.total_amount IS DISTINCT FROM (
  SELECT COALESCE(SUM(COALESCE(sil.line_total, sil.quantity * sil.unit_price)), 0)
  FROM public.sales_invoice_lines sil
  WHERE sil.invoice_id = si.id
);

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Created sync between order_items and sales_invoice_lines';
  RAISE NOTICE '✅ Created triggers for bidirectional sync';
  RAISE NOTICE '✅ Created triggers for order total sync';
  RAISE NOTICE '✅ Created triggers for invoice total sync';
  RAISE NOTICE '✅ Backfilled existing data';
  RAISE NOTICE '✅ Backfilled order totals';
  RAISE NOTICE '✅ Backfilled invoice totals';
END $$;
