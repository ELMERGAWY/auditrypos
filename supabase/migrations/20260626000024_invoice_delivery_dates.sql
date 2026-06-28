-- Add delivery date fields to sales_invoice_lines
-- This allows setting delivery dates for each item in an invoice

ALTER TABLE public.sales_invoice_lines 
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Create indexes for delivery-related queries
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_delivery_date ON public.sales_invoice_lines(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_delivery_status ON public.sales_invoice_lines(delivery_status);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Delivery date fields added to sales_invoice_lines successfully';
END $$;
