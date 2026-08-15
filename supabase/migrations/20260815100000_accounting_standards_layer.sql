-- AuditryPOS optional accounting standards layer
-- Additive only. Does not rewrite journals, orders, inventory, or customer data.
-- Standards are policy/reporting metadata; statutory compliance still requires local review.

CREATE TABLE IF NOT EXISTS public.accounting_standard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reporting_standard TEXT NOT NULL DEFAULT 'IFRS'
    CHECK (reporting_standard IN ('EAS', 'IFRS', 'US_GAAP')),
  inventory_cost_method TEXT NOT NULL DEFAULT 'AVERAGE'
    CHECK (inventory_cost_method IN ('FIFO', 'AVERAGE', 'SPECIFIC', 'LIFO')),
  inventory_write_down_policy TEXT NOT NULL DEFAULT 'LOWER_OF_COST_AND_NRV',
  fiscal_year_start_month SMALLINT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_standard_settings_company
  ON public.accounting_standard_settings(company_id);

ALTER TABLE public.accounting_standard_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'accounting_standard_settings'
      AND policyname = 'company managers manage accounting standard settings'
  ) THEN
    CREATE POLICY "company managers manage accounting standard settings"
      ON public.accounting_standard_settings
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.company_id = accounting_standard_settings.company_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner', 'admin', 'manager')
        )
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.company_id = accounting_standard_settings.company_id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('owner', 'admin', 'manager')
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_accounting_standard_settings(p_company_id UUID)
RETURNS TABLE (
  company_id UUID,
  reporting_standard TEXT,
  inventory_cost_method TEXT,
  inventory_write_down_policy TEXT,
  fiscal_year_start_month SMALLINT,
  effective_from DATE,
  is_active BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.company_users cu
       WHERE cu.company_id = p_company_id AND cu.user_id = auth.uid() AND cu.is_active = true
     ) THEN
    RAISE EXCEPTION 'Company access required';
  END IF;

  RETURN QUERY
  SELECT s.company_id, s.reporting_standard, s.inventory_cost_method,
         s.inventory_write_down_policy, s.fiscal_year_start_month,
         s.effective_from, s.is_active
  FROM public.accounting_standard_settings s
  WHERE s.company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT p_company_id, 'IFRS'::TEXT, 'AVERAGE'::TEXT,
      'LOWER_OF_COST_AND_NRV'::TEXT, 1::SMALLINT, CURRENT_DATE, true;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_accounting_standard_settings(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_accounting_standard_settings(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_accounting_standard_settings(
  p_company_id UUID,
  p_reporting_standard TEXT,
  p_inventory_cost_method TEXT DEFAULT 'AVERAGE',
  p_inventory_write_down_policy TEXT DEFAULT 'LOWER_OF_COST_AND_NRV',
  p_fiscal_year_start_month SMALLINT DEFAULT 1,
  p_effective_from DATE DEFAULT CURRENT_DATE
) RETURNS public.accounting_standard_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result public.accounting_standard_settings;
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.company_users cu
       WHERE cu.company_id = p_company_id AND cu.user_id = auth.uid()
         AND cu.is_active = true AND cu.role IN ('owner', 'admin', 'manager')
     ) THEN
    RAISE EXCEPTION 'Company manager access required';
  END IF;

  IF upper(replace(p_reporting_standard, '-', '_')) NOT IN ('EAS', 'IFRS', 'US_GAAP') THEN
    RAISE EXCEPTION 'Unsupported accounting standard';
  END IF;
  IF upper(p_inventory_cost_method) = 'LIFO' AND upper(replace(p_reporting_standard, '-', '_')) <> 'US_GAAP' THEN
    RAISE EXCEPTION 'LIFO is only selectable for US_GAAP';
  END IF;
  IF p_fiscal_year_start_month NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Fiscal year start month must be between 1 and 12';
  END IF;

  INSERT INTO public.accounting_standard_settings
    (company_id, reporting_standard, inventory_cost_method, inventory_write_down_policy,
     fiscal_year_start_month, effective_from, is_active, created_by, updated_at)
  VALUES
    (p_company_id, upper(replace(p_reporting_standard, '-', '_')),
     upper(p_inventory_cost_method), left(COALESCE(p_inventory_write_down_policy, 'LOWER_OF_COST_AND_NRV'), 80),
     p_fiscal_year_start_month, COALESCE(p_effective_from, CURRENT_DATE), true,
     NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), now())
  ON CONFLICT (company_id) DO UPDATE SET
    reporting_standard = EXCLUDED.reporting_standard,
    inventory_cost_method = EXCLUDED.inventory_cost_method,
    inventory_write_down_policy = EXCLUDED.inventory_write_down_policy,
    fiscal_year_start_month = EXCLUDED.fiscal_year_start_month,
    effective_from = EXCLUDED.effective_from,
    is_active = true,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.update_accounting_standard_settings(UUID,TEXT,TEXT,TEXT,SMALLINT,DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_accounting_standard_settings(UUID,TEXT,TEXT,TEXT,SMALLINT,DATE) TO authenticated, service_role;

-- Safe reporting view: no direct grants to end users; the RPC below applies company and period scope.
CREATE OR REPLACE VIEW public.v_financial_report_by_standard AS
SELECT
  je.company_id,
  je.workspace_id,
  je.entry_date,
  je.is_posted,
  je.id AS journal_entry_id,
  je.entry_number,
  je.reference_type,
  jel.id AS journal_entry_line_id,
  jel.account_id,
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type,
  COALESCE(jel.debit, 0)::NUMERIC AS debit,
  COALESCE(jel.credit, 0)::NUMERIC AS credit,
  CASE
    WHEN coa.account_type IN ('asset', 'expense') THEN COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0)
    ELSE COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0)
  END::NUMERIC AS signed_balance,
  COALESCE(coa.is_cash_account, false) AS is_cash_account,
  COALESCE(coa.is_bank_account, false) AS is_bank_account
FROM public.journal_entries je
JOIN public.journal_entry_lines jel ON jel.entry_id = je.id
JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.is_posted = true;

REVOKE ALL ON public.v_financial_report_by_standard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_financial_report_by_standard TO service_role;

CREATE OR REPLACE FUNCTION public.get_financial_report_by_standard(
  p_company_id UUID,
  p_standard TEXT DEFAULT NULL,
  p_period JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_standard TEXT;
  v_period_start DATE;
  v_period_end DATE;
  v_settings RECORD;
  v_revenue NUMERIC := 0;
  v_cost_of_sales NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_net_income NUMERIC := 0;
  v_assets NUMERIC := 0;
  v_liabilities NUMERIC := 0;
  v_equity NUMERIC := 0;
  v_cash_inflows NUMERIC := 0;
  v_cash_outflows NUMERIC := 0;
  v_total_debits NUMERIC := 0;
  v_total_credits NUMERIC := 0;
  v_account_balances JSONB := '[]'::JSONB;
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.company_users cu
       WHERE cu.company_id = p_company_id AND cu.user_id = auth.uid() AND cu.is_active = true
     ) THEN
    RAISE EXCEPTION 'Company access required';
  END IF;

  SELECT * INTO v_settings FROM public.get_accounting_standard_settings(p_company_id) LIMIT 1;
  v_standard := upper(replace(COALESCE(NULLIF(p_standard, ''), v_settings.reporting_standard, 'IFRS'), '-', '_'));
  IF v_standard NOT IN ('EAS', 'IFRS', 'US_GAAP') THEN
    RAISE EXCEPTION 'Unsupported accounting standard';
  END IF;

  v_period_start := COALESCE(NULLIF(p_period->>'start_date', '')::DATE, date_trunc('year', CURRENT_DATE)::DATE);
  v_period_end := COALESCE(NULLIF(p_period->>'end_date', '')::DATE, CURRENT_DATE);
  IF v_period_end < v_period_start THEN
    RAISE EXCEPTION 'Period end cannot precede period start';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN credit - debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN account_type = 'expense' THEN debit - credit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN account_type = 'asset' THEN debit - credit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN account_type = 'liability' THEN credit - debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN account_type = 'equity' THEN credit - debit ELSE 0 END), 0),
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0),
    COALESCE(SUM(CASE WHEN is_cash_account OR is_bank_account THEN debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_cash_account OR is_bank_account THEN credit ELSE 0 END), 0)
  INTO v_revenue, v_expenses, v_assets, v_liabilities, v_equity,
       v_total_debits, v_total_credits, v_cash_inflows, v_cash_outflows
  FROM public.v_financial_report_by_standard
  WHERE company_id = p_company_id
    AND entry_date BETWEEN v_period_start AND v_period_end;

  -- Cost of sales is presented separately when the chart contains a conventional COGS account.
  SELECT COALESCE(SUM(debit - credit), 0) INTO v_cost_of_sales
  FROM public.v_financial_report_by_standard
  WHERE company_id = p_company_id
    AND entry_date BETWEEN v_period_start AND v_period_end
    AND account_type = 'expense'
    AND (
      lower(account_name) LIKE '%cost of sales%'
      OR lower(account_name) LIKE '%cogs%'
      OR lower(account_name) LIKE '%تكلفة%'
      OR lower(account_name) LIKE '%مبيعات%'
    );

  v_net_income := v_revenue - v_expenses;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'account_code', q.account_code,
    'account_name', q.account_name,
    'account_type', q.account_type,
    'debit', q.debit,
    'credit', q.credit,
    'balance', q.balance
  ) ORDER BY q.account_code), '[]'::JSONB)
  INTO v_account_balances
  FROM (
    SELECT account_code, account_name, account_type,
      SUM(debit) AS debit,
      SUM(credit) AS credit,
      SUM(signed_balance) AS balance
    FROM public.v_financial_report_by_standard
    WHERE company_id = p_company_id
      AND entry_date BETWEEN v_period_start AND v_period_end
    GROUP BY account_code, account_name, account_type
    ORDER BY account_code
    LIMIT 500
  ) q;

  RETURN jsonb_build_object(
    'company_id', p_company_id,
    'standard', v_standard,
    'period', jsonb_build_object('start_date', v_period_start, 'end_date', v_period_end),
    'policy', jsonb_build_object(
      'inventory_cost_method', COALESCE(v_settings.inventory_cost_method, 'AVERAGE'),
      'inventory_write_down_policy', COALESCE(v_settings.inventory_write_down_policy, 'LOWER_OF_COST_AND_NRV'),
      'lifo_allowed', v_standard = 'US_GAAP',
      'statutory_review_required', v_standard = 'EAS'
    ),
    'income_statement', jsonb_build_object(
      'revenue', v_revenue,
      'cost_of_sales', v_cost_of_sales,
      'operating_and_other_expenses', v_expenses,
      'net_income', v_net_income
    ),
    'balance_sheet', jsonb_build_object(
      'assets', v_assets,
      'liabilities', v_liabilities,
      'equity', v_equity,
      'balance_check', v_assets - v_liabilities - v_equity
    ),
    'cash_flow', jsonb_build_object(
      'cash_inflows', v_cash_inflows,
      'cash_outflows', v_cash_outflows,
      'net_cash_movement', v_cash_inflows - v_cash_outflows,
      'basis', 'posted cash and bank journal lines'
    ),
    'trial_balance', jsonb_build_object(
      'total_debits', v_total_debits,
      'total_credits', v_total_credits,
      'balanced', abs(v_total_debits - v_total_credits) < 0.01
    ),
    'account_balances', v_account_balances
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_financial_report_by_standard(UUID,TEXT,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_report_by_standard(UUID,TEXT,JSONB) TO authenticated, service_role;


-- Standard-specific read models. They are period-grain views; the RPC remains the
-- preferred bounded interface for application screens.
CREATE OR REPLACE VIEW public.v_income_statement_by_standard AS
SELECT
  v.company_id,
  s.reporting_standard AS standard,
  v.entry_date,
  COALESCE(SUM(CASE WHEN v.account_type = 'revenue' THEN v.credit - v.debit ELSE 0 END), 0)::NUMERIC AS revenue,
  COALESCE(SUM(CASE WHEN v.account_type = 'expense' THEN v.debit - v.credit ELSE 0 END), 0)::NUMERIC AS expenses,
  COALESCE(SUM(CASE WHEN v.account_type = 'revenue' THEN v.credit - v.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN v.account_type = 'expense' THEN v.debit - v.credit ELSE 0 END), 0)::NUMERIC AS net_income
FROM public.v_financial_report_by_standard v
JOIN public.accounting_standard_settings s ON s.company_id = v.company_id AND s.is_active = true
WHERE v.account_type IN ('revenue', 'expense')
GROUP BY v.company_id, s.reporting_standard, v.entry_date;

CREATE OR REPLACE VIEW public.v_balance_sheet_by_standard AS
SELECT
  v.company_id,
  s.reporting_standard AS standard,
  COALESCE(SUM(CASE WHEN v.account_type = 'asset' THEN v.signed_balance ELSE 0 END), 0)::NUMERIC AS assets,
  COALESCE(SUM(CASE WHEN v.account_type = 'liability' THEN v.signed_balance ELSE 0 END), 0)::NUMERIC AS liabilities,
  COALESCE(SUM(CASE WHEN v.account_type = 'equity' THEN v.signed_balance ELSE 0 END), 0)::NUMERIC AS equity,
  MAX(v.entry_date) AS as_of_date
FROM public.v_financial_report_by_standard v
JOIN public.accounting_standard_settings s ON s.company_id = v.company_id AND s.is_active = true
WHERE v.account_type IN ('asset', 'liability', 'equity')
GROUP BY v.company_id, s.reporting_standard;

CREATE OR REPLACE VIEW public.v_cash_flow_by_standard AS
SELECT
  v.company_id,
  s.reporting_standard AS standard,
  v.entry_date,
  COALESCE(SUM(CASE WHEN v.is_cash_account OR v.is_bank_account THEN v.debit ELSE 0 END), 0)::NUMERIC AS cash_inflows,
  COALESCE(SUM(CASE WHEN v.is_cash_account OR v.is_bank_account THEN v.credit ELSE 0 END), 0)::NUMERIC AS cash_outflows,
  COALESCE(SUM(CASE WHEN v.is_cash_account OR v.is_bank_account THEN v.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN v.is_cash_account OR v.is_bank_account THEN v.credit ELSE 0 END), 0)::NUMERIC AS net_cash_movement
FROM public.v_financial_report_by_standard v
JOIN public.accounting_standard_settings s ON s.company_id = v.company_id AND s.is_active = true
GROUP BY v.company_id, s.reporting_standard, v.entry_date;

REVOKE ALL ON public.v_income_statement_by_standard, public.v_balance_sheet_by_standard, public.v_cash_flow_by_standard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_income_statement_by_standard, public.v_balance_sheet_by_standard, public.v_cash_flow_by_standard TO service_role;
