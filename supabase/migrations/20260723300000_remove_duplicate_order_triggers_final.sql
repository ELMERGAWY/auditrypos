-- Remove all remaining triggers on orders table that might cause duplicate order creation
-- This includes autopost triggers and any other triggers that might fire multiple times

BEGIN;

-- Drop autopost triggers (these can cause side effects)
DROP TRIGGER IF EXISTS trg_autopost_orders_sale ON public.orders;
DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders;
DROP TRIGGER IF EXISTS trg_create_order_journal ON public.orders;

-- Drop sync triggers (may cause circular updates)
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders;

-- Drop workspace triggers (may cause issues)
DROP TRIGGER IF EXISTS trg_orders_set_default_workspace_id ON public.orders;

-- Drop audit triggers (may interfere with operations)
DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;

-- Keep only essential triggers for inventory management
-- These are necessary for proper inventory tracking

COMMIT;
