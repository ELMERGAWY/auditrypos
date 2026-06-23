
-- 1. Products: add secondary unit support
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS secondary_unit text DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_conversion_factor numeric DEFAULT 1;

-- 2. Order items: support fractional quantities and unit tracking
ALTER TABLE public.order_items
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS sold_unit text DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_factor numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cost_price_snapshot numeric DEFAULT 0;

-- 3. Orders: add customer_id link and client_order_id for dedup
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS client_order_id text;

-- Unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id 
  ON public.orders (client_order_id) WHERE client_order_id IS NOT NULL;

-- 4. Customer transactions: add payment_method and reference
ALTER TABLE public.customer_transactions
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reference_number text DEFAULT '';

-- 5. Trigger: restore inventory when order is DELETED
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

DROP TRIGGER IF EXISTS trg_restore_inventory_on_delete ON public.orders;
CREATE TRIGGER trg_restore_inventory_on_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_order_delete();

-- 6. Trigger: restore inventory on cancel (already exists as function, just create trigger)
DROP TRIGGER IF EXISTS trg_restore_inventory_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_inventory_on_cancel
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_for_cancelled_order();

-- 7. Trigger: deduct inventory on order item insert
DROP TRIGGER IF EXISTS trg_apply_inventory_on_item ON public.order_items;
CREATE TRIGGER trg_apply_inventory_on_item
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_inventory_for_order_item();

-- 8. Update apply_inventory to handle unit_factor
CREATE OR REPLACE FUNCTION public.apply_inventory_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _restaurant_id uuid;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
  _effective_qty numeric;
BEGIN
  SELECT restaurant_id INTO _restaurant_id
  FROM public.orders WHERE id = NEW.order_id;

  IF _restaurant_id IS NULL THEN RETURN NEW; END IF;

  _effective_qty := NEW.quantity * COALESCE(NEW.unit_factor, 1);

  IF NEW.product_id IS NOT NULL THEN
    PERFORM public.adjust_product_stock(
      NEW.product_id, _restaurant_id, _effective_qty, 'out', 'sale', NEW.order_id::text
    );
    RETURN NEW;
  END IF;

  IF NEW.menu_item_id IS NULL THEN RETURN NEW; END IF;

  SELECT inventory_mode, product_id INTO _inventory_mode, _linked_product_id
  FROM public.menu_items WHERE id = NEW.menu_item_id;

  IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
    PERFORM public.adjust_product_stock(
      _linked_product_id, _restaurant_id, _effective_qty, 'out', 'direct_sale', NEW.order_id::text
    );
  ELSIF _inventory_mode = 'recipe' THEN
    FOR _component IN
      SELECT product_id, quantity_required FROM public.menu_item_components WHERE menu_item_id = NEW.menu_item_id
    LOOP
      PERFORM public.adjust_product_stock(
        _component.product_id, _restaurant_id,
        _component.quantity_required * _effective_qty, 'out', 'recipe_sale', NEW.order_id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
