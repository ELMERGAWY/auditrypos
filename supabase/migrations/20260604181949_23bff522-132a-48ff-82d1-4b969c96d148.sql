
-- Switch public-facing views to SECURITY DEFINER so anon can read filtered, safe rows
-- without needing direct privileges on the underlying tables (which contain sensitive cost/stock data).
ALTER VIEW public.restaurants_public SET (security_invoker = off);
ALTER VIEW public.public_menu_items SET (security_invoker = off);
ALTER VIEW public.public_products SET (security_invoker = off);

GRANT SELECT ON public.restaurants_public TO anon, authenticated;
GRANT SELECT ON public.public_menu_items TO anon, authenticated;
GRANT SELECT ON public.public_products TO anon, authenticated;
