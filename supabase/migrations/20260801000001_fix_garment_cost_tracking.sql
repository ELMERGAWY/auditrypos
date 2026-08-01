-- Comprehensive fix for garment manufacturing module cost tracking
-- This migration fixes the disconnect between quantities and costs

BEGIN;

-- Drop old version of garment_advance_stage to avoid function ambiguity
DROP FUNCTION IF EXISTS public.garment_advance_stage(
  UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT
);

-- 1. Add quantity_transferred to garment_stage_costs to link costs with actual quantities
ALTER TABLE public.garment_stage_costs
ADD COLUMN IF NOT EXISTS quantity_transferred INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage_log_id UUID REFERENCES public.garment_stage_logs(id) ON DELETE SET NULL;

-- 2. Add cost_per_unit to garment_orders for tracking accumulated cost per piece
ALTER TABLE public.garment_orders
ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_cost_per_unit NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_variance NUMERIC(14,2) DEFAULT 0;

-- 3. Add planned_cost_per_stage to garment_stage_defs for cost planning
ALTER TABLE public.garment_stage_defs
ADD COLUMN IF NOT EXISTS planned_cost_per_unit NUMERIC(14,2) DEFAULT 0;

-- 4. Update garment_refresh_order_costs to calculate cost_per_unit
CREATE OR REPLACE FUNCTION public.garment_refresh_order_costs(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cost NUMERIC(14,2);
  v_total_quantity INTEGER;
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

  -- Calculate cost_per_unit based on quantity_planned
  SELECT total_stage_cost + total_outsourcing_cost, quantity_planned
  INTO v_total_cost, v_total_quantity
  FROM public.garment_orders
  WHERE id = p_order_id;

  IF v_total_quantity > 0 THEN
    UPDATE public.garment_orders
    SET cost_per_unit = ROUND((v_total_cost / v_total_quantity)::numeric, 2)
    WHERE id = p_order_id;
  END IF;

  -- Calculate cost_variance if planned_cost_per_unit exists
  IF EXISTS (SELECT 1 FROM public.garment_orders WHERE id = p_order_id AND planned_cost_per_unit > 0) THEN
    UPDATE public.garment_orders
    SET cost_variance = cost_per_unit - planned_cost_per_unit
    WHERE id = p_order_id;
  END IF;
END;
$$;

-- 5. Update garment_record_stage_cost to validate and link with stage logs
CREATE OR REPLACE FUNCTION public.garment_record_stage_cost(
  p_restaurant_id UUID,
  p_garment_order_id UUID,
  p_stage TEXT,
  p_cost_type TEXT DEFAULT 'internal',
  p_quantity NUMERIC DEFAULT 0,
  p_unit_cost NUMERIC DEFAULT 0,
  p_vendor_name TEXT DEFAULT NULL,
  p_outsourcing_job_id UUID DEFAULT NULL,
  p_stage_log_id UUID DEFAULT NULL,
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
  v_order_qty INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.garment_orders WHERE id = p_garment_order_id) THEN
    RAISE EXCEPTION 'أمر التشغيل غير موجود';
  END IF;

  -- Get planned quantity for validation
  SELECT quantity_planned INTO v_order_qty
  FROM public.garment_orders
  WHERE id = p_garment_order_id;

  -- Validate quantity doesn't exceed planned
  IF COALESCE(p_quantity, 0) > v_order_qty THEN
    RAISE EXCEPTION 'الكمية (%) تتجاوز الكمية المخططة (%)', p_quantity, v_order_qty;
  END IF;

  v_total := ROUND((COALESCE(p_quantity, 0) * COALESCE(p_unit_cost, 0))::numeric, 2);

  INSERT INTO public.garment_stage_costs (
    restaurant_id, garment_order_id, stage, cost_type, quantity, unit_cost, total_cost,
    vendor_name, outsourcing_job_id, stage_log_id, notes, recorded_by_name, quantity_transferred
  ) VALUES (
    p_restaurant_id, p_garment_order_id, p_stage,
    COALESCE(NULLIF(p_cost_type, ''), 'internal'),
    COALESCE(p_quantity, 0), COALESCE(p_unit_cost, 0), v_total,
    p_vendor_name, p_outsourcing_job_id, p_stage_log_id, p_notes, p_actor_name,
    COALESCE(p_quantity, 0)::INTEGER
  )
  RETURNING id INTO v_id;

  PERFORM public.garment_refresh_order_costs(p_garment_order_id);
  RETURN v_id;
END;
$$;

-- 6. Update garment_advance_stage to optionally record costs
CREATE OR REPLACE FUNCTION public.garment_advance_stage(
  p_order_id UUID,
  p_to_stage TEXT,
  p_quantity INTEGER DEFAULT 0,
  p_qc_pass INTEGER DEFAULT 0,
  p_qc_fail INTEGER DEFAULT 0,
  p_laundry_ref TEXT DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_record_cost BOOLEAN DEFAULT false,
  p_cost_per_unit NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.garment_orders%ROWTYPE;
  v_from TEXT;
  v_invoice BOOLEAN := false;
  v_terminal BOOLEAN := false;
  v_packing BOOLEAN := false;
  v_log_id UUID;
  v_cost_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر غير موجود'; END IF;
  v_from := v_order.current_stage;

  PERFORM public.garment_seed_default_stages(v_order.restaurant_id);

  SELECT COALESCE(triggers_invoice, false), COALESCE(is_terminal, false), COALESCE(tracks_packing, false)
  INTO v_invoice, v_terminal, v_packing
  FROM public.garment_stage_defs
  WHERE restaurant_id = v_order.restaurant_id AND stage_key = p_to_stage
  LIMIT 1;

  IF NOT FOUND THEN
    v_invoice := p_to_stage IN ('delivery', 'completed');
    v_terminal := p_to_stage = 'completed';
    v_packing := p_to_stage = 'packing';
  END IF;

  IF v_invoice AND v_order.sales_order_id IS NULL THEN
    PERFORM public.garment_deliver_and_invoice(
      p_order_id,
      COALESCE(NULLIF(p_quantity, 0), NULLIF(v_order.quantity_packed, 0), v_order.quantity_planned),
      0,
      'credit',
      p_actor_name,
      p_notes
    );
    IF v_terminal OR p_to_stage = 'completed' THEN
      UPDATE public.garment_orders SET current_stage = COALESCE(
        (SELECT stage_key FROM public.garment_stage_defs
         WHERE restaurant_id = v_order.restaurant_id AND is_terminal = true AND is_active = true
         ORDER BY order_index DESC LIMIT 1),
        'completed'
      ) WHERE id = p_order_id;
    END IF;
    RETURN NULL;
  END IF;

  INSERT INTO public.garment_stage_logs (
    restaurant_id, garment_order_id, from_stage, to_stage, quantity,
    qc_pass, qc_fail, laundry_ref, actor_name, notes
  ) VALUES (
    v_order.restaurant_id, p_order_id, v_from, p_to_stage, COALESCE(p_quantity, 0),
    COALESCE(p_qc_pass, 0), COALESCE(p_qc_fail, 0), p_laundry_ref, p_actor_name, p_notes
  ) RETURNING id INTO v_log_id;

  -- Optionally record cost for this stage transfer
  IF p_record_cost AND p_cost_per_unit IS NOT NULL AND COALESCE(p_quantity, 0) > 0 THEN
    SELECT planned_cost_per_unit INTO v_cost_id
    FROM public.garment_stage_defs
    WHERE restaurant_id = v_order.restaurant_id AND stage_key = p_to_stage;

    v_cost_id := public.garment_record_stage_cost(
      v_order.restaurant_id,
      p_order_id,
      p_to_stage,
      'internal',
      p_quantity,
      COALESCE(p_cost_per_unit, v_cost_id, 0),
      NULL,
      NULL,
      v_log_id,
      p_notes,
      p_actor_name
    );
  END IF;

  UPDATE public.garment_orders SET
    current_stage = p_to_stage,
    status = CASE
      WHEN v_terminal OR p_to_stage = 'completed' THEN 'completed'
      WHEN p_to_stage = 'cancelled' THEN 'cancelled'
      ELSE 'in_progress'
    END,
    quantity_assembled = CASE WHEN p_to_stage = 'assembly' THEN quantity_assembled + COALESCE(p_quantity, 0) ELSE quantity_assembled END,
    quantity_qc_pass = CASE WHEN p_to_stage IN ('quality','laundry_out') THEN quantity_qc_pass + COALESCE(p_qc_pass, p_quantity, 0) ELSE quantity_qc_pass END,
    quantity_qc_fail = CASE WHEN p_to_stage = 'quality' THEN quantity_qc_fail + COALESCE(p_qc_fail, 0) ELSE quantity_qc_fail END,
    quantity_laundry = CASE WHEN p_to_stage = 'laundry_out' THEN quantity_laundry + COALESCE(p_quantity, 0)
                            WHEN p_to_stage = 'laundry_in' THEN GREATEST(quantity_laundry - COALESCE(p_quantity, 0), 0)
                            ELSE quantity_laundry END,
    quantity_packed = CASE WHEN v_packing OR p_to_stage = 'packing' THEN quantity_packed + COALESCE(p_quantity, 0) ELSE quantity_packed END,
    quantity_delivered = CASE WHEN v_invoice THEN quantity_delivered + COALESCE(p_quantity, 0) ELSE quantity_delivered END,
    updated_by_name = COALESCE(p_actor_name, updated_by_name),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_log_id;
END;
$$;

-- 7. Add trigger to auto-update cost_per_unit when costs change
DROP TRIGGER IF EXISTS garment_stage_costs_cost_update ON public.garment_stage_costs;
DROP FUNCTION IF EXISTS public.garment_trigger_cost_update();

CREATE OR REPLACE FUNCTION public.garment_trigger_cost_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    PERFORM public.garment_refresh_order_costs(NEW.garment_order_id);
    RETURN COALESCE(NEW, OLD);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER garment_stage_costs_cost_update
AFTER INSERT OR UPDATE OR DELETE ON public.garment_stage_costs
FOR EACH ROW EXECUTE FUNCTION public.garment_trigger_cost_update();

-- 8. Add garment order deletion function with inventory rollback
CREATE OR REPLACE FUNCTION public.garment_delete_order(
  p_order_id UUID,
  p_actor_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.garment_orders%ROWTYPE;
  v_fabric_product_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر التشغيل غير موجود'; END IF;

  -- Prevent deletion if order is completed or has sales invoice
  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'لا يمكن حذف أمر مكتمل';
  END IF;
  IF v_order.sales_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'لا يمكن حذف أمر له فاتورة مبيعات';
  END IF;

  -- Rollback fabric inventory if fabric_product_id exists
  v_fabric_product_id := v_order.fabric_product_id;
  IF v_fabric_product_id IS NOT NULL AND v_order.quantity_cut > 0 THEN
    -- Return fabric to inventory (reverse the cutting consumption)
    -- This assumes fabric is tracked as a product in inventory
    INSERT INTO public.inventory_transactions (
      restaurant_id, product_id, transaction_type, quantity,
      reference_type, reference_id, notes, created_by_name
    ) VALUES (
      v_order.restaurant_id,
      v_fabric_product_id,
      'adjustment',
      v_order.quantity_cut, -- Positive to add back to inventory
      'garment_order',
      p_order_id,
      'إرجاع قماش من حذف أمر إنتاج ' || v_order.order_number,
      p_actor_name
    );
  END IF;

  -- Delete related records in order
  DELETE FROM public.garment_stage_logs WHERE garment_order_id = p_order_id;
  DELETE FROM public.garment_stage_costs WHERE garment_order_id = p_order_id;
  DELETE FROM public.garment_outsourcing_jobs WHERE garment_order_id = p_order_id;
  DELETE FROM public.garment_cutting_lots WHERE garment_order_id = p_order_id;
  DELETE FROM public.garment_fabric_rolls WHERE garment_order_id = p_order_id;

  -- Delete the order itself
  DELETE FROM public.garment_orders WHERE id = p_order_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_delete_order(UUID, TEXT) TO authenticated;

COMMIT;
