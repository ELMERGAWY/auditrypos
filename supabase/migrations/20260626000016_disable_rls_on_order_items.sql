-- ============================================================
-- DISABLE RLS ON ORDER ITEMS TABLES
-- ============================================================
-- This disables RLS on order_items and sales_order_items to allow
-- RPC functions to update items without permission issues
-- ============================================================

BEGIN;

-- Disable RLS on order_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items'
  ) THEN
    ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on order_items';
  ELSE
    RAISE NOTICE 'order_items table does not exist, skipping';
  END IF;
END $$;

-- Disable RLS on sales_order_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_order_items'
  ) THEN
    ALTER TABLE public.sales_order_items DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on sales_order_items';
  ELSE
    RAISE NOTICE 'sales_order_items table does not exist, skipping';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- RE-GRANT PERMISSIONS
-- ============================================================
-- Ensure authenticated users have full access
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items'
  ) THEN
    GRANT ALL ON public.order_items TO authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_order_items'
  ) THEN
    GRANT ALL ON public.sales_order_items TO authenticated;
  END IF;
END $$;
