-- Service variables template (admin-defined)
ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Per-line variable values captured at POS
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Delivery workflow status (independent of POS status)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','in_progress','delivered','cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
  ON public.orders(restaurant_id, delivery_status)
  WHERE order_type = 'delivery';

ALTER TABLE public.service_invoices
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','in_progress','delivered','cancelled'));

CREATE INDEX IF NOT EXISTS idx_service_invoices_delivery_status
  ON public.service_invoices(restaurant_id, delivery_status);