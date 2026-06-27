-- ============================================================
-- FIX ORDER_ITEMS RLS POLICIES
-- ============================================================
-- This migration fixes RLS policies for order_items to allow updates
-- ============================================================

BEGIN;

-- Fix order_items policies to allow updates
DROP POLICY IF EXISTS "Owner updates order items" ON public.order_items;
CREATE POLICY "Owner updates order items" 
ON public.order_items 
FOR UPDATE TO authenticated 
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
);

-- Ensure insert policy exists
DROP POLICY IF EXISTS "Owner inserts order items" ON public.order_items;
CREATE POLICY "Owner inserts order items" 
ON public.order_items 
FOR INSERT TO authenticated 
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Order Items RLS Policies Fixed';
END $$;
