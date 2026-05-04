
-- Fix 1: Remove anon read on products. Storefront access must go via edge function or per-restaurant scoped views.
DROP POLICY IF EXISTS "Public reads products" ON public.products;

-- Fix 2: Scope sales_returns to restaurant owners
DROP POLICY IF EXISTS "returns_owner_access" ON public.sales_returns;
CREATE POLICY "Owners manage sales returns"
ON public.sales_returns
FOR ALL
TO authenticated
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 3: Remove permissive "any auth user" policy on delivery_agents.
-- Owner policy already exists; drivers should authenticate via edge function (driver-api).
DROP POLICY IF EXISTS "Drivers manage own profile" ON public.delivery_agents;
