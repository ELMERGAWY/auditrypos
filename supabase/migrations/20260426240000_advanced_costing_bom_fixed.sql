-- ============================================================
-- AUDITRY POS: ADVANCED COSTING & BOM SYSTEM (FIXED)
-- ============================================================

BEGIN;

-- 1. Create Recipes (BOM) Table
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 2. Enhanced Expenses with Chart of Accounts & Cost Centers
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS account_code TEXT,
ADD COLUMN IF NOT EXISTS cost_center TEXT,
ADD COLUMN IF NOT EXISTS payment_account_code TEXT DEFAULT '1100';

-- 3. Manufacturing Orders
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    planned_quantity DECIMAL(12,3) NOT NULL,
    actual_quantity DECIMAL(12,3),
    status TEXT DEFAULT 'planned',
    overhead_costs DECIMAL(12,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Secure Tables (Using safe policy management)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_owner_policy" ON public.recipes;
CREATE POLICY "recipes_owner_policy" ON public.recipes FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "manufacturing_owner_policy" ON public.manufacturing_orders;
CREATE POLICY "manufacturing_owner_policy" ON public.manufacturing_orders FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

COMMIT;
