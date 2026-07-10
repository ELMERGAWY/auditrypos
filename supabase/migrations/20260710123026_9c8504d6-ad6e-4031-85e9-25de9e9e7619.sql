
REVOKE EXECUTE ON FUNCTION public.update_order_item(uuid, numeric, numeric, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_sales_order_item(uuid, text, numeric, numeric, jsonb) FROM anon, public;

ALTER FUNCTION public.sync_invoice_line_to_order_item() SET search_path = public;
ALTER FUNCTION public.sync_invoice_total_from_lines() SET search_path = public;
ALTER FUNCTION public.sync_order_item_to_invoice_line() SET search_path = public;
ALTER FUNCTION public.sync_order_total_from_items() SET search_path = public;
ALTER FUNCTION public.update_order_item(uuid, numeric, numeric, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_sales_order_item(uuid, text, numeric, numeric, jsonb) SET search_path = public;

DROP POLICY IF EXISTS "Public storefront reads available menu" ON public.menu_items;
DROP POLICY IF EXISTS "Public reads available products" ON public.products;
DROP POLICY IF EXISTS "Public storefront reads available products" ON public.products;
