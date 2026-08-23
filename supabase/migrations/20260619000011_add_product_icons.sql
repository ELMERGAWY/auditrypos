-- ============================================================
-- ADD ICON_URL TO PRODUCTS AND MENU_ITEMS
-- ============================================================

BEGIN;

-- 1. Add icon_url column to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Add icon_url column to menu_items
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 3. Update public_products view to include icon_url
CREATE OR REPLACE VIEW public.public_products
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.restaurant_id,
  p.name,
  p.category,
  p.price,
  p.image,
  p.available,
  p.sort_order,
  p.unit,
  COALESCE(p.quantity, 0) as quantity,
  CASE
    WHEN COALESCE(p.quantity, 0) > 0 THEN true
    ELSE false
  END as in_stock,
  p.icon_url
FROM public.products p
WHERE p.available = true;

-- 4. Update public_menu_items view to include icon_url
CREATE OR REPLACE VIEW public.public_menu_items
WITH (security_invoker = false) AS
SELECT
  mi.id,
  mi.restaurant_id,
  mi.name,
  mi.price,
  mi.category,
  mi.image,
  mi.available,
  mi.sort_order,
  NULL::text AS product_type,
  mi.inventory_mode,
  CASE
    WHEN mi.inventory_mode = 'none' THEN true
    WHEN mi.inventory_mode = 'direct' AND mi.product_id IS NOT NULL THEN
      COALESCE((SELECT quantity FROM public.products WHERE id = mi.product_id), 0) > 0
    WHEN mi.inventory_mode = 'recipe' THEN
      EXISTS (
        SELECT 1 FROM public.menu_item_components mic
        JOIN public.products p ON mic.product_id = p.id
        WHERE mic.menu_item_id = mi.id
        AND COALESCE(p.quantity, 0) > 0
      )
    ELSE true
  END as in_stock,
  mi.icon_url
FROM public.menu_items mi
WHERE mi.available = true;

-- 5. Grant SELECT on views
GRANT SELECT ON public.public_products TO anon, authenticated;
GRANT SELECT ON public.public_menu_items TO anon, authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Product icons added:';
  RAISE NOTICE '✅ - icon_url column added to products';
  RAISE NOTICE '✅ - icon_url column added to menu_items';
  RAISE NOTICE '✅ - public_products view updated';
  RAISE NOTICE '✅ - public_menu_items view updated';
END
$$;
