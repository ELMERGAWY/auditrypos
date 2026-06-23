-- ============================================================
-- AUDITRY POS: Financial Closure - Budget/Costing Sign-off
-- ============================================================
-- Goal:
-- - Upgrade budgeting model to company/workspace-aware scope
-- - Deliver management-grade Budget vs Actual views/functions
-- - Add costing control KPI (COGS ratio vs budget)

BEGIN;

-- ============================================================
-- 1) Upgrade account_budgets scope to company/workspace
-- ============================================================
ALTER TABLE public.account_budgets
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_account_budgets_company_period
  ON public.account_budgets(company_id, fiscal_year, fiscal_month);

CREATE INDEX IF NOT EXISTS idx_account_budgets_workspace_period
  ON public.account_budgets(workspace_id, fiscal_year, fiscal_month);

-- Backfill from restaurant -> company/default workspace
UPDATE public.account_budgets b
SET company_id = r.company_id
FROM public.restaurants r
WHERE b.restaurant_id = r.id
  AND b.company_id IS NULL;

UPDATE public.account_budgets b
SET workspace_id = public.fn_default_workspace_id(b.restaurant_id)
WHERE b.workspace_id IS NULL
  AND b.restaurant_id IS NOT NULL;

-- Safer uniqueness for multi-entity scope
CREATE UNIQUE INDEX IF NOT EXISTS ux_account_budgets_company_scope
ON public.account_budgets(company_id, workspace_id, account_id, fiscal_year, fiscal_month)
WHERE company_id IS NOT NULL;

-- Keep tenant columns auto-filled on writes
CREATE OR REPLACE FUNCTION public.tg_set_budget_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.restaurant_id IS NOT NULL THEN
    NEW.company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
  END IF;

  IF NEW.workspace_id IS NULL AND NEW.restaurant_id IS NOT NULL THEN
    NEW.workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_budgets_scope ON public.account_budgets;
CREATE TRIGGER trg_account_budgets_scope
BEFORE INSERT OR UPDATE OF restaurant_id, company_id, workspace_id
ON public.account_budgets
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_budget_scope();

-- ============================================================
-- 2) Company/workspace monthly actuals
-- ============================================================
DROP VIEW IF EXISTS public.v_monthly_account_actuals_scoped;
CREATE VIEW public.v_monthly_account_actuals_scoped AS
SELECT
  je.company_id,
  je.workspace_id,
  je.restaurant_id,
  jel.account_id,
  EXTRACT(YEAR FROM je.entry_date)::int AS fiscal_year,
  EXTRACT(MONTH FROM je.entry_date)::int AS fiscal_month,
  SUM(COALESCE(jel.debit, 0)) AS actual_debit,
  SUM(COALESCE(jel.credit, 0)) AS actual_credit,
  SUM(COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0)) AS net_actual
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.entry_id
WHERE je.is_posted = true
GROUP BY
  je.company_id,
  je.workspace_id,
  je.restaurant_id,
  jel.account_id,
  EXTRACT(YEAR FROM je.entry_date)::int,
  EXTRACT(MONTH FROM je.entry_date)::int;

GRANT SELECT ON public.v_monthly_account_actuals_scoped TO authenticated;

-- ============================================================
-- 3) Company/workspace Budget vs Actual
-- ============================================================
DROP VIEW IF EXISTS public.v_budget_vs_actual_scoped;
CREATE VIEW public.v_budget_vs_actual_scoped AS
SELECT
  b.company_id,
  b.workspace_id,
  b.restaurant_id,
  b.account_id,
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type,
  b.fiscal_year,
  b.fiscal_month,
  b.budget_amount,
  COALESCE(
    CASE
      WHEN coa.account_type = 'revenue' THEN a.actual_credit - a.actual_debit
      ELSE a.actual_debit - a.actual_credit
    END,
    0
  ) AS actual_amount,
  COALESCE(
    CASE
      WHEN coa.account_type = 'revenue' THEN a.actual_credit - a.actual_debit
      ELSE a.actual_debit - a.actual_credit
    END,
    0
  ) - b.budget_amount AS variance_amount,
  CASE
    WHEN b.budget_amount = 0 THEN NULL
    ELSE ROUND(
      (
        COALESCE(
          CASE
            WHEN coa.account_type = 'revenue' THEN a.actual_credit - a.actual_debit
            ELSE a.actual_debit - a.actual_credit
          END,
          0
        ) - b.budget_amount
      ) / NULLIF(b.budget_amount, 0) * 100
    , 2)
  END AS variance_percent
FROM public.account_budgets b
JOIN public.chart_of_accounts coa ON coa.id = b.account_id
LEFT JOIN public.v_monthly_account_actuals_scoped a
  ON a.account_id = b.account_id
 AND a.fiscal_year = b.fiscal_year
 AND a.fiscal_month = b.fiscal_month
 AND a.company_id = b.company_id
 AND (
      a.workspace_id = b.workspace_id
      OR b.workspace_id IS NULL
    );

GRANT SELECT ON public.v_budget_vs_actual_scoped TO authenticated;

-- ============================================================
-- 4) CFO scoped variance function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cfo_budget_variance_scoped(
  p_company_id uuid,
  p_workspace_id uuid,
  p_year int,
  p_month int
)
RETURNS TABLE (
  section text,
  budget_amount numeric,
  actual_amount numeric,
  variance_amount numeric,
  variance_percent numeric
)
LANGUAGE sql
STABLE
AS $$
WITH base AS (
  SELECT
    account_type,
    SUM(budget_amount) AS budget_amount,
    SUM(actual_amount) AS actual_amount
  FROM public.v_budget_vs_actual_scoped
  WHERE company_id = p_company_id
    AND fiscal_year = p_year
    AND fiscal_month = p_month
    AND (
      workspace_id = p_workspace_id
      OR p_workspace_id IS NULL
    )
  GROUP BY account_type
),
rev AS (
  SELECT
    COALESCE(SUM(budget_amount), 0) AS budget_rev,
    COALESCE(SUM(actual_amount), 0) AS actual_rev
  FROM base
  WHERE account_type = 'revenue'
),
exp AS (
  SELECT
    COALESCE(SUM(budget_amount), 0) AS budget_exp,
    COALESCE(SUM(actual_amount), 0) AS actual_exp
  FROM base
  WHERE account_type IN ('expense', 'cogs')
),
profit AS (
  SELECT
    (rev.budget_rev - exp.budget_exp) AS budget_profit,
    (rev.actual_rev - exp.actual_exp) AS actual_profit
  FROM rev, exp
)
SELECT
  'Revenue'::text AS section,
  rev.budget_rev AS budget_amount,
  rev.actual_rev AS actual_amount,
  (rev.actual_rev - rev.budget_rev) AS variance_amount,
  CASE
    WHEN rev.budget_rev = 0 THEN NULL
    ELSE ROUND(((rev.actual_rev - rev.budget_rev) / NULLIF(rev.budget_rev, 0)) * 100, 2)
  END AS variance_percent
FROM rev
UNION ALL
SELECT
  'Expenses'::text AS section,
  exp.budget_exp AS budget_amount,
  exp.actual_exp AS actual_amount,
  (exp.actual_exp - exp.budget_exp) AS variance_amount,
  CASE
    WHEN exp.budget_exp = 0 THEN NULL
    ELSE ROUND(((exp.actual_exp - exp.budget_exp) / NULLIF(exp.budget_exp, 0)) * 100, 2)
  END AS variance_percent
FROM exp
UNION ALL
SELECT
  'Net Profit'::text AS section,
  profit.budget_profit AS budget_amount,
  profit.actual_profit AS actual_amount,
  (profit.actual_profit - profit.budget_profit) AS variance_amount,
  CASE
    WHEN profit.budget_profit = 0 THEN NULL
    ELSE ROUND(((profit.actual_profit - profit.budget_profit) / NULLIF(profit.budget_profit, 0)) * 100, 2)
  END AS variance_percent
FROM profit;
$$;

-- ============================================================
-- 5) Costing KPI view (COGS ratio vs budget)
-- ============================================================
DROP VIEW IF EXISTS public.v_cogs_ratio_vs_budget_scoped;
CREATE VIEW public.v_cogs_ratio_vs_budget_scoped AS
WITH monthly AS (
  SELECT
    company_id,
    workspace_id,
    fiscal_year,
    fiscal_month,
    SUM(CASE WHEN account_type = 'revenue' THEN actual_amount ELSE 0 END) AS actual_revenue,
    SUM(CASE WHEN account_type = 'cogs' THEN actual_amount ELSE 0 END) AS actual_cogs,
    SUM(CASE WHEN account_type = 'revenue' THEN budget_amount ELSE 0 END) AS budget_revenue,
    SUM(CASE WHEN account_type = 'cogs' THEN budget_amount ELSE 0 END) AS budget_cogs
  FROM public.v_budget_vs_actual_scoped
  GROUP BY company_id, workspace_id, fiscal_year, fiscal_month
)
SELECT
  m.company_id,
  m.workspace_id,
  m.fiscal_year,
  m.fiscal_month,
  m.actual_revenue,
  m.actual_cogs,
  m.budget_revenue,
  m.budget_cogs,
  CASE WHEN m.actual_revenue = 0 THEN NULL ELSE ROUND((m.actual_cogs / NULLIF(m.actual_revenue, 0)) * 100, 2) END AS actual_cogs_ratio_percent,
  CASE WHEN m.budget_revenue = 0 THEN NULL ELSE ROUND((m.budget_cogs / NULLIF(m.budget_revenue, 0)) * 100, 2) END AS budget_cogs_ratio_percent,
  CASE
    WHEN m.actual_revenue = 0 OR m.budget_revenue = 0 THEN NULL
    ELSE ROUND(
      ((m.actual_cogs / NULLIF(m.actual_revenue, 0)) - (m.budget_cogs / NULLIF(m.budget_revenue, 0))) * 100
    , 2)
  END AS cogs_ratio_variance_pp
FROM monthly m;

GRANT SELECT ON public.v_cogs_ratio_vs_budget_scoped TO authenticated;

COMMIT;
