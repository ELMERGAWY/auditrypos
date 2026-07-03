-- Add variables sync to order_items and sales_invoice_lines bidirectional sync
BEGIN;

-- Update sync function to include variables
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

-- Update sync function to include variables
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

COMMIT;
