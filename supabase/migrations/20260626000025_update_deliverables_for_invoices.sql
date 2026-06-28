-- Update marketing_service_deliverables to link with invoices
-- This allows automatic creation of deliverables from invoice items

ALTER TABLE public.marketing_service_deliverables
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES public.sales_invoice_items(id) ON DELETE CASCADE;

-- Create indexes for invoice-related queries
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice ON public.marketing_service_deliverables(invoice_id);
CREATE INDEX IF NOT EXISTS idx_marketing_deliverables_invoice_item ON public.marketing_service_deliverables(invoice_item_id);

-- Function to automatically create deliverables from invoice items
CREATE OR REPLACE FUNCTION create_deliverable_from_invoice_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create deliverable if expected_delivery_date is set
  IF NEW.expected_delivery_date IS NOT NULL THEN
    INSERT INTO public.marketing_service_deliverables (
      restaurant_id,
      invoice_id,
      invoice_item_id,
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
      WHERE invoice_item_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create deliverables when invoice item is created/updated
DROP TRIGGER IF EXISTS trigger_create_deliverable_from_invoice_item ON public.sales_invoice_items;
CREATE TRIGGER trigger_create_deliverable_from_invoice_item
  AFTER INSERT OR UPDATE OF expected_delivery_date ON public.sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION create_deliverable_from_invoice_item();

-- Function to sync delivery status from invoice item to deliverable
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
  WHERE invoice_item_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync delivery status
DROP TRIGGER IF EXISTS trigger_sync_delivery_status ON public.sales_invoice_items;
CREATE TRIGGER trigger_sync_delivery_status
  AFTER UPDATE OF actual_delivery_date, delivery_status, delivery_priority, delivery_notes 
  ON public.sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_delivery_status_from_invoice();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Marketing service deliverables updated for invoice integration successfully';
END $$;
