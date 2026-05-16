-- ============================================================
-- COMPREHENSIVE INVENTORY FIX V2: CRASH FIX AND IDEMPOTENCY
-- ============================================================
-- This migration fixes the crash during deletion and prevents
-- double-deduction by making stock adjustments idempotent.

BEGIN;

-- 1. Drop all potentially conflicting old triggers using a robust DO block
-- This ensures no "ghost" triggers with different names remain.
DO $$
DECLARE
    r record;
BEGIN
    -- Drop triggers on order_items related to inventory
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'order_items' 
          AND trigger_schema = 'public'
          AND (trigger_name LIKE '%inventory%' OR trigger_name LIKE '%stock%' OR trigger_name LIKE '%apply_inv%')
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON public.order_items';
    END LOOP;

    -- Drop triggers on orders related to inventory
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'orders' 
          AND trigger_schema = 'public'
          AND (trigger_name LIKE '%inventory%' OR trigger_name LIKE '%stock%' OR trigger_name LIKE '%restore_inv%')
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON public.orders';
    END LOOP;
END $$;

-- 2. Idempotent adjust_product_stock function
-- Prevents double-deduction by checking if a movement with the same reference_id already exists.
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  _product_id uuid,
  _restaurant_id uuid,
  _quantity numeric,
  _movement_type text, -- 'in' (restoration) or 'out' (sale)
  _reason text,
  _reference_id text -- Now used as a unique identifier for idempotency
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) = 0 THEN
    RETURN;
  END IF;

  -- IDEMPOTENCY CHECK:
  -- If we already have a movement for this specific reference and type, skip it.
  -- This prevents double deduction from multiple triggers.
  IF EXISTS (
    SELECT 1 FROM public.stock_movements 
    WHERE reference_id = _reference_id 
      AND product_id = _product_id 
      AND type = _movement_type
  ) THEN
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

-- 3. Fixed Trigger Function for order_items (Handles DELETE crash)
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
  _order_id uuid;
BEGIN
  -- Determine order_id safely based on operation
  IF (TG_OP = 'DELETE') THEN
    _order_id := OLD.order_id;
  ELSE
    _order_id := NEW.order_id;
  END IF;

  -- Get restaurant_id and status from parent order
  -- Use a separate block to handle missing orders gracefully
  SELECT restaurant_id, status INTO _restaurant_id, _order_status
  FROM public.orders WHERE id = _order_id;

  -- If order is not found (e.g. already deleted in cascaded delete), return safely
  IF _restaurant_id IS NULL THEN 
    RETURN COALESCE(NEW, OLD); 
  END IF;

  -- Case: INSERT (New item added)
  IF (TG_OP = 'INSERT') THEN
    IF _order_status NOT IN ('cancelled', 'returned') THEN
      _new_qty := NEW.quantity * COALESCE(NEW.unit_factor, 1);
      
      -- Direct Product
      IF NEW.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(NEW.product_id, _restaurant_id, _new_qty, 'out', 'sale', NEW.id::text);
      
      -- Menu Item
      ELSIF NEW.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = NEW.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _new_qty, 'out', 'direct_sale', NEW.id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _new_qty, 'out', 'recipe_sale', NEW.id::text);
          END LOOP;
        END IF;
      END IF;
    END IF;
    RETURN NEW;

  -- Case: DELETE (Item removed OR Order deleted)
  ELSIF (TG_OP = 'DELETE') THEN
    -- Only restore if order was NOT already cancelled (avoid double restoration)
    IF _order_status NOT IN ('cancelled', 'returned') THEN
      _old_qty := OLD.quantity * COALESCE(OLD.unit_factor, 1);
      
      -- Direct Product
      IF OLD.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(OLD.product_id, _restaurant_id, _old_qty, 'in', 'item_deleted_restore', OLD.id::text);
      
      -- Menu Item
      ELSIF OLD.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = OLD.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, _old_qty, 'in', 'item_deleted_restore', OLD.id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = OLD.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * _old_qty, 'in', 'item_deleted_restore', OLD.id::text);
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
        -- We use a compound ID for quantity updates to allow multiple adjustments if needed
        -- but still protect against trigger re-firing in the same transaction
        IF NEW.product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(NEW.product_id, _restaurant_id, ABS(_diff), 
            CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.id::text || '_upd_' || _new_qty::text);
        
        ELSIF NEW.menu_item_id IS NOT NULL THEN
          SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
          FROM public.menu_items WHERE id = NEW.menu_item_id;

          IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
            PERFORM public.adjust_product_stock(_linked_product_id, _restaurant_id, ABS(_diff), 
              CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.id::text || '_upd_' || _new_qty::text);
          ELSIF _inventory_mode = 'recipe' THEN
            FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id LOOP
              PERFORM public.adjust_product_stock(_component.product_id, _restaurant_id, _component.quantity_required * ABS(_diff), 
                CASE WHEN _diff > 0 THEN 'out' ELSE 'in' END, 'quantity_update', NEW.id::text || '_upd_' || _new_qty::text);
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

-- 4. Robust Trigger Function for orders (Status Change)
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
      
      -- Use item ID as reference to ensure idempotency with item trigger
      IF _item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(_item.product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
      ELSIF _item.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
        FROM public.menu_items WHERE id = _item.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(_linked_product_id, NEW.restaurant_id, _qty, 'in', 'order_cancelled_restore', _item.id::text);
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id LOOP
            PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'in', 'order_cancelled_restore', _item.id::text);
          END LOOP;
        END IF;
      END IF;
    END LOOP;

  -- Case B: Order reinstated (e.g. cancelled -> pending)
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
            PERFORM public.adjust_product_stock(_component.product_id, NEW.restaurant_id, _component.quantity_required * _qty, 'out', 'order_reinstated_deduct', _item.id::text);
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Re-attach Triggers with standardized names
-- This ensures they are easy to find and manage.
CREATE TRIGGER trg_manage_order_item_inventory
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_item_inventory();

CREATE TRIGGER trg_manage_order_status_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_manage_order_status_inventory();

-- 6. Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
