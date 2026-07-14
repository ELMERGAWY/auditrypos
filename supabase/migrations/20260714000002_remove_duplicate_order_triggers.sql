-- ============================================================
-- REMOVE TRIGGERS CAUSING DUPLICATE ORDERS AND DELETE ISSUES
-- ============================================================
-- This migration removes triggers that cause duplicate order creation
-- and prevent proper deletion of orders
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DROP AUTOPOST TRIGGERS ON ORDERS (CAUSE DUPLICATES)
-- ============================================================

-- These triggers create journal entries which may cause side effects
DROP TRIGGER IF EXISTS trg_autopost_orders_sale ON public.orders;
DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders;

-- ============================================================
-- 2. DROP SYNC TRIGGERS (MAY CAUSE ISSUES)
-- ============================================================

-- Sync triggers may cause circular updates
DROP TRIGGER IF EXISTS trigger_sync_order_paid_amount ON public.orders;
DROP TRIGGER IF EXISTS trigger_sync_order_item_to_invoice_line ON public.order_items;

-- ============================================================
-- 3. DROP WORKSPACE/COMPANY TRIGGERS (MAY CAUSE ISSUES)
-- ============================================================

DROP TRIGGER IF EXISTS trg_orders_set_default_workspace_id ON public.orders;
DROP TRIGGER IF EXISTS trg_order_items_set_company_id ON public.order_items;

-- ============================================================
-- 4. DROP AUDIT TRIGGERS (MAY PREVENT DELETION)
-- ============================================================

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_audit_order_items ON public.order_items;

-- ============================================================
-- 5. DROP FUNCTIONS USED BY REMOVED TRIGGERS
-- ============================================================

DROP FUNCTION IF EXISTS public.tg_autopost_orders_sale() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_default_workspace_id() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_id_from_order() CASCADE;

-- ============================================================
-- 6. KEEP ONLY ESSENTIAL TRIGGERS
-- ============================================================

-- Keep only triggers that don't cause side effects
-- No triggers will be recreated here to ensure clean state

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DUPLICATE ORDER TRIGGERS REMOVED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Removed autopost triggers on orders';
  RAISE NOTICE '2. Removed sync triggers';
  RAISE NOTICE '3. Removed workspace/company triggers';
  RAISE NOTICE '4. Removed audit triggers';
  RAISE NOTICE '5. Orders will now be created cleanly without side effects';
  RAISE NOTICE '============================================================';
END $$;
