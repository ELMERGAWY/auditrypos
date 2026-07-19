-- ================================================================
-- FIX: Inventory Transfer RPC Function with Product & Unit Sync
-- ================================================================

CREATE OR REPLACE FUNCTION public.execute_inventory_transfer(
  p_restaurant_id    UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id  UUID,
  p_product_id       UUID,
  p_quantity         NUMERIC,
  p_notes            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id       UUID;
  v_src_stock_id      UUID;
  v_src_qty           NUMERIC := 0;
  v_dst_stock_id      UUID;
  v_dst_qty           NUMERIC := 0;
  
  -- Source product details
  v_src_barcode       TEXT;
  v_src_sku           TEXT;
  v_src_name          TEXT;
  v_src_unit          TEXT;
  v_src_sec_unit      TEXT;
  v_src_conv_factor   NUMERIC;
  v_src_cost_price    NUMERIC;
  v_src_price         NUMERIC;
  v_src_category      TEXT;
  v_src_image         TEXT;
  
  -- Destination product details
  v_dst_product_id    UUID;
  v_dst_unit          TEXT;
  v_dst_sec_unit      TEXT;
  v_dst_conv_factor   NUMERIC;
  
  -- Converted quantity
  v_dst_transfer_qty  NUMERIC;
BEGIN
  -- 0. Validate same-warehouse
  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن التحويل لنفس المخزن');
  END IF;

  -- 1. Get source product details
  SELECT barcode, sku, name, unit, secondary_unit, COALESCE(unit_conversion_factor, 1), cost_price, price, category, image
  INTO v_src_barcode, v_src_sku, v_src_name, v_src_unit, v_src_sec_unit, v_src_conv_factor, v_src_cost_price, v_src_price, v_src_category, v_src_image
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصنف المصدر غير موجود');
  END IF;

  -- 2. Validate source stock (use warehouse_stock or product.quantity as fallback)
  SELECT id, quantity INTO v_src_stock_id, v_src_qty
  FROM public.warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id
    AND product_id = p_product_id
  LIMIT 1;

  IF v_src_stock_id IS NULL THEN
    -- Fallback: Use product.quantity
    SELECT quantity INTO v_src_qty FROM public.products WHERE id = p_product_id;
  END IF;

  IF COALESCE(v_src_qty, 0) < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('الكمية المتاحة في المستودع المصدر: %s فقط', COALESCE(v_src_qty, 0))
    );
  END IF;

  -- 3. Find matching product in destination warehouse (by barcode, sku, or name)
  SELECT id, unit, secondary_unit, COALESCE(unit_conversion_factor, 1)
  INTO v_dst_product_id, v_dst_unit, v_dst_sec_unit, v_dst_conv_factor
  FROM public.products
  WHERE restaurant_id = p_restaurant_id
    AND warehouse_id = p_to_warehouse_id
    AND id != p_product_id
    AND (
      (barcode IS NOT NULL AND barcode != '' AND barcode = v_src_barcode) OR
      (sku IS NOT NULL AND sku != '' AND sku = v_src_sku) OR
      (name = v_src_name)
    )
  LIMIT 1;

  -- 4. If destination product doesn't exist, create it!
  IF v_dst_product_id IS NULL THEN
    INSERT INTO public.products (
      restaurant_id,
      warehouse_id,
      name,
      barcode,
      sku,
      category,
      price,
      cost_price,
      unit,
      secondary_unit,
      unit_conversion_factor,
      image,
      quantity,
      min_quantity,
      available
    ) VALUES (
      p_restaurant_id,
      p_to_warehouse_id,
      v_src_name,
      v_src_barcode,
      v_src_sku,
      v_src_category,
      v_src_price,
      v_src_cost_price,
      v_src_unit,
      v_src_sec_unit,
      v_src_conv_factor,
      v_src_image,
      0, -- start with 0, updated below
      5,
      true
    )
    RETURNING id, unit, secondary_unit, COALESCE(unit_conversion_factor, 1)
    INTO v_dst_product_id, v_dst_unit, v_dst_sec_unit, v_dst_conv_factor;
  END IF;

  -- 5. Calculate unit conversion ratio between source and destination product
  -- Default is 1.0 (no conversion)
  v_dst_transfer_qty := p_quantity;

  IF v_src_unit IS NOT NULL AND v_dst_unit IS NOT NULL THEN
    -- Trim and lowercase units for comparison
    DECLARE
      src_u TEXT := lower(trim(v_src_unit));
      dst_u TEXT := lower(trim(v_dst_unit));
      src_sec TEXT := lower(trim(COALESCE(v_src_sec_unit, '')));
      dst_sec TEXT := lower(trim(COALESCE(v_dst_sec_unit, '')));
    BEGIN
      IF src_u != dst_u THEN
        -- Case A: Source unit matches destination's secondary unit (e.g. source is Piece, dest is Box of X pieces)
        IF src_u = dst_sec AND v_dst_conv_factor > 0 THEN
          v_dst_transfer_qty := p_quantity / v_dst_conv_factor;
        -- Case B: Source's secondary unit matches destination's unit (e.g. source is Box of X pieces, dest is Piece)
        ELSIF src_sec = dst_u AND v_src_conv_factor > 0 THEN
          v_dst_transfer_qty := p_quantity * v_src_conv_factor;
        -- Case C: Source unit is a box/package and dest is a piece
        ELSIF (src_u LIKE '%كرتون%' OR src_u LIKE '%علب%' OR src_u LIKE '%صندو%' OR src_u LIKE '%عبو%') 
              AND (dst_u LIKE '%قطع%' OR dst_u LIKE '%حبة%') 
              AND v_src_conv_factor > 0 THEN
          v_dst_transfer_qty := p_quantity * v_src_conv_factor;
        -- Case D: Source unit is a piece and dest is a box/package
        ELSIF (src_u LIKE '%قطع%' OR src_u LIKE '%حبة%') 
              AND (dst_u LIKE '%كرتون%' OR dst_u LIKE '%علب%' OR dst_u LIKE '%صندو%' OR dst_u LIKE '%عبو%') 
              AND v_dst_conv_factor > 0 THEN
          v_dst_transfer_qty := p_quantity / v_dst_conv_factor;
        END IF;
      END IF;
    END;
  END IF;

  -- 6. Create inventory_transfers record
  INSERT INTO public.inventory_transfers (
    restaurant_id,
    from_warehouse_id,
    to_warehouse_id,
    notes,
    status
  ) VALUES (
    p_restaurant_id,
    p_from_warehouse_id,
    p_to_warehouse_id,
    p_notes,
    'received'
  )
  RETURNING id INTO v_transfer_id;

  -- 7. Create inventory_transfer_items record
  INSERT INTO public.inventory_transfer_items (
    transfer_id,
    restaurant_id,
    product_id,
    quantity,
    cost_price
  ) VALUES (
    v_transfer_id,
    p_restaurant_id,
    p_product_id,
    p_quantity,
    COALESCE(v_src_cost_price, 0)
  );

  -- 8. Deduct from source product quantity (in products table)
  UPDATE public.products
  SET quantity = GREATEST(0, COALESCE(quantity, 0) - p_quantity)
  WHERE id = p_product_id;

  -- 9. Add to destination product quantity (in products table)
  UPDATE public.products
  SET quantity = COALESCE(quantity, 0) + v_dst_transfer_qty
  WHERE id = v_dst_product_id;

  -- 10. Deduct from source warehouse_stock
  IF v_src_stock_id IS NOT NULL THEN
    UPDATE public.warehouse_stock
    SET quantity = GREATEST(0, quantity - p_quantity)
    WHERE id = v_src_stock_id;
  ELSE
    INSERT INTO public.warehouse_stock (
      restaurant_id, warehouse_id, product_id, quantity
    ) VALUES (
      p_restaurant_id, p_from_warehouse_id, p_product_id, 0
    )
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = GREATEST(0, public.warehouse_stock.quantity - p_quantity);
  END IF;

  -- 11. Add to destination warehouse_stock
  SELECT id, quantity
  INTO v_dst_stock_id, v_dst_qty
  FROM public.warehouse_stock
  WHERE warehouse_id = p_to_warehouse_id
    AND product_id = v_dst_product_id
  LIMIT 1;

  IF v_dst_stock_id IS NOT NULL THEN
    UPDATE public.warehouse_stock
    SET quantity = COALESCE(quantity, 0) + v_dst_transfer_qty
    WHERE id = v_dst_stock_id;
  ELSE
    INSERT INTO public.warehouse_stock (
      restaurant_id, warehouse_id, product_id, quantity
    ) VALUES (
      p_restaurant_id, p_to_warehouse_id, v_dst_product_id, v_dst_transfer_qty
    )
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = public.warehouse_stock.quantity + v_dst_transfer_qty;
  END IF;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_inventory_transfer(UUID, UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_inventory_transfer(UUID, UUID, UUID, UUID, NUMERIC, TEXT) TO service_role;
