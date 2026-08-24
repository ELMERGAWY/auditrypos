-- AuditryPOS release safety: repair the existing inventory mutation path.
-- Additive and data-preserving: no rows are deleted, truncated, or rewritten.

BEGIN;

-- The live InventoryTab already calls this function for manual stock-in.
-- Keep its legacy parameter names for compatibility, but validate the real
-- restaurant/workspace/warehouse scope before changing any balance.
CREATE OR REPLACE FUNCTION public.rpc_inventory_receive(
  p_item_id uuid,
  p_sub_warehouse_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_reference_type text DEFAULT 'ADJUSTMENT',
  p_reference_id uuid DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_movement_type text DEFAULT 'RECEIPT'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant_id uuid;
  v_product_workspace_id uuid;
  v_warehouse_workspace_id uuid;
  v_company_id uuid;
  v_balance public.inventory_balances;
  v_move_id uuid;
  v_new_qty numeric;
  v_new_value numeric;
  v_avg numeric;
  v_standard text := 'IFRS';
  v_layer_type text;
  v_total_cost numeric;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الكمية يجب أن تكون أكبر من صفر');
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'تكلفة الوحدة لا يمكن أن تكون سالبة');
  END IF;

  SELECT p.restaurant_id, p.workspace_id
    INTO v_restaurant_id, v_product_workspace_id
  FROM public.products p
  WHERE p.id = p_item_id;

  IF v_restaurant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصنف غير موجود');
  END IF;

  SELECT w.workspace_id
    INTO v_warehouse_workspace_id
  FROM public.warehouses w
  WHERE w.id = p_sub_warehouse_id
    AND w.restaurant_id = v_restaurant_id
    AND w.deleted_at IS NULL
    AND COALESCE(w.is_active, true);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخزن لا يتبع نفس الشركة أو غير نشط');
  END IF;

  IF v_product_workspace_id IS NOT NULL
     AND v_warehouse_workspace_id IS DISTINCT FROM v_product_workspace_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'الصنف لا يتبع فرع المخزن المحدد');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_restaurant_owner(auth.uid(), v_restaurant_id)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND (v_warehouse_workspace_id IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.auth_workspace_ids() aw WHERE aw = v_warehouse_workspace_id
     )) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح بتعديل مخزون هذا الفرع');
  END IF;

  SELECT r.company_id INTO v_company_id
  FROM public.restaurants r
  WHERE r.id = v_restaurant_id;

  SELECT * INTO v_balance
  FROM public.inventory_balances ib
  WHERE ib.item_id = p_item_id
    AND ib.sub_warehouse_id = p_sub_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_balances (
      item_id, sub_warehouse_id, quantity_on_hand, quantity_allocated,
      quantity_available, quantity_incoming, quantity_reserved, unit_cost,
      average_cost, last_purchase_cost, total_value, valuation_method,
      accounting_standard, inventory_valuation_rule, lcm_adjustment,
      is_lcm_applied, updated_at
    ) VALUES (
      p_item_id, p_sub_warehouse_id, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 'AVERAGE', v_standard, 'IAS2_AVERAGE', 0,
      false, now()
    )
    RETURNING * INTO v_balance;
  END IF;

  v_total_cost := p_quantity * p_unit_cost;
  v_new_qty := COALESCE(v_balance.quantity_on_hand, 0) + p_quantity;
  v_new_value := COALESCE(v_balance.total_value, 0) + v_total_cost;
  v_avg := CASE WHEN v_new_qty > 0 THEN v_new_value / v_new_qty ELSE p_unit_cost END;
  v_layer_type := CASE upper(COALESCE(p_reference_type, 'ADJUSTMENT'))
    WHEN 'PURCHASE' THEN 'PURCHASE'
    WHEN 'RECEIPT' THEN 'PURCHASE'
    ELSE 'ADJUSTMENT_POSITIVE'
  END;

  INSERT INTO public.inventory_movements (
    item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost,
    reference_type, reference_id, reference_number, accounting_standard,
    created_by, reason
  ) VALUES (
    p_item_id, p_sub_warehouse_id, 'IN', p_quantity, p_unit_cost, v_total_cost,
    upper(COALESCE(p_reference_type, 'ADJUSTMENT')), p_reference_id, p_reference_number,
    v_standard, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'إضافة مخزنية بمحرك التكلفة المتوسط'
  ) RETURNING id INTO v_move_id;

  INSERT INTO public.inventory_cost_layers (
    item_id, sub_warehouse_id, quantity, unit_cost, total_cost, layer_type,
    reference_type, reference_id, reference_number, purchase_date,
    accounting_standard, is_consumed, consumed_quantity, remaining_quantity,
    created_by
  ) VALUES (
    p_item_id, p_sub_warehouse_id, p_quantity, p_unit_cost, v_total_cost, v_layer_type,
    upper(COALESCE(p_reference_type, 'ADJUSTMENT')), p_reference_id, p_reference_number,
    now(), v_standard, false, 0, p_quantity, auth.uid()
  );

  UPDATE public.inventory_balances
  SET quantity_on_hand = v_new_qty,
      quantity_available = v_new_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
      total_value = v_new_value,
      average_cost = v_avg,
      unit_cost = v_avg,
      last_purchase_cost = p_unit_cost,
      last_purchase_at = now(),
      last_movement_id = v_move_id,
      last_movement_at = now(),
      accounting_standard = v_standard,
      valuation_method = 'AVERAGE',
      updated_at = now()
  WHERE id = v_balance.id;

  INSERT INTO public.warehouse_stock (
    restaurant_id, workspace_id, warehouse_id, product_id, quantity, min_quantity
  ) VALUES (
    v_restaurant_id, v_warehouse_workspace_id, p_sub_warehouse_id, p_item_id, v_new_qty, 0
  )
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET restaurant_id = EXCLUDED.restaurant_id,
      workspace_id = EXCLUDED.workspace_id,
      quantity = EXCLUDED.quantity;

  IF v_total_cost > 0 THEN
    INSERT INTO public.accounting_posting_outbox (
      company_id, restaurant_id, workspace_id, source_table, source_id,
      event_type, payload
    ) VALUES (
      v_company_id, v_restaurant_id, v_warehouse_workspace_id, 'inventory_movements', v_move_id,
      'inventory_adjustment_in', jsonb_build_object(
        'item_id', p_item_id,
        'warehouse_id', p_sub_warehouse_id,
        'quantity', p_quantity,
        'value', v_total_cost,
        'reference_type', upper(COALESCE(p_reference_type, 'ADJUSTMENT')),
        'reference_id', p_reference_id,
        'accounting_standard', v_standard
      )
    )
    ON CONFLICT (source_table, source_id, event_type) DO NOTHING;
  END IF;

  PERFORM public._inventory_sync_compatibility(p_item_id);

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_move_id,
    'unit_cost', p_unit_cost,
    'total_cost', v_total_cost,
    'quantity_on_hand', v_new_qty,
    'average_cost', v_avg,
    'total_value', v_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_inventory_receive(uuid, uuid, numeric, numeric, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_inventory_receive(uuid, uuid, numeric, numeric, text, uuid, text, text) TO authenticated, service_role;

-- The existing outbox worker already handles orders and transfers. Add the two
-- inventory movement events emitted by the existing issue/receive RPCs so COGS
-- and adjustment entries do not remain in failed state.
CREATE OR REPLACE FUNCTION public.process_accounting_posting_outbox(p_batch_size integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_order public.orders%ROWTYPE;
  v_transfer public.inventory_transfers%ROWTYPE;
  v_movement public.inventory_movements%ROWTYPE;
  v_lines jsonb;
  v_entry uuid;
  v_tax numeric;
  v_paid numeric;
  v_credit numeric;
  v_cost numeric;
  v_processed integer := 0;
  v_cash uuid;
  v_ar uuid;
  v_sales uuid;
  v_tax_account uuid;
  v_cogs uuid;
  v_inventory uuid;
  v_adjustment uuid;
  v_amount numeric;
  v_restaurant_id uuid;
BEGIN
  FOR v_row IN
    SELECT * FROM public.accounting_posting_outbox
    WHERE status IN ('pending','failed') AND available_at <= now()
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_batch_size,25), 100))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.accounting_posting_outbox
    SET status='processing', attempts=attempts+1, locked_at=now(), updated_at=now()
    WHERE id=v_row.id;
    BEGIN
      v_entry := NULL;
      v_restaurant_id := NULL;
      IF v_row.source_table = 'orders' AND v_row.event_type = 'sale_completed' THEN
        SELECT * INTO v_order FROM public.orders WHERE id=v_row.source_id FOR UPDATE;
        IF v_order.id IS NULL THEN RAISE EXCEPTION 'order % not found', v_row.source_id; END IF;
        v_tax := COALESCE((SELECT SUM(tax_amount) FROM public.order_taxes WHERE order_id=v_order.id), 0);
        v_paid := LEAST(COALESCE(v_order.total,0), GREATEST(COALESCE(v_order.paid_amount,0), COALESCE(v_order.direct_paid_amount,0)));
        v_credit := GREATEST(COALESCE(v_order.total,0)-v_paid,0);
        v_cash := public.get_cash_account(v_order.restaurant_id);
        v_ar := public.get_accounts_receivable(v_order.restaurant_id);
        v_sales := public.get_sales_account(v_order.restaurant_id);
        v_lines := '[]'::jsonb;
        IF v_paid > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_cash,'debit',v_paid,'credit',0,'description','تحصيل طلب '||v_order.order_number); END IF;
        IF v_credit > 0 THEN v_lines := v_lines || jsonb_build_object('account_id',v_ar,'debit',v_credit,'credit',0,'description','آجل طلب '||v_order.order_number); END IF;
        IF v_tax > 0 THEN
          v_tax_account := public._get_or_create_account(v_order.restaurant_id,'2100','ضريبة القيمة المضافة المستحقة','liability','current_liability','vat_payable','credit',false,false);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_sales,'debit',0,'credit',ROUND(v_order.total-v_tax,2),'description','مبيعات طلب '||v_order.order_number)
            || jsonb_build_object('account_id',v_tax_account,'debit',0,'credit',v_tax,'description','ضريبة طلب '||v_order.order_number);
        ELSE
          v_lines := v_lines || jsonb_build_object('account_id',v_sales,'debit',0,'credit',v_order.total,'description','مبيعات طلب '||v_order.order_number);
        END IF;
        v_cost := COALESCE((v_row.payload->>'inventory_cost')::numeric, v_order.total_cost, 0);
        IF v_cost > 0 THEN
          v_cogs := public.get_cogs_account(v_order.restaurant_id);
          v_inventory := public.get_inventory_account(v_order.restaurant_id);
          v_lines := v_lines
            || jsonb_build_object('account_id',v_cogs,'debit',v_cost,'credit',0,'description','تكلفة مبيعات '||v_order.order_number)
            || jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_cost,'description','صرف مخزون '||v_order.order_number);
        END IF;
        v_entry := public.fn_upsert_doc_journal(v_order.restaurant_id,'order',v_order.id,COALESCE(v_order.created_at::date,current_date),'قيد مبيعات - طلب رقم '||v_order.order_number,'sales',v_lines);
        UPDATE public.orders SET journal_entry_id=v_entry, updated_at=now() WHERE id=v_order.id;
      ELSIF v_row.source_table = 'inventory_transfers' AND v_row.event_type = 'inventory_transfer' THEN
        SELECT * INTO v_transfer FROM public.inventory_transfers WHERE id=v_row.source_id FOR UPDATE;
        IF v_transfer.id IS NULL THEN RAISE EXCEPTION 'transfer % not found', v_row.source_id; END IF;
        v_amount := COALESCE((v_row.payload->>'amount')::numeric,0);
        v_inventory := public.get_inventory_account(v_transfer.restaurant_id);
        v_lines := jsonb_build_array(
          jsonb_build_object('account_id',v_inventory,'debit',v_amount,'credit',0,'description','استلام تحويل مخزون'),
          jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_amount,'description','إرسال تحويل مخزون')
        );
        v_entry := public.fn_upsert_doc_journal(v_transfer.restaurant_id,'inventory_transfer',v_transfer.id,current_date,'قيد تحويل مخزون','inventory',v_lines);
        UPDATE public.inventory_transfers SET accounting_entry_id=v_entry WHERE id=v_transfer.id;
      ELSIF v_row.source_table = 'inventory_movements'
        AND v_row.event_type IN ('inventory_issue_cogs','inventory_adjustment_in') THEN
        SELECT im.* INTO v_movement
        FROM public.inventory_movements im
        WHERE im.id = v_row.source_id
        FOR UPDATE;
        IF v_movement.id IS NULL THEN RAISE EXCEPTION 'inventory movement % not found', v_row.source_id; END IF;
        SELECT p.restaurant_id INTO v_restaurant_id
        FROM public.products p WHERE p.id = v_movement.item_id;
        IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'inventory movement product not found'; END IF;
        v_inventory := public.get_inventory_account(v_restaurant_id);
        v_amount := COALESCE((v_row.payload->>'cogs')::numeric, (v_row.payload->>'value')::numeric, ABS(COALESCE(v_movement.total_cost,0)));
        IF v_row.event_type = 'inventory_issue_cogs' THEN
          v_cogs := public.get_cogs_account(v_restaurant_id);
          v_lines := jsonb_build_array(
            jsonb_build_object('account_id',v_cogs,'debit',v_amount,'credit',0,'description','تكلفة صرف مخزون'),
            jsonb_build_object('account_id',v_inventory,'debit',0,'credit',v_amount,'description','تخفيض المخزون')
          );
        ELSE
          v_adjustment := public._get_or_create_account(v_restaurant_id,'5200','هالك وتسويات المخزون','expense','cost_of_sales','inventory_loss','debit',false,false);
          v_lines := jsonb_build_array(
            jsonb_build_object('account_id',v_inventory,'debit',v_amount,'credit',0,'description','زيادة مخزون بالتسوية'),
            jsonb_build_object('account_id',v_adjustment,'debit',0,'credit',v_amount,'description','مقابل تسوية مخزون')
          );
        END IF;
        v_entry := public.fn_upsert_doc_journal(v_restaurant_id,'inventory_movement',v_movement.id,current_date,'قيد حركة مخزون','inventory',v_lines);
      ELSE
        RAISE EXCEPTION 'unsupported outbox event %.%', v_row.source_table, v_row.event_type;
      END IF;
      UPDATE public.accounting_posting_outbox SET status='posted', posted_entry_id=v_entry, last_error=NULL, updated_at=now() WHERE id=v_row.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.accounting_posting_outbox
      SET status='failed', last_error=left(SQLERRM,2000), available_at=now() + make_interval(secs => LEAST(3600, GREATEST(30, attempts*60))), updated_at=now()
      WHERE id=v_row.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_accounting_posting_outbox(integer) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
