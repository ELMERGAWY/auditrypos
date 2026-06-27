-- ============================================================
-- DISABLE RLS ON ORDER ITEMS TABLES
-- ============================================================
-- This disables RLS on order_items and sales_order_items to allow
-- RPC functions to update items without permission issues
-- ============================================================

BEGIN;

-- Disable RLS on order_items
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sales_order_items
ALTER TABLE public.sales_order_items DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- RE-GRANT PERMISSIONS
-- ============================================================
-- Ensure authenticated users have full access
-- ============================================================

GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.sales_order_items TO authenticated;
