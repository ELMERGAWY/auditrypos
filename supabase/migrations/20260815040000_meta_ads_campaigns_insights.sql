-- AuditryPOS Meta Ads campaigns and Insights sync foundation
-- Additive only. No existing campaign or financial transaction data is deleted or rewritten.

BEGIN;

ALTER TABLE public.marketing_ad_campaigns
  ADD COLUMN IF NOT EXISTS external_ad_account_id TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_ad_campaign_external
  ON public.marketing_ad_campaigns (restaurant_id, platform, campaign_id);

ALTER TABLE public.marketing_ad_performance
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'facebook',
  ADD COLUMN IF NOT EXISTS campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS external_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS external_ad_account_id TEXT,
  ADD COLUMN IF NOT EXISTS attribution_window TEXT,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.social_ads_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  ad_account_id TEXT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  campaigns_synced INTEGER NOT NULL DEFAULT 0,
  insights_synced INTEGER NOT NULL DEFAULT 0,
  spend_total NUMERIC(18,4) NOT NULL DEFAULT 0,
  error_message TEXT,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_ads_sync_runs_tenant
  ON public.social_ads_sync_runs (restaurant_id, started_at DESC);

ALTER TABLE public.social_ads_sync_runs ENABLE ROW LEVEL SECURITY;

-- Campaign/performance data is readable by authorized marketing users; sync writes
-- happen through the server-side ads function only.
DROP POLICY IF EXISTS "Users can view ad campaigns" ON public.marketing_ad_campaigns;
DROP POLICY IF EXISTS "Users can insert ad campaigns" ON public.marketing_ad_campaigns;
DROP POLICY IF EXISTS "Users can update ad campaigns" ON public.marketing_ad_campaigns;
DROP POLICY IF EXISTS "Users can delete ad campaigns" ON public.marketing_ad_campaigns;
CREATE POLICY marketing_ad_campaigns_read ON public.marketing_ad_campaigns FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = marketing_ad_campaigns.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.ads.read'))
  )
);

DROP POLICY IF EXISTS "Users can view ad performance" ON public.marketing_ad_performance;
DROP POLICY IF EXISTS "Users can insert ad performance" ON public.marketing_ad_performance;
DROP POLICY IF EXISTS "Users can update ad performance" ON public.marketing_ad_performance;
DROP POLICY IF EXISTS "Users can delete ad performance" ON public.marketing_ad_performance;
CREATE POLICY marketing_ad_performance_read ON public.marketing_ad_performance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = marketing_ad_performance.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.analytics.read'))
  )
);

CREATE POLICY social_ads_sync_runs_read ON public.social_ads_sync_runs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_ads_sync_runs.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.analytics.read'))
  )
);

COMMENT ON TABLE public.social_ads_sync_runs IS
  'Audit trail for server-side Meta campaign and Insights synchronization.';
COMMENT ON COLUMN public.marketing_ad_performance.spend IS
  'Provider-reported spend in the ad account currency; never silently converted to local currency.';

COMMIT;
