-- Garment: stage costs, outsourcing, inventory fabric deduct, auto sales invoice on delivery

-- ── Columns on existing tables ──────────────────────────────────────────────
ALTER TABLE public.garment_orders
  ADD COLUMN IF NOT EXISTS fabric_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_stage_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_outsourcing_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE public.garment_fabric_rolls
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.garment_cutting_lots
  ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT false;

-- ── Stage costs (internal labor OR external / per-stage costing) ────────────
CREATE TABLE IF NOT EXISTS public.garment_stage_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  garment_order_id UUID NOT NULL REFERENCES public.garment_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  cost_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (cost_type IN ('internal','outsourcing','material','overhead')),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  vendor_name TEXT,
  outsourcing_job_id UUID,
  notes TEXT,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_stage_costs_order
  ON public.garment_stage_costs (garment_order_id, stage);

-- ── Outsourcing jobs tracking ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.garment_outsourcing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  garment_order_id UUID NOT NULL REFERENCES public.garment_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT,
  qty_sent INTEGER NOT NULL DEFAULT 0,
  qty_received INTEGER NOT NULL DEFAULT 0,
  qty_rejected INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft','sent','partial','received','cancelled')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  received_at TIMESTAMPTZ,
  external_ref TEXT,
  notes TEXT,
  created_by_name TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_outsourcing_order
  ON public.garment_outsourcing_jobs (garment_order_id, status);
CREATE INDEX IF NOT EXISTS idx_garment_outsourcing_rest
  ON public.garment_outsourcing_jobs (restaurant_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'garment_stage_costs_outsourcing_job_id_fkey'
  ) THEN
    ALTER TABLE public.garment_stage_costs
      ADD CONSTRAINT garment_stage_costs_outsourcing_job_id_fkey
      FOREIGN KEY (outsourcing_job_id) REFERENCES public.garment_outsourcing_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.garment_stage_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_outsourcing_jobs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['garment_stage_costs','garment_outsourcing_jobs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_all_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY owner_all_%I ON public.%I FOR ALL USING (
         restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
         OR restaurant_id IN (
           SELECT r.id FROM public.restaurants r
           JOIN public.company_users cu ON cu.company_id = r.company_id
           WHERE cu.user_id = auth.uid() AND cu.is_active = true
         )
       )', t, t
    );
  END LOOP;
END $$;

-- Helper: refresh order cost totals
CREATE OR REPLACE FUNCTION public.garment_refresh_order_costs(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.garment_orders o SET
    total_stage_cost = COALESCE((
      SELECT SUM(total_cost) FROM public.garment_stage_costs c
      WHERE c.garment_order_id = p_order_id AND c.cost_type IN ('internal','material','overhead')
    ), 0),
    total_outsourcing_cost = COALESCE((
      SELECT SUM(total_cost) FROM public.garment_stage_costs c
      WHERE c.garment_order_id = p_order_id AND c.cost_type = 'outsourcing'
    ), 0),
    updated_at = NOW()
  WHERE o.id = p_order_id;
END;
$$;

-- ── Record stage cost ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.garment_record_stage_cost(
  p_restaurant_id UUID,
  p_garment_order_id UUID,
  p_stage TEXT,
  p_cost_type TEXT DEFAULT 'internal',
  p_quantity NUMERIC DEFAULT 0,
  p_unit_cost NUMERIC DEFAULT 0,
  p_vendor_name TEXT DEFAULT NULL,
  p_outsourcing_job_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_total NUMERIC(14,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.garment_orders WHERE id = p_garment_order_id) THEN
    RAISE EXCEPTION 'أمر التشغيل غير موجود';
  END IF;
  v_total := ROUND((COALESCE(p_quantity, 0) * COALESCE(p_unit_cost, 0))::numeric, 2);

  INSERT INTO public.garment_stage_costs (
    restaurant_id, garment_order_id, stage, cost_type, quantity, unit_cost, total_cost,
    vendor_name, outsourcing_job_id, notes, recorded_by_name
  ) VALUES (
    p_restaurant_id, p_garment_order_id, p_stage,
    COALESCE(NULLIF(p_cost_type, ''), 'internal'),
    COALESCE(p_quantity, 0), COALESCE(p_unit_cost, 0), v_total,
    p_vendor_name, p_outsourcing_job_id, p_notes, p_actor_name
  )
  RETURNING id INTO v_id;

  PERFORM public.garment_refresh_order_costs(p_garment_order_id);
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_record_stage_cost(
  UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TEXT
) TO authenticated;

-- ── Create outsourcing job ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.garment_create_outsourcing(
  p_restaurant_id UUID,
  p_garment_order_id UUID,
  p_stage TEXT,
  p_vendor_name TEXT,
  p_qty_sent INTEGER,
  p_unit_cost NUMERIC DEFAULT 0,
  p_vendor_phone TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_auto_cost BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_total NUMERIC(14,2);
BEGIN
  IF COALESCE(TRIM(p_vendor_name), '') = '' THEN
    RAISE EXCEPTION 'اسم المصنع/الورشة الخارجي مطلوب';
  END IF;
  IF COALESCE(p_qty_sent, 0) <= 0 THEN
    RAISE EXCEPTION 'كمية الخروج للتصنيع الخارجي يجب أن تكون أكبر من صفر';
  END IF;

  v_total := ROUND((COALESCE(p_qty_sent, 0) * COALESCE(p_unit_cost, 0))::numeric, 2);

  INSERT INTO public.garment_outsourcing_jobs (
    restaurant_id, garment_order_id, stage, vendor_name, vendor_phone,
    qty_sent, unit_cost, total_cost, status, due_date, external_ref, notes, created_by_name
  ) VALUES (
    p_restaurant_id, p_garment_order_id, p_stage, TRIM(p_vendor_name), p_vendor_phone,
    p_qty_sent, COALESCE(p_unit_cost, 0), v_total, 'sent', p_due_date, p_external_ref, p_notes, p_actor_name
  )
  RETURNING id INTO v_id;

  IF COALESCE(p_auto_cost, true) AND v_total > 0 THEN
    PERFORM public.garment_record_stage_cost(
      p_restaurant_id, p_garment_order_id, p_stage, 'outsourcing',
      p_qty_sent, p_unit_cost, TRIM(p_vendor_name), v_id,
      COALESCE(p_notes, 'تكلفة تصنيع خارجي'), p_actor_name
    );
  END IF;

  -- Optional stage log
  INSERT INTO public.garment_stage_logs (
    restaurant_id, garment_order_id, from_stage, to_stage, quantity, laundry_ref, actor_name, notes
  )
  SELECT restaurant_id, id, current_stage, current_stage, p_qty_sent,
         COALESCE(p_external_ref, 'outsourcing'), p_actor_name,
         'تصنيع خارجي: ' || TRIM(p_vendor_name) || ' — مرحلة ' || p_stage
  FROM public.garment_orders WHERE id = p_garment_order_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_create_outsourcing(
  UUID, UUID, TEXT, TEXT, INTEGER, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;

-- ── Receive outsourcing ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.garment_receive_outsourcing(
  p_job_id UUID,
  p_qty_received INTEGER,
  p_qty_rejected INTEGER DEFAULT 0,
  p_actor_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.garment_outsourcing_jobs%ROWTYPE;
  v_recv INTEGER;
  v_rej INTEGER;
BEGIN
  SELECT * INTO v_job FROM public.garment_outsourcing_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر تصنيع خارجي غير موجود'; END IF;

  v_recv := COALESCE(p_qty_received, 0);
  v_rej := COALESCE(p_qty_rejected, 0);
  IF v_recv < 0 OR v_rej < 0 THEN RAISE EXCEPTION 'كميات غير صالحة'; END IF;

  UPDATE public.garment_outsourcing_jobs SET
    qty_received = qty_received + v_recv,
    qty_rejected = qty_rejected + v_rej,
    status = CASE
      WHEN (qty_received + v_recv) >= qty_sent THEN 'received'
      WHEN (qty_received + v_recv) > 0 THEN 'partial'
      ELSE status
    END,
    received_at = CASE
      WHEN (qty_received + v_recv) >= qty_sent THEN NOW()
      ELSE received_at
    END,
    updated_by_name = COALESCE(p_actor_name, updated_by_name),
    updated_at = NOW(),
    notes = CASE WHEN p_notes IS NOT NULL AND TRIM(p_notes) <> '' THEN
      COALESCE(notes || E'\n', '') || p_notes ELSE notes END
  WHERE id = p_job_id;

  INSERT INTO public.garment_stage_logs (
    restaurant_id, garment_order_id, from_stage, to_stage, quantity,
    qc_pass, qc_fail, laundry_ref, actor_name, notes
  ) VALUES (
    v_job.restaurant_id, v_job.garment_order_id, v_job.stage, v_job.stage,
    v_recv, v_recv, v_rej, v_job.external_ref, p_actor_name,
    'استلام تصنيع خارجي من ' || v_job.vendor_name
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_receive_outsourcing(UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- ── Override cutting: also deduct fabric from products inventory ─────────────
CREATE OR REPLACE FUNCTION public.garment_record_cutting(
  p_restaurant_id UUID,
  p_garment_order_id UUID,
  p_fabric_roll_id UUID,
  p_lot_number TEXT,
  p_marker_length_m NUMERIC,
  p_lays_count INTEGER,
  p_meters_planned NUMERIC,
  p_meters_actual NUMERIC,
  p_pieces_planned INTEGER,
  p_pieces_cut INTEGER,
  p_cut_by_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.garment_orders%ROWTYPE;
  v_roll public.garment_fabric_rolls%ROWTYPE;
  v_waste_pct NUMERIC(8,2);
  v_limit NUMERIC(6,2);
  v_flag BOOLEAN := false;
  v_id UUID;
  v_product_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_garment_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر التشغيل غير موجود'; END IF;

  v_limit := COALESCE(v_order.cutting_waste_limit_pct, 5);
  IF p_meters_planned > 0 THEN
    v_waste_pct := ROUND(((GREATEST(p_meters_actual - p_meters_planned, 0) / p_meters_planned) * 100)::numeric, 2);
  ELSE
    v_waste_pct := 0;
  END IF;

  IF v_waste_pct > v_limit OR p_pieces_cut < p_pieces_planned THEN
    v_flag := true;
  END IF;

  INSERT INTO public.garment_cutting_lots (
    restaurant_id, garment_order_id, fabric_roll_id, lot_number,
    marker_length_m, lays_count, meters_planned, meters_actual, waste_pct,
    pieces_planned, pieces_cut, variance_flag, requires_approval,
    approved, cut_by_name, notes, status, inventory_deducted
  ) VALUES (
    p_restaurant_id, p_garment_order_id, p_fabric_roll_id,
    COALESCE(NULLIF(TRIM(p_lot_number), ''), 'LOT-' || LEFT(gen_random_uuid()::text, 8)),
    COALESCE(p_marker_length_m, 0), COALESCE(p_lays_count, 1),
    COALESCE(p_meters_planned, 0), COALESCE(p_meters_actual, 0), v_waste_pct,
    COALESCE(p_pieces_planned, 0), COALESCE(p_pieces_cut, 0),
    v_flag, v_flag,
    NOT v_flag, p_cut_by_name, p_notes,
    CASE WHEN v_flag THEN 'pending' ELSE 'posted' END,
    false
  )
  RETURNING id INTO v_id;

  IF p_fabric_roll_id IS NOT NULL AND COALESCE(p_meters_actual, 0) > 0 THEN
    UPDATE public.garment_fabric_rolls
    SET meters_consumed = meters_consumed + p_meters_actual,
        status = CASE
          WHEN meters_consumed + p_meters_actual >= meters_received THEN 'consumed'
          WHEN meters_consumed + p_meters_actual > 0 THEN 'partial'
          ELSE status
        END
    WHERE id = p_fabric_roll_id
    RETURNING * INTO v_roll;

    -- خصم مباشر من مخزون المنتجات (المتراج)
    v_product_id := COALESCE(v_roll.product_id, v_order.fabric_product_id);
    IF v_product_id IS NOT NULL THEN
      BEGIN
        PERFORM public.adjust_product_stock(
          v_product_id,
          p_restaurant_id,
          p_meters_actual,
          'out',
          'garment_cutting',
          'garment_cut:' || v_id::text
        );
        UPDATE public.garment_cutting_lots SET inventory_deducted = true WHERE id = v_id;
      EXCEPTION
        WHEN undefined_function THEN
          NULL;
        WHEN OTHERS THEN
          RAISE WARNING 'garment inventory deduct failed: %', SQLERRM;
      END;
    END IF;
  END IF;

  IF NOT v_flag THEN
    UPDATE public.garment_orders
    SET quantity_cut = quantity_cut + COALESCE(p_pieces_cut, 0),
        current_stage = CASE WHEN current_stage = 'fabric_receipt' THEN 'cutting' ELSE current_stage END,
        status = 'in_progress',
        updated_at = NOW(),
        updated_by_name = COALESCE(p_cut_by_name, updated_by_name)
    WHERE id = p_garment_order_id;
  END IF;

  RETURN v_id;
END;
$$;

-- ── Deliver + auto create sales invoice (orders + order_items) ───────────────
CREATE OR REPLACE FUNCTION public.garment_deliver_and_invoice(
  p_order_id UUID,
  p_quantity INTEGER DEFAULT NULL,
  p_paid_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'credit',
  p_actor_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.garment_orders%ROWTYPE;
  v_qty INTEGER;
  v_total NUMERIC(14,2);
  v_invoice_id UUID;
  v_order_number TEXT;
  v_customer_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر غير موجود'; END IF;

  IF v_order.sales_order_id IS NOT NULL THEN
    RETURN v_order.sales_order_id;
  END IF;

  v_qty := COALESCE(NULLIF(p_quantity, 0), NULLIF(v_order.quantity_packed, 0), NULLIF(v_order.quantity_qc_pass, 0), v_order.quantity_planned);
  IF COALESCE(v_qty, 0) <= 0 THEN
    RAISE EXCEPTION 'لا توجد كمية للتسليم';
  END IF;

  v_total := ROUND((v_qty * COALESCE(v_order.unit_price, 0))::numeric, 2);
  v_order_number := 'GI-' || COALESCE(v_order.order_number, LEFT(p_order_id::text, 8));
  v_customer_id := v_order.customer_id;

  -- find customer by name if no id
  IF v_customer_id IS NULL AND COALESCE(TRIM(v_order.customer_name), '') <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE restaurant_id = v_order.restaurant_id
      AND name ILIKE TRIM(v_order.customer_name)
    LIMIT 1;
  END IF;

  INSERT INTO public.orders (
    restaurant_id, order_number, customer_name, customer_id,
    total, paid_amount, status, payment_method, notes, is_pos, created_by_name
  ) VALUES (
    v_order.restaurant_id,
    v_order_number,
    COALESCE(v_order.customer_name, 'عميل مصنع'),
    v_customer_id,
    v_total,
    COALESCE(p_paid_amount, 0),
    'completed',
    COALESCE(NULLIF(p_payment_method, ''), 'credit'),
    COALESCE(p_notes, 'فاتورة تسليم أمر ملابس ' || v_order.order_number || ' — ' || v_order.style_name),
    false,
    p_actor_name
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.order_items (
    order_id, menu_item_name, quantity, price, variables
  ) VALUES (
    v_invoice_id,
    COALESCE(v_order.style_name, 'موديل') || COALESCE(' / ' || NULLIF(v_order.style_code, ''), ''),
    v_qty,
    COALESCE(v_order.unit_price, 0),
    jsonb_build_object(
      'garment_order_id', p_order_id,
      'garment_order_number', v_order.order_number,
      'style_code', v_order.style_code,
      'color', v_order.color,
      'sizes', v_order.sizes,
      'stage_cost', v_order.total_stage_cost,
      'outsourcing_cost', v_order.total_outsourcing_cost
    )
  );

  UPDATE public.garment_orders SET
    sales_order_id = v_invoice_id,
    quantity_delivered = GREATEST(COALESCE(quantity_delivered, 0), v_qty),
    quantity_packed = GREATEST(COALESCE(quantity_packed, 0), v_qty),
    current_stage = 'completed',
    status = 'completed',
    delivered_at = NOW(),
    total_value = v_total,
    updated_by_name = COALESCE(p_actor_name, updated_by_name),
    updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO public.garment_stage_logs (
    restaurant_id, garment_order_id, from_stage, to_stage, quantity, actor_name, notes
  ) VALUES (
    v_order.restaurant_id, p_order_id, v_order.current_stage, 'completed', v_qty, p_actor_name,
    'تسليم + فاتورة بيع ' || v_order_number
  );

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_deliver_and_invoice(
  UUID, INTEGER, NUMERIC, TEXT, TEXT, TEXT
) TO authenticated;

-- Wire advance_stage: auto-invoice when moving to delivery/completed
CREATE OR REPLACE FUNCTION public.garment_advance_stage(
  p_order_id UUID,
  p_to_stage TEXT,
  p_quantity INTEGER DEFAULT 0,
  p_qc_pass INTEGER DEFAULT 0,
  p_qc_fail INTEGER DEFAULT 0,
  p_laundry_ref TEXT DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.garment_orders%ROWTYPE;
  v_from TEXT;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر غير موجود'; END IF;
  v_from := v_order.current_stage;

  -- Auto sales invoice on delivery / completed
  IF p_to_stage IN ('delivery', 'completed') AND v_order.sales_order_id IS NULL THEN
    PERFORM public.garment_deliver_and_invoice(
      p_order_id,
      COALESCE(NULLIF(p_quantity, 0), NULLIF(v_order.quantity_packed, 0), v_order.quantity_planned),
      0,
      'credit',
      p_actor_name,
      p_notes
    );
    RETURN true;
  END IF;

  INSERT INTO public.garment_stage_logs (
    restaurant_id, garment_order_id, from_stage, to_stage, quantity,
    qc_pass, qc_fail, laundry_ref, actor_name, notes
  ) VALUES (
    v_order.restaurant_id, p_order_id, v_from, p_to_stage, COALESCE(p_quantity, 0),
    COALESCE(p_qc_pass, 0), COALESCE(p_qc_fail, 0), p_laundry_ref, p_actor_name, p_notes
  );

  UPDATE public.garment_orders SET
    current_stage = p_to_stage,
    status = CASE
      WHEN p_to_stage = 'completed' THEN 'completed'
      WHEN p_to_stage = 'cancelled' THEN 'cancelled'
      ELSE 'in_progress'
    END,
    quantity_assembled = CASE WHEN p_to_stage = 'assembly' THEN quantity_assembled + COALESCE(p_quantity, 0) ELSE quantity_assembled END,
    quantity_qc_pass = CASE WHEN p_to_stage IN ('quality','laundry_out') THEN quantity_qc_pass + COALESCE(p_qc_pass, p_quantity, 0) ELSE quantity_qc_pass END,
    quantity_qc_fail = CASE WHEN p_to_stage = 'quality' THEN quantity_qc_fail + COALESCE(p_qc_fail, 0) ELSE quantity_qc_fail END,
    quantity_laundry = CASE WHEN p_to_stage = 'laundry_out' THEN quantity_laundry + COALESCE(p_quantity, 0)
                            WHEN p_to_stage = 'laundry_in' THEN GREATEST(quantity_laundry - COALESCE(p_quantity, 0), 0)
                            ELSE quantity_laundry END,
    quantity_packed = CASE WHEN p_to_stage = 'packing' THEN quantity_packed + COALESCE(p_quantity, 0) ELSE quantity_packed END,
    quantity_delivered = CASE WHEN p_to_stage IN ('delivery','completed') THEN quantity_delivered + COALESCE(p_quantity, 0) ELSE quantity_delivered END,
    updated_by_name = COALESCE(p_actor_name, updated_by_name),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN true;
END;
$$;
