-- ============================================================
-- FIX RLS POLICIES FOR UPDATES
-- ============================================================
-- This migration fixes overly restrictive RLS policies that prevent
-- updates to orders, products, menu_items, and warehouses
-- ============================================================

BEGIN;

-- 1. FIX ORDERS POLICIES - Allow updates for restaurant owners
DROP POLICY IF EXISTS "Owner updates orders" ON public.orders;
CREATE POLICY "Owner updates orders" 
ON public.orders 
FOR UPDATE TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owner reads orders" ON public.orders;
CREATE POLICY "Owner reads orders" 
ON public.orders 
FOR SELECT TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. FIX ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Owner reads order items" ON public.order_items;
CREATE POLICY "Owner reads order items" 
ON public.order_items 
FOR SELECT TO authenticated 
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
);

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

-- 3. FIX PRODUCTS POLICIES - Allow updates for restaurant owners
DROP POLICY IF EXISTS "Owner or Staff manages products" ON public.products;
CREATE POLICY "Owner manages products" 
ON public.products 
FOR ALL TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Keep public read policy for available products
DROP POLICY IF EXISTS "Public reads available products" ON public.products;
CREATE POLICY "Public reads available products" 
ON public.products 
FOR SELECT TO anon, authenticated 
USING (available = true);

-- 4. FIX MENU_ITEMS POLICIES - Allow updates for restaurant owners
DROP POLICY IF EXISTS "Owner updates menu" ON public.menu_items;
CREATE POLICY "Owner updates menu" 
ON public.menu_items 
FOR UPDATE TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owner manages menu" ON public.menu_items;
CREATE POLICY "Owner manages menu" 
ON public.menu_items 
FOR INSERT TO authenticated 
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owner deletes menu" ON public.menu_items;
CREATE POLICY "Owner deletes menu" 
ON public.menu_items 
FOR DELETE TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Keep public read policy for available menu items
DROP POLICY IF EXISTS "Public storefront reads available menu" ON public.menu_items;
CREATE POLICY "Public storefront reads available menu" 
ON public.menu_items 
FOR SELECT TO anon, authenticated 
USING (available = true);

-- 5. FIX WAREHOUSES POLICIES - Allow create/update/delete for restaurant owners
DROP POLICY IF EXISTS "users_can_manage_warehouses" ON public.warehouses;
CREATE POLICY "Owner manages warehouses" 
ON public.warehouses 
FOR ALL TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "users_can_view_warehouses" ON public.warehouses;
CREATE POLICY "Owner views warehouses" 
ON public.warehouses 
FOR SELECT TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 6. FIX SUB_WAREHOUSES POLICIES
DROP POLICY IF EXISTS "users_can_manage_sub_warehouses" ON public.sub_warehouses;
CREATE POLICY "Owner manages sub_warehouses" 
ON public.sub_warehouses 
FOR ALL TO authenticated 
USING (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "users_can_view_sub_warehouses" ON public.sub_warehouses;
CREATE POLICY "Owner views sub_warehouses" 
ON public.sub_warehouses 
FOR SELECT TO authenticated 
USING (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
);

-- 7. ENSURE RLS IS ENABLED
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_warehouses ENABLE ROW LEVEL SECURITY;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies Fixed for Updates';
  RAISE NOTICE '   • Orders: Owner can update';
  RAISE NOTICE '   • Order Items: Owner can update';
  RAISE NOTICE '   • Products: Owner can update';
  RAISE NOTICE '   • Menu Items: Owner can update';
  RAISE NOTICE '   • Warehouses: Owner can create/update/delete';
  RAISE NOTICE '   • Sub-Warehouses: Owner can manage';
END $$;
