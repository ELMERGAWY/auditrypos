-- Restore the report RPCs used by the existing accounting service.
-- Additive-only: no data mutation, no table rewrites, no destructive view changes.
-- The functions are restaurant-scoped and only read posted journal entries.

BEGIN;

CREATE OR REPLACE FUNCTION public._report_assert_restaurant_access(
  p_restaurant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id is required';
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND NOT (p_restaurant_id IN (SELECT public.auth_restaurant_ids())) THEN
    RAISE EXCEPTION 'Restaurant access required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_balance(
  p_restaurant_id uuid,
  p_as_of_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  account_code text,
  account_id uuid,
  account_name text,
  account_type text,
  budget_amount numeric,
  closing_balance numeric,
  credit_movement numeric,
  debit_movement numeric,
  opening_balance numeric,
  variance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._report_assert_restaurant_access(p_restaurant_id);

  RETURN QUERY
  WITH movements AS (
    SELECT
      coa.id AS account_id,
      coa.code::text AS account_code,
      coa.name::text AS account_name,
      coa.account_type::text AS account_type,
      COALESCE(coa.opening_balance, 0)::numeric AS opening_balance,
      COALESCE(SUM(CASE WHEN je.entry_date <= COALESCE(p_as_of_date::date, CURRENT_DATE)
                        THEN COALESCE(jel.debit, 0) ELSE 0 END), 0)::numeric AS debit_movement,
      COALESCE(SUM(CASE WHEN je.entry_date <= COALESCE(p_as_of_date::date, CURRENT_DATE)
                        THEN COALESCE(jel.credit, 0) ELSE 0 END), 0)::numeric AS credit_movement
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
    LEFT JOIN public.journal_entries je
      ON je.id = jel.entry_id
     AND je.restaurant_id = p_restaurant_id
     AND je.is_posted = true
     AND COALESCE(je.is_deleted, false) = false
     AND COALESCE(je.is_reversed, false) = false
    WHERE coa.restaurant_id = p_restaurant_id
    GROUP BY coa.id, coa.code, coa.name, coa.account_type, coa.opening_balance
  )
  SELECT
    m.account_code,
    m.account_id,
    m.account_name,
    m.account_type,
    0::numeric AS budget_amount,
    (
      m.opening_balance
      + CASE WHEN m.account_type IN ('asset', 'expense')
             THEN m.debit_movement - m.credit_movement
             ELSE m.credit_movement - m.debit_movement
        END
    )::numeric AS closing_balance,
    m.credit_movement,
    m.debit_movement,
    m.opening_balance,
    (
      m.opening_balance
      + CASE WHEN m.account_type IN ('asset', 'expense')
             THEN m.debit_movement - m.credit_movement
             ELSE m.credit_movement - m.debit_movement
        END
    )::numeric AS variance
  FROM movements m
  ORDER BY m.account_code, m.account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profit_and_loss(
  p_restaurant_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  amount numeric,
  category text,
  line_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._report_assert_restaurant_access(p_restaurant_id);

  IF p_start_date::date > p_end_date::date THEN
    RAISE EXCEPTION 'Period end cannot precede period start';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(
      CASE WHEN coa.account_type = 'revenue'
           THEN COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0)
           ELSE COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0)
      END
    ), 0)::numeric AS amount,
    coa.name::text AS category,
    coa.account_type::text AS line_type
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.entry_id = je.id
  JOIN public.chart_of_accounts coa
    ON coa.id = jel.account_id
   AND coa.restaurant_id = p_restaurant_id
  WHERE je.restaurant_id = p_restaurant_id
    AND je.is_posted = true
    AND COALESCE(je.is_deleted, false) = false
    AND COALESCE(je.is_reversed, false) = false
    AND je.entry_date BETWEEN p_start_date::date AND p_end_date::date
    AND coa.account_type IN ('revenue', 'expense')
  GROUP BY coa.name, coa.account_type
  ORDER BY coa.account_type, coa.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_balance_sheet(
  p_restaurant_id uuid,
  p_as_of_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  account_type text,
  amount numeric,
  section text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._report_assert_restaurant_access(p_restaurant_id);

  RETURN QUERY
  WITH balances AS (
    SELECT
      coa.account_type::text AS account_type,
      COALESCE(coa.opening_balance, 0)
      + COALESCE(SUM(
          CASE WHEN coa.account_type IN ('asset', 'expense')
               THEN COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0)
               ELSE COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0)
          END
        ), 0)::numeric AS amount
    FROM public.chart_of_accounts coa
    LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
    LEFT JOIN public.journal_entries je
      ON je.id = jel.entry_id
     AND je.restaurant_id = p_restaurant_id
     AND je.is_posted = true
     AND COALESCE(je.is_deleted, false) = false
     AND COALESCE(je.is_reversed, false) = false
     AND je.entry_date <= COALESCE(p_as_of_date::date, CURRENT_DATE)
    WHERE coa.restaurant_id = p_restaurant_id
      AND coa.account_type IN ('asset', 'liability', 'equity')
    GROUP BY coa.account_type, coa.opening_balance
  )
  SELECT
    b.account_type,
    COALESCE(SUM(b.amount), 0)::numeric AS amount,
    CASE b.account_type
      WHEN 'asset' THEN 'assets'
      WHEN 'liability' THEN 'liabilities'
      WHEN 'equity' THEN 'equity'
      ELSE b.account_type
    END::text AS section
  FROM balances b
  GROUP BY b.account_type
  ORDER BY b.account_type;
END;
$$;

REVOKE ALL ON FUNCTION public._report_assert_restaurant_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_trial_balance(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_profit_and_loss(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_balance_sheet(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profit_and_loss(uuid, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_balance_sheet(uuid, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_trial_balance(uuid, timestamptz) IS 'Restaurant-scoped posted trial balance; read-only and excludes deleted or reversed journal entries.';
COMMENT ON FUNCTION public.get_profit_and_loss(uuid, timestamptz, timestamptz) IS 'Restaurant-scoped posted income statement lines using normal debit/credit balances.';
COMMENT ON FUNCTION public.get_balance_sheet(uuid, timestamptz) IS 'Restaurant-scoped posted balance-sheet totals by account type.';

COMMIT;
