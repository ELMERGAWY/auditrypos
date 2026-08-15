-- ============================================================
-- AUDITRY POS: ADVANCED COSTING & BOM SYSTEM
-- ============================================================

BEGIN;

-- 1. Create Recipes (BOM) Table
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE, -- Final Product
    ingredient_id UUID REFERENCES public.products(id) ON DELETE CASCADE, -- Raw Material
    quantity DECIMAL(12,3) NOT NULL, -- Qty of raw material per 1 unit of final product
    unit TEXT, -- gram, ml, piece
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 2. Enhanced Expenses with Chart of Accounts & Cost Centers
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_code TEXT, -- Link to chart_of_accounts
ADD COLUMN IF NOT EXISTS cost_center TEXT, -- 'kitchen', 'delivery', 'marketing', etc.
ADD COLUMN IF NOT EXISTS payment_account_code TEXT DEFAULT '1100'; -- Account paid from (Cash/Bank)

-- 3. Manufacturing Orders (For converting raw to finished goods in bulk)
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE, -- Final product to produce
    planned_quantity DECIMAL(12,3) NOT NULL,
    actual_quantity DECIMAL(12,3),
    status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    overhead_costs DECIMAL(12,2) DEFAULT 0, -- labor, electricity, etc.
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on new tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage recipes" ON public.recipes FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owners manage manufacturing" ON public.manufacturing_orders FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

COMMIT;
