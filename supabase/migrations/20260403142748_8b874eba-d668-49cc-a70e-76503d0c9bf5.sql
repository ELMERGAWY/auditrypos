ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS product_id uuid,
ADD COLUMN IF NOT EXISTS inventory_mode text NOT NULL DEFAULT 'none';

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS menu_item_id uuid,
ADD COLUMN IF NOT EXISTS product_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_menu_item_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_menu_item_id_fkey
      FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.menu_item_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_required numeric NOT NULL DEFAULT 1,
  unit_label text NOT NULL DEFAULT 'وحدة',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, product_id)
);

ALTER TABLE public.menu_item_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage menu item components" ON public.menu_item_components;
CREATE POLICY "Owners manage menu item components"
ON public.menu_item_components
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_components.menu_item_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_components.menu_item_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

CREATE INDEX IF NOT EXISTS idx_menu_items_product_id ON public.menu_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_components_menu_item_id ON public.menu_item_components(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_components_product_id ON public.menu_item_components(product_id);

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
    SET quantity = GREATEST(COALESCE(quantity, 0) - _quantity, 0),
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

CREATE OR REPLACE FUNCTION public.apply_inventory_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
BEGIN
  SELECT restaurant_id INTO _restaurant_id
  FROM public.orders
  WHERE id = NEW.order_id;

  IF _restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NOT NULL THEN
    PERFORM public.adjust_product_stock(
      NEW.product_id,
      _restaurant_id,
      NEW.quantity,
      'out',
      'sale',
      NEW.order_id::text
    );
    RETURN NEW;
  END IF;

  IF NEW.menu_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT inventory_mode, product_id
  INTO _inventory_mode, _linked_product_id
  FROM public.menu_items
  WHERE id = NEW.menu_item_id;

  IF _inventory_mode = 'direct' AND _linked_product_id IS NOT NULL THEN
    PERFORM public.adjust_product_stock(
      _linked_product_id,
      _restaurant_id,
      NEW.quantity,
      'out',
      'direct_sale',
      NEW.order_id::text
    );
  ELSIF _inventory_mode = 'recipe' THEN
    FOR _component IN
      SELECT product_id, quantity_required
      FROM public.menu_item_components
      WHERE menu_item_id = NEW.menu_item_id
    LOOP
      PERFORM public.adjust_product_stock(
        _component.product_id,
        _restaurant_id,
        _component.quantity_required * NEW.quantity,
        'out',
        'recipe_sale',
        NEW.order_id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory_for_cancelled_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _item record;
  _inventory_mode text;
  _linked_product_id uuid;
  _component record;
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status, '') <> 'cancelled' THEN
    FOR _item IN
      SELECT *
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      IF _item.product_id IS NOT NULL THEN
        PERFORM public.adjust_product_stock(
          _item.product_id,
          NEW.restaurant_id,
          _item.quantity,
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
            _item.quantity,
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
              _component.quantity_required * _item.quantity,
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

DROP TRIGGER IF EXISTS trg_apply_inventory_for_order_item ON public.order_items;
CREATE TRIGGER trg_apply_inventory_for_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_for_order_item();

DROP TRIGGER IF EXISTS trg_restore_inventory_for_cancelled_order ON public.orders;
CREATE TRIGGER trg_restore_inventory_for_cancelled_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_inventory_for_cancelled_order();