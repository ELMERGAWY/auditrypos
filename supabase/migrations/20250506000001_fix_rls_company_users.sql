-- ============================================================
-- CRITICAL FIX: RLS Policy for Company Users (Staff)
-- Issue: Staff users couldn't create orders due to RLS restriction
-- Solution: Update is_restaurant_owner to check company_users table
-- ============================================================

-- Fix 1: Update is_restaurant_owner function to include company_users
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is the direct owner
    SELECT 1 FROM public.restaurants 
    WHERE id = _restaurant_id AND owner_id = _user_id
  ) OR EXISTS (
    -- Check if user is staff member via company_users
    SELECT 1 FROM public.company_users cu
    JOIN public.restaurants r ON r.company_id = cu.company_id
    WHERE cu.user_id = _user_id 
      AND r.id = _restaurant_id 
      AND cu.is_active = true
  )
$$;

COMMENT ON FUNCTION public.is_restaurant_owner IS 'Checks if user is owner OR staff member (via company_users) of the restaurant';

-- Fix 2: Ensure orders table has proper RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Fix 3: Update orders policy to use the fixed function
DROP POLICY IF EXISTS "Owner creates orders" ON public.orders;
CREATE POLICY "Owner or Staff creates orders" 
ON public.orders 
FOR INSERT TO authenticated 
WITH CHECK (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
);

-- Fix 4: Update order_items policy as well (dependent on orders)
DROP POLICY IF EXISTS "Owner reads order items" ON public.order_items;
CREATE POLICY "Owner or Staff reads order items" 
ON public.order_items 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
      AND public.is_restaurant_owner(auth.uid(), o.restaurant_id)
  )
);

DROP POLICY IF EXISTS "Owner creates order items" ON public.order_items;
CREATE POLICY "Owner or Staff creates order items" 
ON public.order_items 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
      AND public.is_restaurant_owner(auth.uid(), o.restaurant_id)
  )
);

-- Fix 5: Update related tables for consistency
-- Products/Menus
DROP POLICY IF EXISTS "Owner reads menu items" ON public.menu_items;
CREATE POLICY "Owner or Staff reads menu items" 
ON public.menu_items 
FOR ALL TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- Customers
DROP POLICY IF EXISTS "Owner manages customers" ON public.customers;
CREATE POLICY "Owner or Staff manages customers" 
ON public.customers 
FOR ALL TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- Inventory (products)
DROP POLICY IF EXISTS "Owner manages products" ON public.products;
CREATE POLICY "Owner or Staff manages products" 
ON public.products 
FOR ALL TO authenticated 
USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- Fix 6: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Fix Applied Successfully!';
  RAISE NOTICE '✅ Staff users (company_users) can now create orders';
  RAISE NOTICE '✅ All related policies updated';
END $$;
