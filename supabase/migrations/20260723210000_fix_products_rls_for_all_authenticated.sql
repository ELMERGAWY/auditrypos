-- Fix products RLS to allow all authenticated users to read products by restaurant_id
-- This ensures purchase invoices can load products for restaurant owners and staff

-- Drop existing policies
DROP POLICY IF EXISTS "Owner manages products" ON public.products;
DROP POLICY IF EXISTS "Public reads available products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users read products by restaurant" ON public.products;
DROP POLICY IF EXISTS "Owners and super admins manage products" ON public.products;

-- Create new policies that allow authenticated users to read products by restaurant_id
CREATE POLICY "Authenticated users read products by restaurant"
ON public.products
FOR SELECT TO authenticated
USING (restaurant_id IN (
  SELECT id FROM restaurants
  WHERE owner_id = auth.uid()
  OR id IN (
    SELECT restaurant_id FROM company_users
    WHERE user_id = auth.uid() AND is_active = true
  )
));

-- Allow owners and super admins to manage products
CREATE POLICY "Owners and super admins manage products"
ON public.products
FOR ALL TO authenticated
USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
