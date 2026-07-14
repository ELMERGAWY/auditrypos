-- CRM harden + bootstrap (safe if earlier CRM migrations were skipped)

-- 1) Core CRM tables
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    stage VARCHAR(50) DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'negotiation', 'won', 'lost')),
    estimated_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    summary VARCHAR(200) NOT NULL,
    details TEXT,
    contact_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sentiment VARCHAR(50),
    ai_analysis TEXT
);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Social / platform tables (were missing on this project)
CREATE TABLE IF NOT EXISTS public.crm_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(200),
    external_account_id VARCHAR(200),
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_social_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES public.crm_social_accounts(id) ON DELETE SET NULL,
    sender_name VARCHAR(200),
    sender_external_id VARCHAR(200),
    message_content TEXT,
    platform VARCHAR(50),
    status VARCHAR(50) DEFAULT 'unread',
    assigned_to UUID NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_platform_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
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

-- 3) Extra lead columns
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS source_details JSONB;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ai_score INTEGER;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(200);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS ad_group_name VARCHAR(200);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS raw_social_data JSONB;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'bronze';

ALTER TABLE public.crm_communication_logs ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50);
ALTER TABLE public.crm_communication_logs ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
ALTER TABLE public.crm_communication_logs ADD COLUMN IF NOT EXISTS details TEXT;

-- 4) Drop auth.users FKs on assigned_to so staff ids work
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_leads_assigned_to_fkey'
      AND table_name = 'crm_leads'
  ) THEN
    ALTER TABLE public.crm_leads DROP CONSTRAINT crm_leads_assigned_to_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'crm_social_messages_assigned_to_fkey'
      AND table_name = 'crm_social_messages'
  ) THEN
    ALTER TABLE public.crm_social_messages DROP CONSTRAINT crm_social_messages_assigned_to_fkey;
  END IF;
END $$;

-- 5) Expand communication types (recreate check)
ALTER TABLE public.crm_communication_logs DROP CONSTRAINT IF EXISTS crm_communication_logs_type_check;
ALTER TABLE public.crm_communication_logs
  ADD CONSTRAINT crm_communication_logs_type_check
  CHECK (type IN ('call', 'email', 'meeting', 'note', 'status_update', 'whatsapp', 'sms', 'social'));

ALTER TABLE public.crm_tasks ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.crm_tasks ALTER COLUMN priority SET DEFAULT 'medium';

-- 6) RLS + policies (idempotent)
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_platform_configs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_leads',
    'crm_communication_logs',
    'crm_tasks',
    'crm_social_accounts',
    'crm_social_messages',
    'crm_platform_configs'
  ] LOOP
    pol := 'owner_all_' || t;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = pol
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))',
        pol, t
      );
    END IF;
  END LOOP;
END $$;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_restaurant_stage
  ON public.crm_leads (restaurant_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_restaurant_due
  ON public.crm_tasks (restaurant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_social_messages_status
  ON public.crm_social_messages (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_social_messages_created
  ON public.crm_social_messages (restaurant_id, created_at DESC);
