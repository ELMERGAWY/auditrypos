
-- 1) contractors.service_variables
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS service_variables jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) service_variable_presets
CREATE TABLE IF NOT EXISTS public.service_variable_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, label, value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_variable_presets TO authenticated;
GRANT ALL ON public.service_variable_presets TO service_role;

ALTER TABLE public.service_variable_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svp_owner_all" ON public.service_variable_presets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.restaurants r
            WHERE r.id = service_variable_presets.restaurant_id
              AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restaurants r
            WHERE r.id = service_variable_presets.restaurant_id
              AND r.owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS svp_restaurant_label_idx
  ON public.service_variable_presets (restaurant_id, label);
