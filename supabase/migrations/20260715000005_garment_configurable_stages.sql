-- Configurable garment production stages (admin-editable queue)
-- Accounting flags stay on stage defs so reorder/add/delete does not break invoices/inventory

-- Drop rigid stage CHECK if present
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'garment_orders'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%current_stage%'
  LOOP
    EXECUTE format('ALTER TABLE public.garment_orders DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.garment_stage_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  -- Accounting / ops hooks (independent of order_index)
  triggers_invoice BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  tracks_cutting BOOLEAN NOT NULL DEFAULT false,
  tracks_packing BOOLEAN NOT NULL DEFAULT false,
  icon_key TEXT DEFAULT 'layers',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_garment_stage_defs_rest
  ON public.garment_stage_defs (restaurant_id, is_active, order_index);

ALTER TABLE public.garment_stage_defs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS owner_all_garment_stage_defs ON public.garment_stage_defs;
  CREATE POLICY owner_all_garment_stage_defs ON public.garment_stage_defs FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR restaurant_id IN (
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );
END $$;

-- Seed defaults for any restaurant that already has garment orders / garment_factory type
CREATE OR REPLACE FUNCTION public.garment_seed_default_stages(p_restaurant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.garment_stage_defs WHERE restaurant_id = p_restaurant_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.garment_stage_defs (
    restaurant_id, stage_key, label_ar, order_index, is_system,
    triggers_invoice, is_terminal, tracks_cutting, tracks_packing, icon_key
  ) VALUES
    (p_restaurant_id, 'fabric_receipt', 'استلام أتواب', 10, true, false, false, false, false, 'package'),
    (p_restaurant_id, 'cutting', 'القص', 20, true, false, false, true, false, 'scissors'),
    (p_restaurant_id, 'preparation', 'التحضير', 30, false, false, false, false, false, 'layers'),
    (p_restaurant_id, 'front', 'الصدر', 40, false, false, false, false, false, 'shirt'),
    (p_restaurant_id, 'back', 'الظهر', 50, false, false, false, false, false, 'shirt'),
    (p_restaurant_id, 'sleeve', 'الكوع', 60, false, false, false, false, false, 'shirt'),
    (p_restaurant_id, 'assembly', 'التجميع', 70, false, false, false, false, false, 'layers'),
    (p_restaurant_id, 'quality', 'الجودة', 80, false, false, false, false, false, 'check'),
    (p_restaurant_id, 'laundry_out', 'خروج مغسلة', 90, false, false, false, false, false, 'truck'),
    (p_restaurant_id, 'laundry_in', 'عودة مغسلة', 100, false, false, false, false, false, 'truck'),
    (p_restaurant_id, 'packing', 'التعبئة', 110, false, false, false, false, true, 'package'),
    (p_restaurant_id, 'delivery', 'التسليم', 120, true, true, false, false, false, 'truck'),
    (p_restaurant_id, 'completed', 'مكتمل', 130, true, true, true, false, false, 'check')
  ON CONFLICT (restaurant_id, stage_key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_seed_default_stages(UUID) TO authenticated;

-- Next active stage by order_index
CREATE OR REPLACE FUNCTION public.garment_next_stage_key(p_restaurant_id UUID, p_current TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ord INTEGER;
  v_next TEXT;
BEGIN
  SELECT order_index INTO v_ord
  FROM public.garment_stage_defs
  WHERE restaurant_id = p_restaurant_id AND stage_key = p_current AND is_active = true
  LIMIT 1;

  IF v_ord IS NULL THEN
    SELECT stage_key INTO v_next
    FROM public.garment_stage_defs
    WHERE restaurant_id = p_restaurant_id AND is_active = true
    ORDER BY order_index ASC
    LIMIT 1;
    RETURN v_next;
  END IF;

  SELECT stage_key INTO v_next
  FROM public.garment_stage_defs
  WHERE restaurant_id = p_restaurant_id AND is_active = true AND order_index > v_ord
  ORDER BY order_index ASC
  LIMIT 1;

  RETURN v_next;
END;
$$;

-- Update advance: invoice when target stage has triggers_invoice (not hardcoded keys)
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
  v_invoice BOOLEAN := false;
  v_terminal BOOLEAN := false;
  v_packing BOOLEAN := false;
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

  -- Fallback for legacy keys if defs missing row
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

  RETURN true;
END;
$$;

-- Reorder helper
CREATE OR REPLACE FUNCTION public.garment_reorder_stages(
  p_restaurant_id UUID,
  p_ordered_keys TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
BEGIN
  IF p_ordered_keys IS NULL OR array_length(p_ordered_keys, 1) IS NULL THEN
    RAISE EXCEPTION 'قائمة المراحل فارغة';
  END IF;
  FOR i IN 1 .. array_length(p_ordered_keys, 1) LOOP
    UPDATE public.garment_stage_defs
    SET order_index = i * 10, updated_at = NOW()
    WHERE restaurant_id = p_restaurant_id AND stage_key = p_ordered_keys[i];
  END LOOP;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.garment_reorder_stages(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garment_next_stage_key(UUID, TEXT) TO authenticated;
