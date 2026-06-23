-- CRM Global Expansion Migration
-- 1. Social Integration
CREATE TABLE IF NOT EXISTS public.crm_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'facebook', 'instagram', 'whatsapp'
    account_name VARCHAR(200),
    external_account_id VARCHAR(200),
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Social Messages / Leads
CREATE TABLE IF NOT EXISTS public.crm_social_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES public.crm_social_accounts(id) ON DELETE CASCADE,
    sender_name VARCHAR(200),
    sender_external_id VARCHAR(200),
    message_content TEXT,
    platform VARCHAR(50),
    status VARCHAR(50) DEFAULT 'unread', -- 'unread', 'read', 'converted', 'assigned'
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lead Assignments & Automation
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS source_details JSONB;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ai_score INTEGER; -- 0-100 lead quality
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 4. Communication Logs Expansion
ALTER TABLE public.crm_communication_logs ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50); -- 'positive', 'neutral', 'negative'
ALTER TABLE public.crm_communication_logs ADD COLUMN IF NOT EXISTS ai_analysis TEXT;

-- RLS
ALTER TABLE public.crm_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_social_messages ENABLE ROW LEVEL SECURITY;

-- Macro for policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['crm_social_accounts', 'crm_social_messages'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY owner_all_%1$s ON public.%1$I FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))', t);
  END LOOP;
END $$;
