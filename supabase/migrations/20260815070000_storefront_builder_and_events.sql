-- AuditryPOS storefront builder and server-side event ledger
-- Additive only: no order, customer, product, or inventory data is deleted or rewritten.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS storefront_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'theme', 'aurora',
    'hero_title', NULL,
    'hero_subtitle', NULL,
    'hero_image_url', NULL,
    'primary_color', NULL,
    'secondary_color', NULL,
    'cta_text', 'اطلب الآن',
    'show_search', true,
    'show_categories', true,
    'meta_title', NULL,
    'meta_description', NULL
  );

CREATE TABLE IF NOT EXISTS public.storefront_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN
    ('PageView','ViewContent','Search','AddToCart','InitiateCheckout','Purchase')),
  event_id TEXT NOT NULL,
  visitor_id TEXT,
  value NUMERIC(18,4),
  currency TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_storefront_events_restaurant_time
  ON public.storefront_events (restaurant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_storefront_events_name_time
  ON public.storefront_events (restaurant_id, event_name, occurred_at DESC);

ALTER TABLE public.storefront_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_storefront_event(
  p_restaurant_id UUID,
  p_event_name TEXT,
  p_event_id TEXT,
  p_visitor_id TEXT DEFAULT NULL,
  p_value NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_event_name NOT IN ('PageView','ViewContent','Search','AddToCart','InitiateCheckout','Purchase') THEN
    RAISE EXCEPTION 'Unsupported storefront event';
  END IF;
  IF p_event_id IS NULL OR length(trim(p_event_id)) < 8 OR length(p_event_id) > 180 THEN
    RAISE EXCEPTION 'Invalid storefront event id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE id = p_restaurant_id AND status IN ('active','trial')) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.storefront_events
    (restaurant_id, event_name, event_id, visitor_id, value, currency, payload)
  VALUES
    (p_restaurant_id, p_event_name, p_event_id, NULLIF(left(p_visitor_id, 180), ''),
     p_value, NULLIF(left(p_currency, 12), ''), COALESCE(p_payload, '{}'::jsonb))
  ON CONFLICT (restaurant_id, event_id) DO NOTHING;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_storefront_event(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_storefront_event(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB) TO anon, authenticated, service_role;

-- Expose only safe storefront branding/content configuration publicly.
CREATE OR REPLACE VIEW public.restaurants_public
WITH (security_invoker=off) AS
SELECT id, name, logo_url, currency, status, business_type, storefront_config
FROM public.restaurants
WHERE status IN ('active','trial');
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- Custom raw HTML/script pixels are not safe in a public storefront; keep supported platforms only.
CREATE OR REPLACE FUNCTION public.get_tracking_pixels(p_restaurant_id UUID, p_placement TEXT DEFAULT 'storefront')
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pixels JSONB := '[]'::JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'platform', platform, 'pixel_id', pixel_id,
    'pixel_name', pixel_name, 'is_active', is_active
  ) ORDER BY created_at), '[]'::JSONB)
  INTO v_pixels
  FROM public.tracking_pixels
  WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND platform <> 'custom'
    AND (placement = p_placement OR placement = 'both');
  RETURN v_pixels;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tracking_pixels(UUID,TEXT) TO anon, authenticated;


INSERT INTO public.permissions (code, name_ar, description_ar, module) VALUES
  ('storefront.manage', 'إدارة المتجر والصفحة العامة', 'تخصيص واجهة المتجر والـLanding Page والبيانات الوصفية', 'storefront')
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  module = EXCLUDED.module;

CREATE OR REPLACE FUNCTION public.update_storefront_config(
  p_restaurant_id UUID,
  p_config JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company UUID;
  v_safe JSONB;
BEGIN
  SELECT company_id INTO v_company FROM public.restaurants WHERE id = p_restaurant_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND (r.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = r.company_id AND cu.user_id = auth.uid()
          AND cu.is_active = true AND cu.role IN ('owner','admin','manager')
      ))
  ) AND auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
    AND NOT public.check_user_permission(auth.uid(), v_company, 'storefront.manage') THEN
    RAISE EXCEPTION 'Not allowed to manage storefront';
  END IF;

  v_safe := jsonb_build_object(
    'theme', left(COALESCE(p_config->>'theme', 'aurora'), 40),
    'hero_title', NULLIF(left(COALESCE(p_config->>'hero_title', ''), 180), ''),
    'hero_subtitle', NULLIF(left(COALESCE(p_config->>'hero_subtitle', ''), 500), ''),
    'hero_image_url', NULLIF(left(COALESCE(p_config->>'hero_image_url', ''), 500), ''),
    'primary_color', NULLIF(left(COALESCE(p_config->>'primary_color', ''), 20), ''),
    'secondary_color', NULLIF(left(COALESCE(p_config->>'secondary_color', ''), 20), ''),
    'cta_text', left(COALESCE(p_config->>'cta_text', 'اطلب الآن'), 60),
    'show_search', COALESCE((p_config->>'show_search')::boolean, true),
    'show_categories', COALESCE((p_config->>'show_categories')::boolean, true),
    'meta_title', NULLIF(left(COALESCE(p_config->>'meta_title', ''), 180), ''),
    'meta_description', NULLIF(left(COALESCE(p_config->>'meta_description', ''), 320), '')
  );

  UPDATE public.restaurants SET storefront_config = v_safe WHERE id = p_restaurant_id;
  RETURN v_safe;
END;
$$;
REVOKE ALL ON FUNCTION public.update_storefront_config(UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_storefront_config(UUID,JSONB) TO authenticated, service_role;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracking_pixels'
      AND policyname = 'Storefront managers manage tracking pixels'
  ) THEN
    CREATE POLICY "Storefront managers manage tracking pixels"
      ON public.tracking_pixels
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id = tracking_pixels.restaurant_id
            AND (
              r.owner_id = auth.uid()
              OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
              OR public.check_user_permission(auth.uid(), r.company_id, 'storefront.manage')
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id = tracking_pixels.restaurant_id
            AND (
              r.owner_id = auth.uid()
              OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
              OR public.check_user_permission(auth.uid(), r.company_id, 'storefront.manage')
            )
        )
      );
  END IF;
END $$;
