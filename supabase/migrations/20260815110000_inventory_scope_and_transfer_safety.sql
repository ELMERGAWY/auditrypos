-- AuditryPOS inventory hardening — additive and data preserving
-- Scope: warehouse_stock assignment, workspace-safe reads, and transfer void/reversal.
-- No DROP TABLE, TRUNCATE, or broad DELETE operations.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS item_type_id uuid,
  ADD COLUMN IF NOT EXISTS batch_number text;

CREATE INDEX IF NOT EXISTS idx_products_item_type_id
  ON public.products(item_type_id);

CREATE OR REPLACE FUNCTION public.tg_normalize_inventory_movement_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.movement_type := CASE upper(COALESCE(NEW.movement_type, 'IN'))
    WHEN 'RECEIPT' THEN 'IN'
    WHEN 'ISSUE' THEN 'OUT'
    ELSE upper(COALESCE(NEW.movement_type, 'IN'))
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_inventory_movement_type ON public.inventory_movements;
CREATE TRIGGER trg_normalize_inventory_movement_type
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_inventory_movement_type();

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_workspace_warehouse_product
  ON public.warehouse_stock(workspace_id, warehouse_id, product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_workspace_product
  ON public.warehouse_stock(workspace_id, product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_workspace_created
  ON public.inventory_transfers(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_workspace_transfer
  ON public.inventory_transfer_items(workspace_id, transfer_id);

CREATE OR REPLACE FUNCTION public._inventory_scope_access(
  p_restaurant_id uuid,
  p_workspace_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_restaurant_id IS NULL OR p_workspace_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.restaurant_id = p_restaurant_id
  ) THEN
    RETURN false;
  END IF;

  -- service_role/SQL maintenance sessions have no end-user auth.uid().
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  RETURN public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.auth_workspace_ids() aw
      WHERE aw = p_workspace_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_warehouse_stock(
  p_product_id uuid,
  p_workspace_id uuid
) RETURNS SETOF public.warehouse_stock
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  SELECT p.restaurant_id INTO v_restaurant_id
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.workspace_id = p_workspace_id;

  IF v_restaurant_id IS NULL OR NOT public._inventory_scope_access(v_restaurant_id, p_workspace_id) THEN
    RAISE EXCEPTION 'غير مصرح بقراءة أرصدة الصنف في هذا الفرع';
  END IF;

  RETURN QUERY
  SELECT ws.*
  FROM public.warehouse_stock ws
  WHERE ws.product_id = p_product_id
    AND ws.workspace_id = p_workspace_id
  ORDER BY ws.warehouse_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_product_warehouse_stock(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_min_quantity numeric DEFAULT 0
) RETURNS public.warehouse_stock
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock public.warehouse_stock;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'كمية المخزون لا يمكن أن تكون سالبة';
  END IF;

  IF NOT public._inventory_scope_access(p_restaurant_id, p_workspace_id) THEN
    RAISE EXCEPTION 'غير مصرح بتعديل مخزون هذا الفرع';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = p_product_id
      AND p.restaurant_id = p_restaurant_id
      AND p.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'الصنف لا يتبع الشركة أو الفرع المحدد';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses w
    WHERE w.id = p_warehouse_id
      AND w.restaurant_id = p_restaurant_id
      AND w.workspace_id = p_workspace_id
      AND w.deleted_at IS NULL
      AND COALESCE(w.is_active, true)
  ) THEN
    RAISE EXCEPTION 'المخزن لا يتبع الشركة أو الفرع المحدد';
  END IF;

  INSERT INTO public.warehouse_stock (
    restaurant_id, workspace_id, warehouse_id, product_id, quantity, min_quantity
  ) VALUES (
    p_restaurant_id, p_workspace_id, p_warehouse_id, p_product_id,
    p_quantity, GREATEST(COALESCE(p_min_quantity, 0), 0)
  )
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET restaurant_id = EXCLUDED.restaurant_id,
      workspace_id = EXCLUDED.workspace_id,
      quantity = EXCLUDED.quantity,
      min_quantity = EXCLUDED.min_quantity;

  SELECT ws.* INTO v_stock
  FROM public.warehouse_stock ws
  WHERE ws.warehouse_id = p_warehouse_id
    AND ws.product_id = p_product_id;

  RETURN v_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_inventory_transfer_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_transfer_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transfer public.inventory_transfers;
  v_item record;
  v_destination_qty numeric;
  v_cost numeric;
BEGIN
  IF NOT public._inventory_scope_access(p_restaurant_id, p_workspace_id) THEN
    RAISE EXCEPTION 'غير مصرح بعكس تحويل هذا الفرع';
  END IF;

  SELECT it.* INTO v_transfer
  FROM public.inventory_transfers it
  WHERE it.id = p_transfer_id
    AND it.restaurant_id = p_restaurant_id
    AND it.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'التحويل غير موجود في الفرع المحدد';
  END IF;

  IF COALESCE(v_transfer.status, '') = 'voided' THEN
    RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'replayed', true);
  END IF;

  IF COALESCE(v_transfer.status, '') NOT IN ('received', 'completed', 'shipped') THEN
    RAISE EXCEPTION 'لا يمكن عكس تحويل بحالة %', v_transfer.status;
  END IF;

  FOR v_item IN
    SELECT iti.product_id, iti.quantity, COALESCE(iti.cost_price, 0) AS cost_price
    FROM public.inventory_transfer_items iti
    WHERE iti.transfer_id = p_transfer_id
      AND iti.restaurant_id = p_restaurant_id
      AND iti.workspace_id = p_workspace_id
    ORDER BY iti.product_id
  LOOP
    SELECT COALESCE(ws.quantity, 0) INTO v_destination_qty
    FROM public.warehouse_stock ws
    WHERE ws.warehouse_id = v_transfer.to_warehouse_id
      AND ws.product_id = v_item.product_id
      AND ws.workspace_id = p_workspace_id
    FOR UPDATE;

    IF COALESCE(v_destination_qty, 0) < v_item.quantity THEN
      RAISE EXCEPTION 'لا يمكن عكس التحويل؛ رصيد الوجهة أقل من كمية التحويل للصنف %', v_item.product_id;
    END IF;

    UPDATE public.warehouse_stock
    SET quantity = quantity - v_item.quantity
    WHERE warehouse_id = v_transfer.to_warehouse_id
      AND product_id = v_item.product_id
      AND workspace_id = p_workspace_id;

    INSERT INTO public.warehouse_stock (
      restaurant_id, workspace_id, warehouse_id, product_id, quantity, min_quantity
    ) VALUES (
      p_restaurant_id, p_workspace_id, v_transfer.from_warehouse_id,
      v_item.product_id, v_item.quantity, 0
    )
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET quantity = COALESCE(public.warehouse_stock.quantity, 0) + EXCLUDED.quantity,
        restaurant_id = EXCLUDED.restaurant_id,
        workspace_id = EXCLUDED.workspace_id;

    v_cost := COALESCE(v_item.cost_price, 0);

    INSERT INTO public.stock_movements (
      product_id, restaurant_id, workspace_id, warehouse_id, type, quantity,
      reason, reference_id
    ) VALUES
      (v_item.product_id, p_restaurant_id, p_workspace_id, v_transfer.to_warehouse_id,
       'transfer_reversal_out', v_item.quantity,
       COALESCE(p_reason, 'عكس تحويل مخزني'), p_transfer.id::text),
      (v_item.product_id, p_restaurant_id, p_workspace_id, v_transfer.from_warehouse_id,
       'transfer_reversal_in', v_item.quantity,
       COALESCE(p_reason, 'عكس تحويل مخزني'), p_transfer.id::text);
  END LOOP;

  UPDATE public.inventory_transfers
  SET status = 'voided',
      notes = concat_ws(E'\n', notes, 'عكس التحويل: ' || COALESCE(p_reason, 'بدون سبب'))
  WHERE id = p_transfer_id;

  INSERT INTO public.accounting_posting_outbox (
    company_id, restaurant_id, workspace_id, source_table, source_id,
    event_type, payload
  )
  SELECT r.company_id, p_restaurant_id, p_workspace_id,
         'inventory_transfers', p_transfer_id, 'inventory_transfer_voided',
         jsonb_build_object(
           'transfer_id', p_transfer_id,
           'from_warehouse_id', v_transfer.from_warehouse_id,
           'to_warehouse_id', v_transfer.to_warehouse_id,
           'reason', COALESCE(p_reason, 'عكس تحويل مخزني')
         )
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_warehouse_stock(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_warehouse_stock(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_product_warehouse_stock(uuid, uuid, uuid, uuid, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_product_warehouse_stock(uuid, uuid, uuid, uuid, numeric, numeric) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_inventory_transfer_v2(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_inventory_transfer_v2(uuid, uuid, uuid, text) TO authenticated, service_role;
