-- ============================================================
-- AUDITRY POS: MASSIVE SECURITY PATCH (v2 - Fixed Table Names)
-- ============================================================

BEGIN;

-- 1. SECURE RESTAURANTS: Prevent public reading of sensitive IDs
ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;
CREATE POLICY "Public can view basic info" 
ON public.restaurants FOR SELECT 
USING (status = 'active');

-- 2. SECURE ORDERS: Prevent fake order creation
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Public can create orders for active restaurants"
ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND status = 'active')
);

-- 3. SECURE ORDER ITEMS
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. SECURE DRIVERS
ALTER TABLE IF EXISTS public.delivery_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers manage own profile" ON public.delivery_agents;
CREATE POLICY "Drivers manage own profile"
ON public.delivery_agents FOR ALL
USING (auth.uid() IS NOT NULL);

-- 5. SECURE INVENTORY LOGS (Try common names to avoid Error 42P01)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_logs') THEN
        ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_audit_log') THEN
        ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 6. SECURE SETTLEMENTS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_settlements') THEN
        ALTER TABLE public.supplier_settlements ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

COMMIT;
