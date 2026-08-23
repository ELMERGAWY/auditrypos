-- ============================================================
-- FIX: Restore product stock when deleting orders/invoices
-- ============================================================
-- Root causes:
-- 1) 20260626000018 dropped ALL triggers on order_items
-- 2) trg_restore_inventory_on_delete on orders was dropped and never restored
-- 3) App sometimes deletes order_items first, sometimes only the order
-- Solution: restore from BOTH paths with shared idempotent reference_id
-- ============================================================

BEGIN;

-- Ensure FK cascade so deleting an order always deletes its items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'order_items' AND constraint_name = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.order_items DROP CONSTRAINT order_items_order_id_fkey;
  END IF;
  ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'order_items FK cascade ensure skipped: %', SQLERRM;
END $$;

-- Shared stock adjuster (idempotent per product+type+reference)
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
SET search_path TO 'public'
AS $$
DECLARE
  v_qty numeric := ABS(COALESCE(_quantity, 0));
BEGIN
  IF _product_id IS NULL OR v_qty = 0 OR _restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE reference_id = _reference_id
      AND product_id = _product_id
      AND type = _movement_type
  ) THEN
    RETURN false;
  END IF;

  IF _movement_type = 'out' THEN
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) - v_qty,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
  ELSE
    UPDATE public.products
    SET quantity = COALESCE(quantity, 0) + v_qty,
        updated_at = now()
    WHERE id = _product_id
      AND restaurant_id = _restaurant_id;
  END IF;

  -- تحديث رصيد المخزن الأساسي للصنف إن وُجد صف واحد أو أكثر
  IF to_regclass('public.warehouse_stock') IS NOT NULL THEN
    UPDATE public.warehouse_stock ws
    SET quantity = CASE
      WHEN _movement_type = 'out' THEN GREATEST(0, COALESCE(ws.quantity, 0) - v_qty)
      ELSE COALESCE(ws.quantity, 0) + v_qty
    END
    WHERE ws.product_id = _product_id
      AND ws.restaurant_id = _restaurant_id
      AND ws.id = (
        SELECT id FROM public.warehouse_stock
        WHERE product_id = _product_id AND restaurant_id = _restaurant_id
        ORDER BY COALESCE(quantity, 0) DESC
        LIMIT 1
      );
  END IF;

  INSERT INTO public.stock_movements (
    product_id, restaurant_id, quantity, type, reason, reference_id
  ) VALUES (
    _product_id, _restaurant_id, v_qty, _movement_type, _reason, _reference_id
  );

  RETURN true;
END;
$$;

-- Helper: restore one order_item's stock
CREATE OR REPLACE FUNCTION public.restore_stock_for_order_item(
  p_item public.order_items,
  p_restaurant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qty numeric;
  v_mode text;
  v_linked uuid;
  v_component record;
  v_ref text;
BEGIN
  v_qty := COALESCE(p_item.quantity, 0) * COALESCE(p_item.unit_factor, 1);
  IF v_qty <= 0 OR p_restaurant_id IS NULL THEN
    RETURN;
  END IF;

  -- Shared reference so order-delete + item-delete never double-restore
  v_ref := 'restore:' || p_item.id::text;

  IF p_item.product_id IS NOT NULL THEN
    PERFORM public.adjust_product_stock(
      p_item.product_id, p_restaurant_id, v_qty, 'in', 'order_delete_restore', v_ref
    );
  ELSIF p_item.menu_item_id IS NOT NULL THEN
    SELECT inventory_mode, product_id INTO v_mode, v_linked
    FROM public.menu_items WHERE id = p_item.menu_item_id;

    IF v_mode = 'direct' AND v_linked IS NOT NULL THEN
      PERFORM public.adjust_product_stock(
        v_linked, p_restaurant_id, v_qty, 'in', 'order_delete_restore_direct', v_ref
      );
    ELSIF v_mode = 'recipe' THEN
      FOR v_component IN
        SELECT product_id, quantity_required
        FROM public.menu_item_components
        WHERE menu_item_id = p_item.menu_item_id
      LOOP
        PERFORM public.adjust_product_stock(
          v_component.product_id,
          p_restaurant_id,
          COALESCE(v_component.quantity_required, 0) * v_qty,
          'in',
          'order_delete_restore_recipe',
          v_ref || ':' || v_component.product_id::text
        );
      END LOOP;
    END IF;
  END IF;
END;
$$;

-- BEFORE DELETE orders: restore while items still visible
CREATE OR REPLACE FUNCTION public.restore_inventory_on_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item public.order_items;
BEGIN
  -- Skip if already cancelled/returned (stock already restored by status trigger)
  IF COALESCE(OLD.status, '') IN ('cancelled', 'returned') THEN
    RETURN OLD;
  END IF;

  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = OLD.id
  LOOP
    PERFORM public.restore_stock_for_order_item(v_item, OLD.restaurant_id);
  END LOOP;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_inventory_on_delete ON public.orders;
CREATE TRIGGER trg_restore_inventory_on_delete
BEFORE DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_inventory_on_order_delete();

-- order_items trigger: deduct on insert/update, restore on delete (idempotent)
CREATE OR REPLACE FUNCTION public.fn_manage_order_item_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_restaurant_id uuid;
  v_status text;
  v_qty numeric;
  v_mode text;
  v_linked uuid;
  v_component record;
  v_ref text;
  v_diff numeric;
BEGIN
  SELECT restaurant_id, status INTO v_restaurant_id, v_status
  FROM public.orders
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  -- If parent order already gone, try restaurant from OLD only via products path
  IF v_restaurant_id IS NULL AND TG_OP = 'DELETE' THEN
    -- Still attempt restore using restaurant resolved from product
    SELECT restaurant_id INTO v_restaurant_id
    FROM public.products
    WHERE id = COALESCE(OLD.product_id, (
      SELECT product_id FROM public.menu_items WHERE id = OLD.menu_item_id
    ))
    LIMIT 1;
  END IF;

  IF v_restaurant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF COALESCE(v_status, '') IN ('cancelled', 'returned') AND TG_OP <> 'DELETE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- DELETE → restore
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(v_status, '') NOT IN ('cancelled', 'returned') THEN
      PERFORM public.restore_stock_for_order_item(OLD, v_restaurant_id);
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE → restore old then deduct new (or adjust diff)
  IF TG_OP = 'UPDATE' THEN
    v_diff := (COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_factor, 1))
            - (COALESCE(OLD.quantity, 0) * COALESCE(OLD.unit_factor, 1));

    IF v_diff = 0
       AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id
       AND NEW.menu_item_id IS NOT DISTINCT FROM OLD.menu_item_id THEN
      RETURN NEW;
    END IF;

    -- Restore old qty first
    PERFORM public.restore_stock_for_order_item(OLD, v_restaurant_id);
    -- Fall through to deduct NEW (with unique sale ref)
  END IF;

  -- INSERT / post-UPDATE deduct
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_qty := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_factor, 1);
    IF v_qty <= 0 THEN
      RETURN NEW;
    END IF;

    v_ref := 'sale:' || NEW.id::text || CASE WHEN TG_OP = 'UPDATE' THEN ':u:' || txid_current()::text ELSE '' END;

    IF NEW.product_id IS NOT NULL THEN
      PERFORM public.adjust_product_stock(NEW.product_id, v_restaurant_id, v_qty, 'out', 'order_item_sale', v_ref);
    ELSIF NEW.menu_item_id IS NOT NULL THEN
      SELECT inventory_mode, product_id INTO v_mode, v_linked
      FROM public.menu_items WHERE id = NEW.menu_item_id;

      IF v_mode = 'direct' AND v_linked IS NOT NULL THEN
        PERFORM public.adjust_product_stock(v_linked, v_restaurant_id, v_qty, 'out', 'direct_order_item_sale', v_ref);
      ELSIF v_mode = 'recipe' THEN
        FOR v_component IN
          SELECT product_id, quantity_required
          FROM public.menu_item_components
          WHERE menu_item_id = NEW.menu_item_id
        LOOP
          PERFORM public.adjust_product_stock(
            v_component.product_id,
            v_restaurant_id,
            COALESCE(v_component.quantity_required, 0) * v_qty,
            'out',
            'recipe_order_item_sale',
            v_ref || ':' || v_component.product_id::text
          );
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manage_order_item_inventory ON public.order_items;
DROP TRIGGER IF EXISTS trg_order_items_inventory_manage ON public.order_items;
CREATE TRIGGER trg_manage_order_item_inventory
AFTER INSERT OR UPDATE OF quantity, unit_factor, product_id, menu_item_id OR DELETE
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_manage_order_item_inventory();

-- Status cancel/return restore
CREATE OR REPLACE FUNCTION public.fn_manage_order_status_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item public.order_items;
  v_qty numeric;
  v_mode text;
  v_linked uuid;
  v_component record;
  v_ref text;
BEGIN
  IF NEW.status IN ('cancelled', 'returned')
     AND COALESCE(OLD.status, '') NOT IN ('cancelled', 'returned') THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      PERFORM public.restore_stock_for_order_item(v_item, NEW.restaurant_id);
    END LOOP;

  ELSIF COALESCE(NEW.status, '') NOT IN ('cancelled', 'returned')
        AND OLD.status IN ('cancelled', 'returned') THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      v_qty := COALESCE(v_item.quantity, 0) * COALESCE(v_item.unit_factor, 1);
      v_ref := 'sale:reinstated:' || v_item.id::text || ':' || txid_current()::text;

      IF v_item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(v_item.product_id, NEW.restaurant_id, v_qty, 'out', 'order_reinstated_deduct', v_ref);
      ELSIF v_item.menu_item_id IS NOT NULL THEN
        SELECT inventory_mode, product_id INTO v_mode, v_linked
        FROM public.menu_items WHERE id = v_item.menu_item_id;
        IF v_mode = 'direct' AND v_linked IS NOT NULL THEN
          PERFORM public.adjust_product_stock(v_linked, NEW.restaurant_id, v_qty, 'out', 'order_reinstated_deduct', v_ref);
        ELSIF v_mode = 'recipe' THEN
          FOR v_component IN
            SELECT product_id, quantity_required
            FROM public.menu_item_components
            WHERE menu_item_id = v_item.menu_item_id
          LOOP
            PERFORM public.adjust_product_stock(
              v_component.product_id, NEW.restaurant_id,
              COALESCE(v_component.quantity_required, 0) * v_qty,
              'out', 'order_reinstated_deduct',
              v_ref || ':' || v_component.product_id::text
            );
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manage_order_status_inventory ON public.orders;
DROP TRIGGER IF EXISTS trg_restore_inventory_for_cancelled_order ON public.orders;
CREATE TRIGGER trg_manage_order_status_inventory
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_manage_order_status_inventory();

-- RPC fallback for app layer
CREATE OR REPLACE FUNCTION public.restore_inventory_for_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders;
  v_item public.order_items;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF COALESCE(v_order.status, '') IN ('cancelled', 'returned') THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    PERFORM public.restore_stock_for_order_item(v_item, v_order.restaurant_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_inventory_for_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, uuid, numeric, text, text, text) TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Inventory restore on order/invoice delete is FIXED';
END $$;
