
-- ============================================================
-- PHASE 2: ATOMIC INVENTORY & WEIGHTED AVERAGE COST ENGINE
-- ============================================================

-- Older inventory movement tables may not have a human-readable reference number.
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS reference_number TEXT;

CREATE OR REPLACE FUNCTION public._inv_lock_balance(
  p_item_id UUID,
  p_sub_warehouse_id UUID
) RETURNS public.inventory_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.inventory_balances;
BEGIN
  SELECT * INTO v_bal
  FROM public.inventory_balances
  WHERE item_id = p_item_id AND sub_warehouse_id = p_sub_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_balances (item_id, sub_warehouse_id)
    VALUES (p_item_id, p_sub_warehouse_id)
    ON CONFLICT (item_id, sub_warehouse_id) DO NOTHING;

    SELECT * INTO v_bal
    FROM public.inventory_balances
    WHERE item_id = p_item_id AND sub_warehouse_id = p_sub_warehouse_id
    FOR UPDATE;
  END IF;

  RETURN v_bal;
END;
$$;

-- ---------- RECEIVE (purchase / production in / return in) ----------
CREATE OR REPLACE FUNCTION public.rpc_inventory_receive(
  p_item_id UUID,
  p_sub_warehouse_id UUID,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'RECEIPT'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.inventory_balances;
  v_new_qty NUMERIC;
  v_new_value NUMERIC;
  v_new_avg NUMERIC;
  v_move_id UUID;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  v_bal := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);

  v_new_qty   := COALESCE(v_bal.quantity_on_hand, 0) + p_quantity;
  v_new_value := COALESCE(v_bal.total_value, 0) + (p_quantity * COALESCE(p_unit_cost, 0));
  v_new_avg   := CASE WHEN v_new_qty > 0 THEN v_new_value / v_new_qty ELSE COALESCE(p_unit_cost, 0) END;

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity,
    unit_cost, total_cost, reference_type, reference_id, reference_number
  ) VALUES (
    p_item_id, p_sub_warehouse_id, COALESCE(p_movement_type, 'RECEIPT'), p_quantity,
    COALESCE(p_unit_cost, 0), p_quantity * COALESCE(p_unit_cost, 0),
    p_reference_type, p_reference_id, p_reference_number
  ) RETURNING id INTO v_move_id;

  UPDATE public.inventory_balances SET
    quantity_on_hand   = v_new_qty,
    quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
    total_value        = v_new_value,
    average_cost       = v_new_avg,
    unit_cost          = v_new_avg,
    last_purchase_cost = COALESCE(p_unit_cost, last_purchase_cost),
    last_purchase_at   = CASE WHEN COALESCE(p_movement_type,'RECEIPT') = 'RECEIPT' THEN now() ELSE last_purchase_at END,
    last_movement_id   = v_move_id,
    last_movement_at   = now(),
    updated_at         = now()
  WHERE id = v_bal.id;

  RETURN jsonb_build_object(
    'success', true, 'movement_id', v_move_id,
    'quantity_on_hand', v_new_qty, 'average_cost', v_new_avg, 'total_value', v_new_value
  );
END;
$$;

-- ---------- ISSUE (sale / consumption / return out) ----------
CREATE OR REPLACE FUNCTION public.rpc_inventory_issue(
  p_item_id UUID,
  p_sub_warehouse_id UUID,
  p_quantity NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_movement_type TEXT DEFAULT 'ISSUE',
  p_allow_negative BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.inventory_balances;
  v_cost NUMERIC;
  v_new_qty NUMERIC;
  v_new_value NUMERIC;
  v_move_id UUID;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;

  v_bal := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);

  IF NOT p_allow_negative AND COALESCE(v_bal.quantity_on_hand, 0) < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('الكمية المتاحة %s فقط', COALESCE(v_bal.quantity_on_hand, 0))
    );
  END IF;

  v_cost      := COALESCE(NULLIF(v_bal.average_cost, 0), v_bal.unit_cost, 0);
  v_new_qty   := COALESCE(v_bal.quantity_on_hand, 0) - p_quantity;
  v_new_value := GREATEST(COALESCE(v_bal.total_value, 0) - (p_quantity * v_cost), 0);

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity,
    unit_cost, total_cost, reference_type, reference_id, reference_number
  ) VALUES (
    p_item_id, p_sub_warehouse_id, COALESCE(p_movement_type, 'ISSUE'), -p_quantity,
    v_cost, -(p_quantity * v_cost),
    p_reference_type, p_reference_id, p_reference_number
  ) RETURNING id INTO v_move_id;

  UPDATE public.inventory_balances SET
    quantity_on_hand   = v_new_qty,
    quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
    total_value        = CASE WHEN v_new_qty <= 0 THEN 0 ELSE v_new_value END,
    last_movement_id   = v_move_id,
    last_movement_at   = now(),
    updated_at         = now()
  WHERE id = v_bal.id;

  RETURN jsonb_build_object(
    'success', true, 'movement_id', v_move_id, 'unit_cost', v_cost,
    'cogs', p_quantity * v_cost, 'quantity_on_hand', v_new_qty
  );
END;
$$;

-- ---------- ADJUST (stock count / write-off) ----------
CREATE OR REPLACE FUNCTION public.rpc_inventory_adjust(
  p_item_id UUID,
  p_sub_warehouse_id UUID,
  p_new_quantity NUMERIC,
  p_reason TEXT DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal public.inventory_balances;
  v_diff NUMERIC;
  v_cost NUMERIC;
BEGIN
  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية غير صحيحة');
  END IF;

  v_bal  := public._inv_lock_balance(p_item_id, p_sub_warehouse_id);
  v_diff := p_new_quantity - COALESCE(v_bal.quantity_on_hand, 0);
  v_cost := COALESCE(NULLIF(p_unit_cost, 0), NULLIF(v_bal.average_cost, 0), v_bal.unit_cost, 0);

  IF v_diff = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'لا يوجد فرق');
  ELSIF v_diff > 0 THEN
    RETURN public.rpc_inventory_receive(
      p_item_id, p_sub_warehouse_id, v_diff, v_cost, 'adjustment', NULL, p_reason, 'ADJUSTMENT_IN'
    );
  ELSE
    RETURN public.rpc_inventory_issue(
      p_item_id, p_sub_warehouse_id, -v_diff, 'adjustment', NULL, p_reason, 'ADJUSTMENT_OUT', true
    );
  END IF;
END;
$$;

-- ---------- TRANSFER between sub-warehouses (cost preserving) ----------
CREATE OR REPLACE FUNCTION public.rpc_inventory_transfer(
  p_item_id UUID,
  p_from_sub_warehouse_id UUID,
  p_to_sub_warehouse_id UUID,
  p_quantity NUMERIC,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out JSONB;
  v_in  JSONB;
  v_cost NUMERIC;
BEGIN
  IF p_from_sub_warehouse_id = p_to_sub_warehouse_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن التحويل لنفس المخزن');
  END IF;

  v_out := public.rpc_inventory_issue(
    p_item_id, p_from_sub_warehouse_id, p_quantity,
    'transfer', NULL, p_notes, 'TRANSFER_OUT', false
  );

  IF NOT (v_out->>'success')::boolean THEN
    RETURN v_out;
  END IF;

  v_cost := COALESCE((v_out->>'unit_cost')::numeric, 0);

  v_in := public.rpc_inventory_receive(
    p_item_id, p_to_sub_warehouse_id, p_quantity, v_cost,
    'transfer', NULL, p_notes, 'TRANSFER_IN'
  );

  IF NOT (v_in->>'success')::boolean THEN
    RAISE EXCEPTION 'فشل التحويل: %', v_in->>'error';
  END IF;

  RETURN jsonb_build_object('success', true, 'unit_cost', v_cost, 'out', v_out, 'in', v_in);
END;
$$;

-- ---------- ITEM CARD REPORT ----------
CREATE OR REPLACE FUNCTION public.fn_inventory_item_card(
  p_item_id UUID,
  p_sub_warehouse_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
) RETURNS TABLE (
  movement_id UUID,
  movement_date TIMESTAMPTZ,
  movement_type TEXT,
  reference_type TEXT,
  reference_number TEXT,
  quantity NUMERIC,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  running_quantity NUMERIC,
  running_value NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.movement_date,
    m.movement_type::text,
    m.reference_type::text,
    m.reference_number::text,
    m.quantity,
    m.unit_cost,
    m.total_cost,
    SUM(m.quantity) OVER (ORDER BY m.movement_date, m.id),
    SUM(m.total_cost) OVER (ORDER BY m.movement_date, m.id)
  FROM public.inventory_movements m
  WHERE m.item_id = p_item_id
    AND m.sub_warehouse_id = p_sub_warehouse_id
    AND (p_from IS NULL OR m.movement_date >= p_from)
    AND (p_to   IS NULL OR m.movement_date < (p_to + 1))
  ORDER BY m.movement_date, m.id;
$$;

-- Permissions: authenticated app users only, never anon
REVOKE ALL ON FUNCTION public._inv_lock_balance(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_receive(UUID, UUID, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_issue(UUID, UUID, NUMERIC, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_adjust(UUID, UUID, NUMERIC, TEXT, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_inventory_transfer(UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_inventory_item_card(UUID, UUID, DATE, DATE) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rpc_inventory_receive(UUID, UUID, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_issue(UUID, UUID, NUMERIC, TEXT, UUID, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_adjust(UUID, UUID, NUMERIC, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_transfer(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_inventory_item_card(UUID, UUID, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._inv_lock_balance(UUID, UUID) TO service_role;
