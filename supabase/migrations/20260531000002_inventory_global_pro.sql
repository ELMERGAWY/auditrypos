-- Advanced Inventory & Costing Migration
-- 1. Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(50) DEFAULT 'main', -- 'main', 'sub', 'raw', 'finished', 'project'
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Multi-Warehouse Stock Tracking
CREATE TABLE IF NOT EXISTS public.warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(15,3) DEFAULT 0,
    min_quantity DECIMAL(15,3) DEFAULT 0,
    location_in_warehouse VARCHAR(100), -- Shelf/Bin location
    UNIQUE(warehouse_id, product_id)
);

-- 3. Advanced Costing: Landed Costs (Indirect Expenses)
CREATE TABLE IF NOT EXISTS public.inventory_landed_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES public.inventory_receipts(id) ON DELETE CASCADE,
    expense_type VARCHAR(100), -- 'shipping', 'customs', 'labor', 'other'
    amount DECIMAL(15,2) DEFAULT 0,
    allocation_method VARCHAR(50) DEFAULT 'value', -- 'value', 'quantity', 'weight'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory Transfers (Between Warehouses)
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'shipped', 'received'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    transfer_id UUID REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(15,3) NOT NULL,
    cost_price DECIMAL(15,2) -- Cost at time of transfer
);

-- RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_landed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;

-- Ensure restaurant_id exists on all relevant tables for RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouse_stock' AND column_name='restaurant_id') THEN
        ALTER TABLE public.warehouse_stock ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transfer_items' AND column_name='restaurant_id') THEN
        ALTER TABLE public.inventory_transfer_items ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Owner Policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['warehouses', 'warehouse_stock', 'inventory_landed_costs', 'inventory_transfers', 'inventory_transfer_items'];
  policy_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    policy_name := 'owner_all_' || t;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = policy_name 
        AND polrelid = ('public.' || t)::regclass
    ) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))', policy_name, t);
    END IF;
  END LOOP;
END $$;
