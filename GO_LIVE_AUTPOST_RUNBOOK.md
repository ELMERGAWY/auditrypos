# Auto-Posting Go-Live Runbook

This runbook is for production operations after deploying the Auto-Posting ERP stack.

## 1) Pre-Open Daily Checks

- Check pipeline health:
  - `select * from public.v_gl_autopost_success_rate_30d;`
  - `select * from public.v_gl_posting_open_alerts;`
  - `select * from public.v_gl_posting_failures_summary;`
- Confirm no old backlog:
  - `select * from public.v_gl_posting_pending_aging_summary;`
- If pending exists, run:
  - `select * from public.fn_run_posting_self_heal(100);`

## 2) During-Day Operations

- Monitor every 1-2 hours:
  - `select * from public.v_gl_posting_open_alerts order by created_at desc;`
  - `select * from public.v_gl_posting_top_failure_reasons_30d limit 20;`
- If critical alert exists:
  - Run one retry cycle:
    - `select * from public.fn_retry_failed_postings(100);`
  - Re-check health:
    - `select * from public.fn_gl_posting_kpi_snapshot('<company_id>'::uuid, 30);`

## 3) End-of-Day Controls

- Confirm no pending queue:
  - `select count(*) from public.gl_posting_failures where status = 'pending';`
- Review unresolved alerts:
  - `select * from public.gl_posting_alert_events where status = 'open' order by created_at desc;`
- Confirm posting activity:
  - `select count(*) from public.v_gl_autopost_activity_30d where created_at::date = current_date;`

## 4) Period-End Close Checklist

- Validate controls:
  - `select * from public.fn_validate_period_close_controls('<company_id>'::uuid, '<workspace_id>'::uuid, '<period_start>'::date, '<period_end>'::date);`
- Capture material variances:
  - `select public.fn_capture_material_variances('<company_id>'::uuid, '<workspace_id>'::uuid, <year>, <month>, auth.uid());`
- Execute controlled close:
  - `select * from public.fn_close_period_with_controls('<restaurant_id>'::uuid, '<period_start>'::date, '<period_end>'::date, true, 'Month-end close');`
- Review backlog:
  - `select * from public.v_variance_approval_backlog order by fiscal_year desc, fiscal_month desc;`

## 5) Incident Playbook (Posting Failure Spike)

- Step 1: Snapshot failure reasons
  - `select * from public.v_gl_posting_top_failure_reasons_30d limit 50;`
- Step 2: Retry aggressively
  - `select * from public.fn_run_posting_self_heal(300);`
- Step 3: Emit fresh alerts
  - `select * from public.fn_gl_posting_emit_alerts_all(30);`
- Step 4: Verify recovery
  - `select * from public.fn_gl_posting_health_check('<company_id>'::uuid, 30);`

## 6) Weekly CFO Checks

- Budget vs Actual:
  - `select * from public.fn_cfo_budget_variance_scoped('<company_id>'::uuid, '<workspace_id>'::uuid, <year>, <month>);`
- Costing quality:
  - `select * from public.v_cogs_ratio_vs_budget_scoped where company_id = '<company_id>'::uuid order by fiscal_year desc, fiscal_month desc;`
- Alert drift:
  - `select company_id, status, severity, alerts_count from public.v_gl_posting_alert_counts order by company_id, status, severity;`

## 7) Exit Criteria (Production Healthy)

- Pending failures = 0 for 7 consecutive days.
- Success rate >= policy minimum for 7 consecutive days.
- No critical open alerts older than 2 hours.
- Period close executed with controls and no rejected critical variances pending.

