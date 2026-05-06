-- 1. Create Projects Table for Contracting Module
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_budget NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, suspended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Project Blocks (Phases) Table
CREATE TABLE IF NOT EXISTS public.project_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., 'Block A', 'Foundation', etc.
    estimated_cost NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Project tracking to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.project_blocks(id) ON DELETE SET NULL;

-- 4. Add Project tracking to sales invoices (for المستخلصات / Progress Invoices)
ALTER TABLE public.sales_invoices
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.project_blocks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_progress_invoice BOOLEAN DEFAULT false; -- To distinguish مستخلصات from regular invoices

-- 5. Track exact cost of goods sold (COGS) on orders for accurate profit calculation
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2) DEFAULT 0;

-- 6. Add RLS Policies for the new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages projects" ON public.projects
    FOR ALL TO authenticated
    USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Owner manages project_blocks" ON public.project_blocks
    FOR ALL TO authenticated
    USING (project_id IN (SELECT id FROM public.projects WHERE is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role)))
    WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role)));
