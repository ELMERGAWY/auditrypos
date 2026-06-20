-- Print Settings Persistence Migration
-- This migration adds support for persisting print settings per restaurant
-- ensuring settings remain constant across all print operations

-- 1. Create print_settings table
CREATE TABLE IF NOT EXISTS public.print_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id)
);

-- 2. Enable RLS
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
DROP POLICY IF EXISTS owner_all_print_settings ON public.print_settings;
CREATE POLICY owner_all_print_settings ON public.print_settings
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants 
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS accounting_staff_print_settings ON public.print_settings;
CREATE POLICY accounting_staff_print_settings ON public.print_settings
    FOR ALL USING (
        is_restaurant_owner(auth.uid(), restaurant_id)
        OR has_role(auth.uid(), 'super_admin'::app_role)
    );

-- 4. Create function to get or create print settings
DROP FUNCTION IF EXISTS public.get_or_create_print_settings(uuid);
CREATE FUNCTION public.get_or_create_print_settings(restaurant_id UUID)
RETURNS JSONB AS $$
DECLARE
    settings JSONB;
BEGIN
    -- Try to get existing settings
    SELECT settings INTO settings
    FROM public.print_settings
    WHERE restaurant_id = restaurant_id;
    
    -- If not found, create default settings
    IF settings IS NULL THEN
        settings := '{
            "logo": true,
            "restaurantName": true,
            "invoiceNumber": true,
            "dateTime": true,
            "itemCount": true,
            "customerName": true,
            "customerPhone": true,
            "customerRef": true,
            "deliveryAddress": true,
            "items": true,
            "totalQty": true,
            "subtotal": true,
            "discount": true,
            "total": true,
            "paymentMethod": true,
            "paidAmount": true,
            "remaining": true,
            "change": true,
            "notes": true,
            "thankYou": true,
            "poweredBy": true,
            "customerCopy": true,
            "businessCopy": true,
            "kitchenCopy": true
        }'::jsonb;
        
        INSERT INTO public.print_settings (restaurant_id, settings)
        VALUES (restaurant_id, settings);
    END IF;
    
    RETURN settings;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to update print settings
DROP FUNCTION IF EXISTS public.update_print_settings(uuid, jsonb);
CREATE FUNCTION public.update_print_settings(restaurant_id UUID, new_settings JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.print_settings (restaurant_id, settings)
    VALUES (restaurant_id, new_settings)
    ON CONFLICT (restaurant_id) 
    DO UPDATE SET 
        settings = EXCLUDED.settings,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Add index for performance
CREATE INDEX IF NOT EXISTS idx_print_settings_restaurant_id 
ON public.print_settings(restaurant_id);

-- 7. Add comment for documentation
COMMENT ON TABLE public.print_settings IS 'Stores print settings per restaurant. Settings are applied consistently across all print operations (receipts, invoices, etc.)';
COMMENT ON FUNCTION public.get_or_create_print_settings IS 'Gets existing print settings or creates default settings if none exist';
COMMENT ON FUNCTION public.update_print_settings IS 'Updates print settings for a restaurant, creating the record if it does not exist';
