
-- ============================================================
-- Supplier Contracts & Commissions Module
-- ============================================================

-- 1. Create supplier_contracts table
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    contract_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
    immediate_commission_percent NUMERIC(5, 2) DEFAULT 0, -- عمولة فورية %
    immediate_commission_fixed NUMERIC(12, 2) DEFAULT 0, -- عمولة فورية ثابتة
    has_annual_bonus BOOLEAN DEFAULT false,
    annual_bonus_type VARCHAR(50) CHECK (annual_bonus_type IN ('percentage', 'fixed')),
    annual_bonus_value NUMERIC(12, 2) DEFAULT 0,
    annual_bonus_threshold NUMERIC(12, 2) DEFAULT 0, -- حد المبيعات للبونص
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create supplier_commissions table to track earned commissions
CREATE TABLE IF NOT EXISTS public.supplier_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.supplier_contracts(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('immediate', 'annual_bonus')),
    amount NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(50), -- e.g., 'purchase_invoice'
    reference_id UUID,
    status VARCHAR(50) DEFAULT 'earned' CHECK (status IN ('earned', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add columns to purchase_invoices to link to contracts
ALTER TABLE public.purchase_invoices 
ADD COLUMN IF NOT EXISTS supplier_contract_id UUID REFERENCES public.supplier_contracts(id) ON DELETE SET NULL;

-- 4. Add RLS policies
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage supplier contracts" ON public.supplier_contracts
    FOR ALL TO authenticated
    USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Manage supplier commissions" ON public.supplier_commissions
    FOR ALL TO authenticated
    USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Create function to calculate and insert immediate commission on purchase invoice
CREATE OR REPLACE FUNCTION public.calculate_immediate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract public.supplier_contracts;
    v_commission NUMERIC(12, 2);
BEGIN
    -- Check if invoice has a contract
    IF NEW.supplier_contract_id IS NOT NULL THEN
        SELECT * INTO v_contract 
        FROM public.supplier_contracts 
        WHERE id = NEW.supplier_contract_id AND status = 'active';

        IF v_contract IS NOT NULL THEN
            -- Calculate commission
            v_commission := 0;
            IF v_contract.immediate_commission_percent > 0 THEN
                v_commission := v_commission + (NEW.total_amount * v_contract.immediate_commission_percent / 100);
            END IF;
            IF v_contract.immediate_commission_fixed > 0 THEN
                v_commission := v_commission + v_contract.immediate_commission_fixed;
            END IF;

            -- Insert commission if > 0
            IF v_commission > 0 THEN
                INSERT INTO public.supplier_commissions (
                    restaurant_id,
                    contract_id,
                    supplier_id,
                    type,
                    amount,
                    reference_type,
                    reference_id,
                    status
                ) VALUES (
                    NEW.restaurant_id,
                    NEW.supplier_contract_id,
                    NEW.supplier_id,
                    'immediate',
                    v_commission,
                    'purchase_invoice',
                    NEW.id,
                    'earned'
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Create trigger for purchase invoices
DROP TRIGGER IF EXISTS trg_calculate_immediate_commission ON public.purchase_invoices;
CREATE TRIGGER trg_calculate_immediate_commission
AFTER INSERT ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.calculate_immediate_commission();

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_restaurant ON public.supplier_contracts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier ON public.supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_commissions_restaurant ON public.supplier_commissions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_commissions_contract ON public.supplier_commissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_supplier_commissions_supplier ON public.supplier_commissions(supplier_id);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Supplier Contracts & Commissions Module Added!';
END $$;

