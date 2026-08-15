-- Inventory costing engine v2 — atomic issue/COGS by warehouse.
-- Supports AVERAGE, FIFO, and LIFO only for US_GAAP. No destructive data changes.

CREATE OR REPLACE FUNCTION public.rpc_inventory_issue_v2(
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_costing_method text DEFAULT NULL,
  p_accounting_standard text DEFAULT NULL,
  p_reference_type text DEFAULT 'SALE',
  p_reference_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_allow_negative boolean DEFAULT false,
  p_specific_unit_cost numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
  v_balance public.inventory_balances;
  v_layer record;
  v_method text;
  v_standard text;
  v_remaining numeric;
  v_available numeric;
  v_total_cost numeric := 0;
  v_actual_from_layers numeric := 0;
  v_fallback_cost numeric := 0;
  v_new_qty numeric;
  v_new_value numeric;
  v_unit_cost numeric;
  v_move_id uuid;
  v_company_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  SELECT p.restaurant_id INTO v_restaurant_id
  FROM public.products p
  WHERE p.id = p_item_id;

  SELECT r.company_id INTO v_company_id
  FROM public.restaurants r
  WHERE r.id = v_restaurant_id;

  IF v_restaurant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصنف غير موجود');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = p_warehouse_id
      AND w.restaurant_id = v_restaurant_id
      AND w.deleted_at IS NULL
      AND COALESCE(w.is_active, true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزن لا يتبع نفس الشركة');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_restaurant_owner(auth.uid(), v_restaurant_id)
     AND NOT EXISTS (SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = (SELECT workspace_id FROM public.warehouses WHERE id = p_warehouse_id))
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح بتعديل مخزون هذا الفرع');
  END IF;

  SELECT * INTO v_balance
  FROM public.inventory_balances ib
  WHERE ib.item_id = p_item_id
    AND ib.sub_warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_balances (
      item_id, sub_warehouse_id, accounting_standard, valuation_method,
      inventory_valuation_rule
    ) VALUES (
      p_item_id, p_warehouse_id,
      COALESCE(NULLIF(upper(replace(p_accounting_standard, '-', '_')), ''), 'IFRS'),
      CASE WHEN upper(COALESCE(p_costing_method, 'AVERAGE')) = 'LIFO'
             AND upper(replace(COALESCE(p_accounting_standard, 'IFRS'), '-', '_')) <> 'US_GAAP'
           THEN 'AVERAGE'
           ELSE upper(COALESCE(p_costing_method, 'AVERAGE')) END,
      'IAS2_AVERAGE'
    )
    RETURNING * INTO v_balance;
  END IF;

  v_standard := upper(replace(COALESCE(NULLIF(p_accounting_standard, ''), v_balance.accounting_standard, 'IFRS'), '-', '_'));
  v_method := upper(COALESCE(NULLIF(p_costing_method, ''), v_balance.valuation_method, 'AVERAGE'));

  IF v_standard NOT IN ('EAS', 'IFRS', 'US_GAAP') THEN v_standard := 'IFRS'; END IF;
  IF v_method NOT IN ('AVERAGE', 'FIFO', 'LIFO', 'SPECIFIC') THEN v_method := 'AVERAGE'; END IF;
  IF v_method = 'LIFO' AND v_standard <> 'US_GAAP' THEN
    v_method := 'FIFO';
  END IF;

  v_available := COALESCE(v_balance.quantity_on_hand, 0);
  IF NOT p_allow_negative AND v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('الكمية المتاحة %s فقط في المخزن المحدد', v_available),
      'quantity_on_hand', v_available
    );
  END IF;

  v_fallback_cost := CASE
    WHEN v_method = 'SPECIFIC' AND p_specific_unit_cost IS NOT NULL AND p_specific_unit_cost >= 0 THEN p_specific_unit_cost
    ELSE COALESCE(NULLIF(v_balance.average_cost, 0), v_balance.unit_cost, 0)
  END;

  v_remaining := p_quantity;

  IF v_method IN ('FIFO', 'LIFO') THEN
    FOR v_layer IN
      SELECT id, remaining_quantity, unit_cost
      FROM public.inventory_cost_layers
      WHERE item_id = p_item_id
        AND sub_warehouse_id = p_warehouse_id
        AND remaining_quantity > 0
      ORDER BY
        CASE WHEN v_method = 'FIFO' THEN purchase_date END ASC,
        CASE WHEN v_method = 'FIFO' THEN created_at END ASC,
        CASE WHEN v_method = 'LIFO' THEN purchase_date END DESC,
        CASE WHEN v_method = 'LIFO' THEN created_at END DESC,
        id
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      DECLARE
        v_take numeric := LEAST(v_remaining, v_layer.remaining_quantity);
      BEGIN
        v_total_cost := v_total_cost + v_take * v_layer.unit_cost;
        v_actual_from_layers := v_actual_from_layers + v_take;
        v_remaining := v_remaining - v_take;

        UPDATE public.inventory_cost_layers
        SET remaining_quantity = remaining_quantity - v_take,
            consumed_quantity = COALESCE(consumed_quantity, 0) + v_take,
            is_consumed = (remaining_quantity - v_take) <= 0,
            consumed_at = CASE WHEN (remaining_quantity - v_take) <= 0 THEN now() ELSE consumed_at END
        WHERE id = v_layer.id;
      END;
    END LOOP;
  END IF;

  IF v_remaining > 0 THEN
    v_total_cost := v_total_cost + (v_remaining * v_fallback_cost);
  END IF;

  v_unit_cost := CASE WHEN p_quantity > 0 THEN v_total_cost / p_quantity ELSE 0 END;
  v_new_qty := v_available - p_quantity;
  v_new_value := CASE WHEN v_new_qty <= 0 THEN 0 ELSE GREATEST(COALESCE(v_balance.total_value, 0) - v_total_cost, 0) END;

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost,
    reference_type, reference_id, reference_number, accounting_standard,
    created_by, reason
  ) VALUES (
    p_item_id, p_warehouse_id, 'OUT', -p_quantity, v_unit_cost, -v_total_cost,
    upper(COALESCE(p_reference_type, 'SALE')), p_reference_id, p_reference_number,
    v_standard, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'صرف مخزني بمحرك تكلفة ' || v_method
  ) RETURNING id INTO v_move_id;

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_new_qty,
      quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
      total_value = v_new_value,
      average_cost = CASE WHEN v_new_qty > 0 THEN v_new_value / v_new_qty ELSE average_cost END,
      unit_cost = CASE WHEN v_new_qty > 0 THEN v_new_value / v_new_qty ELSE unit_cost END,
      last_movement_id = v_move_id,
      last_movement_at = now(),
      accounting_standard = v_standard,
      valuation_method = v_method,
      updated_at = now()
  WHERE id = v_balance.id;

  UPDATE public.warehouse_stock
  SET quantity = v_new_qty
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_item_id
    AND restaurant_id = v_restaurant_id;

  INSERT INTO public.accounting_posting_outbox (
    company_id, restaurant_id, workspace_id, source_table, source_id,
    event_type, payload
  )
  SELECT v_company_id, v_restaurant_id, w.workspace_id,
         'inventory_movements', v_move_id, 'inventory_issue_cogs',
         jsonb_build_object(
           'item_id', p_item_id,
           'warehouse_id', p_warehouse_id,
           'reference_type', upper(COALESCE(p_reference_type, 'SALE')),
           'reference_id', p_reference_id,
           'quantity', p_quantity,
           'cogs', v_total_cost,
           'costing_method', v_method,
           'accounting_standard', v_standard
         )
  FROM public.warehouses w
  WHERE w.id = p_warehouse_id
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

  PERFORM public._inventory_sync_compatibility(p_item_id);

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_move_id,
    'cogs', v_total_cost,
    'unit_cost', v_unit_cost,
    'costing_method', v_method,
    'layers_consumed_quantity', v_actual_from_layers,
    'quantity_on_hand', v_new_qty,
    'total_value', v_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_inventory_issue_v2(uuid, uuid, numeric, text, text, text, uuid, text, boolean, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_issue_v2(uuid, uuid, numeric, text, text, text, uuid, text, boolean, numeric) TO authenticated, service_role;
