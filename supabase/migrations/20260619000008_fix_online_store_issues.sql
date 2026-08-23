-- ============================================================
-- FIX ONLINE STORE ISSUES: NOTIFICATIONS & PRODUCT DISPLAY
-- ============================================================

BEGIN;

-- 1. Update public_products view to include stock information
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
  END as in_stock
FROM public.products p
WHERE p.available = true;

-- 2. Update public_menu_items view to include stock information
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
  END as in_stock
FROM public.menu_items mi
WHERE mi.available = true;

-- 3. Create function to create storefront order with notification
CREATE OR REPLACE FUNCTION public.create_storefront_order(
  p_restaurant_id UUID,
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_order_type TEXT DEFAULT 'takeaway'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_total_amount NUMERIC := 0;
  v_item JSONB;
  v_order_item_id UUID;
  v_notification_id UUID;
  v_restaurant_name TEXT;
BEGIN
  -- Validate restaurant exists and is active
  SELECT name INTO v_restaurant_name
  FROM public.restaurants
  WHERE id = p_restaurant_id AND status IN ('active', 'trial');
  
  IF v_restaurant_name IS NULL THEN
    RAISE EXCEPTION 'المطعم غير متاح حالياً';
  END IF;

  -- Calculate total amount
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total_amount := v_total_amount + (v_item->>'price')::NUMERIC * (v_item->>'quantity')::INTEGER;
  END LOOP;

  -- Generate order number
  v_order_number := 'SO-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

  -- Create order
  INSERT INTO public.orders (
    restaurant_id,
    order_number,
    order_type,
    total,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    notes,
    created_at
  ) VALUES (
    p_restaurant_id,
    v_order_number,
    p_order_type,
    v_total_amount,
    'pending',
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_notes,
    NOW()
  ) RETURNING id INTO v_order_id;

  -- Create order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      menu_item_id,
      name,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      NULL, -- Will be linked later if needed
      NULL, -- Will be linked later if needed
      v_item->>'name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      (v_item->>'price')::NUMERIC * (v_item->>'quantity')::INTEGER
    );
  END LOOP;

  -- Create notification for restaurant owner
  INSERT INTO public.notifications (
    restaurant_id,
    target_type,
    target_id,
    title,
    body,
    type,
    metadata
  ) VALUES (
    p_restaurant_id,
    'owner',
    '',
    'طلب جديد من المتجر الإلكتروني',
    'تم استلام طلب جديد من ' || p_customer_name || ' - ' || p_customer_phone || 
    CASE WHEN p_delivery_address IS NOT NULL THEN ' (توصيل)' ELSE ' (استلام)' END ||
    ' - الإجمالي: ' || v_total_amount,
    'order',
    jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'customer_name', p_customer_name,
      'customer_phone', p_customer_phone,
      'total_amount', v_total_amount,
      'order_type', p_order_type
    )
  ) RETURNING id INTO v_notification_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'notification_id', v_notification_id,
    'total_amount', v_total_amount
  );
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_storefront_order TO anon, authenticated;

-- 5. Grant SELECT on views to anon users
GRANT SELECT ON public.public_products TO anon, authenticated;
GRANT SELECT ON public.public_menu_items TO anon, authenticated;

-- 6. Ensure RLS policies allow anon users to read available products/menu items
DROP POLICY IF EXISTS "Public storefront reads available menu" ON public.menu_items;
CREATE POLICY "Public storefront reads available menu" ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (available = true);

DROP POLICY IF EXISTS "Public storefront reads available products" ON public.products;
CREATE POLICY "Public storefront reads available products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (available = true);

-- 7. Update RLS policies for notifications to allow system to create
DROP POLICY IF EXISTS "Owner manages notifications" ON public.notifications;
CREATE POLICY "Owner manages notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow service role to create notifications (for system notifications)
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Online store issues fixed:';
  RAISE NOTICE '✅ - public_products view updated with stock information';
  RAISE NOTICE '✅ - public_menu_items view updated with stock information';
  RAISE NOTICE '✅ - create_storefront_order function created with notifications';
  RAISE NOTICE '✅ - RLS policies updated for notifications';
END
$$;
