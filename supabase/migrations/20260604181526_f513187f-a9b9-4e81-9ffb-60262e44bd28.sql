DROP POLICY IF EXISTS "Public storefront reads available menu" ON public.menu_items;
DROP POLICY IF EXISTS "Public storefront reads available products" ON public.products;
REVOKE SELECT ON public.menu_items FROM anon;
REVOKE SELECT ON public.products FROM anon;