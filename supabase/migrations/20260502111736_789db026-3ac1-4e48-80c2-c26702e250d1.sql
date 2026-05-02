
-- 1. AP/AR settlements RLS
ALTER TABLE public.ap_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_settlements_owner_all ON public.ap_settlements
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY ar_settlements_owner_all ON public.ar_settlements
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 2. accounting_posting_rules RLS (config table — read for authenticated, manage for super admin)
ALTER TABLE public.accounting_posting_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_posting_rules_read ON public.accounting_posting_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY accounting_posting_rules_admin ON public.accounting_posting_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Restaurants: remove broad public SELECT and expose only safe columns via a view
DROP POLICY IF EXISTS "Public basic restaurant info" ON public.restaurants;
DROP POLICY IF EXISTS "Public reads restaurant basic info" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view basic info" ON public.restaurants;

CREATE OR REPLACE VIEW public.public_restaurant_info
WITH (security_invoker = on) AS
SELECT id, name, logo_url, currency, status
FROM public.restaurants
WHERE status = 'active';

GRANT SELECT ON public.public_restaurant_info TO anon, authenticated;

-- 4. Orders: remove unrestricted anonymous INSERT; storefront edge function uses service role
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders for active restaurants" ON public.orders;

-- 5. Storage: restaurant-assets — restrict writes to user's own restaurant folder
DROP POLICY IF EXISTS "Owner uploads assets" ON storage.objects;
DROP POLICY IF EXISTS "Owner updates assets" ON storage.objects;
DROP POLICY IF EXISTS "Owner deletes assets" ON storage.objects;

CREATE POLICY "Owner uploads assets to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner updates own assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'restaurant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner deletes own assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'restaurant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- 6. Recreate financial reporting views with security_invoker = on
DO $$
DECLARE
  v_name text;
  v_def text;
BEGIN
  FOR v_name IN
    SELECT viewname FROM pg_views
    WHERE schemaname='public' AND viewname LIKE 'v_%'
  LOOP
    SELECT pg_get_viewdef(format('public.%I', v_name)::regclass, true) INTO v_def;
    EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH (security_invoker = on) AS %s', v_name, v_def);
  END LOOP;
END $$;
