-- AuditryPOS social webhook ingestion, inbox, and Lead Ads linkage
-- Additive only. Existing CRM leads and messages are not deleted or rewritten.

BEGIN;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS external_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS external_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS external_adset_id TEXT,
  ADD COLUMN IF NOT EXISTS external_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS external_form_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_external_source
  ON public.crm_leads (restaurant_id, source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

ALTER TABLE public.crm_social_messages
  ADD COLUMN IF NOT EXISTS external_message_id TEXT,
  ADD COLUMN IF NOT EXISTS conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS external_account_id TEXT,
  ADD COLUMN IF NOT EXISTS source_event_id UUID,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_social_messages_external
  ON public.crm_social_messages (restaurant_id, platform, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.social_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (restaurant_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_social_webhook_events_processing
  ON public.social_webhook_events (status, received_at);
CREATE INDEX IF NOT EXISTS idx_social_webhook_events_tenant
  ON public.social_webhook_events (restaurant_id, platform, received_at DESC);

ALTER TABLE public.social_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_webhook_events_read ON public.social_webhook_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_webhook_events.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);

-- The webhook endpoint uses the service role to insert/update events. No client
-- insert/update policy is intentionally created.

COMMENT ON TABLE public.social_webhook_events IS
  'Raw, signature-verified social webhook events with idempotent event keys.';
COMMENT ON COLUMN public.crm_leads.external_lead_id IS
  'Provider lead identifier used to prevent duplicate Lead Ads imports.';
COMMENT ON COLUMN public.crm_social_messages.external_message_id IS
  'Provider message identifier used to prevent duplicate inbox messages.';

COMMIT;
