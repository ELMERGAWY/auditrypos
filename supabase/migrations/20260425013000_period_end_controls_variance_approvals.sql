-- ============================================================
-- AUDITRY POS: Period-End Controls + Variance Approvals
-- ============================================================
-- Goal:
-- - Enforce pre-close checks before period close
-- - Freeze budgets after period close
-- - Route material variances through approval workflow

BEGIN;

-- ============================================================
-- 1) Control policy per company
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_period_control_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,

  -- Pre-close controls
  require_no_pending_posting_failures boolean NOT NULL DEFAULT true,
  require_no_open_journal_approvals boolean NOT NULL DEFAULT true,
  require_budget_freeze_on_close boolean NOT NULL DEFAULT true,

  -- Variance approval controls
  variance_threshold_percent numeric(8,2) NOT NULL DEFAULT 10.00,
  variance_threshold_amount numeric(15,2) NOT NULL DEFAULT 10000.00,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_gl_period_control_policies_company
  ON public.gl_period_control_policies(company_id);

ALTER TABLE public.gl_period_control_policies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gl_period_control_policies_updated_at ON public.gl_period_control_policies;
CREATE TRIGGER trg_gl_period_control_policies_updated_at
BEFORE UPDATE ON public.gl_period_control_policies
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_timestamp_updated_at();

INSERT INTO public.gl_period_control_policies (company_id)
SELECT c.id
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.gl_period_control_policies p WHERE p.company_id = c.id
);

-- ============================================================
-- 2) Budget freeze registry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_budget_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_frozen boolean NOT NULL DEFAULT true,
  reason text,
  frozen_by uuid REFERENCES auth.users(id),
  frozen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, workspace_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_account_budget_freezes_company_period
  ON public.account_budget_freezes(company_id, period_start, period_end, is_frozen);

ALTER TABLE public.account_budget_freezes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3) Variance approval queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budget_variance_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  fiscal_year int NOT NULL,
  fiscal_month int NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),

  budget_amount numeric(15,2) NOT NULL DEFAULT 0,
  actual_amount numeric(15,2) NOT NULL DEFAULT 0,
  variance_amount numeric(15,2) NOT NULL DEFAULT 0,
  variance_percent numeric(15,2),

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  requested_by uuid REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,

  UNIQUE(company_id, workspace_id, account_id, fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_budget_variance_approvals_pending
  ON public.budget_variance_approvals(company_id, status, fiscal_year, fiscal_month);

ALTER TABLE public.budget_variance_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4) Budget freeze enforcement trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_block_budget_changes_when_frozen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_month_start date;
  v_month_end date;
  v_is_frozen boolean;
BEGIN
  v_company_id := COALESCE(NEW.company_id, public.fn_company_id_from_restaurant(NEW.restaurant_id));
  v_workspace_id := NEW.workspace_id;
  v_month_start := make_date(NEW.fiscal_year, NEW.fiscal_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  SELECT EXISTS (
    SELECT 1
    FROM public.account_budget_freezes f
    WHERE f.company_id = v_company_id
      AND (f.workspace_id = v_workspace_id OR f.workspace_id IS NULL)
      AND f.is_frozen = true
      AND f.period_start <= v_month_start
      AND f.period_end >= v_month_end
  ) INTO v_is_frozen;

  IF v_is_frozen THEN
    RAISE EXCEPTION 'Budget is frozen for company %, workspace %, period %-%',
      v_company_id, v_workspace_id, NEW.fiscal_year, NEW.fiscal_month;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_budget_changes_when_frozen ON public.account_budgets;
CREATE TRIGGER trg_block_budget_changes_when_frozen
BEFORE INSERT OR UPDATE OR DELETE ON public.account_budgets
FOR EACH ROW
EXECUTE FUNCTION public.tg_block_budget_changes_when_frozen();

-- ============================================================
-- 5) Pre-close validation function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_validate_period_close_controls(
  p_company_id uuid,
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE(
  control_name text,
  passed boolean,
  details text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_policy record;
  v_pending_failures int;
  v_open_approvals int;
BEGIN
  SELECT *
  INTO v_policy
  FROM public.gl_period_control_policies p
  WHERE p.company_id = p_company_id
    AND p.is_active = true
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    RETURN QUERY SELECT 'policy_exists'::text, false, 'No active period control policy';
    RETURN;
  END IF;

  IF v_policy.require_no_pending_posting_failures THEN
    SELECT COUNT(*) INTO v_pending_failures
    FROM public.gl_posting_failures f
    WHERE f.company_id = p_company_id
      AND (f.workspace_id = p_workspace_id OR p_workspace_id IS NULL)
      AND f.status = 'pending';

    RETURN QUERY
    SELECT
      'no_pending_posting_failures'::text,
      (v_pending_failures = 0),
      ('Pending failures: ' || v_pending_failures)::text;
  END IF;

  IF v_policy.require_no_open_journal_approvals THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'journal_approval_requests'
    ) THEN
      EXECUTE $SQL$
        SELECT COUNT(*)
        FROM public.journal_approval_requests r
        WHERE r.company_id = $1
          AND ($2::uuid IS NULL OR r.workspace_id = $2::uuid)
          AND r.status IN ('pending', 'under_review')
      $SQL$
      INTO v_open_approvals
      USING p_company_id, p_workspace_id;
    ELSE
      v_open_approvals := 0;
    END IF;

    RETURN QUERY
    SELECT
      'no_open_journal_approvals'::text,
      (v_open_approvals = 0),
      ('Open approvals: ' || v_open_approvals)::text;
  END IF;

  RETURN QUERY SELECT 'validation_complete'::text, true, 'All enabled controls evaluated';
END;
$$;

-- ============================================================
-- 6) Capture variance approvals for material variances
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_capture_material_variances(
  p_company_id uuid,
  p_workspace_id uuid,
  p_year int,
  p_month int,
  p_requested_by uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy record;
  v_count int := 0;
BEGIN
  SELECT *
  INTO v_policy
  FROM public.gl_period_control_policies p
  WHERE p.company_id = p_company_id
    AND p.is_active = true
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.budget_variance_approvals (
    company_id,
    workspace_id,
    account_id,
    fiscal_year,
    fiscal_month,
    budget_amount,
    actual_amount,
    variance_amount,
    variance_percent,
    status,
    reason,
    requested_by
  )
  SELECT
    v.company_id,
    v.workspace_id,
    v.account_id,
    v.fiscal_year,
    v.fiscal_month,
    v.budget_amount,
    v.actual_amount,
    v.variance_amount,
    v.variance_percent,
    'pending',
    'Material variance exceeded configured policy thresholds',
    p_requested_by
  FROM public.v_budget_vs_actual_scoped v
  WHERE v.company_id = p_company_id
    AND (v.workspace_id = p_workspace_id OR p_workspace_id IS NULL)
    AND v.fiscal_year = p_year
    AND v.fiscal_month = p_month
    AND (
      ABS(COALESCE(v.variance_percent, 0)) >= v_policy.variance_threshold_percent
      OR ABS(COALESCE(v.variance_amount, 0)) >= v_policy.variance_threshold_amount
    )
  ON CONFLICT (company_id, workspace_id, account_id, fiscal_year, fiscal_month)
  DO UPDATE SET
    budget_amount = EXCLUDED.budget_amount,
    actual_amount = EXCLUDED.actual_amount,
    variance_amount = EXCLUDED.variance_amount,
    variance_percent = EXCLUDED.variance_percent,
    status = 'pending',
    reason = EXCLUDED.reason,
    requested_by = EXCLUDED.requested_by,
    requested_at = now(),
    reviewed_by = NULL,
    reviewed_at = NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- 7) Controlled close wrapper (validation + freeze + variance capture)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_close_period_with_controls(
  p_restaurant_id uuid,
  p_period_start date,
  p_period_end date,
  p_create_closing_entry boolean DEFAULT true,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  close_id uuid,
  locked boolean,
  closing_entry_id uuid,
  revenue_total numeric,
  expense_total numeric,
  net_result numeric,
  variance_requests_created int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_failed_controls int;
  v_variance_created int;
BEGIN
  v_company_id := public.fn_company_id_from_restaurant(p_restaurant_id);
  v_workspace_id := public.fn_default_workspace_id(p_restaurant_id);

  SELECT COUNT(*) INTO v_failed_controls
  FROM public.fn_validate_period_close_controls(v_company_id, v_workspace_id, p_period_start, p_period_end) c
  WHERE c.passed = false;

  IF v_failed_controls > 0 THEN
    RAISE EXCEPTION 'Period close controls failed for company %, workspace %, failed controls=%',
      v_company_id, v_workspace_id, v_failed_controls;
  END IF;

  v_variance_created := public.fn_capture_material_variances(
    v_company_id,
    v_workspace_id,
    EXTRACT(YEAR FROM p_period_end)::int,
    EXTRACT(MONTH FROM p_period_end)::int,
    auth.uid()
  );

  RETURN QUERY
  SELECT
    c.close_id,
    c.locked,
    c.closing_entry_id,
    c.revenue_total,
    c.expense_total,
    c.net_result,
    v_variance_created
  FROM public.close_accounting_period(
    p_restaurant_id,
    p_period_start,
    p_period_end,
    p_create_closing_entry,
    p_notes
  ) c;

  IF EXISTS (
    SELECT 1
    FROM public.gl_period_control_policies p
    WHERE p.company_id = v_company_id
      AND p.is_active = true
      AND p.require_budget_freeze_on_close = true
  ) THEN
    INSERT INTO public.account_budget_freezes (
      company_id, workspace_id, period_start, period_end, is_frozen, reason, frozen_by
    )
    VALUES (
      v_company_id,
      v_workspace_id,
      p_period_start,
      p_period_end,
      true,
      COALESCE(p_notes, 'Auto freeze on period close'),
      auth.uid()
    )
    ON CONFLICT (company_id, workspace_id, period_start, period_end)
    DO UPDATE SET
      is_frozen = true,
      reason = EXCLUDED.reason,
      frozen_by = EXCLUDED.frozen_by,
      frozen_at = now();
  END IF;
END;
$$;

-- ============================================================
-- 8) Executive monitoring views
-- ============================================================
CREATE OR REPLACE VIEW public.v_period_close_control_status AS
SELECT
  c.restaurant_id,
  r.company_id,
  c.period_start,
  c.period_end,
  c.status,
  c.revenue_total,
  c.expense_total,
  c.net_result,
  COALESCE(f.is_frozen, false) AS budget_frozen,
  f.frozen_at,
  f.reason AS freeze_reason
FROM public.accounting_period_closes c
JOIN public.restaurants r ON r.id = c.restaurant_id
LEFT JOIN public.account_budget_freezes f
  ON f.company_id = r.company_id
 AND f.period_start = c.period_start
 AND f.period_end = c.period_end
 AND f.is_frozen = true;

CREATE OR REPLACE VIEW public.v_variance_approval_backlog AS
SELECT
  a.company_id,
  a.workspace_id,
  a.fiscal_year,
  a.fiscal_month,
  COUNT(*) FILTER (WHERE a.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE a.status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE a.status = 'rejected') AS rejected_count,
  SUM(CASE WHEN a.status = 'pending' THEN ABS(a.variance_amount) ELSE 0 END) AS pending_abs_variance_amount
FROM public.budget_variance_approvals a
GROUP BY a.company_id, a.workspace_id, a.fiscal_year, a.fiscal_month;

GRANT SELECT ON public.v_period_close_control_status TO authenticated;
GRANT SELECT ON public.v_variance_approval_backlog TO authenticated;

COMMIT;
