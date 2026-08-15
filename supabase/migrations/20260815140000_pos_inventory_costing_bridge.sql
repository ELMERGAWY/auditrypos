-- POS inventory costing bridge — use the warehouse-scoped costing engine.
-- Existing orders remain untouched; this only changes future idempotent consumption calls.

CREATE OR REPLACE FUNCTION public.consume_pos_inventory_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_warehouse_id uuid,
  p_order_id uuid,
  p_items jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric;
  v_warehouse uuid := p_warehouse_id;
  v_cost_result jsonb;
  v_total_cost numeric := 0;
  v_order_number text;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace is required for POS inventory consumption';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND o.restaurant_id = p_restaurant_id
      AND o.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'order does not belong to restaurant workspace';
  END IF;

  SELECT o.order_number INTO v_order_number
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_warehouse IS NULL THEN
    SELECT w.id INTO v_warehouse
    FROM public.warehouses w
    WHERE w.restaurant_id = p_restaurant_id
      AND w.workspace_id = p_workspace_id
      AND COALESCE(w.is_active, true)
      AND w.deleted_at IS NULL
    ORDER BY w.is_default DESC, w.created_at
    LIMIT 1;
  END IF;
  IF v_warehouse IS NULL THEN RAISE EXCEPTION 'no active warehouse for workspace'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = v_warehouse
      AND w.restaurant_id = p_restaurant_id
      AND w.workspace_id = p_workspace_id
      AND COALESCE(w.is_active, true)
      AND w.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'warehouse does not belong to restaurant workspace';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0)
           * COALESCE((v_item->>'unit_factor')::numeric, 1);
    IF v_product_id IS NULL OR v_qty <= 0 THEN CONTINUE; END IF;

    -- Idempotency across both legacy stock_movements and the new inventory ledger.
    IF EXISTS (
      SELECT 1 FROM public.inventory_movements im
      WHERE im.item_id = v_product_id
        AND im.sub_warehouse_id = v_warehouse
        AND im.reference_id = p_order_id
        AND im.movement_type = 'OUT'
    ) OR EXISTS (
      SELECT 1 FROM public.stock_movements sm
      WHERE sm.reference_id = p_order_id::text
        AND sm.type = 'out'
        AND sm.product_id = v_product_id
        AND sm.warehouse_id = v_warehouse
    ) THEN
      CONTINUE;
    END IF;

    v_cost_result := public.rpc_inventory_issue_v2(
      v_product_id,
      v_warehouse,
      v_qty,
      NULL,
      NULL,
      'SALE',
      p_order_id,
      v_order_number,
      false,
      NULL
    );

    IF COALESCE((v_cost_result->>'success')::boolean, false) = false THEN
      RAISE EXCEPTION 'فشل خصم مخزون POS للصنف %: %', v_product_id, COALESCE(v_cost_result->>'error', 'unknown');
    END IF;

    v_total_cost := v_total_cost + COALESCE((v_cost_result->>'cogs')::numeric, 0);
  END LOOP;

  INSERT INTO public.accounting_posting_outbox (
    company_id, restaurant_id, workspace_id, source_table, source_id,
    event_type, payload
  )
  SELECT r.company_id, p_restaurant_id, p_workspace_id, 'orders', p_order_id,
         'sale_completed',
         jsonb_build_object('order_id', p_order_id, 'inventory_cost', v_total_cost)
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
  ON CONFLICT (source_table, source_id, event_type) DO UPDATE
    SET payload = public.accounting_posting_outbox.payload || EXCLUDED.payload,
        updated_at = now();

  RETURN v_total_cost;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pos_inventory_v2(uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_pos_inventory_v2(uuid, uuid, uuid, uuid, jsonb) TO authenticated, service_role;
