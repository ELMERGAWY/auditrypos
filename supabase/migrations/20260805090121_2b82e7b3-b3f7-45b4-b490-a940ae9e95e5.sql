-- Auditry ERP inventory convergence: one atomic WAC ledger with compatibility mirrors.

CREATE OR REPLACE FUNCTION public._inventory_assert_access(p_item_id uuid, p_warehouse_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  SELECT p.restaurant_id INTO v_restaurant_id
  FROM public.products p
  WHERE p.id = p_item_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'الصنف غير موجود';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = p_warehouse_id
      AND w.restaurant_id = v_restaurant_id
      AND w.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'المخزن لا يتبع نفس الشركة';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_restaurant_owner(v_restaurant_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.restaurants r
       JOIN public.company_users cu ON cu.company_id = r.company_id
       WHERE r.id = v_restaurant_id
         AND cu.user_id = auth.uid()
         AND cu.is_active = true
     ) THEN
    RAISE EXCEPTION 'غير مصرح بتعديل مخزون هذه الشركة';
  END IF;

  RETURN v_restaurant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._inventory_sync_compatibility(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_qty numeric;
  v_total_value numeric;
  v_avg numeric;
BEGIN
  SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(total_value), 0)
  INTO v_total_qty, v_total_value
  FROM public.inventory_balances
  WHERE item_id = p_item_id;

  v_avg := CASE WHEN v_total_qty > 0 THEN v_total_value / v_total_qty ELSE 0 END;

  UPDATE public.products
  SET quantity = v_total_qty,
      cost_price = CASE WHEN v_total_qty > 0 THEN v_avg ELSE cost_price END,
      updated_at = now()
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._inventory_sync_warehouse_stock(
  p_restaurant_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.warehouse_stock (restaurant_id, warehouse_id, product_id, quantity)
  VALUES (p_restaurant_id, p_warehouse_id, p_item_id, p_quantity)
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET quantity = EXCLUDED.quantity;
END;
$$;

ALTER TABLE public.inventory_balances
  DROP CONSTRAINT IF EXISTS inventory_balances_sub_warehouse_id_fkey;
ALTER TABLE public.inventory_balances
  ADD CONSTRAINT inventory_balances_sub_warehouse_id_fkey
  FOREIGN KEY (sub_warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.rpc_inventory_receive(
  p_item_id uuid,
  p_sub_warehouse_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_movement_type text DEFAULT 'RECEIPT'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_bal public.inventory_balances;
  v_new_qty numeric;
  v_new_value numeric;
  v_new_avg numeric;
  v_move_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'التكلفة لا يمكن أن تكون سالبة');
  END IF;

  v_restaurant_id := public._inventory_assert_access(p_item_id, p_sub_warehouse_id);
  v_bal := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);
  v_new_qty := COALESCE(v_bal.quantity_on_hand, 0) + p_quantity;
  v_new_value := COALESCE(v_bal.total_value, 0) + (p_quantity * p_unit_cost);
  v_new_avg := CASE WHEN v_new_qty > 0 THEN v_new_value / v_new_qty ELSE p_unit_cost END;

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost,
    reference_type, reference_id, reference_number, accounting_standard
  ) VALUES (
    p_item_id, p_sub_warehouse_id, COALESCE(p_movement_type, 'RECEIPT'), p_quantity,
    p_unit_cost, p_quantity * p_unit_cost, p_reference_type, p_reference_id,
    p_reference_number, COALESCE(v_bal.accounting_standard, 'IFRS')
  ) RETURNING id INTO v_move_id;

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_new_qty,
      quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
      total_value = v_new_value,
      average_cost = v_new_avg,
      unit_cost = v_new_avg,
      last_purchase_cost = p_unit_cost,
      last_purchase_at = now(),
      last_movement_id = v_move_id,
      last_movement_at = now(),
      updated_at = now()
  WHERE id = v_bal.id;

  PERFORM public._inventory_sync_warehouse_stock(v_restaurant_id, p_item_id, p_sub_warehouse_id, v_new_qty);
  PERFORM public._inventory_sync_compatibility(p_item_id);

  RETURN jsonb_build_object('success', true, 'movement_id', v_move_id,
    'quantity_on_hand', v_new_qty, 'average_cost', v_new_avg, 'total_value', v_new_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_inventory_issue(
  p_item_id uuid,
  p_sub_warehouse_id uuid,
  p_quantity numeric,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_movement_type text DEFAULT 'ISSUE',
  p_allow_negative boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_bal public.inventory_balances;
  v_cost numeric;
  v_new_qty numeric;
  v_new_value numeric;
  v_move_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  v_restaurant_id := public._inventory_assert_access(p_item_id, p_sub_warehouse_id);
  v_bal := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);

  IF NOT p_allow_negative AND COALESCE(v_bal.quantity_on_hand, 0) < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', format('الكمية المتاحة %s فقط في المخزن المحدد', COALESCE(v_bal.quantity_on_hand, 0)));
  END IF;

  v_cost := COALESCE(NULLIF(v_bal.average_cost, 0), v_bal.unit_cost, 0);
  v_new_qty := COALESCE(v_bal.quantity_on_hand, 0) - p_quantity;
  v_new_value := CASE WHEN v_new_qty <= 0 THEN 0 ELSE GREATEST(COALESCE(v_bal.total_value, 0) - (p_quantity * v_cost), 0) END;

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost,
    reference_type, reference_id, reference_number, accounting_standard
  ) VALUES (
    p_item_id, p_sub_warehouse_id, COALESCE(p_movement_type, 'ISSUE'), -p_quantity,
    v_cost, -(p_quantity * v_cost), p_reference_type, p_reference_id,
    p_reference_number, COALESCE(v_bal.accounting_standard, 'IFRS')
  ) RETURNING id INTO v_move_id;

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_new_qty,
      quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
      total_value = v_new_value,
      last_movement_id = v_move_id,
      last_movement_at = now(),
      updated_at = now()
  WHERE id = v_bal.id;

  PERFORM public._inventory_sync_warehouse_stock(v_restaurant_id, p_item_id, p_sub_warehouse_id, v_new_qty);
  PERFORM public._inventory_sync_compatibility(p_item_id);

  RETURN jsonb_build_object('success', true, 'movement_id', v_move_id, 'unit_cost', v_cost,
    'cogs', p_quantity * v_cost, 'quantity_on_hand', v_new_qty, 'total_value', v_new_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_inventory_adjust(
  p_item_id uuid,
  p_sub_warehouse_id uuid,
  p_new_quantity numeric,
  p_reason text DEFAULT NULL,
  p_unit_cost numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.inventory_balances;
  v_diff numeric;
  v_cost numeric;
BEGIN
  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية غير صحيحة');
  END IF;
  PERFORM public._inventory_assert_access(p_item_id, p_sub_warehouse_id);
  v_bal := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);
  v_diff := p_new_quantity - COALESCE(v_bal.quantity_on_hand, 0);
  v_cost := COALESCE(NULLIF(p_unit_cost, 0), NULLIF(v_bal.average_cost, 0), v_bal.unit_cost, 0);

  IF v_diff = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'لا يوجد فرق', 'quantity_on_hand', p_new_quantity);
  ELSIF v_diff > 0 THEN
    RETURN public.rpc_inventory_receive(p_item_id, p_sub_warehouse_id, v_diff, v_cost, 'adjustment', NULL, p_reason, 'ADJUSTMENT_IN');
  ELSE
    RETURN public.rpc_inventory_issue(p_item_id, p_sub_warehouse_id, -v_diff, 'adjustment', NULL, p_reason, 'ADJUSTMENT_OUT', true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_inventory_transfer(
  p_item_id uuid,
  p_from_sub_warehouse_id uuid,
  p_to_sub_warehouse_id uuid,
  p_quantity numeric,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from public.inventory_balances;
  v_to public.inventory_balances;
  v_restaurant_id uuid;
  v_cost numeric;
  v_from_qty numeric;
  v_to_qty numeric;
  v_from_value numeric;
  v_to_value numeric;
  v_to_avg numeric;
  v_out_id uuid;
  v_in_id uuid;
  v_transfer_ref uuid := gen_random_uuid();
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر'); END IF;
  IF p_from_sub_warehouse_id = p_to_sub_warehouse_id THEN RETURN jsonb_build_object('success', false, 'error', 'لا يمكن التحويل لنفس المخزن'); END IF;

  v_restaurant_id := public._inventory_assert_access(p_item_id, p_from_sub_warehouse_id);
  PERFORM public._inventory_assert_access(p_item_id, p_to_sub_warehouse_id);

  -- Deterministic lock order prevents deadlocks between opposite transfers.
  IF p_from_sub_warehouse_id::text < p_to_sub_warehouse_id::text THEN
    v_from := public._inv_lock_balance(p_item_id, p_from_sub_warehouse_id);
    v_to := public._inv_lock_balance(p_item_id, p_to_sub_warehouse_id);
  ELSE
    v_to := public._inv_lock_balance(p_item_id, p_to_sub_warehouse_id);
    v_from := public._inv_lock_balance(p_item_id, p_from_sub_warehouse_id);
  END IF;

  IF COALESCE(v_from.quantity_on_hand, 0) < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', format('الكمية المتاحة %s فقط في مخزن المصدر', COALESCE(v_from.quantity_on_hand, 0)));
  END IF;

  v_cost := COALESCE(NULLIF(v_from.average_cost, 0), v_from.unit_cost, 0);
  v_from_qty := v_from.quantity_on_hand - p_quantity;
  v_from_value := CASE WHEN v_from_qty <= 0 THEN 0 ELSE GREATEST(v_from.total_value - p_quantity * v_cost, 0) END;
  v_to_qty := COALESCE(v_to.quantity_on_hand, 0) + p_quantity;
  v_to_value := COALESCE(v_to.total_value, 0) + p_quantity * v_cost;
  v_to_avg := CASE WHEN v_to_qty > 0 THEN v_to_value / v_to_qty ELSE v_cost END;

  INSERT INTO public.inventory_movements (item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, reference_number, accounting_standard)
  VALUES (p_item_id, p_from_sub_warehouse_id, 'TRANSFER_OUT', -p_quantity, v_cost, -(p_quantity*v_cost), 'transfer', v_transfer_ref, p_notes, COALESCE(v_from.accounting_standard,'IFRS'))
  RETURNING id INTO v_out_id;
  INSERT INTO public.inventory_movements (item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, reference_number, accounting_standard)
  VALUES (p_item_id, p_to_sub_warehouse_id, 'TRANSFER_IN', p_quantity, v_cost, p_quantity*v_cost, 'transfer', v_transfer_ref, p_notes, COALESCE(v_to.accounting_standard,'IFRS'))
  RETURNING id INTO v_in_id;

  UPDATE public.inventory_balances SET quantity_on_hand=v_from_qty, quantity_available=v_from_qty-COALESCE(quantity_allocated,0)-COALESCE(quantity_reserved,0), total_value=v_from_value, last_movement_id=v_out_id,last_movement_at=now(),updated_at=now() WHERE id=v_from.id;
  UPDATE public.inventory_balances SET quantity_on_hand=v_to_qty, quantity_available=v_to_qty-COALESCE(quantity_allocated,0)-COALESCE(quantity_reserved,0), total_value=v_to_value, average_cost=v_to_avg,unit_cost=v_to_avg,last_movement_id=v_in_id,last_movement_at=now(),updated_at=now() WHERE id=v_to.id;

  PERFORM public._inventory_sync_warehouse_stock(v_restaurant_id,p_item_id,p_from_sub_warehouse_id,v_from_qty);
  PERFORM public._inventory_sync_warehouse_stock(v_restaurant_id,p_item_id,p_to_sub_warehouse_id,v_to_qty);
  PERFORM public._inventory_sync_compatibility(p_item_id);
  RETURN jsonb_build_object('success',true,'transfer_id',v_transfer_ref,'unit_cost',v_cost,'from_quantity',v_from_qty,'to_quantity',v_to_qty);
END;
$$;

-- Inventory movements are audit rows. Atomic RPCs own balances; this trigger must never apply a second mutation.
CREATE OR REPLACE FUNCTION public.tg_sync_inventory_balances_from_movements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Safe non-destructive backfill: warehouse_stock is the current warehouse-level operational source.
INSERT INTO public.inventory_balances (
  item_id, sub_warehouse_id, quantity_on_hand, quantity_allocated, quantity_available,
  quantity_incoming, quantity_reserved, unit_cost, average_cost, last_purchase_cost,
  total_value, valuation_method, accounting_standard, inventory_valuation_rule, updated_at
)
SELECT ws.product_id, ws.warehouse_id, COALESCE(ws.quantity,0), 0, COALESCE(ws.quantity,0), 0, 0,
       COALESCE(p.cost_price,0), COALESCE(p.cost_price,0), COALESCE(p.cost_price,0),
       COALESCE(ws.quantity,0)*COALESCE(p.cost_price,0), 'AVERAGE', 'IFRS', 'IAS2_AVERAGE', now()
FROM public.warehouse_stock ws
JOIN public.products p ON p.id=ws.product_id
ON CONFLICT (item_id,sub_warehouse_id) DO UPDATE SET
  quantity_on_hand=EXCLUDED.quantity_on_hand,
  quantity_available=EXCLUDED.quantity_available,
  unit_cost=EXCLUDED.unit_cost,
  average_cost=EXCLUDED.average_cost,
  last_purchase_cost=EXCLUDED.last_purchase_cost,
  total_value=EXCLUDED.total_value,
  updated_at=now();

-- Ledger-derived reporting source shared by financial statements.
CREATE OR REPLACE FUNCTION public.fn_financial_account_balances(
  p_restaurant_id uuid,
  p_as_of date DEFAULT CURRENT_DATE
) RETURNS TABLE(account_id uuid, code text, name text, account_type text, debit numeric, credit numeric, balance numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,a.code,a.name,a.account_type,
         COALESCE(SUM(l.debit),0),COALESCE(SUM(l.credit),0),
         COALESCE(a.opening_balance,0)+CASE WHEN a.account_type IN ('asset','expense') THEN COALESCE(SUM(l.debit-l.credit),0) ELSE COALESCE(SUM(l.credit-l.debit),0) END
  FROM public.chart_of_accounts a
  LEFT JOIN public.journal_entry_lines l ON l.account_id=a.id
  LEFT JOIN public.journal_entries j ON j.id=l.entry_id AND j.restaurant_id=p_restaurant_id AND j.is_posted=true AND j.entry_date<=p_as_of
  WHERE a.restaurant_id=p_restaurant_id
  GROUP BY a.id,a.code,a.name,a.account_type,a.opening_balance;
$$;

REVOKE ALL ON FUNCTION public._inventory_assert_access(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public._inventory_sync_compatibility(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public._inventory_sync_warehouse_stock(uuid,uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._inventory_assert_access(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._inventory_sync_compatibility(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._inventory_sync_warehouse_stock(uuid,uuid,uuid,numeric) TO service_role;

REVOKE ALL ON FUNCTION public.rpc_inventory_receive(uuid,uuid,numeric,numeric,text,uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_issue(uuid,uuid,numeric,text,uuid,text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_adjust(uuid,uuid,numeric,text,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_transfer(uuid,uuid,uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_receive(uuid,uuid,numeric,numeric,text,uuid,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_issue(uuid,uuid,numeric,text,uuid,text,text,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_adjust(uuid,uuid,numeric,text,numeric) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_transfer(uuid,uuid,uuid,numeric,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.fn_financial_account_balances(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_financial_account_balances(uuid,date) TO authenticated,service_role;