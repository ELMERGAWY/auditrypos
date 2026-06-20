-- ============================================================
-- ADD TRACKING PIXELS SYSTEM FOR COMPANIES & LANDING PAGE
-- ============================================================

BEGIN;

-- 1. Create tracking_pixels table for companies
CREATE TABLE IF NOT EXISTS public.tracking_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'google_analytics', 'tiktok', 'twitter', 'linkedin', 'snapchat', 'pinterest', 'custom'
  pixel_id TEXT NOT NULL,
  pixel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  placement TEXT NOT NULL, -- 'storefront', 'landing_page', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tracking_pixels column to restaurants for landing page pixels
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS landing_page_pixels JSONB DEFAULT '[]';

-- 3. Enable RLS
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Owner manages tracking pixels" ON public.tracking_pixels
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Create policy for super admin to manage landing page pixels
CREATE POLICY "Super admin manages landing page pixels" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 6. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_tracking_pixels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_tracking_pixels_updated_at ON public.tracking_pixels;
CREATE TRIGGER trg_update_tracking_pixels_updated_at
BEFORE UPDATE ON public.tracking_pixels
FOR EACH ROW
EXECUTE FUNCTION public.update_tracking_pixels_updated_at();

-- 7. Create function to get tracking pixels for a restaurant
CREATE OR REPLACE FUNCTION public.get_tracking_pixels(p_restaurant_id UUID, p_placement TEXT DEFAULT 'storefront')
RETURNS JSONB AS $$
DECLARE
  v_pixels JSONB := '[]'::JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'platform', platform,
      'pixel_id', pixel_id,
      'pixel_name', pixel_name,
      'is_active', is_active
    )
  ), '[]'::JSONB)
  INTO v_pixels
  FROM public.tracking_pixels
  WHERE restaurant_id = p_restaurant_id
  AND is_active = true
  AND (placement = p_placement OR placement = 'both');

  RETURN v_pixels;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tracking_pixels TO anon, authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Tracking pixels system created:';
  RAISE NOTICE '✅ - tracking_pixels table created';
  RAISE NOTICE '✅ - landing_page_pixels column added to restaurants';
  RAISE NOTICE '✅ - RLS policies created';
  RAISE NOTICE '✅ - get_tracking_pixels function created';
END
$$;
