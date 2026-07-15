-- Fix: marketing_workflow_stages.stage_key was UNIQUE globally,
-- but stages are per-restaurant (same keys: briefing, strategy, ...).
-- Change to UNIQUE (restaurant_id, stage_key).

ALTER TABLE public.marketing_workflow_stages
  DROP CONSTRAINT IF EXISTS marketing_workflow_stages_stage_key_key;

-- Drop any other unique-only-on-stage_key variants
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'marketing_workflow_stages'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%stage_key%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%restaurant_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.marketing_workflow_stages DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.marketing_workflow_stages
  DROP CONSTRAINT IF EXISTS marketing_workflow_stages_restaurant_stage_key_key;

ALTER TABLE public.marketing_workflow_stages
  ADD CONSTRAINT marketing_workflow_stages_restaurant_stage_key_key
  UNIQUE (restaurant_id, stage_key);

CREATE OR REPLACE FUNCTION public.create_default_workflow_stages(p_restaurant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.marketing_workflow_stages
    WHERE restaurant_id = p_restaurant_id
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.marketing_workflow_stages (
    restaurant_id, stage_key, stage_name_ar, stage_name_en,
    description, order_index, default_duration_hours, requires_approval
  ) VALUES
    (p_restaurant_id, 'briefing', 'استلام الطلب', 'Briefing', 'استلام متطلبات العميل وتحديد نطاق المشروع', 1, 24, true),
    (p_restaurant_id, 'strategy', 'الاستراتيجية', 'Strategy', 'وضع الاستراتيجية التسويقية وخطة العمل', 2, 48, true),
    (p_restaurant_id, 'creative', 'الإبداع والتصميم', 'Creative', 'مرحلة الإبداع والتصميم والإنتاج', 3, 72, true),
    (p_restaurant_id, 'review', 'المراجعة', 'Review', 'مراجعة العميل والتعديلات', 4, 24, true),
    (p_restaurant_id, 'delivery', 'التسليم', 'Delivery', 'التسليم النهائي للمشروع', 5, 8, false),
    (p_restaurant_id, 'followup', 'المتابعة', 'Follow-up', 'متابعة ما بعد التسليم', 6, 24, false)
  ON CONFLICT (restaurant_id, stage_key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_default_workflow_stages(UUID) TO authenticated;
