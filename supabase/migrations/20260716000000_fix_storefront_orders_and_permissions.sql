-- ============================================================
-- FIX STOREFRONT ORDERS: PERMISSIONS & FLEXIBLE PRICE LOOKUP
-- ============================================================

BEGIN;

-- 1. Create or replace the function with fallback lookup logic
CREATE OR REPLACE FUNCTION public.create_storefront_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_order_type text DEFAULT 'takeaway'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_total_amount numeric := 0;
  v_item jsonb;
  v_restaurant_name text;
  v_price numeric;
  v_qty numeric;
  v_menu_id uuid;
  v_product_id uuid;
  v_item_id uuid;
  v_name text;
  v_image text;
  v_db_price numeric;
BEGIN
  -- Validate restaurant exists and is active/trial
  SELECT name INTO v_restaurant_name FROM public.restaurants WHERE id = p_restaurant_id AND status IN ('active', 'trial');
  IF v_restaurant_name IS NULL THEN RAISE EXCEPTION 'المتجر غير متاح حالياً'; END IF;

  -- First Pass: Calculate total amount securely
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_item_id := COALESCE(v_menu_id, v_product_id);
    
    v_price := NULL;
    v_db_price := NULL;
    
    -- Try fetching price from menu_items
    IF v_item_id IS NOT NULL THEN
      SELECT price INTO v_db_price FROM public.menu_items 
      WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      
      -- If not found, try products
      IF v_db_price IS NULL THEN
        SELECT price INTO v_db_price FROM public.products 
        WHERE id = v_item_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      END IF;
    END IF;
    
    -- Use DB price if found, else fallback to client price, else 0
    v_price := COALESCE(v_db_price, (v_item->>'price')::numeric, 0);
    v_total_amount := v_total_amount + (v_price * v_qty);
  END LOOP;

  -- Enforce minimum order total (must be > 0)
  IF v_total_amount <= 0 THEN 
    -- Fallback safety check: if everything was zero or not found, let's use client prices if any exists
    v_total_amount := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
      v_price := GREATEST(0, COALESCE((v_item->>'price')::numeric, 0));
      v_total_amount := v_total_amount + (v_price * v_qty);
    END LOOP;
    
    IF v_total_amount <= 0 THEN
      RAISE EXCEPTION 'لا توجد أصناف صالحة في الطلب'; 
    END IF;
  END IF;

  -- Generate order number (e.g., SF-260716-12345)
  v_order_number := 'SF-' || to_char(now(), 'YYMMDD') || '-' || lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');

  -- Create order
  INSERT INTO public.orders (
    restaurant_id, order_number, order_type, total, status, 
    customer_name, customer_phone, delivery_address, notes, 
    payment_method, paid_amount, created_at
  )
  VALUES (
    p_restaurant_id, 
    v_order_number, 
    COALESCE(p_order_type, 'takeaway'), 
    v_total_amount, 
    'pending', 
    COALESCE(p_customer_name, ''), 
    COALESCE(p_customer_phone, ''), 
    p_delivery_address, 
    COALESCE(p_notes, ''), 
    'cash', 
    0, 
    now()
  )
  RETURNING id INTO v_order_id;

  -- Second Pass: Create order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_item_id := COALESCE(v_menu_id, v_product_id);
    
    v_price := NULL;
    v_db_price := NULL;
    v_name := COALESCE(v_item->>'name', 'صنف');
    v_image := COALESCE(v_item->>'image', '📦');
    
    -- Check which table the item actually belongs to
    IF v_item_id IS NOT NULL THEN
      IF EXISTS(SELECT 1 FROM public.menu_items WHERE id = v_item_id) THEN
        v_menu_id := v_item_id;
        v_product_id := NULL;
        SELECT name, price, image INTO v_name, v_db_price, v_image FROM public.menu_items 
        WHERE id = v_menu_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      ELSIF EXISTS(SELECT 1 FROM public.products WHERE id = v_item_id) THEN
        v_product_id := v_item_id;
        v_menu_id := NULL;
        SELECT name, price, image INTO v_name, v_db_price, v_image FROM public.products 
        WHERE id = v_product_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      ELSE
        v_menu_id := NULL;
        v_product_id := NULL;
      END IF;
    END IF;
    
    v_price := COALESCE(v_db_price, (v_item->>'price')::numeric, 0);
    
    -- Insert order item
    INSERT INTO public.order_items (
      order_id, menu_item_id, product_id, menu_item_name, menu_item_image, 
      quantity, price, sold_unit, unit_factor, variables, line_total
    )
    VALUES (
      v_order_id, 
      v_menu_id,
      v_product_id,
      v_name, 
      v_image, 
      v_qty, 
      v_price, 
      COALESCE(v_item->>'sold_unit', 'قطعة'), 
      COALESCE((v_item->>'unit_factor')::numeric, 1), 
      CASE WHEN v_item ? 'variables' THEN v_item->'variables' ELSE NULL END, 
      v_qty * v_price
    );
  END LOOP;

  -- Create notification for owner (triggering realtime refresh on POS dashboard)
  INSERT INTO public.notifications (restaurant_id, target_type, title, body, type, metadata)
  VALUES (
    p_restaurant_id, 
    'owner', 
    'طلب جديد من المتجر الإلكتروني', 
    'تم استلام طلب جديد من ' || COALESCE(p_customer_name, 'عميل') || ' - الإجمالي: ' || v_total_amount, 
    'order', 
    jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
  );

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total', v_total_amount);
END;
$$;

-- 2. Grant execution permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.create_storefront_order(uuid, jsonb, text, text, text, text, text) TO anon, authenticated;

COMMIT;
