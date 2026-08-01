CREATE TABLE IF NOT EXISTS public.garment_stage_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  stage_key text NOT NULL,
  cost_type text NOT NULL DEFAULT 'internal',
  rate_per_piece numeric NOT NULL DEFAULT 0,
  vendor_name text,
  auto_apply boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, stage_key, cost_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garment_stage_rates TO authenticated;
GRANT ALL ON public.garment_stage_rates TO service_role;

ALTER TABLE public.garment_stage_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_all_garment_stage_rates ON public.garment_stage_rates;
CREATE POLICY owner_all_garment_stage_rates ON public.garment_stage_rates
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
    OR restaurant_id IN (
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
  WITH CHECK (
    restaurant_id IN (SELECT r.id FROM public.restaurants r WHERE r.owner_id = auth.uid())
    OR restaurant_id IN (
      SELECT r.id FROM public.restaurants r
      JOIN public.company_users cu ON cu.company_id = r.company_id
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_garment_stage_rates_restaurant ON public.garment_stage_rates(restaurant_id, stage_key);