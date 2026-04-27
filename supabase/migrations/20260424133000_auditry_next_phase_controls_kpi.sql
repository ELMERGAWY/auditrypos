-- ============================================================
-- AUDITRY NEXT PHASE
-- Period locking + audit timeline + unified KPI view
-- Conservative / idempotent migration
-- ============================================================

BEGIN;

-- ============================================================
-- 1) PERIOD LOCKING (independent from legacy fiscal schemas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.accounting_period_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  lock_name text NOT NULL DEFAULT 'manual_lock',
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_locked boolean NOT NULL DEFAULT true,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_accounting_period_locks_restaurant_dates
ON public.accounting_period_locks(restaurant_id, period_start, period_end, is_locked);

ALTER TABLE public.accounting_period_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apl_tenant_policy ON public.accounting_period_locks;
CREATE POLICY apl_tenant_policy ON public.accounting_period_locks
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.is_posting_allowed(
  p_restaurant_id uuid,
  p_entry_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.accounting_period_locks l
    WHERE l.restaurant_id = p_restaurant_id
      AND l.is_locked = true
      AND p_entry_date BETWEEN l.period_start AND l.period_end
  )
$$;

CREATE OR REPLACE FUNCTION public.trg_block_posting_on_locked_period()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_date date;
BEGIN
  -- Support both INSERT and UPDATE safely.
  v_entry_date := COALESCE(NEW.entry_date, CURRENT_DATE);

  IF public.is_posting_allowed(NEW.restaurant_id, v_entry_date) = false THEN
    RAISE EXCEPTION 'Posting blocked: accounting period is locked for restaurant % on date %', NEW.restaurant_id, v_entry_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_posting_on_locked_period ON public.journal_entries;
CREATE TRIGGER trg_block_posting_on_locked_period
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_block_posting_on_locked_period();

-- ============================================================
-- 2) AUDIT TIMELINE VIEW (single stream for operations + GL)
-- ============================================================

DROP VIEW IF EXISTS public.v_audit_timeline;
CREATE VIEW public.v_audit_timeline AS
SELECT
  o.restaurant_id,
  'order'::text AS entity_type,
  o.id AS entity_id,
  COALESCE(o.order_number, o.id::text) AS entity_ref,
  o.status::text AS entity_status,
  o.created_at AS event_at,
  'order_created_or_updated'::text AS event_name,
  o.total::numeric AS amount,
  o.journal_entry_id,
  je.entry_number,
  je.is_posted,
  je.total_debit,
  je.total_credit
FROM public.orders o
LEFT JOIN public.journal_entries je ON je.id = o.journal_entry_id

UNION ALL

SELECT
  e.restaurant_id,
  'expense'::text AS entity_type,
  e.id AS entity_id,
  COALESCE(e.category, e.id::text) AS entity_ref,
  'booked'::text AS entity_status,
  COALESCE(e.created_at, now()) AS event_at,
  'expense_created'::text AS event_name,
  e.amount::numeric AS amount,
  e.journal_entry_id,
  je.entry_number,
  je.is_posted,
  je.total_debit,
  je.total_credit
FROM public.expenses e
LEFT JOIN public.journal_entries je ON je.id = e.journal_entry_id

UNION ALL

SELECT
  je.restaurant_id,
  'journal_entry'::text AS entity_type,
  je.id AS entity_id,
  je.entry_number::text AS entity_ref,
  CASE WHEN je.is_posted THEN 'posted' ELSE 'draft' END::text AS entity_status,
  je.created_at AS event_at,
  COALESCE(je.source_event, 'journal_created')::text AS event_name,
  (je.total_debit)::numeric AS amount,
  je.id AS journal_entry_id,
  je.entry_number,
  je.is_posted,
  je.total_debit,
  je.total_credit
FROM public.journal_entries je;

GRANT SELECT ON public.v_audit_timeline TO authenticated;

-- ============================================================
-- 3) UNIFIED CFO KPI VIEW
-- ============================================================

DROP VIEW IF EXISTS public.v_cfo_kpi_snapshot;
CREATE VIEW public.v_cfo_kpi_snapshot AS
WITH posted_sales AS (
  SELECT
    je.restaurant_id,
    date_trunc('month', je.entry_date)::date AS period_month,
    SUM(CASE WHEN coa.account_type = 'revenue' THEN (jel.credit - jel.debit) ELSE 0 END) AS revenue
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.is_posted = true
  GROUP BY je.restaurant_id, date_trunc('month', je.entry_date)::date
),
posted_expenses AS (
  SELECT
    je.restaurant_id,
    date_trunc('month', je.entry_date)::date AS period_month,
    SUM(CASE WHEN coa.account_type IN ('expense', 'cogs') THEN (jel.debit - jel.credit) ELSE 0 END) AS expenses
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.is_posted = true
  GROUP BY je.restaurant_id, date_trunc('month', je.entry_date)::date
),
cashflow AS (
  SELECT
    je.restaurant_id,
    date_trunc('month', je.entry_date)::date AS period_month,
    SUM(CASE WHEN coa.system_key = 'cash_on_hand' THEN jel.debit ELSE 0 END) AS cash_in,
    SUM(CASE WHEN coa.system_key = 'cash_on_hand' THEN jel.credit ELSE 0 END) AS cash_out
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.is_posted = true
  GROUP BY je.restaurant_id, date_trunc('month', je.entry_date)::date
),
ar_open AS (
  SELECT
    restaurant_id,
    SUM(balance_amount) AS open_ar
  FROM public.ar_open_items
  WHERE balance_amount > 0
    AND status IN ('open', 'partial')
  GROUP BY restaurant_id
),
ap_open AS (
  SELECT
    restaurant_id,
    SUM(balance_amount) AS open_ap
  FROM public.ap_open_items
  WHERE balance_amount > 0
    AND status IN ('open', 'partial')
  GROUP BY restaurant_id
),
periods AS (
  SELECT restaurant_id, period_month FROM posted_sales
  UNION
  SELECT restaurant_id, period_month FROM posted_expenses
  UNION
  SELECT restaurant_id, period_month FROM cashflow
)
SELECT
  p.restaurant_id,
  p.period_month,
  COALESCE(s.revenue, 0) AS revenue,
  COALESCE(e.expenses, 0) AS expenses,
  COALESCE(s.revenue, 0) - COALESCE(e.expenses, 0) AS net_profit,
  COALESCE(c.cash_in, 0) AS cash_in,
  COALESCE(c.cash_out, 0) AS cash_out,
  COALESCE(c.cash_in, 0) - COALESCE(c.cash_out, 0) AS net_cash,
  COALESCE(ar.open_ar, 0) AS open_ar,
  COALESCE(ap.open_ap, 0) AS open_ap
FROM periods p
LEFT JOIN posted_sales s ON s.restaurant_id = p.restaurant_id AND s.period_month = p.period_month
LEFT JOIN posted_expenses e ON e.restaurant_id = p.restaurant_id AND e.period_month = p.period_month
LEFT JOIN cashflow c ON c.restaurant_id = p.restaurant_id AND c.period_month = p.period_month
LEFT JOIN ar_open ar ON ar.restaurant_id = p.restaurant_id
LEFT JOIN ap_open ap ON ap.restaurant_id = p.restaurant_id;

GRANT SELECT ON public.v_cfo_kpi_snapshot TO authenticated;

COMMIT;

