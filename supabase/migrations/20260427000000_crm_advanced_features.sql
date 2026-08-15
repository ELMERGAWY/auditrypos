-- Migration: Advanced CRM Features
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
    type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note')),
    summary VARCHAR(200) NOT NULL,
    details TEXT,
    contact_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure loyalty and metrics fields exist on customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add constraint to ensure either customer_id or lead_id is provided, but not both or neither.
-- Actually, let's keep it simple and just allow one to be null.

-- RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurant_isolation_leads ON public.crm_leads;
CREATE POLICY restaurant_isolation_leads ON public.crm_leads
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS restaurant_isolation_logs ON public.crm_communication_logs;
CREATE POLICY restaurant_isolation_logs ON public.crm_communication_logs
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
