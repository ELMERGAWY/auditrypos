-- Marketing Service Deliverables Table
-- This table tracks the delivery status of marketing services from invoices/contracts/quotes

CREATE TABLE IF NOT EXISTS public.marketing_service_deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  -- Optional in service schemas; sales_invoice_items is not installed everywhere.
  invoice_item_id UUID,
  contract_id UUID REFERENCES public.marketing_contracts(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.marketing_quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.marketing_services(id) ON DELETE SET NULL,
  service_name VARCHAR(255) NOT NULL,
  description TEXT,
  expected_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, delivered, delayed, cancelled
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_restaurant ON public.marketing_service_deliverables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice ON public.marketing_service_deliverables(invoice_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice_item ON public.marketing_service_deliverables(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_contract ON public.marketing_service_deliverables(contract_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_quote ON public.marketing_service_deliverables(quote_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_status ON public.marketing_service_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_expected_date ON public.marketing_service_deliverables(expected_delivery_date);

-- Enable RLS
ALTER TABLE public.marketing_service_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can view deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can view all deliverables"
  ON public.marketing_service_deliverables FOR SELECT
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can insert deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can insert deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can insert deliverables"
  ON public.marketing_service_deliverables FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can update deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can update deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can update deliverables"
  ON public.marketing_service_deliverables FOR UPDATE
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

DROP POLICY IF EXISTS "Users can delete deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can delete deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR DELETE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can delete deliverables"
  ON public.marketing_service_deliverables FOR DELETE
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_super_admin' = 'true'));

-- Function to automatically update status based on delivery date
CREATE OR REPLACE FUNCTION update_deliverable_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If actual delivery date is set, update status to delivered
  IF NEW.actual_delivery_date IS NOT NULL AND OLD.actual_delivery_date IS NULL THEN
    NEW.status := 'delivered';
  END IF;
  
  -- If expected date has passed and not delivered, mark as delayed
  IF NEW.expected_delivery_date < CURRENT_DATE AND NEW.status NOT IN ('delivered', 'cancelled') THEN
    NEW.status := 'delayed';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status
DROP TRIGGER IF EXISTS trigger_update_deliverable_status ON public.marketing_service_deliverables;
CREATE TRIGGER trigger_update_deliverable_status
  BEFORE INSERT OR UPDATE ON public.marketing_service_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_status();

-- Function to get delayed deliverables count for dashboard analytics
CREATE OR REPLACE FUNCTION get_delayed_deliverables_count(p_restaurant_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM marketing_service_deliverables
    WHERE restaurant_id = p_restaurant_id
    AND status = 'delayed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Marketing service deliverables table created successfully';
END $$;
