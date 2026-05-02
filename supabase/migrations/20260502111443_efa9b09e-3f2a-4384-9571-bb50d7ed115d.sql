
-- Sales Invoices (unified header for POS + B2B)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID,
  source_type VARCHAR(30) NOT NULL DEFAULT 'pos',
  source_reference_id UUID,
  subtotal NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  payment_method VARCHAR(30),
  notes TEXT,
  journal_entry_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_sinv_company ON public.sales_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_sinv_customer ON public.sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sinv_source ON public.sales_invoices(source_type, source_reference_id);

-- Sales Invoice Lines
CREATE TABLE IF NOT EXISTS public.sales_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id UUID,
  description TEXT,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,4) NOT NULL DEFAULT 0,
  warehouse_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sinvl_invoice ON public.sales_invoice_lines(invoice_id);

-- RLS
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users access their sales_invoices"
ON public.sales_invoices FOR ALL
TO authenticated
USING (public.user_owns_company(company_id))
WITH CHECK (public.user_owns_company(company_id));

CREATE POLICY "users access their sales_invoice_lines"
ON public.sales_invoice_lines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales_invoices si
    WHERE si.id = sales_invoice_lines.invoice_id
    AND public.user_owns_company(si.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales_invoices si
    WHERE si.id = sales_invoice_lines.invoice_id
    AND public.user_owns_company(si.company_id)
  )
);
