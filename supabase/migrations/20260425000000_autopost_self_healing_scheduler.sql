-- ============================================================
-- AUDITRY POS: Auto-Posting Self-Healing Scheduler
-- ============================================================
-- Goal:
-- - Run failed-posting retries automatically
-- - Prevent overlapping retry workers
-- - Keep scheduler setup idempotent and environment-safe

BEGIN;

-- ============================================================
-- 1) Retry run logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_posting_retry_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  requested_limit int NOT NULL DEFAULT 50,
  processed_count int NOT NULL DEFAULT 0,
  resolved_count int NOT NULL DEFAULT 0,
  pending_after_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gl_posting_retry_runs_started_at
  ON public.gl_posting_retry_runs(started_at DESC);

ALTER TABLE public.gl_posting_retry_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) Guarded retry worker
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_run_posting_self_heal(p_limit int DEFAULT 50)
RETURNS TABLE(
  run_id uuid,
  processed_count int,
  resolved_count int,
  pending_after_count int,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
  v_run_id uuid;
  v_processed int := 0;
  v_resolved int := 0;
  v_pending_after int := 0;
BEGIN
  -- Advisory lock to prevent overlapping runs across scheduler/manual invocations.
  v_locked := pg_try_advisory_lock(hashtext('auditry_autopost_self_heal_v1'));
  IF NOT v_locked THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      0::int,
      0::int,
      (
        SELECT COUNT(*)::int
        FROM public.gl_posting_failures
        WHERE status = 'pending'
      ),
      'skipped_locked'::text;
    RETURN;
  END IF;

  INSERT INTO public.gl_posting_retry_runs(requested_limit, status)
  VALUES (GREATEST(COALESCE(p_limit, 1), 1), 'running')
  RETURNING id INTO v_run_id;

  BEGIN
    WITH run_result AS (
      SELECT *
      FROM public.fn_retry_failed_postings(GREATEST(COALESCE(p_limit, 1), 1))
    )
    SELECT
      COUNT(*)::int,
      COUNT(*) FILTER (WHERE rr.status = 'resolved')::int
    INTO v_processed, v_resolved
    FROM run_result rr;

    SELECT COUNT(*)::int
    INTO v_pending_after
    FROM public.gl_posting_failures
    WHERE status = 'pending';

    UPDATE public.gl_posting_retry_runs
    SET finished_at = now(),
        processed_count = v_processed,
        resolved_count = v_resolved,
        pending_after_count = v_pending_after,
        status = 'completed'
    WHERE id = v_run_id;

    RETURN QUERY
    SELECT v_run_id, v_processed, v_resolved, v_pending_after, 'completed'::text;
  EXCEPTION WHEN OTHERS THEN
    SELECT COUNT(*)::int
    INTO v_pending_after
    FROM public.gl_posting_failures
    WHERE status = 'pending';

    UPDATE public.gl_posting_retry_runs
    SET finished_at = now(),
        processed_count = v_processed,
        resolved_count = v_resolved,
        pending_after_count = v_pending_after,
        status = 'failed',
        error_message = left(SQLERRM, 2000)
    WHERE id = v_run_id;

    RETURN QUERY
    SELECT v_run_id, v_processed, v_resolved, v_pending_after, 'failed'::text;
  END;

  PERFORM pg_advisory_unlock(hashtext('auditry_autopost_self_heal_v1'));
EXCEPTION WHEN OTHERS THEN
  -- Ensure lock release in unexpected paths
  PERFORM pg_advisory_unlock(hashtext('auditry_autopost_self_heal_v1'));
  RAISE;
END;
$$;

-- ============================================================
-- 3) Optional scheduler via pg_cron (if available)
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
    -- Unschedule old versions (if any)
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'auditry_autopost_self_heal_every_5m';

    -- Every 5 minutes: retry up to 50 pending failures
    PERFORM cron.schedule(
      'auditry_autopost_self_heal_every_5m',
      '*/5 * * * *',
      'SELECT * FROM public.fn_run_posting_self_heal(50);'
    );
  END IF;
END $$;

COMMIT;
