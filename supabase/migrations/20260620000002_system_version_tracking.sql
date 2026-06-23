-- ============================================================
-- SYSTEM VERSION TRACKING FOR FORCED UPDATES
-- ============================================================
-- This migration creates a system to track application versions
-- and force updates on all devices, especially weak ones.

BEGIN;

-- 1. Create system_versions table
CREATE TABLE IF NOT EXISTS public.system_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  force_update BOOLEAN DEFAULT FALSE,
  release_notes TEXT,
  min_compatible_version VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create device_version_tracking table
CREATE TABLE IF NOT EXISTS public.device_version_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  current_version VARCHAR(50) NOT NULL,
  last_check_in TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_agent TEXT,
  platform VARCHAR(50),
  is_weak_device BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id, device_id)
);

-- 3. Enable RLS
ALTER TABLE public.system_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_version_tracking ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for system_versions (read-only for authenticated)
CREATE POLICY "Anyone can read system versions" ON public.system_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage system versions" ON public.system_versions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Create policies for device_version_tracking
CREATE POLICY "Restaurant can manage their device tracking" ON public.device_version_tracking
  FOR ALL TO authenticated USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_version_tracking_restaurant ON public.device_version_tracking(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_device_version_tracking_device ON public.device_version_tracking(device_id);
CREATE INDEX IF NOT EXISTS idx_device_version_tracking_version ON public.device_version_tracking(current_version);

-- 7. Insert initial version
INSERT INTO public.system_versions (version, is_active, force_update, release_notes)
VALUES ('1.0.0', TRUE, FALSE, 'الإصدار الأول من النظام')
ON CONFLICT (version) DO NOTHING;

-- 8. Create function to check for updates
CREATE OR REPLACE FUNCTION public.check_for_update(p_current_version VARCHAR, p_restaurant_id UUID)
RETURNS TABLE(
  has_update BOOLEAN,
  latest_version VARCHAR,
  force_update BOOLEAN,
  release_notes TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_latest RECORD;
BEGIN
  SELECT * INTO v_latest
  FROM public.system_versions
  WHERE is_active = TRUE
  ORDER BY release_date DESC
  LIMIT 1;

  IF v_latest.version IS NULL THEN
    RETURN QUERY SELECT FALSE, p_current_version, FALSE, NULL::TEXT;
    RETURN;
  END IF;

  -- Compare versions (simple string comparison for now)
  IF v_latest.version > p_current_version OR v_latest.force_update = TRUE THEN
    RETURN QUERY SELECT TRUE, v_latest.version, v_latest.force_update, v_latest.release_notes;
  ELSE
    RETURN QUERY SELECT FALSE, p_current_version, FALSE, NULL::TEXT;
  END IF;
END;
$$;

-- 9. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_for_update TO authenticated;

-- 10. Create function to record device check-in
CREATE OR REPLACE FUNCTION public.record_device_check_in(
  p_restaurant_id UUID,
  p_device_id VARCHAR,
  p_current_version VARCHAR,
  p_user_agent TEXT DEFAULT NULL,
  p_platform VARCHAR DEFAULT NULL,
  p_is_weak_device BOOLEAN DEFAULT FALSE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.device_version_tracking (
    restaurant_id, device_id, current_version, last_check_in,
    user_agent, platform, is_weak_device, updated_at
  ) VALUES (
    p_restaurant_id, p_device_id, p_current_version, now(),
    p_user_agent, p_platform, p_is_weak_device, now()
  )
  ON CONFLICT (restaurant_id, device_id) DO UPDATE SET
    current_version = EXCLUDED.current_version,
    last_check_in = now(),
    user_agent = COALESCE(EXCLUDED.user_agent, p_user_agent),
    platform = COALESCE(EXCLUDED.platform, p_platform),
    is_weak_device = COALESCE(EXCLUDED.is_weak_device, p_is_weak_device),
    updated_at = now();
END;
$$;

-- 11. Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_device_check_in TO authenticated;

COMMIT;
