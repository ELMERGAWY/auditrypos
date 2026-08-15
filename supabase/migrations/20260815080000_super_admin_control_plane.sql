-- AuditryPOS Super Admin control plane
-- Additive only: read-oriented monitoring and audit trail; no tenant transaction mutation.

CREATE TABLE IF NOT EXISTS public.super_admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_created
  ON public.super_admin_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_target
  ON public.super_admin_audit_events(target_type, target_id);

ALTER TABLE public.super_admin_audit_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'super_admin_audit_events'
      AND policyname = 'super admins manage platform audit events'
  ) THEN
    CREATE POLICY "super admins manage platform audit events"
      ON public.super_admin_audit_events
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_super_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_restaurant_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;
  INSERT INTO public.super_admin_audit_events
    (actor_user_id, action, target_type, target_id, restaurant_id, details)
  VALUES
    (NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
     left(p_action, 120), left(p_target_type, 80), p_target_id, p_restaurant_id,
     COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_super_admin_action(TEXT,TEXT,UUID,UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT,TEXT,UUID,UUID,JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_super_admin_tenant_health(p_limit INTEGER DEFAULT 200)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  status TEXT,
  plan_id TEXT,
  orders_24h BIGINT,
  revenue_24h NUMERIC,
  active_staff BIGINT,
  last_order_at TIMESTAMPTZ,
  health_state TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name::TEXT,
    r.status::TEXT,
    r.plan_id::TEXT,
    COALESCE((SELECT count(*) FROM public.orders o
      WHERE o.restaurant_id = r.id AND o.created_at >= now() - interval '24 hours'
        AND COALESCE(o.status, '') <> 'cancelled'), 0)::BIGINT,
    COALESCE((SELECT sum(COALESCE(o.total, 0)) FROM public.orders o
      WHERE o.restaurant_id = r.id AND o.created_at >= now() - interval '24 hours'
        AND COALESCE(o.status, '') <> 'cancelled'), 0)::NUMERIC,
    COALESCE((SELECT count(*) FROM public.staff_profiles sp
      WHERE sp.restaurant_id = r.id AND lower(COALESCE(sp.status, 'active')) = 'active'), 0)::BIGINT,
    (SELECT max(o.created_at) FROM public.orders o WHERE o.restaurant_id = r.id),
    CASE
      WHEN r.status NOT IN ('active','trial') THEN 'blocked'
      WHEN r.subscription_end IS NOT NULL AND r.subscription_end < now() THEN 'expired'
      WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.restaurant_id = r.id AND o.created_at >= now() - interval '7 days') THEN 'no_activity'
      ELSE 'healthy'
    END
  FROM public.restaurants r
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$$;
REVOKE ALL ON FUNCTION public.get_super_admin_tenant_health(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_super_admin_tenant_health(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_super_admin_audit_events(p_limit INTEGER DEFAULT 100)
RETURNS SETOF public.super_admin_audit_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Super Admin access required';
  END IF;
  RETURN QUERY
  SELECT * FROM public.super_admin_audit_events
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;
REVOKE ALL ON FUNCTION public.get_super_admin_audit_events(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_super_admin_audit_events(INTEGER) TO authenticated, service_role;
