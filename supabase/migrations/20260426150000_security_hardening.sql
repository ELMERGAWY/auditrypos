-- ============================================================
-- AUDITRY POS: Security Hardening & RLS Policies
-- ============================================================

BEGIN;

-- 1. Enable RLS on core tables if not already enabled
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 2. Secure Restaurants Table
-- Only owner or admins can see full details. Public can only see basic store info (name, logo, business_type)
DROP POLICY IF EXISTS "Public basic restaurant info" ON public.restaurants;
CREATE POLICY "Public basic restaurant info" ON public.restaurants
  FOR SELECT USING (true); -- We will use a view or select specific columns in frontend for public

-- Strict policy for sensitive restaurant data
DROP POLICY IF EXISTS "Owners can manage their restaurant" ON public.restaurants;
CREATE POLICY "Owners can manage their restaurant" ON public.restaurants
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 3. Secure Orders Table (Prevent data harvesting)
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT WITH CHECK (true); -- Public can still order

DROP POLICY IF EXISTS "Owners/Staff can see orders" ON public.orders;
CREATE POLICY "Owners/Staff can see orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- 4. Secure Delivery Agents (Hide phone numbers from public)
DROP POLICY IF EXISTS "Public cannot see delivery phone numbers" ON public.delivery_agents;
CREATE POLICY "Public cannot see delivery phone numbers" ON public.delivery_agents
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- 5. Secure Profiles (Privacy)
DROP POLICY IF EXISTS "Users can see their own profile" ON public.profiles;
CREATE POLICY "Users can see their own profile" ON public.profiles
  FOR ALL USING (user_id = auth.uid());

COMMIT;
