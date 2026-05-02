
-- Bill of Materials
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  product_id UUID NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  standard_labor_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  standard_overhead_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  standard_total_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  expected_yield_quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
  expected_yield_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bom_company ON public.bill_of_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_product ON public.bill_of_materials(product_id);

-- BOM Components
CREATE TABLE IF NOT EXISTS public.bom_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity_required NUMERIC(15,4) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'unit',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  scrap_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bomc_bom ON public.bom_components(bom_id);

-- RLS
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users access their bill_of_materials"
ON public.bill_of_materials FOR ALL
TO authenticated
USING (public.user_owns_company(company_id))
WITH CHECK (public.user_owns_company(company_id));

CREATE POLICY "users access their bom_components"
ON public.bom_components FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bill_of_materials b
    WHERE b.id = bom_components.bom_id
    AND public.user_owns_company(b.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bill_of_materials b
    WHERE b.id = bom_components.bom_id
    AND public.user_owns_company(b.company_id)
  )
);
