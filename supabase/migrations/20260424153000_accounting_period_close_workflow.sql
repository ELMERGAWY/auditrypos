-- ============================================================
-- ACCOUNTING PERIOD CLOSE WORKFLOW
-- - Close accounting periods safely
-- - Lock posting window
-- - Optional closing journal for period net result
-- ============================================================

BEGIN;

-- 1) Period close registry
CREATE TABLE IF NOT EXISTS public.accounting_period_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'reopened')),
  revenue_total numeric(15,2) NOT NULL DEFAULT 0,
  expense_total numeric(15,2) NOT NULL DEFAULT 0,
  net_result numeric(15,2) NOT NULL DEFAULT 0,
  closing_journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reopened_at timestamptz,
  reopened_by uuid REFERENCES auth.users(id),
  UNIQUE (restaurant_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_period_closes_restaurant_period
ON public.accounting_period_closes(restaurant_id, period_start, period_end, status);

ALTER TABLE public.accounting_period_closes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apc_tenant_policy ON public.accounting_period_closes;
CREATE POLICY apc_tenant_policy ON public.accounting_period_closes
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 2) Utility: fetch account by system key with strict validation
CREATE OR REPLACE FUNCTION public.require_account_by_system_key(
  p_restaurant_id uuid,
  p_system_key text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT id INTO v_account_id
  FROM public.chart_of_accounts
  WHERE restaurant_id = p_restaurant_id
    AND system_key = p_system_key
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Missing required account system_key=% for restaurant=%', p_system_key, p_restaurant_id;
  END IF;

  RETURN v_account_id;
END;
$$;

-- 3) Close period function
CREATE OR REPLACE FUNCTION public.close_accounting_period(
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
  net_result numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_close_id uuid;
  v_revenue numeric(15,2);
  v_expense numeric(15,2);
  v_net numeric(15,2);
  v_entry_id uuid;
  v_revenue_acc uuid;
  v_expense_acc uuid;
  v_equity_acc uuid;
BEGIN
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end cannot be earlier than period_start';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.accounting_period_closes c
    WHERE c.restaurant_id = p_restaurant_id
      AND c.period_start = p_period_start
      AND c.period_end = p_period_end
      AND c.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Period already closed for restaurant=% [% - %]', p_restaurant_id, p_period_start, p_period_end;
  END IF;

  -- Summarize P&L from posted entries
  SELECT
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN (jel.credit - jel.debit) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_type IN ('expense', 'cogs') THEN (jel.debit - jel.credit) ELSE 0 END), 0)
  INTO v_revenue, v_expense
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.restaurant_id = p_restaurant_id
    AND je.is_posted = true
    AND je.entry_date BETWEEN p_period_start AND p_period_end;

  v_net := v_revenue - v_expense;

  -- Optional: create a closing journal to move period result to equity
  IF p_create_closing_entry THEN
    v_revenue_acc := public.require_account_by_system_key(p_restaurant_id, 'sales_revenue');
    v_expense_acc := public.require_account_by_system_key(p_restaurant_id, 'operating_expenses');
    v_equity_acc := public.require_account_by_system_key(p_restaurant_id, 'owner_equity');

    INSERT INTO public.journal_entries (
      restaurant_id, entry_number, entry_date, description, source, is_posted,
      source_module, source_event, source_id
    )
    VALUES (
      p_restaurant_id,
      'CL-' || to_char(p_period_end, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8),
      p_period_end,
      'Period closing entry [' || p_period_start || ' - ' || p_period_end || ']',
      'system',
      true,
      'closing',
      'period_close',
      gen_random_uuid()
    )
    RETURNING id INTO v_entry_id;

    -- Close revenue to equity
    IF v_revenue > 0 THEN
      INSERT INTO public.journal_entry_lines(entry_id, account_id, debit, credit, description, line_order)
      VALUES
      (v_entry_id, v_revenue_acc, v_revenue, 0, 'Close revenue', 1),
      (v_entry_id, v_equity_acc, 0, v_revenue, 'Transfer revenue to equity', 2);
    END IF;

    -- Close expense to equity
    IF v_expense > 0 THEN
      INSERT INTO public.journal_entry_lines(entry_id, account_id, debit, credit, description, line_order)
      VALUES
      (v_entry_id, v_equity_acc, v_expense, 0, 'Transfer expenses to equity', 3),
      (v_entry_id, v_expense_acc, 0, v_expense, 'Close expenses', 4);
    END IF;
  END IF;

  -- Register close
  INSERT INTO public.accounting_period_closes (
    restaurant_id,
    period_start,
    period_end,
    status,
    revenue_total,
    expense_total,
    net_result,
    closing_journal_entry_id,
    notes,
    created_by
  )
  VALUES (
    p_restaurant_id,
    p_period_start,
    p_period_end,
    'closed',
    v_revenue,
    v_expense,
    v_net,
    v_entry_id,
    p_notes,
    auth.uid()
  )
  ON CONFLICT (restaurant_id, period_start, period_end)
  DO UPDATE SET
    status = 'closed',
    revenue_total = EXCLUDED.revenue_total,
    expense_total = EXCLUDED.expense_total,
    net_result = EXCLUDED.net_result,
    closing_journal_entry_id = EXCLUDED.closing_journal_entry_id,
    notes = EXCLUDED.notes,
    created_by = EXCLUDED.created_by,
    created_at = now(),
    reopened_at = NULL,
    reopened_by = NULL
  RETURNING id INTO v_close_id;

  -- Lock period to block future posting
  INSERT INTO public.accounting_period_locks (
    restaurant_id, lock_name, period_start, period_end, is_locked, reason, created_by
  )
  VALUES (
    p_restaurant_id,
    'period_close_lock',
    p_period_start,
    p_period_end,
    true,
    COALESCE(p_notes, 'Closed period lock'),
    auth.uid()
  );

  RETURN QUERY
  SELECT v_close_id, true, v_entry_id, v_revenue, v_expense, v_net;
END;
$$;

-- 4) Reopen period function
CREATE OR REPLACE FUNCTION public.reopen_accounting_period(
  p_restaurant_id uuid,
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  close_id uuid,
  reopened boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_close_id uuid;
BEGIN
  UPDATE public.accounting_period_closes
  SET status = 'reopened',
      notes = COALESCE(p_notes, notes),
      reopened_at = now(),
      reopened_by = auth.uid()
  WHERE restaurant_id = p_restaurant_id
    AND period_start = p_period_start
    AND period_end = p_period_end
  RETURNING id INTO v_close_id;

  IF v_close_id IS NULL THEN
    RAISE EXCEPTION 'No closed period found for restaurant=% [% - %]', p_restaurant_id, p_period_start, p_period_end;
  END IF;

  UPDATE public.accounting_period_locks
  SET is_locked = false,
      reason = COALESCE(p_notes, reason)
  WHERE restaurant_id = p_restaurant_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND is_locked = true;

  RETURN QUERY SELECT v_close_id, true;
END;
$$;

-- 5) Executive views for period control
DROP VIEW IF EXISTS public.v_accounting_period_status;
CREATE VIEW public.v_accounting_period_status AS
SELECT
  c.restaurant_id,
  c.period_start,
  c.period_end,
  c.status,
  c.revenue_total,
  c.expense_total,
  c.net_result,
  c.closing_journal_entry_id,
  l.is_locked,
  c.created_at AS closed_at,
  c.reopened_at
FROM public.accounting_period_closes c
LEFT JOIN LATERAL (
  SELECT is_locked
  FROM public.accounting_period_locks l
  WHERE l.restaurant_id = c.restaurant_id
    AND l.period_start = c.period_start
    AND l.period_end = c.period_end
  ORDER BY l.created_at DESC
  LIMIT 1
) l ON true;

GRANT SELECT ON public.v_accounting_period_status TO authenticated;

COMMIT;

