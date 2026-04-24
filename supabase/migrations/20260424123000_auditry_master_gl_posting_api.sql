-- ============================================================
-- AUDITRY MASTER MIGRATION
-- GL hardening + posting engine + API views + CFO + AR/AP aging
-- Conservative / idempotent / safe re-run
-- ============================================================

BEGIN;

-- 1) Core compatibility
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS account_class text,
  ADD COLUMN IF NOT EXISTS normal_side text CHECK (normal_side IN ('debit', 'credit')),
  ADD COLUMN IF NOT EXISTS system_key text,
  ADD COLUMN IF NOT EXISTS posting_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_scope text[] NOT NULL DEFAULT ARRAY['all']::text[];

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS source_module text,
  ADD COLUMN IF NOT EXISTS source_event text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS is_posted boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_coa_restaurant_system_key
ON public.chart_of_accounts(restaurant_id, system_key)
WHERE system_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_je_source_once
ON public.journal_entries(restaurant_id, source_module, source_event, source_id)
WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_je_restaurant_date ON public.journal_entries(restaurant_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_jel_entry_id ON public.journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_id ON public.journal_entry_lines(account_id);

-- 2) Business profiles
CREATE TABLE IF NOT EXISTS public.business_profiles (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  features jsonb,
  default_features jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS features jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_profiles' AND column_name = 'default_features'
  ) THEN
    UPDATE public.business_profiles
    SET features = COALESCE(features, default_features, '{}'::jsonb);
  END IF;
END $$;

UPDATE public.business_profiles
SET features = '{}'::jsonb
WHERE features IS NULL;

ALTER TABLE public.business_profiles
  ALTER COLUMN features SET DEFAULT '{}'::jsonb,
  ALTER COLUMN features SET NOT NULL;

INSERT INTO public.business_profiles (code, name_ar, name_en, description, features)
VALUES
('restaurant', 'مطاعم', 'Restaurant', 'Dine-in and kitchen workflow', '{"tables":true,"kitchen":true,"barcode":false,"inventory":true}'::jsonb),
('retail', 'تجزئة', 'Retail', 'Barcode and inventory workflow', '{"tables":false,"kitchen":false,"barcode":true,"inventory":true}'::jsonb),
('services', 'خدمات', 'Services', 'Service-first workflow', '{"tables":false,"kitchen":false,"barcode":false,"inventory":false,"services":true}'::jsonb),
('pharmacy', 'صيدلية', 'Pharmacy', 'Batch and expiry workflow', '{"tables":false,"kitchen":false,"barcode":true,"inventory":true,"batch_tracking":true}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    description = EXCLUDED.description,
    features = EXCLUDED.features;

CREATE TABLE IF NOT EXISTS public.restaurant_business_profiles (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  profile_code text NOT NULL REFERENCES public.business_profiles(code),
  features_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  accounting_method text NOT NULL DEFAULT 'accrual' CHECK (accounting_method IN ('cash', 'accrual')),
  costing_method text NOT NULL DEFAULT 'fifo' CHECK (costing_method IN ('fifo', 'weighted_average', 'standard')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.restaurant_business_profiles (restaurant_id, profile_code)
SELECT r.id, COALESCE(r.business_category::text, 'restaurant')
FROM public.restaurants r
ON CONFLICT (restaurant_id) DO NOTHING;

ALTER TABLE public.restaurant_business_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rbp_isolation ON public.restaurant_business_profiles;
CREATE POLICY rbp_isolation ON public.restaurant_business_profiles
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- 3) COA seed
CREATE OR REPLACE FUNCTION public.seed_global_coa(p_restaurant_id uuid, p_profile text DEFAULT 'restaurant')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.chart_of_accounts
  (restaurant_id, code, name, account_type, subtype, account_class, normal_side, system_key, posting_allowed, business_scope)
  VALUES
  (p_restaurant_id, '1000', 'Cash On Hand', 'asset', 'cash', 'asset', 'debit', 'cash_on_hand', true, ARRAY['all']),
  (p_restaurant_id, '1100', 'Bank Accounts', 'asset', 'bank', 'asset', 'debit', 'bank_main', true, ARRAY['all']),
  (p_restaurant_id, '1200', 'Accounts Receivable', 'asset', 'receivable', 'asset', 'debit', 'accounts_receivable', true, ARRAY['all']),
  (p_restaurant_id, '1300', 'Inventory', 'asset', 'inventory', 'asset', 'debit', 'inventory', true, ARRAY['retail', 'restaurant', 'pharmacy']),
  (p_restaurant_id, '2000', 'Accounts Payable', 'liability', 'payable', 'liability', 'credit', 'accounts_payable', true, ARRAY['all']),
  (p_restaurant_id, '2100', 'Tax Payable', 'liability', 'current_liability', 'liability', 'credit', 'tax_payable', true, ARRAY['all']),
  (p_restaurant_id, '3000', 'Owner Equity', 'equity', 'equity', 'equity', 'credit', 'owner_equity', true, ARRAY['all']),
  (p_restaurant_id, '4000', 'Sales Revenue', 'revenue', 'sales_revenue', 'revenue', 'credit', 'sales_revenue', true, ARRAY['all']),
  (p_restaurant_id, '4100', 'Service Revenue', 'revenue', 'other_revenue', 'revenue', 'credit', 'service_revenue', true, ARRAY['services']),
  (p_restaurant_id, '5000', 'COGS', 'expense', 'cogs', 'expense', 'debit', 'cogs', true, ARRAY['retail', 'restaurant', 'pharmacy']),
  (p_restaurant_id, '6000', 'Operating Expenses', 'expense', 'operating_expense', 'expense', 'debit', 'operating_expenses', true, ARRAY['all'])
  ON CONFLICT (restaurant_id, code) DO NOTHING;
END;
$$;

SELECT public.seed_global_coa(r.id, COALESCE(rbp.profile_code, 'restaurant'))
FROM public.restaurants r
LEFT JOIN public.restaurant_business_profiles rbp ON rbp.restaurant_id = r.id;

-- 4) GL integrity
CREATE OR REPLACE FUNCTION public.get_account_by_system_key(p_restaurant_id uuid, p_system_key text)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id
  FROM public.chart_of_accounts
  WHERE restaurant_id = p_restaurant_id
    AND system_key = p_system_key
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.recalc_journal_totals(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_dr numeric(15,2);
  v_cr numeric(15,2);
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_dr, v_cr
  FROM public.journal_entry_lines
  WHERE entry_id = p_entry_id;

  UPDATE public.journal_entries
  SET total_debit = v_dr,
      total_credit = v_cr
  WHERE id = p_entry_id;

  IF v_dr <> v_cr THEN
    RAISE EXCEPTION 'Unbalanced JE %, DR %, CR %', p_entry_id, v_dr, v_cr;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_journal_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalc_journal_totals(COALESCE(NEW.entry_id, OLD.entry_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_journal_totals_i   ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_recalc_journal_totals_u   ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_recalc_journal_totals_d   ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_recalc_journal_totals_ins ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_recalc_journal_totals_upd ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_recalc_journal_totals_del ON public.journal_entry_lines;

CREATE TRIGGER trg_recalc_journal_totals_ins
AFTER INSERT ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_journal_totals();

CREATE TRIGGER trg_recalc_journal_totals_upd
AFTER UPDATE ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_journal_totals();

CREATE TRIGGER trg_recalc_journal_totals_del
AFTER DELETE ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_journal_totals();

CREATE OR REPLACE FUNCTION public.trg_validate_journal_header()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total_debit <> NEW.total_credit THEN
    RAISE EXCEPTION 'Journal header not balanced. DR %, CR %', NEW.total_debit, NEW.total_credit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_journal_header ON public.journal_entries;
CREATE TRIGGER trg_validate_journal_header
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_journal_header();

-- 5) Posting engine
CREATE OR REPLACE FUNCTION public.post_order_sale_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_id uuid;
  v_cash uuid;
  v_sales uuid;
  v_total numeric(15,2);
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.journal_entries
    WHERE restaurant_id = NEW.restaurant_id
      AND source_module = 'pos'
      AND source_event = 'sale_completed'
      AND source_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.total, 0);
  v_cash  := public.get_account_by_system_key(NEW.restaurant_id, 'cash_on_hand');
  v_sales := public.get_account_by_system_key(NEW.restaurant_id, 'sales_revenue');

  IF v_cash IS NULL OR v_sales IS NULL THEN
    RAISE EXCEPTION 'Missing COA keys for restaurant % (cash_on_hand/sales_revenue)', NEW.restaurant_id;
  END IF;

  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, description, source, is_posted,
    source_module, source_event, source_id
  )
  VALUES (
    NEW.restaurant_id,
    'JE-' || to_char(current_date, 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.created_at::date, current_date),
    'POS Sale #' || COALESCE(NEW.order_number, NEW.id::text),
    'system', true,
    'pos', 'sale_completed', NEW.id
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines(entry_id, account_id, debit, credit, description, line_order)
  VALUES
    (v_entry_id, v_cash,  v_total, 0,       'Cash receipt', 1),
    (v_entry_id, v_sales, 0,       v_total, 'Sales revenue', 2);

  UPDATE public.orders SET journal_entry_id = v_entry_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders;
CREATE TRIGGER trg_post_order_sale_completed
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.post_order_sale_completed();

CREATE OR REPLACE FUNCTION public.post_expense_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry_id uuid;
  v_cash uuid;
  v_exp uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_cash := public.get_account_by_system_key(NEW.restaurant_id, 'cash_on_hand');
  v_exp  := public.get_account_by_system_key(NEW.restaurant_id, 'operating_expenses');

  IF v_cash IS NULL OR v_exp IS NULL THEN
    RAISE EXCEPTION 'Missing COA keys for restaurant % (cash_on_hand/operating_expenses)', NEW.restaurant_id;
  END IF;

  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, description, source, is_posted,
    source_module, source_event, source_id
  )
  VALUES (
    NEW.restaurant_id,
    'JE-' || to_char(current_date, 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.date::date, current_date),
    'Expense - ' || COALESCE(NEW.category, 'General'),
    'system', true,
    'expense', 'expense_created', NEW.id
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines(entry_id, account_id, debit, credit, description, line_order)
  VALUES
    (v_entry_id, v_exp, COALESCE(NEW.amount, 0), 0, 'Expense booked', 1),
    (v_entry_id, v_cash, 0, COALESCE(NEW.amount, 0), 'Cash payment', 2);

  NEW.journal_entry_id := v_entry_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_expense_journal ON public.expenses;
CREATE TRIGGER trg_post_expense_journal
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.post_expense_journal();

-- 6) API views
DROP VIEW IF EXISTS public.v_order_financial_api;
DROP VIEW IF EXISTS public.v_trial_balance;
DROP VIEW IF EXISTS public.v_profit_loss;

CREATE VIEW public.v_order_financial_api AS
SELECT
  o.id AS order_id,
  o.restaurant_id,
  o.order_number,
  o.status AS order_status,
  o.total AS order_total,
  o.created_at,
  o.journal_entry_id,
  je.entry_number,
  je.entry_date,
  je.total_debit,
  je.total_credit,
  je.is_posted,
  je.source_module,
  je.source_event
FROM public.orders o
LEFT JOIN public.journal_entries je ON je.id = o.journal_entry_id;

CREATE VIEW public.v_trial_balance AS
SELECT
  je.restaurant_id,
  coa.id AS account_id,
  coa.code AS account_code,
  coa.name AS account_name,
  coa.account_type,
  SUM(jel.debit) AS total_debit,
  SUM(jel.credit) AS total_credit,
  SUM(jel.debit - jel.credit) AS net_balance
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.entry_id
JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.is_posted = true
GROUP BY je.restaurant_id, coa.id, coa.code, coa.name, coa.account_type;

CREATE VIEW public.v_profit_loss AS
SELECT
  je.restaurant_id,
  date_trunc('month', je.entry_date)::date AS period_month,
  SUM(CASE WHEN coa.account_type = 'revenue' THEN (jel.credit - jel.debit) ELSE 0 END) AS revenue,
  SUM(CASE WHEN coa.account_type IN ('expense', 'cogs') THEN (jel.debit - jel.credit) ELSE 0 END) AS expenses,
  SUM(CASE WHEN coa.account_type = 'revenue' THEN (jel.credit - jel.debit) ELSE 0 END)
  - SUM(CASE WHEN coa.account_type IN ('expense', 'cogs') THEN (jel.debit - jel.credit) ELSE 0 END) AS net_profit
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.entry_id
JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.is_posted = true
GROUP BY je.restaurant_id, date_trunc('month', je.entry_date)::date;

GRANT SELECT ON public.v_order_financial_api TO authenticated;
GRANT SELECT ON public.v_trial_balance TO authenticated;
GRANT SELECT ON public.v_profit_loss TO authenticated;

-- 7) CFO functions
CREATE OR REPLACE FUNCTION public.fn_cfo_pnl(p_restaurant_id uuid, p_from date, p_to date)
RETURNS TABLE(section text, amount numeric)
LANGUAGE sql STABLE
AS $$
WITH t AS (
  SELECT
    SUM(CASE WHEN coa.account_type = 'revenue' THEN (jel.credit - jel.debit) ELSE 0 END) AS rev,
    SUM(CASE WHEN coa.account_type IN ('expense', 'cogs') THEN (jel.debit - jel.credit) ELSE 0 END) AS exp
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.restaurant_id = p_restaurant_id
    AND je.is_posted = true
    AND je.entry_date BETWEEN p_from AND p_to
)
SELECT 'Revenue', COALESCE(rev, 0) FROM t
UNION ALL
SELECT 'Expenses', COALESCE(exp, 0) FROM t
UNION ALL
SELECT 'Net Profit', COALESCE(rev, 0) - COALESCE(exp, 0) FROM t;
$$;

CREATE OR REPLACE FUNCTION public.fn_cfo_cashflow(p_restaurant_id uuid, p_from date, p_to date)
RETURNS TABLE(cash_in numeric, cash_out numeric, net_cash numeric)
LANGUAGE sql STABLE
AS $$
SELECT
  COALESCE(SUM(CASE WHEN coa.system_key = 'cash_on_hand' THEN jel.debit ELSE 0 END), 0) AS cash_in,
  COALESCE(SUM(CASE WHEN coa.system_key = 'cash_on_hand' THEN jel.credit ELSE 0 END), 0) AS cash_out,
  COALESCE(SUM(CASE WHEN coa.system_key = 'cash_on_hand' THEN (jel.debit - jel.credit) ELSE 0 END), 0) AS net_cash
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.entry_id
JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.restaurant_id = p_restaurant_id
  AND je.is_posted = true
  AND je.entry_date BETWEEN p_from AND p_to;
$$;

-- 8) AR/AP open items and aging
CREATE TABLE IF NOT EXISTS public.ar_open_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  doc_no text,
  doc_date date NOT NULL,
  due_date date,
  original_amount numeric(15,2) NOT NULL DEFAULT 0,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  balance_amount numeric(15,2) GENERATED ALWAYS AS (original_amount - paid_amount) STORED,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed', 'void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.ap_open_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  doc_no text,
  doc_date date NOT NULL,
  due_date date,
  original_amount numeric(15,2) NOT NULL DEFAULT 0,
  paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  balance_amount numeric(15,2) GENERATED ALWAYS AS (original_amount - paid_amount) STORED,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed', 'void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_open_items_restaurant_due ON public.ar_open_items(restaurant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_ap_open_items_restaurant_due ON public.ap_open_items(restaurant_id, due_date);

ALTER TABLE public.ar_open_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_open_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_open_items_tenant ON public.ar_open_items;
CREATE POLICY ar_open_items_tenant ON public.ar_open_items
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS ap_open_items_tenant ON public.ap_open_items;
CREATE POLICY ap_open_items_tenant ON public.ap_open_items
FOR ALL
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()))
WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP VIEW IF EXISTS public.v_ar_aging_detail;
DROP VIEW IF EXISTS public.v_ap_aging_detail;

CREATE VIEW public.v_ar_aging_detail AS
SELECT
  a.id,
  a.restaurant_id,
  a.customer_id,
  c.name AS customer_name,
  a.source_type,
  a.source_id,
  a.doc_no,
  a.doc_date,
  a.due_date,
  a.original_amount,
  a.paid_amount,
  a.balance_amount,
  GREATEST((current_date - COALESCE(a.due_date, a.doc_date)), 0) AS days_overdue,
  CASE
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 30 THEN '0-30'
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 60 THEN '31-60'
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM public.ar_open_items a
LEFT JOIN public.customers c ON c.id = a.customer_id
WHERE a.balance_amount > 0 AND a.status IN ('open', 'partial');

CREATE VIEW public.v_ap_aging_detail AS
SELECT
  a.id,
  a.restaurant_id,
  a.supplier_id,
  s.name AS supplier_name,
  a.source_type,
  a.source_id,
  a.doc_no,
  a.doc_date,
  a.due_date,
  a.original_amount,
  a.paid_amount,
  a.balance_amount,
  GREATEST((current_date - COALESCE(a.due_date, a.doc_date)), 0) AS days_overdue,
  CASE
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 30 THEN '0-30'
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 60 THEN '31-60'
    WHEN (current_date - COALESCE(a.due_date, a.doc_date)) <= 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM public.ap_open_items a
LEFT JOIN public.suppliers s ON s.id = a.supplier_id
WHERE a.balance_amount > 0 AND a.status IN ('open', 'partial');

CREATE OR REPLACE FUNCTION public.fn_cfo_aging_ar(p_restaurant_id uuid)
RETURNS TABLE(bucket text, amount numeric)
LANGUAGE sql STABLE
AS $$
  SELECT aging_bucket, SUM(balance_amount) AS amount
  FROM public.v_ar_aging_detail
  WHERE restaurant_id = p_restaurant_id
  GROUP BY aging_bucket
  ORDER BY CASE aging_bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cfo_aging_ap(p_restaurant_id uuid)
RETURNS TABLE(bucket text, amount numeric)
LANGUAGE sql STABLE
AS $$
  SELECT aging_bucket, SUM(balance_amount) AS amount
  FROM public.v_ap_aging_detail
  WHERE restaurant_id = p_restaurant_id
  GROUP BY aging_bucket
  ORDER BY CASE aging_bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END;
$$;

-- 9) Auto create/settle open items
CREATE OR REPLACE FUNCTION public.recalc_ar_item_status(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ar_open_items
  SET status = CASE
    WHEN (original_amount - paid_amount) <= 0 THEN 'closed'
    WHEN paid_amount > 0 THEN 'partial'
    ELSE 'open'
  END
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_ap_item_status(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ap_open_items
  SET status = CASE
    WHEN (original_amount - paid_amount) <= 0 THEN 'closed'
    WHEN paid_amount > 0 THEN 'partial'
    ELSE 'open'
  END
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ar_open_item_from_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ar_open_items (
    restaurant_id, customer_id, source_type, source_id, doc_no, doc_date, due_date,
    original_amount, paid_amount, status
  )
  VALUES (
    NEW.restaurant_id,
    NEW.customer_id,
    'pos_order',
    NEW.id,
    COALESCE(NEW.order_number, NEW.id::text),
    COALESCE(NEW.created_at::date, current_date),
    COALESCE(NEW.created_at::date, current_date) + 30,
    COALESCE(NEW.total, 0),
    0,
    'open'
  )
  ON CONFLICT (restaurant_id, source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_ar_open_item_from_order ON public.orders;
CREATE TRIGGER trg_create_ar_open_item_from_order
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_ar_open_item_from_order();

CREATE OR REPLACE FUNCTION public.create_ap_open_item_from_receipt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'posted' OR OLD.status = 'posted' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ap_open_items (
    restaurant_id, supplier_id, source_type, source_id, doc_no, doc_date, due_date,
    original_amount, paid_amount, status
  )
  VALUES (
    NEW.restaurant_id,
    NEW.supplier_id,
    'inventory_receipt',
    NEW.id,
    NEW.receipt_number,
    NEW.receipt_date,
    NEW.receipt_date + 30,
    COALESCE(NEW.net_amount, NEW.total_amount, 0),
    COALESCE(NEW.paid_amount, 0),
    CASE
      WHEN COALESCE(NEW.paid_amount, 0) >= COALESCE(NEW.net_amount, NEW.total_amount, 0) THEN 'closed'
      WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partial'
      ELSE 'open'
    END
  )
  ON CONFLICT (restaurant_id, source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_ap_open_item_from_receipt ON public.inventory_receipts;
CREATE TRIGGER trg_create_ap_open_item_from_receipt
AFTER UPDATE ON public.inventory_receipts
FOR EACH ROW EXECUTE FUNCTION public.create_ap_open_item_from_receipt();

CREATE TABLE IF NOT EXISTS public.ar_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ar_item_id uuid NOT NULL REFERENCES public.ar_open_items(id) ON DELETE CASCADE,
  payment_ref text,
  settled_amount numeric(15,2) NOT NULL CHECK (settled_amount > 0),
  settled_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.ap_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ap_item_id uuid NOT NULL REFERENCES public.ap_open_items(id) ON DELETE CASCADE,
  payment_ref text,
  settled_amount numeric(15,2) NOT NULL CHECK (settled_amount > 0),
  settled_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE OR REPLACE FUNCTION public.apply_ar_settlement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ar_open_items
  SET paid_amount = paid_amount + NEW.settled_amount
  WHERE id = NEW.ar_item_id
    AND restaurant_id = NEW.restaurant_id;

  PERFORM public.recalc_ar_item_status(NEW.ar_item_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_ap_settlement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.ap_open_items
  SET paid_amount = paid_amount + NEW.settled_amount
  WHERE id = NEW.ap_item_id
    AND restaurant_id = NEW.restaurant_id;

  PERFORM public.recalc_ap_item_status(NEW.ap_item_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ar_settlement ON public.ar_settlements;
CREATE TRIGGER trg_apply_ar_settlement
AFTER INSERT ON public.ar_settlements
FOR EACH ROW EXECUTE FUNCTION public.apply_ar_settlement();

DROP TRIGGER IF EXISTS trg_apply_ap_settlement ON public.ap_settlements;
CREATE TRIGGER trg_apply_ap_settlement
AFTER INSERT ON public.ap_settlements
FOR EACH ROW EXECUTE FUNCTION public.apply_ap_settlement();

COMMIT;
