-- ============================================================
-- AUDITRY POS: Auto-Posting Retry Processor
-- ============================================================
-- Goal:
-- - Retry failed/pending posting attempts in controlled batches
-- - Mark failures as resolved when posting succeeds
-- - Keep full observability for retry attempts

BEGIN;

-- ============================================================
-- 1) Retry single failure item
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_retry_posting_failure(p_failure_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failure public.gl_posting_failures%ROWTYPE;
  v_entry_id uuid;
BEGIN
  SELECT *
  INTO v_failure
  FROM public.gl_posting_failures
  WHERE id = p_failure_id
  LIMIT 1;

  IF v_failure.id IS NULL THEN
    RAISE EXCEPTION 'Posting failure % not found', p_failure_id;
  END IF;

  IF v_failure.status IN ('resolved', 'cancelled') THEN
    RETURN NULL;
  END IF;

  UPDATE public.gl_posting_failures
  SET status = 'retrying',
      retry_count = retry_count + 1,
      updated_at = now()
  WHERE id = v_failure.id;

  BEGIN
    v_entry_id := public.fn_autopost_transaction(
      v_failure.company_id,
      v_failure.workspace_id,
      v_failure.restaurant_id,
      COALESCE(v_failure.payload->>'profile_code', 'restaurant'),
      COALESCE(v_failure.movement_type, 'expense'),
      COALESCE(v_failure.movement_subtype, 'cash_expense'),
      COALESCE(v_failure.payment_method, 'cash'),
      COALESCE(v_failure.amount, 0),
      COALESCE((v_failure.payload->>'entry_date')::date, current_date),
      COALESCE(v_failure.payload->>'description', 'Retried auto-post transaction'),
      v_failure.source_table,
      v_failure.source_event,
      v_failure.source_id,
      NULL
    );

    UPDATE public.gl_posting_failures
    SET status = 'resolved',
        resolved_at = now(),
        updated_at = now(),
        error_message = 'Resolved after retry'
    WHERE id = v_failure.id;

    RETURN v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.gl_posting_failures
    SET status = 'pending',
        updated_at = now(),
        error_message = left(SQLERRM, 2000)
    WHERE id = v_failure.id;

    RETURN NULL;
  END;
END;
$$;

-- ============================================================
-- 2) Batch retry processor
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_retry_failed_postings(p_limit int DEFAULT 50)
RETURNS TABLE(
  failure_id uuid,
  source_table text,
  source_id uuid,
  retry_count int,
  status text,
  resolved_entry_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_entry_id uuid;
BEGIN
  FOR v_item IN
    SELECT f.id, f.source_table, f.source_id, f.retry_count, f.status
    FROM public.gl_posting_failures f
    WHERE f.status = 'pending'
    ORDER BY f.created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 1), 1)
  LOOP
    v_entry_id := public.fn_retry_posting_failure(v_item.id);

    RETURN QUERY
    SELECT
      v_item.id,
      v_item.source_table,
      v_item.source_id,
      (
        SELECT f2.retry_count
        FROM public.gl_posting_failures f2
        WHERE f2.id = v_item.id
      ) AS retry_count,
      (
        SELECT f2.status
        FROM public.gl_posting_failures f2
        WHERE f2.id = v_item.id
      ) AS status,
      v_entry_id;
  END LOOP;
END;
$$;

-- ============================================================
-- 3) Monitoring view
-- ============================================================
CREATE OR REPLACE VIEW public.v_gl_posting_failures_summary AS
SELECT
  f.status,
  COUNT(*) AS failures_count,
  MIN(f.created_at) AS oldest_created_at,
  MAX(f.updated_at) AS latest_updated_at
FROM public.gl_posting_failures f
GROUP BY f.status;

COMMIT;
