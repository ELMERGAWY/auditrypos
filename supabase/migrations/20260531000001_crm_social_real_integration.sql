-- Advanced CRM Social & Multi-Platform Integration
-- 1. Configuration for Platforms
CREATE TABLE IF NOT EXISTS public.crm_platform_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'meta', 'google', 'tiktok', 'snapchat'
    api_key TEXT,
    api_secret TEXT,
    pixel_id VARCHAR(100),
    webhook_verify_token VARCHAR(100),
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, platform)
);

-- 2. Enhanced Social Leads (to track marketing attribution)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(200);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ad_group_name VARCHAR(200);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS raw_social_data JSONB;

-- 3. Lead Distribution History
CREATE TABLE IF NOT EXISTS public.crm_lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'reassigned', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.crm_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all_platform_configs ON public.crm_platform_configs
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY owner_all_lead_assignments ON public.crm_lead_assignments
  FOR ALL USING (lead_id IN (SELECT id FROM public.crm_leads WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));
