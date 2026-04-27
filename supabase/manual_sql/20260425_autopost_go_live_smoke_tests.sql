-- ============================================================
-- AUDITRY POS - AUTO-POSTING GO-LIVE SMOKE TESTS
-- Run manually in Supabase SQL editor after deployments
-- ============================================================

-- 1) Structural sanity
select to_regclass('public.gl_posting_settings') as gl_posting_settings_table;
select to_regclass('public.gl_posting_failures') as gl_posting_failures_table;
select to_regclass('public.gl_posting_alert_events') as gl_posting_alert_events_table;

-- 2) Function existence sanity
select proname
from pg_proc
where proname in (
  'fn_autopost_transaction',
  'fn_retry_failed_postings',
  'fn_run_posting_self_heal',
  'fn_gl_posting_emit_alerts_all',
  'fn_close_period_with_controls'
)
order by proname;

-- 3) KPI sanity
select * from public.v_gl_autopost_success_rate_30d;
select * from public.v_gl_posting_pending_aging_summary;
select * from public.v_gl_posting_top_failure_reasons_30d limit 10;

-- 4) Health check sample (replace IDs)
-- select * from public.fn_gl_posting_health_check('<company_id>'::uuid, 30);

-- 5) Retry processor dry run (safe even when queue is empty)
select * from public.fn_retry_failed_postings(10);

-- 6) Self-heal run (guarded by advisory lock)
select * from public.fn_run_posting_self_heal(25);

-- 7) Alert emission run
select * from public.fn_gl_posting_emit_alerts_all(30);

-- 8) Budget/variance reporting sample (replace IDs)
-- select * from public.fn_cfo_budget_variance_scoped('<company_id>'::uuid, '<workspace_id>'::uuid, 2026, 4);
-- select * from public.v_cogs_ratio_vs_budget_scoped where company_id = '<company_id>'::uuid;

-- 9) Period control validation sample (replace IDs)
-- select * from public.fn_validate_period_close_controls(
--   '<company_id>'::uuid,
--   '<workspace_id>'::uuid,
--   '2026-04-01'::date,
--   '2026-04-30'::date
-- );

