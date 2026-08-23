-- AuditryPOS purchase receipt/costing bridge — additive, idempotent, data preserving.
-- Purchase invoices remain drafts until goods are received through the RPC below.

-- The new project may not have the legacy receipt tables. Create the minimal
-- canonical structures additively so purchase receiving and costing can work.
CREATE TABLE IF NOT EXISTS public.inventory_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  receipt_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(15,4) NOT NULL DEFAULT 0,
  paid_amount numeric(15,4) NOT NULL DEFAULT 0,
  discount_amount numeric(15,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,4) NOT NULL DEFAULT 0,
  net_amount numeric(15,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_receipt_id uuid NOT NULL REFERENCES public.inventory_receipts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost numeric(15,4) NOT NULL DEFAULT 0,
  total_cost numeric(15,4) NOT NULL DEFAULT 0,
  unit text,
  warehouse_location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_receipts_restaurant
  ON public.inventory_receipts(restaurant_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_receipts_workspace
  ON public.inventory_receipts(workspace_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_receipt
  ON public.inventory_receipt_items(inventory_receipt_id);

ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_receipts_tenant_access ON public.inventory_receipts;
CREATE POLICY inventory_receipts_tenant_access ON public.inventory_receipts
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT public.auth_restaurant_ids())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    restaurant_id IN (SELECT public.auth_restaurant_ids())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
REVOKE ALL ON public.inventory_receipts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_receipts TO authenticated;
GRANT ALL ON public.inventory_receipts TO service_role;

ALTER TABLE public.inventory_receipt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_receipt_items_tenant_access ON public.inventory_receipt_items;
CREATE POLICY inventory_receipt_items_tenant_access ON public.inventory_receipt_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inventory_receipts ir
      WHERE ir.id = inventory_receipt_id
        AND (
          ir.restaurant_id IN (SELECT public.auth_restaurant_ids())
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inventory_receipts ir
      WHERE ir.id = inventory_receipt_id
        AND (
          ir.restaurant_id IN (SELECT public.auth_restaurant_ids())
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );
REVOKE ALL ON public.inventory_receipt_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_receipt_items TO authenticated;
GRANT ALL ON public.inventory_receipt_items TO service_role;

ALTER TABLE public.purchase_invoices
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_receipts
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_purchase_invoices_set_workspace_id ON public.purchase_invoices;
CREATE TRIGGER trg_purchase_invoices_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

DROP TRIGGER IF EXISTS trg_inventory_receipts_set_workspace_id ON public.inventory_receipts;
CREATE TRIGGER trg_inventory_receipts_set_workspace_id
BEFORE INSERT OR UPDATE OF restaurant_id, workspace_id ON public.inventory_receipts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_workspace_id_from_restaurant();

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_workspace_created
  ON public.purchase_invoices(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_receipts_workspace_created
  ON public.inventory_receipts(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_inventory_warehouse
  ON public.purchase_invoice_items(invoice_id, line_type, warehouse_id, product_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_sub_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_sub_warehouse_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_warehouse_id_fkey
      FOREIGN KEY (sub_warehouse_id) REFERENCES public.warehouses(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_cost_layers'::regclass
      AND conname = 'inventory_cost_layers_sub_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_cost_layers DROP CONSTRAINT inventory_cost_layers_sub_warehouse_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_cost_layers'::regclass
      AND conname = 'inventory_cost_layers_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_cost_layers
      ADD CONSTRAINT inventory_cost_layers_warehouse_id_fkey
      FOREIGN KEY (sub_warehouse_id) REFERENCES public.warehouses(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.post_purchase_invoice_receipt_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_invoice_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice public.purchase_invoices;
  v_receipt_id uuid;
  v_receipt_number text;
  v_item record;
  v_balance public.inventory_balances;
  v_qty numeric;
  v_value numeric;
  v_avg numeric;
  v_move_id uuid;
  v_method text;
  v_standard text;
  v_company_id uuid;
  v_total numeric := 0;
BEGIN
  IF p_restaurant_id IS NULL OR p_workspace_id IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'restaurant, workspace, and invoice are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'الفاتورة لا تتبع الفرع المحدد';
  END IF;

  SELECT pi.* INTO v_invoice
  FROM public.purchase_invoices pi
  WHERE pi.id = p_invoice_id
    AND pi.restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'فاتورة الشراء غير موجودة';
  END IF;

  IF v_invoice.goods_received_at IS NOT NULL OR v_invoice.inventory_receipt_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'replayed', true,
      'invoice_id', p_invoice_id,
      'receipt_id', v_invoice.inventory_receipt_id
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_invoice_items pii
    WHERE pii.invoice_id = p_invoice_id
      AND pii.line_type = 'inventory'
      AND pii.product_id IS NOT NULL
      AND pii.warehouse_id IS NOT NULL
      AND pii.quantity > 0
  ) THEN
    RAISE EXCEPTION 'لا توجد بنود مخزون مكتملة بالمخزن والكمية';
  END IF;

  SELECT r.company_id INTO v_company_id
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id;

  SELECT COALESCE(ass.reporting_standard, 'IFRS') INTO v_standard
  FROM public.accounting_standard_settings ass
  WHERE ass.company_id = v_company_id
  LIMIT 1;
  v_standard := COALESCE(v_standard, 'IFRS');

  SELECT CASE lower(COALESCE(r.inventory_method, s.costing_method, 'average'))
    WHEN 'fifo' THEN 'FIFO'
    WHEN 'lifo' THEN CASE WHEN v_standard = 'US_GAAP' THEN 'LIFO' ELSE 'AVERAGE' END
    WHEN 'specific' THEN 'SPECIFIC'
    WHEN 'wac' THEN 'AVERAGE'
    WHEN 'weighted_avg' THEN 'AVERAGE'
    WHEN 'average' THEN 'AVERAGE'
    ELSE 'AVERAGE'
  END
  INTO v_method
  FROM public.restaurants r
  LEFT JOIN public.inventory_settings s ON s.restaurant_id = r.id
  WHERE r.id = p_restaurant_id;
  v_method := COALESCE(v_method, 'AVERAGE');

  v_receipt_number := 'RC-' || upper(right(replace(p_invoice_id::text, '-', ''), 12));

  INSERT INTO public.inventory_receipts (
    restaurant_id, workspace_id, receipt_number, supplier_id, receipt_date,
    total_amount, paid_amount, discount_amount, tax_amount, net_amount,
    status, notes, created_by
  ) VALUES (
    p_restaurant_id,
    p_workspace_id,
    v_receipt_number,
    v_invoice.supplier_id,
    COALESCE(v_invoice.invoice_date::date, current_date),
    COALESCE(v_invoice.total_amount, 0),
    COALESCE(v_invoice.paid_amount, 0),
    0,
    COALESCE(v_invoice.tax_amount, 0),
    COALESCE(v_invoice.net_amount, 0),
    'posted',
    concat('استلام ذري من فاتورة شراء ', v_invoice.invoice_number),
    auth.uid()
  ) RETURNING id INTO v_receipt_id;

  FOR v_item IN
    SELECT pii.*, p.name AS product_name, p.restaurant_id AS product_restaurant,
           p.workspace_id AS product_workspace
    FROM public.purchase_invoice_items pii
    JOIN public.products p ON p.id = pii.product_id
    WHERE pii.invoice_id = p_invoice_id
      AND pii.line_type = 'inventory'
    ORDER BY pii.id
  LOOP
    IF v_item.product_restaurant <> p_restaurant_id
       OR v_item.product_workspace <> p_workspace_id THEN
      RAISE EXCEPTION 'الصنف % لا يتبع الشركة أو الفرع المحدد', v_item.product_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = v_item.warehouse_id
        AND w.restaurant_id = p_restaurant_id
        AND w.workspace_id = p_workspace_id
        AND w.deleted_at IS NULL
        AND COALESCE(w.is_active, true)
    ) THEN
      RAISE EXCEPTION 'المخزن غير صالح للبند %', v_item.product_name;
    END IF;

    SELECT * INTO v_balance
    FROM public.inventory_balances ib
    WHERE ib.item_id = v_item.product_id
      AND ib.sub_warehouse_id = v_item.warehouse_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.inventory_balances (
        item_id, sub_warehouse_id, accounting_standard, valuation_method,
        inventory_valuation_rule
      ) VALUES (
        v_item.product_id, v_item.warehouse_id, v_standard, v_method,
        CASE v_method
          WHEN 'FIFO' THEN CASE WHEN v_standard = 'US_GAAP' THEN 'GAAP_FIFO' ELSE 'IAS2_FIFO' END
          WHEN 'LIFO' THEN 'GAAP_LIFO'
          WHEN 'SPECIFIC' THEN CASE WHEN v_standard = 'US_GAAP' THEN 'GAAP_AVERAGE' ELSE 'IAS2_SPECIFIC' END
          ELSE CASE WHEN v_standard = 'US_GAAP' THEN 'GAAP_AVERAGE' ELSE 'IAS2_AVERAGE' END
        END
      )
      RETURNING * INTO v_balance;
    END IF;

    v_qty := COALESCE(v_balance.quantity_on_hand, 0) + COALESCE(v_item.quantity, 0)::numeric;
    v_value := COALESCE(v_balance.total_value, 0) + (COALESCE(v_item.quantity, 0)::numeric * COALESCE(v_item.unit_cost, 0)::numeric);
    v_avg := CASE WHEN v_qty > 0 THEN v_value / v_qty ELSE COALESCE(v_item.unit_cost, 0)::numeric END;

    INSERT INTO public.inventory_movements (
      item_id, sub_warehouse_id, movement_type, quantity, unit_cost, total_cost,
      reference_type, reference_id, reference_number, accounting_standard,
      created_by, reason, notes
    ) VALUES (
      v_item.product_id, v_item.warehouse_id, 'IN', COALESCE(v_item.quantity, 0)::numeric,
      COALESCE(v_item.unit_cost, 0)::numeric, COALESCE(v_item.total, 0)::numeric, 'PURCHASE', p_invoice_id,
      v_invoice.invoice_number, v_standard,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'استلام فاتورة شراء', v_item.description
    ) RETURNING id INTO v_move_id;

    INSERT INTO public.inventory_cost_layers (
      item_id, sub_warehouse_id, quantity, unit_cost, total_cost, layer_type,
      reference_type, reference_id, reference_number, purchase_date,
      accounting_standard, remaining_quantity, created_by
    ) VALUES (
      v_item.product_id, v_item.warehouse_id, COALESCE(v_item.quantity, 0)::numeric,
      COALESCE(v_item.unit_cost, 0)::numeric, COALESCE(v_item.total, 0)::numeric, 'PURCHASE',
      'PURCHASE', p_invoice_id, v_invoice.invoice_number,
      COALESCE(v_invoice.invoice_date::timestamptz, now()), v_standard,
      COALESCE(v_item.quantity, 0)::numeric, auth.uid()
    );

    UPDATE public.inventory_balances
    SET quantity_on_hand = v_qty,
        quantity_available = v_qty - COALESCE(quantity_allocated, 0) - COALESCE(quantity_reserved, 0),
        total_value = v_value,
        average_cost = v_avg,
        unit_cost = CASE WHEN v_method = 'AVERAGE' THEN v_avg ELSE COALESCE(v_balance.unit_cost, v_avg) END,
        last_purchase_cost = COALESCE(v_item.unit_cost, 0)::numeric,
        last_purchase_at = now(),
        last_movement_id = v_move_id,
        last_movement_at = now(),
        valuation_method = v_method,
        accounting_standard = v_standard,
        updated_at = now()
    WHERE id = v_balance.id;

    INSERT INTO public.warehouse_stock (
      restaurant_id, workspace_id, warehouse_id, product_id, quantity, min_quantity
    ) VALUES (
      p_restaurant_id, p_workspace_id, v_item.warehouse_id, v_item.product_id,
      v_qty, 0
    )
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET restaurant_id = EXCLUDED.restaurant_id,
        workspace_id = EXCLUDED.workspace_id,
        quantity = EXCLUDED.quantity;

    INSERT INTO public.inventory_receipt_items (
      inventory_receipt_id, product_id, quantity, unit_cost, total_cost,
      unit, warehouse_location, notes
    ) VALUES (
      v_receipt_id, v_item.product_id, COALESCE(v_item.quantity, 0)::numeric,
      COALESCE(v_item.unit_cost, 0)::numeric, COALESCE(v_item.total, 0)::numeric,
      (SELECT unit FROM public.products WHERE id = v_item.product_id),
      v_item.warehouse_id::text,
      v_item.description
    );

    v_total := v_total + COALESCE(v_item.total, 0)::numeric;
  END LOOP;

  UPDATE public.inventory_receipts
  SET total_amount = v_total,
      net_amount = v_total + COALESCE(v_invoice.tax_amount, 0),
      status = 'posted'
  WHERE id = v_receipt_id;

  UPDATE public.purchase_invoices
  SET goods_received_at = now(),
      inventory_receipt_id = v_receipt_id,
      status = 'received',
      updated_at = now()
  WHERE id = p_invoice_id
    AND restaurant_id = p_restaurant_id;

  INSERT INTO public.accounting_posting_outbox (
    company_id, restaurant_id, workspace_id, source_table, source_id,
    event_type, payload
  ) VALUES (
    v_company_id, p_restaurant_id, p_workspace_id, 'inventory_receipts',
    v_receipt_id, 'purchase_receipt_posted',
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'receipt_id', v_receipt_id,
      'amount', v_total,
      'standard', v_standard,
      'costing_method', v_method
    )
  )
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'replayed', false,
    'invoice_id', p_invoice_id,
    'receipt_id', v_receipt_id,
    'costing_method', v_method,
    'amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.void_purchase_invoice_receipt_v2(
  p_restaurant_id uuid,
  p_workspace_id uuid,
  p_invoice_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice public.purchase_invoices;
  v_item record;
  v_issue jsonb;
  v_company_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'الفاتورة لا تتبع الفرع المحدد';
  END IF;

  SELECT pi.* INTO v_invoice
  FROM public.purchase_invoices pi
  WHERE pi.id = p_invoice_id AND pi.restaurant_id = p_restaurant_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'فاتورة الشراء غير موجودة'; END IF;

  IF v_invoice.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'replayed', true, 'invoice_id', p_invoice_id);
  END IF;

  IF v_invoice.inventory_receipt_id IS NULL THEN
    UPDATE public.purchase_invoices
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_invoice_id AND restaurant_id = p_restaurant_id;
    RETURN jsonb_build_object('success', true, 'replayed', false, 'stock_reversed', false, 'invoice_id', p_invoice_id);
  END IF;

  FOR v_item IN
    SELECT iri.product_id, iri.quantity, iri.warehouse_location::uuid AS warehouse_id
    FROM public.inventory_receipt_items iri
    WHERE iri.inventory_receipt_id = v_invoice.inventory_receipt_id
    ORDER BY iri.id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = v_item.warehouse_id
        AND w.restaurant_id = p_restaurant_id
        AND w.workspace_id = p_workspace_id
    ) THEN
      RAISE EXCEPTION 'مخزن عكس الفاتورة غير صالح';
    END IF;

    v_issue := public.rpc_inventory_issue(
      v_item.product_id,
      v_item.warehouse_id,
      COALESCE(v_item.quantity, 0)::numeric,
      'PURCHASE_RETURN',
      p_invoice_id,
      v_invoice.invoice_number,
      'RETURN_OUT',
      false
    );

    IF COALESCE((v_issue->>'success')::boolean, false) = false THEN
      RAISE EXCEPTION 'فشل عكس رصيد الصنف: %', COALESCE(v_issue->>'error', 'unknown');
    END IF;
  END LOOP;

  SELECT r.company_id INTO v_company_id FROM public.restaurants r WHERE r.id = p_restaurant_id;

  UPDATE public.purchase_invoices
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_invoice_id AND restaurant_id = p_restaurant_id;

  UPDATE public.inventory_receipts
  SET status = 'cancelled',
      notes = concat_ws(E'\n', notes, 'عكس الاستلام: ' || COALESCE(p_reason, 'بدون سبب')),
      updated_at = now()
  WHERE id = v_invoice.inventory_receipt_id;

  INSERT INTO public.accounting_posting_outbox (
    company_id, restaurant_id, workspace_id, source_table, source_id,
    event_type, payload
  ) VALUES (
    v_company_id, p_restaurant_id, p_workspace_id, 'purchase_invoices',
    p_invoice_id, 'purchase_receipt_voided',
    jsonb_build_object('invoice_id', p_invoice_id, 'reason', COALESCE(p_reason, 'عكس استلام شراء'))
  )
  ON CONFLICT (source_table, source_id, event_type) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'replayed', false, 'stock_reversed', true, 'invoice_id', p_invoice_id);
END;
$$;

REVOKE ALL ON FUNCTION public.post_purchase_invoice_receipt_v2(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_purchase_invoice_receipt_v2(uuid, uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_purchase_invoice_receipt_v2(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_purchase_invoice_receipt_v2(uuid, uuid, uuid, text) TO authenticated, service_role;
