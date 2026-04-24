-- ============================================================
-- AUDITRY POS: Auto-Posting Alerting + SLA Guardrails
-- ============================================================
-- Goal:
-- - Define SLA thresholds for posting pipeline health
-- - Detect violations automatically
-- - Queue actionable alerts for downstream channels (email/slack/webhook)

BEGIN;

-- ============================================================
-- 1) Alert policy table (tenant-level thresholds)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_posting_alert_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  is_active boolean NOT NULL DEFAULT true,

  -- SLA thresholds
  max_pending_count int NOT NULL DEFAULT 20 CHECK (max_pending_count >= 0),
  max_pending_age_minutes int NOT NULL DEFAULT 120 CHECK (max_pending_age_minutes >= 1),
  min_success_rate_percent numeric(5,2) NOT NULL DEFAULT 97.00 CHECK (min_success_rate_percent >= 0 AND min_success_rate_percent <= 100),

  -- Alert channels toggles (actual integrations can be wired later)
  alert_in_app boolean NOT NULL DEFAULT true,
  alert_email boolean NOT NULL DEFAULT false,
  alert_webhook boolean NOT NULL DEFAULT false,
  webhook_url text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_gl_posting_alert_policies_company
  ON public.gl_posting_alert_policies(company_id);

ALTER TABLE public.gl_posting_alert_policies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gl_posting_alert_policies_updated_at ON public.gl_posting_alert_policies;
CREATE TRIGGER trg_gl_posting_alert_policies_updated_at
BEFORE UPDATE ON public.gl_posting_alert_policies
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_timestamp_updated_at();

-- Backfill default policy for all companies (idempotent)
INSERT INTO public.gl_posting_alert_policies (company_id)
SELECT c.id
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.gl_posting_alert_policies p
  WHERE p.company_id = c.id
);

-- ============================================================
-- 2) Alert events queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_posting_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_id uuid NULL REFERENCES public.gl_posting_alert_policies(id) ON DELETE SET NULL,

  alert_type text NOT NULL CHECK (
    alert_type IN ('pending_count_breach', 'pending_age_breach', 'success_rate_breach', 'pipeline_recovered')
  ),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,

  metric_value numeric NULL,
  threshold_value numeric NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_gl_posting_alert_events_company_status
  ON public.gl_posting_alert_events(company_id, status, created_at DESC);

ALTER TABLE public.gl_posting_alert_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3) Company health check function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_gl_posting_health_check(p_company_id uuid, p_days int DEFAULT 30)
RETURNS TABLE(
  company_id uuid,
  pending_count int,
  max_pending_age_minutes int,
  success_rate_percent numeric,
  policy_max_pending_count int,
  policy_max_pending_age_minutes int,
  policy_min_success_rate_percent numeric,
  is_pending_count_breach boolean,
  is_pending_age_breach boolean,
  is_success_rate_breach boolean,
  is_healthy boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH pol AS (
    SELECT *
    FROM public.gl_posting_alert_policies p
    WHERE p.company_id = p_company_id
      AND p.is_active = true
    LIMIT 1
  ),
  pend AS (
    SELECT
      COUNT(*)::int AS pending_count,
      COALESCE(
        MAX(EXTRACT(EPOCH FROM (now() - f.created_at)) / 60.0)::int,
        0
      ) AS max_pending_age_minutes
    FROM public.gl_posting_failures f
    WHERE f.company_id = p_company_id
      AND f.status = 'pending'
  ),
  kpi AS (
    SELECT *
    FROM public.fn_gl_posting_kpi_snapshot(p_company_id, p_days)
  )
  SELECT
    p_company_id AS company_id,
    pend.pending_count,
    pend.max_pending_age_minutes,
    COALESCE(kpi.success_rate_percent, 100::numeric) AS success_rate_percent,
    pol.max_pending_count AS policy_max_pending_count,
    pol.max_pending_age_minutes AS policy_max_pending_age_minutes,
    pol.min_success_rate_percent AS policy_min_success_rate_percent,
    (pend.pending_count > pol.max_pending_count) AS is_pending_count_breach,
    (pend.max_pending_age_minutes > pol.max_pending_age_minutes) AS is_pending_age_breach,
    (COALESCE(kpi.success_rate_percent, 100::numeric) < pol.min_success_rate_percent) AS is_success_rate_breach,
    NOT (
      (pend.pending_count > pol.max_pending_count)
      OR (pend.max_pending_age_minutes > pol.max_pending_age_minutes)
      OR (COALESCE(kpi.success_rate_percent, 100::numeric) < pol.min_success_rate_percent)
    ) AS is_healthy
  FROM pol
  CROSS JOIN pend
  LEFT JOIN kpi ON true;
$$;

-- ============================================================
-- 4) Emit alerts based on policy breaches
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_gl_posting_emit_alerts(p_company_id uuid, p_days int DEFAULT 30)
RETURNS TABLE(
  emitted_alert_id uuid,
  alert_type text,
  severity text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_health record;
  v_policy_id uuid;
  v_alert_id uuid;
BEGIN
  SELECT p.id INTO v_policy_id
  FROM public.gl_posting_alert_policies p
  WHERE p.company_id = p_company_id
    AND p.is_active = true
  LIMIT 1;

  IF v_policy_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_health
  FROM public.fn_gl_posting_health_check(p_company_id, p_days)
  LIMIT 1;

  -- Pending count breach
  IF COALESCE(v_health.is_pending_count_breach, false) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.gl_posting_alert_events e
      WHERE e.company_id = p_company_id
        AND e.alert_type = 'pending_count_breach'
        AND e.status = 'open'
    ) THEN
      INSERT INTO public.gl_posting_alert_events (
        company_id, policy_id, alert_type, severity, title, message, metric_value, threshold_value, context
      )
      VALUES (
        p_company_id,
        v_policy_id,
        'pending_count_breach',
        'critical',
        'Posting backlog exceeded threshold',
        'Pending posting failures exceeded configured SLA threshold.',
        v_health.pending_count,
        v_health.policy_max_pending_count,
        jsonb_build_object('pending_count', v_health.pending_count)
      )
      RETURNING id INTO v_alert_id;

      RETURN QUERY SELECT v_alert_id, 'pending_count_breach'::text, 'critical'::text, 'open'::text;
    END IF;
  ELSE
    UPDATE public.gl_posting_alert_events
    SET status = 'resolved',
        resolved_at = now()
    WHERE company_id = p_company_id
      AND alert_type = 'pending_count_breach'
      AND status = 'open';
  END IF;

  -- Pending age breach
  IF COALESCE(v_health.is_pending_age_breach, false) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.gl_posting_alert_events e
      WHERE e.company_id = p_company_id
        AND e.alert_type = 'pending_age_breach'
        AND e.status = 'open'
    ) THEN
      INSERT INTO public.gl_posting_alert_events (
        company_id, policy_id, alert_type, severity, title, message, metric_value, threshold_value, context
      )
      VALUES (
        p_company_id,
        v_policy_id,
        'pending_age_breach',
        'warning',
        'Old pending posting failures detected',
        'Maximum pending age exceeded configured SLA threshold.',
        v_health.max_pending_age_minutes,
        v_health.policy_max_pending_age_minutes,
        jsonb_build_object('max_pending_age_minutes', v_health.max_pending_age_minutes)
      )
      RETURNING id INTO v_alert_id;

      RETURN QUERY SELECT v_alert_id, 'pending_age_breach'::text, 'warning'::text, 'open'::text;
    END IF;
  ELSE
    UPDATE public.gl_posting_alert_events
    SET status = 'resolved',
        resolved_at = now()
    WHERE company_id = p_company_id
      AND alert_type = 'pending_age_breach'
      AND status = 'open';
  END IF;

  -- Success rate breach
  IF COALESCE(v_health.is_success_rate_breach, false) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.gl_posting_alert_events e
      WHERE e.company_id = p_company_id
        AND e.alert_type = 'success_rate_breach'
        AND e.status = 'open'
    ) THEN
      INSERT INTO public.gl_posting_alert_events (
        company_id, policy_id, alert_type, severity, title, message, metric_value, threshold_value, context
      )
      VALUES (
        p_company_id,
        v_policy_id,
        'success_rate_breach',
        'critical',
        'Posting success rate below SLA',
        'Auto-posting success rate is below configured minimum threshold.',
        v_health.success_rate_percent,
        v_health.policy_min_success_rate_percent,
        jsonb_build_object('success_rate_percent', v_health.success_rate_percent)
      )
      RETURNING id INTO v_alert_id;

      RETURN QUERY SELECT v_alert_id, 'success_rate_breach'::text, 'critical'::text, 'open'::text;
    END IF;
  ELSE
    UPDATE public.gl_posting_alert_events
    SET status = 'resolved',
        resolved_at = now()
    WHERE company_id = p_company_id
      AND alert_type = 'success_rate_breach'
      AND status = 'open';
  END IF;

  -- Recovered signal (optional informational event)
  IF COALESCE(v_health.is_healthy, false) THEN
    IF EXISTS (
      SELECT 1
      FROM public.gl_posting_alert_events e
      WHERE e.company_id = p_company_id
        AND e.created_at >= now() - interval '24 hours'
        AND e.alert_type IN ('pending_count_breach', 'pending_age_breach', 'success_rate_breach')
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.gl_posting_alert_events e
        WHERE e.company_id = p_company_id
          AND e.alert_type = 'pipeline_recovered'
          AND e.status = 'open'
      ) THEN
        INSERT INTO public.gl_posting_alert_events (
          company_id, policy_id, alert_type, severity, title, message, context
        )
        VALUES (
          p_company_id,
          v_policy_id,
          'pipeline_recovered',
          'info',
          'Posting pipeline recovered',
          'Auto-posting health returned within SLA thresholds.',
          jsonb_build_object('at', now())
        )
        RETURNING id INTO v_alert_id;

        RETURN QUERY SELECT v_alert_id, 'pipeline_recovered'::text, 'info'::text, 'open'::text;
      END IF;
    END IF;
  ELSE
    UPDATE public.gl_posting_alert_events
    SET status = 'resolved',
        resolved_at = now()
    WHERE company_id = p_company_id
      AND alert_type = 'pipeline_recovered'
      AND status = 'open';
  END IF;
END;
$$;

-- ============================================================
-- 5) Run alert checks for all active companies
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_gl_posting_emit_alerts_all(p_days int DEFAULT 30)
RETURNS TABLE(
  company_id uuid,
  emitted_alert_id uuid,
  alert_type text,
  severity text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company record;
  v_emitted record;
BEGIN
  FOR v_company IN
    SELECT p.company_id
    FROM public.gl_posting_alert_policies p
    WHERE p.is_active = true
  LOOP
    FOR v_emitted IN
      SELECT *
      FROM public.fn_gl_posting_emit_alerts(v_company.company_id, p_days)
    LOOP
      RETURN QUERY
      SELECT
        v_company.company_id,
        v_emitted.emitted_alert_id,
        v_emitted.alert_type,
        v_emitted.severity,
        v_emitted.status;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- 6) Monitoring views for alert operations
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_posting_open_alerts AS
SELECT
  e.id,
  e.company_id,
  e.alert_type,
  e.severity,
  e.title,
  e.message,
  e.metric_value,
  e.threshold_value,
  e.created_at
FROM public.gl_posting_alert_events e
WHERE e.status = 'open'
ORDER BY
  CASE e.severity
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  e.created_at DESC;

CREATE OR REPLACE VIEW public.v_gl_posting_alert_counts AS
SELECT
  e.company_id,
  e.status,
  e.severity,
  COUNT(*) AS alerts_count
FROM public.gl_posting_alert_events e
GROUP BY e.company_id, e.status, e.severity;

-- ============================================================
-- 7) Optional scheduler for alert emission (pg_cron)
-- ============================================================
DO $$
DECLARE
  v_pg_cron_available boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  )
  INTO v_pg_cron_available;

  IF v_pg_cron_available THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'auditry_autopost_emit_alerts_every_10m';

    PERFORM cron.schedule(
      'auditry_autopost_emit_alerts_every_10m',
      '*/10 * * * *',
      'SELECT * FROM public.fn_gl_posting_emit_alerts_all(30);'
    );
  END IF;
END $$;

COMMIT;
