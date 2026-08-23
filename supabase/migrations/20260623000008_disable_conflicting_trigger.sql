-- ============================================================
-- DISABLE CONFLICTING TRIGGER - COPY TO SUPABASE SQL EDITOR
-- ============================================================
-- The issue is that there are TWO triggers creating journal entries:
-- 1. trg_create_sales_return_journal (BEFORE UPDATE) - which we fixed
-- 2. trg_post_sales_return_to_journal (AFTER UPDATE) - which is causing the error
-- We need to disable the conflicting one

BEGIN;

-- Drop the conflicting trigger only when the optional table exists.
DO $trigger_setup$
BEGIN
  IF to_regclass('public.sales_returns') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_post_sales_return_to_journal ON public.sales_returns';
  ELSE
    RAISE NOTICE 'sales_returns is not installed; skipping conflicting trigger removal';
  END IF;
END;
$trigger_setup$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Disabled conflicting trigger trg_post_sales_return_to_journal';
  RAISE NOTICE 'The fixed trigger trg_create_sales_return_journal will handle journal entries';
END
$$;
