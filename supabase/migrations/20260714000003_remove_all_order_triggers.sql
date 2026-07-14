-- ============================================================
-- REMOVE ONLY PROBLEMATIC TRIGGERS (KEEP ESSENTIAL ONES)
-- ============================================================
-- This migration removes ONLY triggers that cause duplicate orders
-- while keeping essential triggers like inventory management
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REMOVE TRIGGERS THAT CAUSE DUPLICATES
-- ============================================================

-- Autopost triggers (create journal entries - may cause issues)
DROP TRIGGER IF EXISTS trg_autopost_orders_sale ON public.orders;
DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders;

-- Sync triggers (may cause circular updates)
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount_insert ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_item_to_invoice_line ON public.order_items;
DROP TRIGGER IF EXISTS trigger_sync_order_to_sales_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_sales_order_to_order ON public.sales_orders;

-- Workspace/Company triggers (may cause issues)
DROP TRIGGER IF EXISTS trg_orders_set_default_workspace_id ON public.orders;
DROP TRIGGER IF EXISTS trg_order_items_set_company_id ON public.order_items;

-- Audit triggers (may prevent deletion)
DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_audit_order_items ON public.order_items;

-- Cleanup trigger (may interfere with deletion)
DROP TRIGGER IF EXISTS trg_cleanup_order_financial_links ON public.orders;

-- ============================================================
-- 2. KEEP ESSENTIAL TRIGGERS
-- ============================================================

-- KEEP: Inventory management triggers (essential for stock)
-- - trg_manage_order_status_inventory (on orders)
-- - trg_manage_order_item_inventory (on order_items)
-- - trg_restore_inventory_on_delete (on orders)

-- KEEP: Customer creation triggers (useful for UX)
-- - trg_auto_create_customer_on_order (on orders)
-- - trg_record_customer_transaction_on_order (on orders)

-- ============================================================
-- 3. DROP FUNCTIONS FOR REMOVED TRIGGERS ONLY
-- ============================================================

DROP FUNCTION IF EXISTS public.tg_autopost_orders_sale() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_default_workspace_id() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_id_from_order() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_paid_amount() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_order_financial_links() CASCADE;
DROP FUNCTION IF EXISTS public.sync_order_to_sales_order() CASCADE;
DROP FUNCTION IF EXISTS public.sync_sales_order_to_order() CASCADE;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PROBLEMATIC TRIGGERS REMOVED (ESSENTIAL ONES KEPT)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Removed autopost and sync triggers';
  RAISE NOTICE '2. Removed workspace/company triggers';
  RAISE NOTICE '3. Removed audit triggers';
  RAISE NOTICE '4. KEPT inventory management triggers';
  RAISE NOTICE '5. KEPT customer creation triggers';
  RAISE NOTICE '============================================================';
END $$;
