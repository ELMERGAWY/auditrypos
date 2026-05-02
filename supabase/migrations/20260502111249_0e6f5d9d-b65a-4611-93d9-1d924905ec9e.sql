
-- ========================================
-- ERP Layer Compatibility Tables
-- ========================================

-- 1) inventory_products
CREATE TABLE IF NOT EXISTS public.inventory_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  category_id UUID,
  costing_method VARCHAR(20) NOT NULL DEFAULT 'weighted_average',
  standard_cost NUMERIC(15,4) DEFAULT 0,
  average_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  last_purchase_price NUMERIC(15,4) NOT NULL DEFAULT 0,
  track_expiry BOOLEAN NOT NULL DEFAULT false,
  track_batches BOOLEAN NOT NULL DEFAULT false,
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'unit',
  weight NUMERIC(10,3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_inventory_item BOOLEAN NOT NULL DEFAULT true,
  source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inv_products_company ON public.inventory_products(company_id);

-- 2) inventory_levels
CREATE TABLE IF NOT EXISTS public.inventory_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL,
  quantity_on_hand NUMERIC(15,4) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(15,4) NOT NULL DEFAULT 0,
  quantity_available NUMERIC(15,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  average_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_value NUMERIC(15,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_levels_warehouse ON public.inventory_levels(warehouse_id);

-- 3) inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC(15,4) NOT NULL,
  unit_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  reference_line_id UUID,
  source_warehouse_id UUID,
  destination_warehouse_id UUID,
  cost_layer_ids JSONB,
  batch_number VARCHAR(100),
  expiry_date DATE,
  journal_entry_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_company ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_ref ON public.inventory_movements(reference_type, reference_id);

-- 4) أعمدة cost_layers الناقصة
ALTER TABLE public.cost_layers 
  ADD COLUMN IF NOT EXISTS product_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

UPDATE public.cost_layers SET product_id = item_id WHERE product_id IS NULL;

ALTER TABLE public.cost_layers
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  ADD COLUMN IF NOT EXISTS remaining_quantity NUMERIC(15,4) GENERATED ALWAYS AS (remaining_qty) STORED,
  ADD COLUMN IF NOT EXISTS consumed_quantity NUMERIC(15,4) GENERATED ALWAYS AS (quantity - remaining_qty) STORED;

-- 5) helper function: التحقق من ملكية company_id
CREATE OR REPLACE FUNCTION public.user_owns_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = _company_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = _company_id AND primary_owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.restaurants r
    INNER JOIN public.companies c ON c.id = r.company_id
    WHERE r.id = _company_id AND c.primary_owner_id = auth.uid()
  );
$$;

-- 6) RLS
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users access their inventory_products" ON public.inventory_products;
CREATE POLICY "users access their inventory_products"
ON public.inventory_products FOR ALL
TO authenticated
USING (public.user_owns_company(company_id))
WITH CHECK (public.user_owns_company(company_id));

DROP POLICY IF EXISTS "users access their inventory_levels" ON public.inventory_levels;
CREATE POLICY "users access their inventory_levels"
ON public.inventory_levels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_products ip 
    WHERE ip.id = inventory_levels.product_id 
    AND public.user_owns_company(ip.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_products ip 
    WHERE ip.id = inventory_levels.product_id 
    AND public.user_owns_company(ip.company_id)
  )
);

DROP POLICY IF EXISTS "users access their inventory_movements" ON public.inventory_movements;
CREATE POLICY "users access their inventory_movements"
ON public.inventory_movements FOR ALL
TO authenticated
USING (public.user_owns_company(company_id))
WITH CHECK (public.user_owns_company(company_id));
