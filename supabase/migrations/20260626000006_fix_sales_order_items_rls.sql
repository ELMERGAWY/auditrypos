-- ============================================================
-- FIX SALES ORDER ITEMS RLS POLICIES
-- ============================================================
-- This migration fixes RLS policies for sales_order_items to allow updates
-- Note: This table may not exist in your database, so we check first
-- ============================================================

DO $$
BEGIN
  -- Only create policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_order_items') THEN

    -- Fix sales_order_items policies
    DROP POLICY IF EXISTS "Owner reads sales order items" ON public.sales_order_items;
    CREATE POLICY "Owner reads sales order items"
    ON public.sales_order_items
    FOR SELECT TO authenticated
    USING (
      sales_order_id IN (
        SELECT id FROM public.sales_orders
        WHERE restaurant_id IN (
          SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
      )
    );

    DROP POLICY IF EXISTS "Owner updates sales order items" ON public.sales_order_items;
    CREATE POLICY "Owner updates sales order items"
    ON public.sales_order_items
    FOR UPDATE TO authenticated
    USING (
      sales_order_id IN (
        SELECT id FROM public.sales_orders
        WHERE restaurant_id IN (
          SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      sales_order_id IN (
        SELECT id FROM public.sales_orders
        WHERE restaurant_id IN (
          SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
      )
    );

    DROP POLICY IF EXISTS "Owner inserts sales order items" ON public.sales_order_items;
    CREATE POLICY "Owner inserts sales order items"
    ON public.sales_order_items
    FOR INSERT TO authenticated
    WITH CHECK (
      sales_order_id IN (
        SELECT id FROM public.sales_orders
        WHERE restaurant_id IN (
          SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
      )
    );

    RAISE NOTICE '✅ Sales Order Items RLS Policies Fixed';
  ELSE
    RAISE NOTICE '⚠️ sales_order_items table does not exist, skipping policies';
  END IF;
END $$;
