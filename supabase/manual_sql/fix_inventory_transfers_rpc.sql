-- ================================================================
-- FIX: Inventory Transfer RPC Function (SECURITY DEFINER)
-- Run this in Supabase SQL Editor
-- ================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.execute_inventory_transfer(
  p_restaurant_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC,
  p_notes TEXT
);

-- Create atomic transfer function with SECURITY DEFINER (bypasses RLS)
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
  v_transfer_id     UUID;
  v_src_stock_id    UUID;
  v_src_qty         NUMERIC := 0;
  v_dst_stock_id    UUID;
  v_dst_qty         NUMERIC := 0;
  v_product_qty     NUMERIC := 0;
  v_cost_price      NUMERIC := 0;
BEGIN
  -- 0. Validate same-warehouse
  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن التحويل لنفس المخزن');
  END IF;

  -- 1. Get source warehouse_stock
  SELECT id, quantity
  INTO v_src_stock_id, v_src_qty
  FROM public.warehouse_stock
  WHERE warehouse_id = p_from_warehouse_id
    AND product_id = p_product_id
  LIMIT 1;

  -- 2. Fallback: use product.quantity if no warehouse_stock row
  IF v_src_stock_id IS NULL THEN
    SELECT quantity, cost_price
    INTO v_product_qty, v_cost_price
    FROM public.products
    WHERE id = p_product_id;
    v_src_qty := COALESCE(v_product_qty, 0);
  ELSE
    SELECT cost_price INTO v_cost_price
    FROM public.products WHERE id = p_product_id;
  END IF;

  -- 3. Check sufficient quantity
  IF v_src_qty < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('الكمية المتاحة في المستودع المصدر: %s فقط', v_src_qty)
    );
  END IF;

  -- 4. Create inventory_transfers record
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

  -- 5. Create inventory_transfer_items record
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
    COALESCE(v_cost_price, 0)
  );

  -- 6. Deduct from source warehouse_stock (upsert)
  IF v_src_stock_id IS NOT NULL THEN
    UPDATE public.warehouse_stock
    SET quantity = GREATEST(0, v_src_qty - p_quantity)
    WHERE id = v_src_stock_id;
  ELSE
    INSERT INTO public.warehouse_stock (
      restaurant_id, warehouse_id, product_id, quantity
    ) VALUES (
      p_restaurant_id, p_from_warehouse_id, p_product_id,
      GREATEST(0, v_src_qty - p_quantity)
    )
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = GREATEST(0, public.warehouse_stock.quantity - p_quantity);
  END IF;

  -- 7. Add to destination warehouse_stock (upsert)
  SELECT id, quantity
  INTO v_dst_stock_id, v_dst_qty
  FROM public.warehouse_stock
  WHERE warehouse_id = p_to_warehouse_id
    AND product_id = p_product_id
  LIMIT 1;

  IF v_dst_stock_id IS NOT NULL THEN
    UPDATE public.warehouse_stock
    SET quantity = COALESCE(v_dst_qty, 0) + p_quantity
    WHERE id = v_dst_stock_id;
  ELSE
    INSERT INTO public.warehouse_stock (
      restaurant_id, warehouse_id, product_id, quantity
    ) VALUES (
      p_restaurant_id, p_to_warehouse_id, p_product_id, p_quantity
    )
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET
      quantity = public.warehouse_stock.quantity + p_quantity;
  END IF;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_inventory_transfer(UUID, UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_inventory_transfer(UUID, UUID, UUID, UUID, NUMERIC, TEXT) TO service_role;

-- Also ensure RLS select policies exist for reading transfers
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

-- Drop & recreate permissive policies for all operations
DROP POLICY IF EXISTS "transfers_all" ON public.inventory_transfers;
CREATE POLICY "transfers_all" ON public.inventory_transfers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "transfer_items_all" ON public.inventory_transfer_items;
CREATE POLICY "transfer_items_all" ON public.inventory_transfer_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "warehouse_stock_all" ON public.warehouse_stock;
CREATE POLICY "warehouse_stock_all" ON public.warehouse_stock
  FOR ALL USING (true) WITH CHECK (true);

SELECT 'execute_inventory_transfer function created successfully' AS status;
