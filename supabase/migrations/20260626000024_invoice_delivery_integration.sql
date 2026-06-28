-- Complete Invoice Delivery Integration
-- This migration adds delivery tracking to invoices and links it with deliverables

-- Step 0: Add delivery_date to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Step 1: Add delivery date fields to sales_invoice_lines
ALTER TABLE public.sales_invoice_lines 
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Create indexes for delivery-related queries
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_delivery_date ON public.sales_invoice_lines(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_delivery_status ON public.sales_invoice_lines(delivery_status);

-- Step 2: Create marketing_service_deliverables table if not exists
CREATE TABLE IF NOT EXISTS public.marketing_service_deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES public.sales_invoice_lines(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.marketing_contracts(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.marketing_quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.marketing_services(id) ON DELETE SET NULL,
  service_name VARCHAR(255) NOT NULL,
  description TEXT,
  expected_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for deliverables
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_restaurant ON public.marketing_service_deliverables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice ON public.marketing_service_deliverables(invoice_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice_line ON public.marketing_service_deliverables(invoice_line_id);
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
  USING (true);

DROP POLICY IF EXISTS "Users can insert deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can insert deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can insert deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can insert deliverables"
  ON public.marketing_service_deliverables FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can update deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can update deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can update deliverables"
  ON public.marketing_service_deliverables FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete deliverables for their restaurant" ON public.marketing_service_deliverables;
CREATE POLICY "Users can delete deliverables for their restaurant"
  ON public.marketing_service_deliverables FOR DELETE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Super admin can delete deliverables" ON public.marketing_service_deliverables;
CREATE POLICY "Super admin can delete deliverables"
  ON public.marketing_service_deliverables FOR DELETE
  USING (true);

-- Step 3: Add invoice link columns to deliverables (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_service_deliverables' AND column_name = 'invoice_id') THEN
    ALTER TABLE public.marketing_service_deliverables ADD COLUMN invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_service_deliverables' AND column_name = 'invoice_line_id') THEN
    ALTER TABLE public.marketing_service_deliverables ADD COLUMN invoice_line_id UUID REFERENCES public.sales_invoice_lines(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Create function to automatically update deliverable status
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

-- Step 5: Create function to automatically create deliverables from invoice lines
CREATE OR REPLACE FUNCTION create_deliverable_from_invoice_line()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create deliverable if expected_delivery_date is set
  IF NEW.expected_delivery_date IS NOT NULL THEN
    INSERT INTO public.marketing_service_deliverables (
      restaurant_id,
      invoice_id,
      invoice_line_id,
      service_name,
      description,
      expected_delivery_date,
      actual_delivery_date,
      status,
      priority,
      notes
    )
    SELECT 
      NEW.restaurant_id,
      NEW.invoice_id,
      NEW.id,
      COALESCE(NEW.item_name, 'خدمة غير مسماة'),
      NEW.description,
      NEW.expected_delivery_date,
      NEW.actual_delivery_date,
      COALESCE(NEW.delivery_status, 'pending'),
      COALESCE(NEW.delivery_priority, 'medium'),
      NEW.delivery_notes
    WHERE NOT EXISTS (
      SELECT 1 FROM public.marketing_service_deliverables 
      WHERE invoice_line_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create deliverables when invoice line is created/updated
DROP TRIGGER IF EXISTS trigger_create_deliverable_from_invoice_line ON public.sales_invoice_lines;
CREATE TRIGGER trigger_create_deliverable_from_invoice_line
  AFTER INSERT OR UPDATE OF expected_delivery_date ON public.sales_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION create_deliverable_from_invoice_line();

-- Step 6: Create function to sync delivery status from invoice line to deliverable
CREATE OR REPLACE FUNCTION sync_delivery_status_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketing_service_deliverables
  SET 
    actual_delivery_date = NEW.actual_delivery_date,
    status = COALESCE(NEW.delivery_status, status),
    priority = COALESCE(NEW.delivery_priority, priority),
    notes = COALESCE(NEW.delivery_notes, notes),
    updated_at = NOW()
  WHERE invoice_line_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync delivery status
DROP TRIGGER IF EXISTS trigger_sync_delivery_status ON public.sales_invoice_lines;
CREATE TRIGGER trigger_sync_delivery_status
  AFTER UPDATE OF actual_delivery_date, delivery_status, delivery_priority, delivery_notes 
  ON public.sales_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_status_from_invoice();

-- Step 7: Function to get delayed deliverables count for dashboard analytics
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Invoice delivery integration completed successfully';
END $$;
