-- ============================================================
-- INVENTORY DEBUG AND FIX V3
-- ============================================================
-- 1. Adds detailed error reporting to triggers
-- 2. Makes stock adjustments even more idempotent
-- 3. Standardizes trigger names for easy debugging

BEGIN;

-- 1. Helper function for idempotent stock adjustment
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
SET search_path = public
AS $$
DECLARE
  v_current_qty numeric;
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN;
  END IF;

  -- IDEMPOTENCY CHECK:
  -- Prevent multiple adjustments for the same reference_id and type
  IF EXISTS (
    SELECT 1 FROM public.stock_movements 
    WHERE reference_id = _reference_id 
      AND product_id = _product_id 
      AND type = _movement_type
  ) THEN
    RETURN;
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

  -- If product was not found (maybe deleted), just return
  IF v_current_qty IS NULL THEN
    RETURN;
  END IF;

  -- Log movement
  INSERT INTO public.stock_movements (
    product_id, restaurant_id, quantity, type, reason, reference_id
  )
  VALUES (
    _product_id, _restaurant_id, ABS(_quantity), _movement_type, _reason, _reference_id
  );
END;
$$;

-- 2. Trigger for order items
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
BEGIN
  BEGIN
    _order_id := COALESCE(NEW.order_id, OLD.order_id);

    SELECT restaurant_id, status INTO _restaurant_id, _order_status
    FROM public.orders WHERE id = _order_id;

    IF _restaurant_id IS NULL THEN 
      RETURN COALESCE(NEW, OLD); 
    END IF;

    -- INSERT / UPDATE (Deduction)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.quantity <> OLD.quantity) THEN
      IF _order_status NOT IN ('cancelled', 'returned') THEN
        -- If update, first restore old quantity to avoid complex diff logic
        IF TG_OP = 'UPDATE' THEN
          _qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
          IF OLD.product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(OLD.product_id, _restaurant_id, _qty, 'in', 'item_updated_restore', OLD.id::text || '_upd_restore');
          END IF;
        END IF;

        -- Now deduct new quantity
        _qty := (CASE WHEN TG_OP = 'INSERT' THEN NEW.quantity ELSE NEW.quantity END) * COALESCE(NEW.unit_factor, 1);
        
        IF NEW.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(NEW.product_id, _restaurant_id, _qty, 'out', 'item_sale', NEW.id::text);
        ELSIF NEW.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = NEW.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _qty, 'out', 'direct_sale', NEW.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _qty, 'out', 'recipe_sale', NEW.id::text || '_' || _component.product_id::text);
            END LOOP;
          END IF;
        END IF;
      END IF;

    -- DELETE (Restoration)
    ELSIF (TG_OP = 'DELETE') THEN
      IF _order_status NOT IN ('cancelled', 'returned') THEN
        _qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
        IF OLD.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(OLD.product_id, _restaurant_id, _qty, 'in', 'item_deleted_restore', OLD.id::text);
        ELSIF OLD.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = OLD.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _qty, 'in', 'item_deleted_restore', OLD.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = OLD.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _qty, 'in', 'item_deleted_restore', OLD.id::text || '_' || _component.product_id::text);
            END LOOP;
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
BEGIN
  BEGIN
    -- Case: Cancelled/Returned (Restore stock)
    IF (NEW.status IN ('cancelled', 'returned')) AND (OLD.status NOT IN ('cancelled', 'returned')) THEN
      FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
        _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
        IF _item.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
        ELSIF _item.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = _item.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'in', 'order_cancelled_restore', _item.id::text || '_' || _component.product_id::text);
            END LOOP;
          END IF;
        END IF;
      END LOOP;

    -- Case: Re-instated (Deduct stock)
    ELSIF (NEW.status NOT IN ('cancelled', 'returned')) AND (OLD.status IN ('cancelled', 'returned')) THEN
      FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
        _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
        IF _item.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', _item.id::text);
        ELSIF _item.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = _item.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', _item.id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'out', 'order_reinstated_deduct', _item.id::text || '_' || _component.product_id::text);
            END LOOP;
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

-- 4. Re-attach triggers with aggressive dropping
DROP TRIGGER IF EXISTS trg_manage_order_item_inventory ON public.order_items;
CREATE TRIGGER trg_manage_order_item_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_item_inventory();

DROP TRIGGER IF EXISTS trg_manage_order_status_inventory ON public.orders;
CREATE TRIGGER trg_manage_order_status_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_status_inventory();

COMMIT;
