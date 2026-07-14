-- Harden CRM schema for production use
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

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'owner_all_crm_tasks' AND tablename = 'crm_tasks'
  ) THEN
    CREATE POLICY owner_all_crm_tasks ON public.crm_tasks
      FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
  END IF;
END $$;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL;

-- assigned_to should accept staff ids (not only auth.users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_leads_assigned_to_fkey'
      AND table_name = 'crm_leads'
  ) THEN
    ALTER TABLE public.crm_leads DROP CONSTRAINT crm_leads_assigned_to_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_social_messages_assigned_to_fkey'
      AND table_name = 'crm_social_messages'
  ) THEN
    ALTER TABLE public.crm_social_messages DROP CONSTRAINT crm_social_messages_assigned_to_fkey;
  END IF;
END $$;

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;

-- Expand communication log types
ALTER TABLE public.crm_communication_logs DROP CONSTRAINT IF EXISTS crm_communication_logs_type_check;
ALTER TABLE public.crm_communication_logs
  ADD CONSTRAINT crm_communication_logs_type_check
  CHECK (type IN ('call', 'email', 'meeting', 'note', 'status_update', 'whatsapp', 'sms', 'social'));

-- Tasks: ensure status defaults
ALTER TABLE public.crm_tasks
  ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.crm_tasks
  ALTER COLUMN priority SET DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_crm_leads_restaurant_stage
  ON public.crm_leads (restaurant_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_restaurant_due
  ON public.crm_tasks (restaurant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_social_messages_status
  ON public.crm_social_messages (restaurant_id, status);
