-- ============================================================
-- INVENTORY FIX V4: ROBUST ID LOOKUP AND FALLBACK
-- ============================================================
-- Fixes the issue where inventory is not deducted/restored 
-- because of mismatched IDs between order_items and products.

BEGIN;

-- 1. Helper function for idempotent stock adjustment (now returns boolean)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  _product_id uuid,
  _restaurant_id uuid,
  _quantity numeric,
  _movement_type text,
  _reason text,
  _reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN false;
  END IF;

  -- IDEMPOTENCY CHECK
  IF EXISTS (
    SELECT 1 FROM public.stock_movements 
    WHERE reference_id = _reference_id 
      AND product_id = _product_id 
      AND type = _movement_type
  ) THEN
    RETURN true; -- Already done
  END IF;

  -- Update quantity
  IF _movement_type = 'out' THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) - ABS(_quantity),
        updated_at = now()
    WHERE id = _product_id AND restaurant_id = _restaurant_id
    RETURNING quantity INTO v_current_qty;
  ELSE
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + ABS(_quantity),
        updated_at = now()
    WHERE id = _product_id AND restaurant_id = _restaurant_id
    RETURNING quantity INTO v_current_qty;
  END IF;

  -- If product was not found in this restaurant, try without restaurant_id as fallback
  -- (Some systems might share products across branches)
  IF v_current_qty IS NULL THEN
    IF _movement_type = 'out' THEN
      UPDATE public.products
      SET quantity = COALESCE(quantity, 0) - ABS(_quantity),
          updated_at = now()
      WHERE id = _product_id
      RETURNING quantity INTO v_current_qty;
    ELSE
      UPDATE public.products
      SET quantity = COALESCE(quantity, 0) + ABS(_quantity),
          updated_at = now()
      WHERE id = _product_id
      RETURNING quantity INTO v_current_qty;
    END IF;
  END IF;

  -- If still not found, return false
  IF v_current_qty IS NULL THEN
    RETURN false;
  END IF;

  -- Log movement
  INSERT INTO public.stock_movements (
    product_id, restaurant_id, quantity, type, reason, reference_id
  )
  VALUES (
    _product_id, _restaurant_id, ABS(_quantity), _movement_type, _reason, _reference_id
  );
  
  RETURN true;
END;
$$;

-- 2. Trigger function with fallback logic
CREATE OR REPLACE FUNCTION public.fn_manage_order_item_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
  _order_status text;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
  _qty numeric;
  _order_id uuid;
  _success boolean;
BEGIN
  BEGIN
    _order_id := COALESCE(NEW.order_id, OLD.order_id);

    SELECT restaurant_id, status INTO _restaurant_id, _order_status
    FROM public.orders WHERE id = _order_id;

    IF _restaurant_id IS NULL THEN 
      RETURN COALESCE(NEW, OLD); 
    END IF;

    -- INSERT / UPDATE
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.quantity <> OLD.quantity) THEN
      IF _order_status NOT IN ('cancelled', 'returned') THEN
        IF TG_OP = 'UPDATE' THEN
          _qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
          PERFORM public.adjust_product_stock(OLD.product_id, _restaurant_id, _qty, 'in', 'item_updated_restore', OLD.id::text || '_upd_restore');
        END IF;

        _qty := NEW.quantity * COALESCE(NEW.unit_factor, 1);
        _success := false;

        -- Try direct product_id first
        IF NEW.product_id IS NOT NULL THEN
          _success := public.adjust_product_stock(NEW.product_id, _restaurant_id, _qty, 'out', 'item_sale', NEW.id::text);
        END IF;

        -- Fallback: If product_id failed or was null, try menu_item_id
        IF NOT _success AND NEW.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = NEW.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            _success := public.adjust_product_stock(_linked_product_id, _restaurant_id, _qty, 'out', 'direct_sale', NEW.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _qty, 'out', 'recipe_sale', NEW.id::text || '_' || _component.product_id::text);
            END LOOP;
          ELSIF _inventory_mode = 'none' OR _inventory_mode IS NULL THEN
            -- If it's a retail driven business, it might be the product itself
            _success := public.adjust_product_stock(NEW.menu_item_id, _restaurant_id, _qty, 'out', 'retail_item_sale', NEW.id::text);
          END IF;
        END IF;
      END IF;

    -- DELETE
    ELSIF (TG_OP = 'DELETE') THEN
      IF _order_status NOT IN ('cancelled', 'returned') THEN
        _qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
        _success := false;

        IF OLD.product_id IS NOT NULL THEN
          _success := public.adjust_product_stock(OLD.product_id, _restaurant_id, _qty, 'in', 'item_deleted_restore', OLD.id::text);
        END IF;

        IF NOT _success AND OLD.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = OLD.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            _success := public.adjust_product_stock(_linked_product_id, _restaurant_id, _qty, 'in', 'item_deleted_restore', OLD.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = OLD.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _qty, 'in', 'item_deleted_restore', OLD.id::text || '_' || _component.product_id::text);
            END LOOP;
          ELSIF _inventory_mode = 'none' OR _inventory_mode IS NULL THEN
            _success := public.adjust_product_stock(OLD.menu_item_id, _restaurant_id, _qty, 'in', 'retail_item_restore', OLD.id::text);
          END IF;
        END IF;
      END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Inventory Error [Item Trigger]: % | Order: %', SQLERRM, _order_id;
  END;
END;
$$;

-- 3. Trigger for order status
CREATE OR REPLACE FUNCTION public.fn_manage_order_status_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item record;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
  _qty numeric;
  _success boolean;
BEGIN
  BEGIN
    -- Case: Cancelled/Returned
    IF (NEW.status IN ('cancelled', 'returned')) AND (OLD.status NOT IN ('cancelled', 'returned')) THEN
      FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
        _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
        _success := false;

        IF _item.product_id IS NOT NULL THEN
          _success := public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
        END IF;

        IF NOT _success AND _item.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = _item.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            _success := public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'in', 'order_cancelled_restore', _item.id::text || '_' || _component.product_id::text);
            END LOOP;
          ELSIF _inventory_mode = 'none' OR _inventory_mode IS NULL THEN
            _success := public.adjust_product_stock(_item.menu_item_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
          END IF;
        END IF;
      END LOOP;

    -- Case: Re-instated
    ELSIF (NEW.status NOT IN ('cancelled', 'returned')) AND (OLD.status IN ('cancelled', 'returned')) THEN
      FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
        _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
        _success := false;

        IF _item.product_id IS NOT NULL THEN
          _success := public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', _item.id::text);
        END IF;

        IF NOT _success AND _item.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = _item.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            _success := public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', _item.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'out', 'order_reinstated_deduct', _item.id::text || '_' || _component.product_id::text);
            END LOOP;
          ELSIF _inventory_mode = 'none' OR _inventory_mode IS NULL THEN
            _success := public.adjust_product_stock(_item.menu_item_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', _item.id::text);
          END IF;
        END IF;
      END LOOP;
    END IF;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Inventory Error [Status Trigger]: % | Order: %', SQLERRM, NEW.id;
  END;
END;
$$;

COMMIT;
