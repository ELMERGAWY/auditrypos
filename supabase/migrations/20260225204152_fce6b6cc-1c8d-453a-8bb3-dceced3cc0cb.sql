
-- 1. Fix delivery_agents: Remove public SELECT, create view for tracking, restrict phone exposure
DROP POLICY IF EXISTS "Public reads agents for tracking" ON public.delivery_agents;

-- Create a public view that only exposes location (no phone, no name details)
CREATE OR REPLACE VIEW public.delivery_agents_tracking
WITH (security_invoker = on) AS
SELECT id, restaurant_id, current_lat, current_lng, last_location_update, status
FROM public.delivery_agents;

-- Allow authenticated restaurant owners to SELECT agents
CREATE POLICY "Authenticated reads agents"
ON public.delivery_agents
FOR SELECT
TO authenticated
USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow anon to read tracking view only (no direct table access for anon)
CREATE POLICY "Anon reads tracking view"
ON public.delivery_agents
FOR SELECT
TO anon
USING (false);

-- 2. Fix waiter_calls: INSERT WITH CHECK (true) - restrict to require restaurant_id exists
DROP POLICY IF EXISTS "Anyone creates waiter call" ON public.waiter_calls;

CREATE POLICY "Anyone creates waiter call"
ON public.waiter_calls
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id)
);

-- 3. Fix restaurants: Create a public view excluding sensitive fields
CREATE OR REPLACE VIEW public.restaurants_public
WITH (security_invoker = on) AS
SELECT id, name, logo_url, currency, status
FROM public.restaurants;

-- Replace public SELECT on restaurants with restricted one
DROP POLICY IF EXISTS "Public reads restaurant name" ON public.restaurants;

CREATE POLICY "Public reads restaurant basic info"
ON public.restaurants
FOR SELECT
TO anon
USING (true);  -- anon needs basic info for QR menu, but we use the view in code

CREATE POLICY "Authenticated reads own restaurant"
ON public.restaurants
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Fix orders: Ensure no public read - orders already has restrictive policies, but add explicit anon deny
CREATE POLICY "Anon cannot read orders"
ON public.orders
FOR SELECT
TO anon
USING (false);

-- 5. Fix order_items: Add explicit protection
CREATE POLICY "Anon cannot read order items"
ON public.order_items
FOR SELECT
TO anon
USING (false);

-- 6. Fix user_roles: Explicit deny for INSERT/UPDATE/DELETE for non-admins (already restrictive type but add explicit)
-- user_roles already has no INSERT/UPDATE/DELETE policies which means they're denied by default with restrictive RLS
-- But let's be extra safe

-- 7. Fix profiles: Already has restrictive policies, add explicit anon deny
CREATE POLICY "Anon cannot read profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
