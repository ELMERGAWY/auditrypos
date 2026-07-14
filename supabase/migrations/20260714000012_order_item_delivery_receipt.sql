-- Partial item delivery + receipt note/who/date on orders
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS actual_delivery_date DATE NULL,
  ADD COLUMN IF NOT EXISTS delivery_received_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_receipt_note TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_is_delivered
  ON public.order_items (order_id, is_delivered);

COMMENT ON COLUMN public.order_items.is_delivered IS 'Whether this line item has been handed over to the customer';
COMMENT ON COLUMN public.orders.delivery_received_by IS 'Name of person who received the delivery';
COMMENT ON COLUMN public.orders.delivery_receipt_note IS 'Reminder note recorded at delivery confirmation';
COMMENT ON COLUMN public.orders.actual_delivery_date IS 'Actual date the order (or last partial) was received';
