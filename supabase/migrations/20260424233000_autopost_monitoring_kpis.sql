-- ============================================================
-- AUDITRY POS: Auto-Posting Monitoring KPIs
-- ============================================================
-- Goal:
-- - Provide operational visibility for posting engine quality
-- - Track success rate, pending aging, and top failure reasons

BEGIN;

-- ============================================================
-- 1) Recent activity view (from journal_entries)
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_autopost_activity_30d AS
SELECT
  je.company_id,
  je.workspace_id,
  je.source_module,
  je.source_event,
  je.entry_date,
  je.created_at,
  je.id AS journal_entry_id
FROM public.journal_entries je
WHERE je.source = 'system'
  AND je.source_module IN ('orders', 'retail_sales', 'service_invoices', 'inventory_receipts', 'expenses')
  AND je.created_at >= now() - interval '30 days';

-- ============================================================
-- 2) Success rate KPI (30 days)
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_autopost_success_rate_30d AS
WITH success_cte AS (
  SELECT COUNT(*)::numeric AS success_count
  FROM public.v_gl_autopost_activity_30d
),
fail_cte AS (
  SELECT COUNT(*)::numeric AS failure_count
  FROM public.gl_posting_failures f
  WHERE f.created_at >= now() - interval '30 days'
)
SELECT
  s.success_count,
  f.failure_count,
  (s.success_count + f.failure_count) AS total_attempts,
  CASE
    WHEN (s.success_count + f.failure_count) = 0 THEN 100::numeric
    ELSE ROUND((s.success_count / (s.success_count + f.failure_count)) * 100, 2)
  END AS success_rate_percent
FROM success_cte s
CROSS JOIN fail_cte f;

-- ============================================================
-- 3) Pending aging KPI
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_posting_pending_aging AS
SELECT
  f.id,
  f.company_id,
  f.workspace_id,
  f.restaurant_id,
  f.source_table,
  f.source_id,
  f.movement_type,
  f.movement_subtype,
  f.retry_count,
  f.created_at,
  f.updated_at,
  EXTRACT(EPOCH FROM (now() - f.created_at)) / 3600.0 AS pending_hours,
  CASE
    WHEN now() - f.created_at <= interval '1 hour' THEN '0-1h'
    WHEN now() - f.created_at <= interval '6 hours' THEN '1-6h'
    WHEN now() - f.created_at <= interval '24 hours' THEN '6-24h'
    ELSE '24h+'
  END AS aging_bucket
FROM public.gl_posting_failures f
WHERE f.status = 'pending';

CREATE OR REPLACE VIEW public.v_gl_posting_pending_aging_summary AS
SELECT
  p.aging_bucket,
  COUNT(*) AS pending_count
FROM public.v_gl_posting_pending_aging p
GROUP BY p.aging_bucket
ORDER BY
  CASE p.aging_bucket
    WHEN '0-1h' THEN 1
    WHEN '1-6h' THEN 2
    WHEN '6-24h' THEN 3
    ELSE 4
  END;

-- ============================================================
-- 4) Top failure reasons (last 30 days)
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_posting_top_failure_reasons_30d AS
SELECT
  COALESCE(NULLIF(left(f.error_message, 120), ''), 'Unknown') AS error_signature,
  COUNT(*) AS failures_count,
  MAX(f.created_at) AS last_seen_at
FROM public.gl_posting_failures f
WHERE f.created_at >= now() - interval '30 days'
GROUP BY COALESCE(NULLIF(left(f.error_message, 120), ''), 'Unknown')
ORDER BY failures_count DESC, last_seen_at DESC;

-- ============================================================
-- 5) Company-level KPI snapshot function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_gl_posting_kpi_snapshot(
  p_company_id uuid,
  p_days int DEFAULT 30
)
RETURNS TABLE(
  success_count numeric,
  failure_count numeric,
  total_attempts numeric,
  success_rate_percent numeric,
  pending_now numeric,
  avg_pending_hours numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH rng AS (
    SELECT now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1)) AS from_ts
  ),
  s AS (
    SELECT COUNT(*)::numeric AS success_count
    FROM public.journal_entries je, rng
    WHERE je.company_id = p_company_id
      AND je.source = 'system'
      AND je.source_module IN ('orders', 'retail_sales', 'service_invoices', 'inventory_receipts', 'expenses')
      AND je.created_at >= rng.from_ts
  ),
  f AS (
    SELECT COUNT(*)::numeric AS failure_count
    FROM public.gl_posting_failures gf, rng
    WHERE gf.company_id = p_company_id
      AND gf.created_at >= rng.from_ts
  ),
  p AS (
    SELECT
      COUNT(*)::numeric AS pending_now,
      AVG(EXTRACT(EPOCH FROM (now() - gf.created_at)) / 3600.0)::numeric AS avg_pending_hours
    FROM public.gl_posting_failures gf
    WHERE gf.company_id = p_company_id
      AND gf.status = 'pending'
  )
  SELECT
    s.success_count,
    f.failure_count,
    (s.success_count + f.failure_count) AS total_attempts,
    CASE
      WHEN (s.success_count + f.failure_count) = 0 THEN 100::numeric
      ELSE ROUND((s.success_count / (s.success_count + f.failure_count)) * 100, 2)
    END AS success_rate_percent,
    p.pending_now,
    COALESCE(p.avg_pending_hours, 0::numeric) AS avg_pending_hours
  FROM s
  CROSS JOIN f
  CROSS JOIN p;
$$;

COMMIT;
