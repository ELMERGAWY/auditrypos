
-- ============================================
-- 1. جدول الشفتات (Shifts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  cashier_id uuid NOT NULL,
  cashier_name text NOT NULL DEFAULT '',
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance numeric,
  total_sales numeric NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' -- open | closed
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages shifts"
ON public.shifts FOR ALL
USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================
-- 2. جدول المناديب (Delivery Agents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.delivery_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'available', -- available | busy | offline
  current_lat numeric,
  current_lng numeric,
  last_location_update timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages agents"
ON public.delivery_agents FOR ALL
USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public reads agents for tracking"
ON public.delivery_agents FOR SELECT
USING (true);

-- ============================================
-- 3. جدول طلبات التوصيل (Delivery Orders)
-- ============================================
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in', -- dine_in | takeaway | delivery
  ADD COLUMN IF NOT EXISTS delivery_agent_id uuid REFERENCES public.delivery_agents(id),
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_lat numeric,
  ADD COLUMN IF NOT EXISTS delivery_lng numeric,
  ADD COLUMN IF NOT EXISTS tracking_token text;

-- ============================================
-- 4. إضافة عمود لوجو المطعم
-- ============================================
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ج.م';

-- Enable realtime for tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
