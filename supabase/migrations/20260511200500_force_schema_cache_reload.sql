-- Force reload schema cache for PostgREST to fix relation issues

-- Ensure the relationship exists
ALTER TABLE public.purchase_invoices 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON public.purchase_invoices(supplier_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
