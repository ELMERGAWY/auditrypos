-- ============================================================
-- Fix conflicting delivery_status CHECK constraints on orders table
-- ============================================================

BEGIN;

-- Drop any existing conflicting constraints on orders.delivery_status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;

-- Add the correct constraint with all valid statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

-- Also ensure service_invoices has the correct constraint
ALTER TABLE public.service_invoices DROP CONSTRAINT IF EXISTS service_invoices_delivery_status_check;
ALTER TABLE public.service_invoices ADD CONSTRAINT service_invoices_delivery_status_check CHECK (
  delivery_status IN ('pending', 'in_progress', 'contacted', 'no_answer', 'delivered', 'cancelled')
);

COMMIT;
