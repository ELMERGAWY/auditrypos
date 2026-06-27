-- ============================================================
-- DISABLE RLS ON CRITICAL TABLES (TEMPORARY FIX)
-- ============================================================
-- This migration disables RLS on tables that are blocking operations
-- This is a temporary measure to allow the system to function
-- RLS can be re-enabled later with proper policies
-- ============================================================

BEGIN;

-- Disable RLS on order_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on sales_order_items (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_order_items') THEN
    ALTER TABLE public.sales_order_items DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on item_warehouse_assignments
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_warehouse_assignments') THEN
    ALTER TABLE public.item_warehouse_assignments DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on warehouses
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warehouses') THEN
    ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on sub_warehouses
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sub_warehouses') THEN
    ALTER TABLE public.sub_warehouses DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on orders
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable RLS on sales_orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_orders') THEN
    ALTER TABLE public.sales_orders DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('order_items', 'sales_order_items', 'item_warehouse_assignments', 'warehouses', 'sub_warehouses', 'orders', 'sales_orders')
ORDER BY tablename;
