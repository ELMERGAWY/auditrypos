-- Add delivery tracking columns to orders table for marketing center
-- These columns are used in ServiceDeliverables.tsx for delivery management

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'cancelled', 'failed')),
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_received_by TEXT,
ADD COLUMN IF NOT EXISTS delivery_receipt_note TEXT;

-- Add comments
COMMENT ON COLUMN public.orders.delivery_date IS 'Expected delivery date for the order';
COMMENT ON COLUMN public.orders.delivery_status IS 'Current status of delivery: pending, in_transit, delivered, cancelled, failed';
COMMENT ON COLUMN public.orders.actual_delivery_date IS 'Actual date when delivery was completed';
COMMENT ON COLUMN public.orders.delivery_received_by IS 'Name of person who received the delivery';
COMMENT ON COLUMN public.orders.delivery_receipt_note IS 'Notes about delivery receipt';
