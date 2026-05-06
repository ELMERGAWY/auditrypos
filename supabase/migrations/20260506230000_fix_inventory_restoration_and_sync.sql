-- Fix Inventory Restoration for Deleted and Cancelled Orders
-- Supporting unit factors and unifying logic

-- 1. Function to restore inventory on DELETE
CREATE OR REPLACE FUNCTION public.restore_inventory_on_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _item record;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
BEGIN
  -- We use OLD because it's a BEFORE DELETE trigger
  FOR _item IN
    SELECT * FROM public.order_items WHERE order_id = OLD.id
  LOOP
    IF _item.product_id IS NOT NULL THEN
      PERFORM public.adjust_product_stock(
        _item.product_id, OLD.restaurant_id, _item.quantity * COALESCE(_item.unit_factor, 1),
        'in', 'order_deleted_restore', OLD.id::text
      );
    ELSIF _item.menu_item_id IS NOT NULL THEN
      SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
      FROM public.menu_items WHERE id = _item.menu_item_id;

      IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(
          _linked_product_id, OLD.restaurant_id, _item.quantity * COALESCE(_item.unit_factor, 1),
          'in', 'deleted_direct_restore', OLD.id::text
        );
      ELSIF _inventory_mode = 'recipe' THEN
        FOR _component IN
          SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = _item.menu_item_id
        LOOP
          PERFORM public.adjust_product_stock(
            _component.product_id, OLD.restaurant_id,
            _component.quantity_required * _item.quantity * COALESCE(_item.unit_factor, 1),
            'in', 'deleted_recipe_restore', OLD.id::text
          );
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  RETURN OLD;
END;
$$;

-- 2. Improved Function to restore inventory on CANCEL (Update status)
CREATE OR REPLACE FUNCTION public.restore_inventory_for_cancelled_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _item record;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
BEGIN
  -- Only trigger if status changes TO cancelled
  IF (NEW.status = 'cancelled' OR NEW.status = 'returned') AND COALESCE(OLD.status, '') NOT IN ('cancelled', 'returned') THEN
    FOR _item IN
      SELECT *
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      IF _item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(
          _item.product_id,
          NEW.restaurant_id,
          _item.quantity * COALESCE(_item.unit_factor, 1),
          'in',
          'cancelled_order_restore',
          NEW.id::text
        );
      ELSIF _item.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id
        INTO _inventory_mode, _linked_product_id
        FROM public.menu_items
        WHERE id = _item.menu_item_id;

        IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
          PERFORM public.adjust_product_stock(
            _linked_product_id,
            NEW.restaurant_id,
            _item.quantity * COALESCE(_item.unit_factor, 1),
            'in',
            'cancelled_direct_sale_restore',
            NEW.id::text
          );
        ELSIF _inventory_mode = 'recipe' THEN
          FOR _component IN
            SELECT product_id, quantity_required
            FROM public.menu_item_components
            WHERE menu_item_id = _item.menu_item_id
          LOOP
            PERFORM public.adjust_product_stock(
              _component.product_id,
              NEW.restaurant_id,
              _component.quantity_required * _item.quantity * COALESCE(_item.unit_factor, 1),
              'in',
              'cancelled_recipe_sale_restore',
              NEW.id::text
            );
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Re-install triggers
DROP TRIGGER IF EXISTS trg_restore_inventory_on_delete ON public.orders;
CREATE TRIGGER trg_restore_inventory_on_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_order_delete();

DROP TRIGGER IF EXISTS trg_restore_inventory_for_cancelled_order ON public.orders;
CREATE TRIGGER trg_restore_inventory_for_cancelled_order
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_for_cancelled_order();

-- 4. Ensure adjust_product_stock handles negative quantities correctly (safety check)
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
SET search_path = public
AS $$
BEGIN
  IF _product_id IS NULL OR COALESCE(_quantity, 0) <= 0 THEN
    RETURN;
  END IF;

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

  INSERT INTO public.stock_movements (product_id, restaurant_id, quantity, type, reason, reference_id)
  VALUES (_product_id, _restaurant_id, _quantity, _movement_type, _reason, _reference_id);
END;
$$;
