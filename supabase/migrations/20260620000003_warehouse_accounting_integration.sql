-- Warehouse Accounting Integration
-- This migration adds comprehensive accounting integration for warehouses/sub-inventories
-- following international accounting standards (IFRS/GAAP)

-- 1. Add accounting account mapping to warehouses table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='inventory_account_id') THEN
        ALTER TABLE public.warehouses 
        ADD COLUMN inventory_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='cogs_account_id') THEN
        ALTER TABLE public.warehouses 
        ADD COLUMN cogs_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='variance_account_id') THEN
        ALTER TABLE public.warehouses 
        ADD COLUMN variance_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='description') THEN
        ALTER TABLE public.warehouses 
        ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Create function to auto-create warehouse accounts if they don't exist
CREATE OR REPLACE FUNCTION public.ensure_warehouse_accounts(warehouse_id UUID, restaurant_id UUID)
RETURNS VOID AS $$
DECLARE
    wh_name TEXT;
    wh_code TEXT;
    inv_acc_id UUID;
    cogs_acc_id UUID;
    var_acc_id UUID;
BEGIN
    -- Get warehouse details
    SELECT name, code INTO wh_name, wh_code
    FROM public.warehouses
    WHERE id = warehouse_id;
    
    -- Create or get inventory account for this warehouse
    INSERT INTO public.chart_of_accounts (
        restaurant_id, code, name, account_type, parent_id, 
        is_active, balance_type, description
    ) VALUES (
        restaurant_id,
        '13' || SUBSTRING(wh_code FROM 1 FOR 2) || '00',
        'مخزون - ' || wh_name,
        'asset',
        (SELECT id FROM public.chart_of_accounts WHERE code = '1300' AND restaurant_id = restaurant_id LIMIT 1),
        true,
        'debit',
        'حساب مخزون ' || wh_name || ' - ' || wh_code
    )
    ON CONFLICT (restaurant_id, code) DO NOTHING
    RETURNING id INTO inv_acc_id;
    
    IF inv_acc_id IS NULL THEN
        SELECT id INTO inv_acc_id FROM public.chart_of_accounts 
        WHERE restaurant_id = restaurant_id AND code = '13' || SUBSTRING(wh_code FROM 1 FOR 2) || '00';
    END IF;
    
    -- Create or get COGS account for this warehouse
    INSERT INTO public.chart_of_accounts (
        restaurant_id, code, name, account_type, parent_id, 
        is_active, balance_type, description
    ) VALUES (
        restaurant_id,
        '51' || SUBSTRING(wh_code FROM 1 FOR 2) || '00',
        'تكلفة البضاعة المباعة - ' || wh_name,
        'expense',
        (SELECT id FROM public.chart_of_accounts WHERE code = '5100' AND restaurant_id = restaurant_id LIMIT 1),
        true,
        'debit',
        'حساب تكلفة البضاعة المباعة لمخزون ' || wh_name
    )
    ON CONFLICT (restaurant_id, code) DO NOTHING
    RETURNING id INTO cogs_acc_id;
    
    IF cogs_acc_id IS NULL THEN
        SELECT id INTO cogs_acc_id FROM public.chart_of_accounts 
        WHERE restaurant_id = restaurant_id AND code = '51' || SUBSTRING(wh_code FROM 1 FOR 2) || '00';
    END IF;
    
    -- Create or get variance account for this warehouse
    INSERT INTO public.chart_of_accounts (
        restaurant_id, code, name, account_type, parent_id, 
        is_active, balance_type, description
    ) VALUES (
        restaurant_id,
        '52' || SUBSTRING(wh_code FROM 1 FOR 2) || '00',
        'فروقات مخزون - ' || wh_name,
        'expense',
        (SELECT id FROM public.chart_of_accounts WHERE code = '5200' AND restaurant_id = restaurant_id LIMIT 1),
        true,
        'debit',
        'حساب فروحات المخزون لمخزون ' || wh_name
    )
    ON CONFLICT (restaurant_id, code) DO NOTHING
    RETURNING id INTO var_acc_id;
    
    IF var_acc_id IS NULL THEN
        SELECT id INTO var_acc_id FROM public.chart_of_accounts 
        WHERE restaurant_id = restaurant_id AND code = '52' || SUBSTRING(wh_code FROM 1 FOR 2) || '00';
    END IF;
    
    -- Update warehouse with account references
    UPDATE public.warehouses
    SET 
        inventory_account_id = inv_acc_id,
        cogs_account_id = cogs_acc_id,
        variance_account_id = var_acc_id
    WHERE id = warehouse_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-create accounts when warehouse is created
CREATE OR REPLACE FUNCTION public.handle_warehouse_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Delay account creation to after the warehouse is fully inserted
    -- This will be called by a separate trigger or application logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update RLS policies to include accounting staff
DROP POLICY IF EXISTS owner_all_warehouses ON public.warehouses;
CREATE POLICY owner_all_warehouses ON public.warehouses
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants 
            WHERE owner_id = auth.uid()
        )
    );

-- Add policy for accounting staff (company admin)
CREATE POLICY accounting_staff_warehouses ON public.warehouses
    FOR ALL USING (
        is_restaurant_owner(auth.uid(), restaurant_id)
        OR has_role(auth.uid(), 'super_admin'::app_role)
    );

-- 5. Create warehouse permissions table for granular control
CREATE TABLE IF NOT EXISTS public.warehouse_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('view', 'edit', 'manage', 'full')),
    can_view_stock BOOLEAN DEFAULT true,
    can_edit_stock BOOLEAN DEFAULT false,
    can_transfer BOOLEAN DEFAULT false,
    can_adjust BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, user_id)
);

ALTER TABLE public.warehouse_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for warehouse permissions
CREATE POLICY owner_all_warehouse_permissions ON public.warehouse_permissions
    FOR ALL USING (
        warehouse_id IN (
            SELECT w.id FROM public.warehouses w
            JOIN public.restaurants r ON r.id = w.restaurant_id
            WHERE r.owner_id = auth.uid()
        )
    );

-- 6. Create warehouse settings table for configuration
CREATE TABLE IF NOT EXISTS public.warehouse_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, setting_key)
);

ALTER TABLE public.warehouse_settings ENABLE ROW LEVEL SECURITY;

-- RLS for warehouse settings
CREATE POLICY owner_all_warehouse_settings ON public.warehouse_settings
    FOR ALL USING (
        warehouse_id IN (
            SELECT w.id FROM public.warehouses w
            JOIN public.restaurants r ON r.id = w.restaurant_id
            WHERE r.owner_id = auth.uid()
        )
    );

-- 7. Add comment for documentation
COMMENT ON TABLE public.warehouses IS 'Warehouses/Sub-inventories with accounting integration. Each warehouse can have its own inventory, COGS, and variance accounts following international accounting standards.';
COMMENT ON FUNCTION public.ensure_warehouse_accounts IS 'Auto-creates accounting accounts for a warehouse following IFRS/GAAP standards. Creates inventory (asset), COGS (expense), and variance (expense) accounts.';
