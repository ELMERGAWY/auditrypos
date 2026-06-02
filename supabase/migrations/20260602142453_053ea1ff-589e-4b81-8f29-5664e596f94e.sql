
-- 1) Branches: only super admin can access (table has no restaurant_id)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages branches" ON public.branches
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 2) customer_points
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages customer_points" ON public.customer_points
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3) gift_cards
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages gift_cards" ON public.gift_cards
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4) loyalty_programs
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages loyalty_programs" ON public.loyalty_programs
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 5) Replace broad public reads on menu_items and products with safe storefront views
DROP POLICY IF EXISTS "Public reads menu" ON public.menu_items;
DROP POLICY IF EXISTS "Public reads available products" ON public.products;

CREATE OR REPLACE VIEW public.public_menu_items
WITH (security_invoker = true) AS
SELECT id, restaurant_id, name, price, category, image, available, sort_order, product_type
FROM public.menu_items
WHERE available = true;

CREATE OR REPLACE VIEW public.public_products
WITH (security_invoker = true) AS
SELECT id, restaurant_id, name, category, price, image, available, sort_order, unit, quantity
FROM public.products
WHERE available = true;

-- Allow underlying-table SELECT for available rows so the views can return data to anon
CREATE POLICY "Public storefront reads available menu" ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (available = true);

CREATE POLICY "Public storefront reads available products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (available = true);

-- Revoke direct anon read on tables; expose only the safe views to anon
REVOKE SELECT ON public.menu_items FROM anon;
REVOKE SELECT ON public.products FROM anon;

GRANT SELECT ON public.public_menu_items TO anon, authenticated;
GRANT SELECT ON public.public_products TO anon, authenticated;
