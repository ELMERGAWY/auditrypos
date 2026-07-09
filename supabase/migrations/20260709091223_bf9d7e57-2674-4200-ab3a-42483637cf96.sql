
-- 1) Media Plans
CREATE TABLE IF NOT EXISTS public.media_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'awareness', -- awareness/conversion/lead_gen/engagement/traffic
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{channel:'meta', budget:1000, kpi_target:{...}}]
  start_date DATE,
  end_date DATE,
  total_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  kpis JSONB NOT NULL DEFAULT '{}'::jsonb,          -- {impressions_target, clicks_target, conversions_target, ctr_target, cpa_target}
  results JSONB NOT NULL DEFAULT '{}'::jsonb,       -- {impressions, clicks, conversions, revenue}
  revenue_generated NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',              -- draft/active/paused/completed
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_plans TO authenticated;
GRANT ALL ON public.media_plans TO service_role;
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages media plans" ON public.media_plans;
CREATE POLICY "Owner manages media plans" ON public.media_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = media_plans.restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = media_plans.restaurant_id AND r.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_media_plans_rest ON public.media_plans(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_customer ON public.media_plans(customer_id);

-- 2) Audit "who did it" columns
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales_invoices','purchase_invoices','receipt_vouchers','payment_vouchers',
    'expense_vouchers','orders','inventory_receipts','journal_entries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by_name TEXT', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by_name TEXT', t);
  END LOOP;
END $$;
