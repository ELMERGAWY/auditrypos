-- Add client_sales_amount column to purchase_invoices table
-- This column is used for pass-through invoices to clients

ALTER TABLE public.purchase_invoices
ADD COLUMN IF NOT EXISTS is_pass_through_to_client BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_sales_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_through_markup_amount NUMERIC(12, 2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.purchase_invoices.is_pass_through_to_client IS 'Whether this purchase invoice is passed through directly to a client';
COMMENT ON COLUMN public.purchase_invoices.client_sales_amount IS 'The amount we charge the client for this pass-through item';
COMMENT ON COLUMN public.purchase_invoices.pass_through_markup_amount IS 'Our profit from this pass-through invoice (client sales amount - purchase total amount)';
