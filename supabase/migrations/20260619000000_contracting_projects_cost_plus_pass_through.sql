
-- 1. Update Projects Table with Cost Plus Pricing
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50) DEFAULT 'fixed_price' CHECK (pricing_type IN ('fixed_price', 'cost_plus_percentage')),
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5, 2) DEFAULT 0; -- e.g., 10.00 means 10%

-- 2. Update Purchase Invoices Table with Pass-Through Invoice Support
ALTER TABLE public.purchase_invoices
ADD COLUMN IF NOT EXISTS is_pass_through_to_client BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_sales_amount NUMERIC(12, 2) DEFAULT 0, -- The amount we charge the client for this pass-through
ADD COLUMN IF NOT EXISTS pass_through_markup_amount NUMERIC(12, 2) DEFAULT 0; -- (client_sales_amount - total_amount) = our profit

-- 3. Add RLS for the new columns (already covered by existing policies)
COMMENT ON COLUMN public.projects.pricing_type IS 'Pricing type: fixed_price or cost_plus_percentage';
COMMENT ON COLUMN public.projects.markup_percentage IS 'Markup percentage for cost plus pricing';
COMMENT ON COLUMN public.purchase_invoices.is_pass_through_to_client IS 'Whether this purchase invoice is passed through directly to a client';
COMMENT ON COLUMN public.purchase_invoices.client_sales_amount IS 'The amount we charge the client for this pass-through item';
COMMENT ON COLUMN public.purchase_invoices.pass_through_markup_amount IS 'Our profit from this pass-through invoice (client sales amount - purchase total amount)';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Updated projects and purchase_invoices tables for cost plus and pass through invoicing';
END $$;
