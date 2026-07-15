-- Garment / Apparel Factory Production Module
-- Pipeline: fabric → cut (metrage control) → prep → front/back/sleeve → assemble → QC → laundry → pack → deliver

ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'garment_factory';

CREATE TABLE IF NOT EXISTS public.garment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  style_name TEXT NOT NULL,
  style_code TEXT,
  color TEXT,
  fabric_type TEXT,
  sizes JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity_planned INTEGER NOT NULL DEFAULT 0,
  quantity_cut INTEGER NOT NULL DEFAULT 0,
  quantity_assembled INTEGER NOT NULL DEFAULT 0,
  quantity_qc_pass INTEGER NOT NULL DEFAULT 0,
  quantity_qc_fail INTEGER NOT NULL DEFAULT 0,
  quantity_laundry INTEGER NOT NULL DEFAULT 0,
  quantity_packed INTEGER NOT NULL DEFAULT 0,
  quantity_delivered INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'fabric_receipt'
    CHECK (current_stage IN (
      'fabric_receipt','cutting','preparation','front','back','sleeve',
      'assembly','quality','laundry_out','laundry_in','packing','delivery','completed','cancelled'
    )),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','on_hold','completed','cancelled')),
  unit_price NUMERIC(14,2) DEFAULT 0,
  total_value NUMERIC(14,2) DEFAULT 0,
  due_date DATE,
  notes TEXT,
  cutting_waste_limit_pct NUMERIC(6,2) DEFAULT 5,
  created_by_name TEXT,
  updated_by_name TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.garment_fabric_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  garment_order_id UUID REFERENCES public.garment_orders(id) ON DELETE SET NULL,
  roll_number TEXT NOT NULL,
  fabric_type TEXT,
  color TEXT,
  width_cm NUMERIC(10,2),
  meters_received NUMERIC(14,3) NOT NULL DEFAULT 0,
  meters_consumed NUMERIC(14,3) NOT NULL DEFAULT 0,
  meters_remaining NUMERIC(14,3) GENERATED ALWAYS AS (GREATEST(meters_received - meters_consumed, 0)) STORED,
  weight_kg NUMERIC(12,3),
  supplier_name TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  received_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock','partial','consumed','returned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.garment_cutting_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  garment_order_id UUID NOT NULL REFERENCES public.garment_orders(id) ON DELETE CASCADE,
  fabric_roll_id UUID REFERENCES public.garment_fabric_rolls(id) ON DELETE SET NULL,
  lot_number TEXT NOT NULL,
  marker_length_m NUMERIC(12,3) DEFAULT 0,
  lays_count INTEGER DEFAULT 1,
  meters_planned NUMERIC(14,3) NOT NULL DEFAULT 0,
  meters_actual NUMERIC(14,3) NOT NULL DEFAULT 0,
  waste_meters NUMERIC(14,3) GENERATED ALWAYS AS (GREATEST(meters_actual - meters_planned, 0)) STORED,
  waste_pct NUMERIC(8,2),
  pieces_planned INTEGER NOT NULL DEFAULT 0,
  pieces_cut INTEGER NOT NULL DEFAULT 0,
  variance_flag BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN DEFAULT false,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  cut_by_name TEXT,
  cut_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.garment_stage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  garment_order_id UUID NOT NULL REFERENCES public.garment_orders(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  qc_pass INTEGER DEFAULT 0,
  qc_fail INTEGER DEFAULT 0,
  laundry_ref TEXT,
  actor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garment_orders_rest_stage
  ON public.garment_orders (restaurant_id, current_stage, status);
CREATE INDEX IF NOT EXISTS idx_garment_rolls_order
  ON public.garment_fabric_rolls (garment_order_id);
CREATE INDEX IF NOT EXISTS idx_garment_cutting_order
  ON public.garment_cutting_lots (garment_order_id);
CREATE INDEX IF NOT EXISTS idx_garment_logs_order
  ON public.garment_stage_logs (garment_order_id, created_at DESC);

ALTER TABLE public.garment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_fabric_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_cutting_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_stage_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'garment_orders','garment_fabric_rolls','garment_cutting_lots','garment_stage_logs'
  ] LOOP
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

-- RPC: record cutting lot with metrage control
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
  v_waste_pct NUMERIC(8,2);
  v_limit NUMERIC(6,2);
  v_flag BOOLEAN := false;
  v_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.garment_orders WHERE id = p_garment_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'أمر التشغيل غير موجود'; END IF;

  v_limit := COALESCE(v_order.cutting_waste_limit_pct, 5);
  IF p_meters_planned > 0 THEN
    v_waste_pct := ROUND(((GREATEST(p_meters_actual - p_meters_planned, 0) / p_meters_planned) * 100)::2);
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
    approved, cut_by_name, notes, status
  ) VALUES (
    p_restaurant_id, p_garment_order_id, p_fabric_roll_id, COALESCE(NULLIF(TRIM(p_lot_number), ''), 'LOT-' || LEFT(gen_random_uuid()::text, 8)),
    COALESCE(p_marker_length_m, 0), COALESCE(p_lays_count, 1),
    COALESCE(p_meters_planned, 0), COALESCE(p_meters_actual, 0), v_waste_pct,
    COALESCE(p_pieces_planned, 0), COALESCE(p_pieces_cut, 0),
    v_flag, v_flag,
    NOT v_flag, p_cut_by_name, p_notes,
    CASE WHEN v_flag THEN 'pending' ELSE 'posted' END
  )
  RETURNING id INTO v_id;

  -- Consume fabric meters
  IF p_fabric_roll_id IS NOT NULL AND COALESCE(p_meters_actual, 0) > 0 THEN
    UPDATE public.garment_fabric_rolls
    SET meters_consumed = meters_consumed + p_meters_actual,
        status = CASE
          WHEN meters_consumed + p_meters_actual >= meters_received THEN 'consumed'
          WHEN meters_consumed + p_meters_actual > 0 THEN 'partial'
          ELSE status
        END
    WHERE id = p_fabric_roll_id;
  END IF;

  -- Only post pieces if no variance gate OR later approval
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

GRANT EXECUTE ON FUNCTION public.garment_record_cutting(
  UUID, UUID, UUID, TEXT, NUMERIC, INTEGER, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.garment_approve_cutting(
  p_lot_id UUID,
  p_approver_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot public.garment_cutting_lots%ROWTYPE;
BEGIN
  SELECT * INTO v_lot FROM public.garment_cutting_lots WHERE id = p_lot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'دفعة قص غير موجودة'; END IF;
  IF v_lot.status = 'posted' THEN RETURN true; END IF;

  UPDATE public.garment_cutting_lots
  SET approved = true,
      approved_by_name = p_approver_name,
      approved_at = NOW(),
      status = 'posted',
      requires_approval = false
  WHERE id = p_lot_id;

  UPDATE public.garment_orders
  SET quantity_cut = quantity_cut + v_lot.pieces_cut,
      current_stage = CASE WHEN current_stage IN ('fabric_receipt','cutting') THEN 'cutting' ELSE current_stage END,
      status = 'in_progress',
      updated_at = NOW(),
      updated_by_name = COALESCE(p_approver_name, updated_by_name)
  WHERE id = v_lot.garment_order_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_approve_cutting(UUID, TEXT) TO authenticated;

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

GRANT EXECUTE ON FUNCTION public.garment_advance_stage(
  UUID, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;
