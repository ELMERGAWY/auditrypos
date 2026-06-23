-- ============================================================
-- POS FLEXIBLE SELLING
-- Bidirectional pricing:
-- - entering amount recalculates quantity
-- - entering quantity recalculates amount
-- Also keeps order total synced from order_items
-- ============================================================

BEGIN;

-- 1) Extend order_items with explicit pricing fields
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(12,4),
  ADD COLUMN IF NOT EXISTS line_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS manual_sale_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS pricing_input_mode text
    CHECK (pricing_input_mode IN ('quantity', 'amount'));

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 2) Helper function to resolve unit price from source entities
CREATE OR REPLACE FUNCTION public.resolve_order_item_unit_price(
  p_menu_item_id uuid,
  p_product_id uuid,
  p_fallback_price numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_menu_price numeric;
  v_product_price numeric;
BEGIN
  IF p_menu_item_id IS NOT NULL THEN
    SELECT price INTO v_menu_price
    FROM public.menu_items
    WHERE id = p_menu_item_id;
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT price INTO v_product_price
    FROM public.products
    WHERE id = p_product_id;
  END IF;

  RETURN COALESCE(v_menu_price, v_product_price, p_fallback_price, 0);
END;
$$;

-- 3) Core pricing normalization trigger (before insert/update)
CREATE OR REPLACE FUNCTION public.normalize_order_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit_price numeric(12,4);
  v_qty numeric;
  v_amount numeric(12,2);
BEGIN
  v_unit_price := COALESCE(
    NEW.unit_price_snapshot,
    public.resolve_order_item_unit_price(NEW.menu_item_id, NEW.product_id, NEW.price)
  );

  IF v_unit_price < 0 THEN
    v_unit_price := 0;
  END IF;

  -- If seller entered amount, derive quantity from amount / unit_price.
  IF COALESCE(NEW.pricing_input_mode, '') = 'amount'
     OR (COALESCE(NEW.manual_sale_amount, 0) > 0 AND TG_OP = 'INSERT') THEN

    v_amount := COALESCE(NEW.manual_sale_amount, NEW.line_total, NEW.price, 0);

    IF v_unit_price > 0 THEN
      v_qty := ROUND((v_amount / v_unit_price)::numeric, 3);
    ELSE
      v_qty := COALESCE(NEW.quantity, 1);
    END IF;

    IF v_qty <= 0 THEN
      v_qty := 1;
    END IF;

    NEW.quantity := v_qty;
    NEW.line_total := ROUND(v_amount::numeric, 2);
    NEW.manual_sale_amount := ROUND(v_amount::numeric, 2);
    NEW.pricing_input_mode := 'amount';
  ELSE
    -- Default quantity-driven mode.
    v_qty := COALESCE(NEW.quantity, 1);
    IF v_qty <= 0 THEN
      v_qty := 1;
    END IF;

    v_amount := ROUND((v_qty * v_unit_price)::numeric, 2);

    NEW.quantity := v_qty;
    NEW.line_total := v_amount;
    NEW.manual_sale_amount := v_amount;
    NEW.pricing_input_mode := 'quantity';
  END IF;

  NEW.unit_price_snapshot := v_unit_price;

  -- Keep legacy price column as unit price for backward compatibility.
  NEW.price := v_unit_price;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_order_item_pricing ON public.order_items;
CREATE TRIGGER trg_normalize_order_item_pricing
BEFORE INSERT OR UPDATE OF quantity, price, menu_item_id, product_id, unit_price_snapshot, line_total, manual_sale_amount, pricing_input_mode
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_order_item_pricing();

-- 4) Keep order header total synced from items
CREATE OR REPLACE FUNCTION public.sync_order_total_from_items()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric(12,2);
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(COALESCE(line_total, quantity * price)), 0)
  INTO v_total
  FROM public.order_items
  WHERE order_id = v_order_id;

  UPDATE public.orders
  SET total = ROUND(v_total, 2)
  WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_ins ON public.order_items;
DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_upd ON public.order_items;
DROP TRIGGER IF EXISTS trg_sync_order_total_from_items_del ON public.order_items;

CREATE TRIGGER trg_sync_order_total_from_items_ins
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

CREATE TRIGGER trg_sync_order_total_from_items_upd
AFTER UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

CREATE TRIGGER trg_sync_order_total_from_items_del
AFTER DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_total_from_items();

-- 5) Backfill historical rows once
UPDATE public.order_items
SET unit_price_snapshot = COALESCE(unit_price_snapshot, price, 0),
    line_total = COALESCE(line_total, ROUND((COALESCE(quantity, 0) * COALESCE(price, 0))::numeric, 2)),
    manual_sale_amount = COALESCE(manual_sale_amount, ROUND((COALESCE(quantity, 0) * COALESCE(price, 0))::numeric, 2)),
    pricing_input_mode = COALESCE(pricing_input_mode, 'quantity')
WHERE unit_price_snapshot IS NULL
   OR line_total IS NULL
   OR manual_sale_amount IS NULL
   OR pricing_input_mode IS NULL;

-- Re-sync all order totals
UPDATE public.orders o
SET total = COALESCE(src.total_value, 0)
FROM (
  SELECT oi.order_id, ROUND(COALESCE(SUM(COALESCE(oi.line_total, oi.quantity * oi.price)), 0), 2) AS total_value
  FROM public.order_items oi
  GROUP BY oi.order_id
) src
WHERE src.order_id = o.id;

COMMIT;

