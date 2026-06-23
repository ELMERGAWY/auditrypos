-- ============================================================
-- COMPREHENSIVE INVENTORY FIX: DEDUCTION AND RESTORATION
-- ============================================================
-- This migration unifies all inventory-related triggers to ensure
-- consistent stock deduction on sale and restoration on delete/cancel.

-- 1. Drop all potentially conflicting old triggers
DROP TRIGGER IF EXISTS trg_apply_inventory_for_order_item ON public.order_items;
DROP TRIGGER IF EXISTS trg_apply_inventory_on_item ON public.order_items;
DROP TRIGGER IF EXISTS trg_restore_inventory_on_delete ON public.orders;
DROP TRIGGER IF EXISTS trg_restore_inventory_for_cancelled_order ON public.orders;
DROP TRIGGER IF EXISTS trg_restore_inventory_on_cancel ON public.orders;
DROP TRIGGER IF EXISTS trg_manage_order_item_inventory ON public.order_items;
DROP TRIGGER IF EXISTS trg_manage_order_status_inventory ON public.orders;

-- 2. Enhanced adjust_product_stock function (SECURITY DEFINER)
-- Bypasses RLS to ensure stock updates always succeed from triggers
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  _product_id uuid,
  _restaurant_id uuid,
  _quantity numeric,
  _movement_type text, -- 'in' (restoration) or 'out' (sale)
  _reason text,
  _reference_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Ensures permissions
SET search_path = public
AS $$
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN;
  END IF;

  -- Update product quantity
  IF _movement_type = 'out' THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) - _quantity,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
  ELSE
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + _quantity,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
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

-- 3. Unified Trigger Function for order_items
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
  _old_qty numeric;
  _new_qty numeric;
  _diff numeric;
BEGIN
  -- Get restaurant_id and status from parent order
  SELECT restaurant_id, status INTO _restaurant_id, _order_status
  FROM public.orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  IF _restaurant_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Case: INSERT (New item added)
  IF (TG_OP = 'INSERT') THEN
    -- Only deduct if order is NOT cancelled or returned
    IF _order_status NOT IN ('cancelled', 'returned') THEN
      _new_qty := NEW.quantity * COALESCE(NEW.unit_factor, 1);
      
      -- Direct Product
      IF NEW.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(NEW.product_id, _restaurant_id, _new_qty, 'out', 'sale', NEW.order_id::text);
      
      -- Menu Item
      ELSIF NEW.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = NEW.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _new_qty, 'out', 'direct_sale', NEW.order_id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _new_qty, 'out', 'recipe_sale', NEW.order_id::text);
          END LOOP;
        END IF;
      END IF;
    END IF;
    RETURN NEW;

  -- Case: DELETE (Item removed OR Order deleted)
  ELSIF (TG_OP = 'DELETE') THEN
    -- Only restore if order was NOT already cancelled (since cancel already restored it)
    IF _order_status NOT IN ('cancelled', 'returned') THEN
      _old_qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
      
      -- Direct Product
      IF OLD.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(OLD.product_id, _restaurant_id, _old_qty, 'in', 'item_deleted_restore', OLD.order_id::text);
      
      -- Menu Item
      ELSIF OLD.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = OLD.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _old_qty, 'in', 'item_deleted_restore', OLD.order_id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = OLD.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _old_qty, 'in', 'item_deleted_restore', OLD.order_id::text);
          END LOOP;
        END IF;
      END IF;
    END IF;
    RETURN OLD;

  -- Case: UPDATE (Quantity changed)
  ELSIF (TG_OP = 'UPDATE') THEN
    IF _order_status NOT IN ('cancelled', 'returned') THEN
      _old_qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
      _new_qty := NEW.quantity * COALESCE(NEW.unit_factor, 1);
      _diff := _new_qty - _old_qty;

      IF _diff != 0 THEN
        -- Direct Product
        IF NEW.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(NEW.product_id, _restaurant_id, ABS(_diff), 
            CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.order_id::text);
        
        -- Menu Item
        ELSIF NEW.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = NEW.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, ABS(_diff), 
              CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.order_id::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * ABS(_diff), 
                CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.order_id::text);
            END LOOP;
          END IF;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Unified Trigger Function for orders (Status Change)
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
  -- Case A: Order marked as cancelled or returned
  IF (NEW.status IN ('cancelled', 'returned')) AND (OLD.status NOT IN ('cancelled', 'returned')) THEN
    FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
      
      IF _item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', NEW.id::text);
      ELSIF _item.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = _item.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', NEW.id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'in', 'order_cancelled_restore', NEW.id::text);
          END LOOP;
        END IF;
      END IF;
    END LOOP;

  -- Case B: Order reinstated (e.g. cancelled -> pending)
  ELSIF (NEW.status NOT IN ('cancelled', 'returned')) AND (OLD.status IN ('cancelled', 'returned')) THEN
    FOR _item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      _qty := _item.quantity * COALESCE(_item.unit_factor, 1);
      
      IF _item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', NEW.id::text);
      ELSIF _item.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = _item.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'out', 'order_reinstated_deduct', NEW.id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'out', 'order_reinstated_deduct', NEW.id::text);
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach Triggers
CREATE TRIGGER trg_manage_order_item_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_item_inventory();

CREATE TRIGGER trg_manage_order_status_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_status_inventory();

-- 6. Force a schema cache reload for PostgREST
NOTIFY pgrst, 'reload schema';
