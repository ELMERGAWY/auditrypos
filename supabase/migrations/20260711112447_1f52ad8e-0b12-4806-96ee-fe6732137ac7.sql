BEGIN;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  _product_id uuid,
  _restaurant_id uuid,
  _quantity numeric,
  _movement_type text,
  _reason text,
  _reference_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE reference_id = _reference_id
      AND product_id = _product_id
      AND type = _movement_type
  ) THEN
    RETURN;
  END IF;

  IF _movement_type = 'out' THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) - ABS(_quantity), updated_at = now()
    WHERE id = _product_id AND restaurant_id = _restaurant_id
    RETURNING quantity INTO v_current_qty;
  ELSE
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + ABS(_quantity), updated_at = now()
    WHERE id = _product_id AND restaurant_id = _restaurant_id
    RETURNING quantity INTO v_current_qty;
  END IF;

  IF v_current_qty IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.stock_movements (product_id, restaurant_id, quantity, type, reason, reference_id)
  VALUES (_product_id, _restaurant_id, ABS(_quantity), _movement_type, _reason, _reference_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_manage_order_item_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_restaurant_id uuid;
  v_status text;
  v_inventory_mode text;
  v_linked_product_id uuid;
  v_component record;
  v_qty numeric;
  v_ref text;
BEGIN
  SELECT restaurant_id, status INTO v_restaurant_id, v_status
  FROM public.orders
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_restaurant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND COALESCE(v_status, '') NOT IN ('cancelled', 'returned') THEN
    v_qty := COALESCE(OLD.quantity, 0) * COALESCE(OLD.unit_factor, 1);
    v_ref := OLD.id::text || CASE WHEN TG_OP = 'DELETE' THEN '_delete_restore' ELSE '_update_restore_' || txid_current()::text END;

    IF OLD.product_id IS NOT NULL THEN
      PERFORM public.adjust_product_stock(OLD.product_id, v_restaurant_id, v_qty, 'in', 'order_item_restore', v_ref);
    ELSIF OLD.menu_item_id IS NOT NULL THEN
      SELECT inventory_mode, product_id INTO v_inventory_mode, v_linked_product_id FROM public.menu_items WHERE id = OLD.menu_item_id;
      IF v_inventory_mode = 'direct' AND v_linked_product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(v_linked_product_id, v_restaurant_id, v_qty, 'in', 'direct_order_item_restore', v_ref);
      ELSIF v_inventory_mode = 'recipe' THEN
        FOR v_component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = OLD.menu_item_id LOOP
          PERFORM public.adjust_product_stock(v_component.product_id, v_restaurant_id, COALESCE(v_component.quantity_required, 0) * v_qty, 'in', 'recipe_order_item_restore', v_ref || '_' || v_component.product_id::text);
        END LOOP;
      END IF;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND COALESCE(v_status, '') NOT IN ('cancelled', 'returned') THEN
    v_qty := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_factor, 1);
    v_ref := NEW.id::text || CASE WHEN TG_OP = 'INSERT' THEN '' ELSE '_update_deduct_' || txid_current()::text END;

    IF NEW.product_id IS NOT NULL THEN
      PERFORM public.adjust_product_stock(NEW.product_id, v_restaurant_id, v_qty, 'out', 'order_item_sale', v_ref);
    ELSIF NEW.menu_item_id IS NOT NULL THEN
      SELECT inventory_mode, product_id INTO v_inventory_mode, v_linked_product_id FROM public.menu_items WHERE id = NEW.menu_item_id;
      IF v_inventory_mode = 'direct' AND v_linked_product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(v_linked_product_id, v_restaurant_id, v_qty, 'out', 'direct_order_item_sale', v_ref);
      ELSIF v_inventory_mode = 'recipe' THEN
        FOR v_component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
          PERFORM public.adjust_product_stock(v_component.product_id, v_restaurant_id, COALESCE(v_component.quantity_required, 0) * v_qty, 'out', 'recipe_order_item_sale', v_ref || '_' || v_component.product_id::text);
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_inventory_manage ON public.order_items;
DROP TRIGGER IF EXISTS trg_manage_order_item_inventory ON public.order_items;
CREATE TRIGGER trg_manage_order_item_inventory
AFTER INSERT OR UPDATE OF quantity, unit_factor, product_id, menu_item_id OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_item_inventory();

CREATE OR REPLACE FUNCTION public.cleanup_order_financial_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.receipt_vouchers
  WHERE restaurant_id = OLD.restaurant_id
    AND (id = ANY(COALESCE(OLD.receipt_voucher_ids, ARRAY[]::uuid[])) OR notes ILIKE '%' || OLD.order_number || '%');

  DELETE FROM public.customer_transactions WHERE order_id = OLD.id OR reference_id = OLD.id;

  DELETE FROM public.journal_entry_lines
  WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE reference_id = OLD.id OR source_id = OLD.id);
  DELETE FROM public.journal_entries WHERE reference_id = OLD.id OR source_id = OLD.id;

  DELETE FROM public.sales_invoice_lines WHERE invoice_id IN (SELECT id FROM public.sales_invoices WHERE order_id = OLD.id);
  DELETE FROM public.sales_invoices WHERE order_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_order_financial_links ON public.orders;
CREATE TRIGGER trg_cleanup_order_financial_links
BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.cleanup_order_financial_links();

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
  v_menu record;
  v_product record;
  v_name text;
  v_image text;
  v_price numeric;
  v_qty numeric;
  v_menu_id uuid;
  v_product_id uuid;
BEGIN
  SELECT name INTO v_restaurant_name FROM public.restaurants WHERE id = p_restaurant_id AND status IN ('active', 'trial');
  IF v_restaurant_name IS NULL THEN RAISE EXCEPTION 'المتجر غير متاح حالياً'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_price := NULL;
    IF v_menu_id IS NOT NULL THEN
      SELECT id, price INTO v_menu FROM public.menu_items WHERE id = v_menu_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF FOUND THEN v_price := COALESCE(v_menu.price, 0); END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT id, price INTO v_product FROM public.products WHERE id = v_product_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF FOUND THEN v_price := COALESCE(v_product.price, 0); END IF;
    END IF;
    IF v_price IS NOT NULL THEN v_total_amount := v_total_amount + (v_price * v_qty); END IF;
  END LOOP;

  IF v_total_amount <= 0 THEN RAISE EXCEPTION 'لا توجد أصناف صالحة في الطلب'; END IF;
  v_order_number := 'SF-' || to_char(now(), 'YYMMDD') || '-' || lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');

  INSERT INTO public.orders (restaurant_id, order_number, order_type, total, status, customer_name, customer_phone, delivery_address, notes, payment_method, paid_amount, created_at)
  VALUES (p_restaurant_id, v_order_number, COALESCE(p_order_type, 'takeaway'), v_total_amount, 'pending', COALESCE(p_customer_name, ''), COALESCE(p_customer_phone, ''), p_delivery_address, p_notes, 'cash', 0, now())
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::numeric, 1));
    v_menu_id := NULLIF(v_item->>'menu_item_id', '')::uuid;
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_name := NULL; v_image := COALESCE(v_item->>'image', '📦'); v_price := NULL;
    IF v_menu_id IS NOT NULL THEN
      SELECT name, price, image, product_id INTO v_menu FROM public.menu_items WHERE id = v_menu_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF FOUND THEN v_name := v_menu.name; v_price := COALESCE(v_menu.price, 0); v_image := COALESCE(v_menu.image, v_image); v_product_id := v_menu.product_id; END IF;
    ELSIF v_product_id IS NOT NULL THEN
      SELECT name, price, image INTO v_product FROM public.products WHERE id = v_product_id AND restaurant_id = p_restaurant_id AND available IS DISTINCT FROM false;
      IF FOUND THEN v_name := v_product.name; v_price := COALESCE(v_product.price, 0); v_image := COALESCE(v_product.image, v_image); END IF;
    END IF;
    IF v_price IS NOT NULL THEN
      INSERT INTO public.order_items (order_id, menu_item_id, product_id, menu_item_name, menu_item_image, quantity, price, sold_unit, unit_factor, variables, line_total)
      VALUES (v_order_id, v_menu_id, v_product_id, COALESCE(v_name, v_item->>'name', 'صنف'), v_image, v_qty, v_price, COALESCE(v_item->>'sold_unit', 'قطعة'), COALESCE((v_item->>'unit_factor')::numeric, 1), CASE WHEN v_item ? 'variables' THEN v_item->'variables' ELSE NULL END, v_qty * v_price);
    END IF;
  END LOOP;

  INSERT INTO public.notifications (restaurant_id, target_type, title, body, type, metadata)
  VALUES (p_restaurant_id, 'owner', 'طلب جديد من المتجر الإلكتروني', 'تم استلام طلب جديد من ' || COALESCE(p_customer_name, 'عميل') || ' - الإجمالي: ' || v_total_amount, 'order', jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number));

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total', v_total_amount);
END;
$$;

COMMIT;