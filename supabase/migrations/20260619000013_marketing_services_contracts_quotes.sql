
-- 1. Create Marketing Services Table
CREATE TABLE IF NOT EXISTS public.marketing_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'brand_design', 'digital_marketing', 'social_media', etc.
  base_price NUMERIC(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Quotes Table
CREATE TABLE IF NOT EXISTS public.marketing_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  quote_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, approved, rejected
  valid_until DATE,
  notes TEXT,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Quote Items Table
CREATE TABLE IF NOT EXISTS public.marketing_quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.marketing_quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.marketing_services(id) ON DELETE SET NULL,
  service_name VARCHAR(255),
  description TEXT,
  quantity NUMERIC(10, 2) DEFAULT 1,
  unit_price NUMERIC(12, 2) DEFAULT 0,
  total_price NUMERIC(12, 2) DEFAULT 0
);

-- 4. Create Contracts Table
CREATE TABLE IF NOT EXISTS public.marketing_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  quote_id UUID REFERENCES public.marketing_quotes(id) ON DELETE SET NULL,
  contract_number VARCHAR(50),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, terminated
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Contract Services Table
CREATE TABLE IF NOT EXISTS public.marketing_contract_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.marketing_contracts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.marketing_services(id) ON DELETE SET NULL,
  service_name VARCHAR(255),
  description TEXT,
  price NUMERIC(12, 2) DEFAULT 0
);

-- 6. Enable RLS
ALTER TABLE public.marketing_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_contract_services ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (allow all for authenticated users who are owners or staff)
CREATE POLICY "Enable all for authenticated" ON public.marketing_services
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated" ON public.marketing_quotes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated" ON public.marketing_quote_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated" ON public.marketing_contracts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated" ON public.marketing_contract_services
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Marketing services, quotes, and contracts tables created successfully';
END $$;
