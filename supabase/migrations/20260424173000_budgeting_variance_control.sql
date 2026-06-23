-- ============================================================
-- BUDGETING & VARIANCE CONTROL
-- - Monthly account budgets
-- - Actual vs Budget analytics
-- - CFO variance function + views
-- ============================================================

BEGIN;

-- 1) Budget master table (monthly per account)
CREATE TABLE IF NOT EXISTS public.account_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  fiscal_month int NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
  budget_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, account_id, fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_account_budgets_restaurant_period
ON public.account_budgets(restaurant_id, fiscal_year, fiscal_month);

CREATE INDEX IF NOT EXISTS idx_account_budgets_account
ON public.account_budgets(account_id);

ALTER TABLE public.account_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_budgets_tenant_policy ON public.account_budgets;
CREATE POLICY account_budgets_tenant_policy ON public.account_budgets
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.trg_touch_budget_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_budget_updated_at ON public.account_budgets;
CREATE TRIGGER trg_touch_budget_updated_at
BEFORE UPDATE ON public.account_budgets
FOR EACH ROW
EXECUTE FUNCTION public.trg_touch_budget_updated_at();

-- 2) Monthly actuals (posted journals only)
DROP VIEW IF EXISTS public.v_monthly_account_actuals;
CREATE VIEW public.v_monthly_account_actuals AS
SELECT
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
  je.restaurant_id,
  jel.account_id,
  EXTRACT(YEAR FROM je.entry_date)::int,
  EXTRACT(MONTH FROM je.entry_date)::int;

GRANT SELECT ON public.v_monthly_account_actuals TO authenticated;

-- 3) Budget variance view by account/month
DROP VIEW IF EXISTS public.v_budget_variance;
CREATE VIEW public.v_budget_variance AS
SELECT
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
        (
          COALESCE(
            CASE
              WHEN coa.account_type = 'revenue' THEN a.actual_credit - a.actual_debit
              ELSE a.actual_debit - a.actual_credit
            END,
            0
          ) - b.budget_amount
        ) / NULLIF(b.budget_amount, 0)
      ) * 100
    , 2)
  END AS variance_percent
FROM public.account_budgets b
JOIN public.chart_of_accounts coa ON coa.id = b.account_id
LEFT JOIN public.v_monthly_account_actuals a
  ON a.restaurant_id = b.restaurant_id
 AND a.account_id = b.account_id
 AND a.fiscal_year = b.fiscal_year
 AND a.fiscal_month = b.fiscal_month;

GRANT SELECT ON public.v_budget_variance TO authenticated;

-- 4) CFO rollup function for variance summary by month
CREATE OR REPLACE FUNCTION public.fn_cfo_budget_variance(
  p_restaurant_id uuid,
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
  FROM public.v_budget_variance
  WHERE restaurant_id = p_restaurant_id
    AND fiscal_year = p_year
    AND fiscal_month = p_month
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

-- 5) Helper function: seed flat monthly budget for account range
CREATE OR REPLACE FUNCTION public.seed_equal_monthly_budget(
  p_restaurant_id uuid,
  p_account_id uuid,
  p_year int,
  p_annual_budget numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  m int;
  v_monthly numeric(15,2);
BEGIN
  v_monthly := ROUND(COALESCE(p_annual_budget, 0) / 12.0, 2);

  FOR m IN 1..12 LOOP
    INSERT INTO public.account_budgets(
      restaurant_id, account_id, fiscal_year, fiscal_month, budget_amount, created_by
    )
    VALUES (
      p_restaurant_id, p_account_id, p_year, m, v_monthly, auth.uid()
    )
    ON CONFLICT (restaurant_id, account_id, fiscal_year, fiscal_month)
    DO UPDATE SET
      budget_amount = EXCLUDED.budget_amount,
      updated_at = now();
  END LOOP;
END;
$$;

COMMIT;

