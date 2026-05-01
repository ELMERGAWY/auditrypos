-- ============================================================
-- ERP + AI ACCOUNTING ALIGNMENT (Option A)
-- - Enforce ERP-period-based accounting (fiscal periods + account_balances)
-- - Link journal_entries to fiscal_period_id
-- - Provide stored procs to resolve period & update balances
-- - Add AI chat + journal suggestion tables (approval workflow)
-- ============================================================

BEGIN;

-- ----------------------------
-- 1) Fiscal years / periods
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  year_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'locked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, year_number)
);

CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  fiscal_year_id UUID REFERENCES public.fiscal_years(id) ON DELETE CASCADE NOT NULL,
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'locked')),
  is_posting_allowed BOOLEAN DEFAULT true,
  posting_restriction_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, fiscal_year_id, period_number)
);

-- ----------------------------
-- 2) Account balances (period-based)
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE NOT NULL,
  fiscal_period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE CASCADE NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  debit_movement DECIMAL(15,2) DEFAULT 0,
  credit_movement DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, fiscal_period_id)
);

-- Helpful index (reporting)
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON public.account_balances(fiscal_period_id);

-- ----------------------------
-- 3) Journal entries alignment
-- ----------------------------
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES public.fiscal_periods(id) ON DELETE RESTRICT;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed'));

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id);

-- Ensure journal_entry_lines has optional dimensions used by ERP engine (non-breaking)
ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS cost_center_id UUID;

ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS project_id UUID;

ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS branch_id UUID;

ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS line_reference VARCHAR(100);

-- ----------------------------
-- 4) Period resolver (get-or-create)
-- ----------------------------
CREATE OR REPLACE FUNCTION public.fn_get_or_create_fiscal_period(
  p_restaurant_id UUID,
  p_txn_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INT;
  v_year_start DATE;
  v_year_end DATE;
  v_fy_id UUID;
  v_period INT;
  v_period_start DATE;
  v_period_end DATE;
  v_period_name TEXT;
  v_fp_id UUID;
BEGIN
  v_year := EXTRACT(YEAR FROM p_txn_date)::INT;
  v_year_start := make_date(v_year, 1, 1);
  v_year_end := make_date(v_year, 12, 31);

  SELECT id INTO v_fy_id
  FROM public.fiscal_years
  WHERE restaurant_id = p_restaurant_id AND year_number = v_year
  LIMIT 1;

  IF v_fy_id IS NULL THEN
    INSERT INTO public.fiscal_years (restaurant_id, year_number, start_date, end_date, status)
    VALUES (p_restaurant_id, v_year, v_year_start, v_year_end, 'open')
    RETURNING id INTO v_fy_id;
  END IF;

  v_period := EXTRACT(MONTH FROM p_txn_date)::INT;
  v_period_start := date_trunc('month', p_txn_date)::DATE;
  v_period_end := (date_trunc('month', p_txn_date) + INTERVAL '1 month - 1 day')::DATE;
  v_period_name := to_char(p_txn_date, 'Mon YYYY');

  SELECT id INTO v_fp_id
  FROM public.fiscal_periods
  WHERE restaurant_id = p_restaurant_id
    AND fiscal_year_id = v_fy_id
    AND period_number = v_period
  LIMIT 1;

  IF v_fp_id IS NULL THEN
    INSERT INTO public.fiscal_periods (
      restaurant_id, fiscal_year_id, period_number, period_name,
      start_date, end_date, status, is_posting_allowed
    )
    VALUES (
      p_restaurant_id, v_fy_id, v_period, v_period_name,
      v_period_start, v_period_end, 'open', true
    )
    RETURNING id INTO v_fp_id;
  END IF;

  RETURN v_fp_id;
END;
$$;

-- ----------------------------
-- 5) Update account balances for a posted entry
-- ----------------------------
CREATE OR REPLACE FUNCTION public.update_account_balances(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_period_id UUID;
BEGIN
  SELECT restaurant_id, fiscal_period_id
    INTO v_restaurant_id, v_period_id
  FROM public.journal_entries
  WHERE id = p_entry_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_entry_id;
  END IF;

  -- If period missing, resolve from entry_date
  IF v_period_id IS NULL THEN
    UPDATE public.journal_entries
      SET fiscal_period_id = public.fn_get_or_create_fiscal_period(v_restaurant_id, entry_date)
    WHERE id = p_entry_id
    RETURNING fiscal_period_id INTO v_period_id;
  END IF;

  -- Only update for posted entries
  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE id = p_entry_id AND (status = 'posted' OR is_posted = true)) THEN
    RETURN;
  END IF;

  -- Aggregate movements per account for this entry
  WITH mov AS (
    SELECT
      jel.account_id,
      COALESCE(SUM(jel.debit), 0)::DECIMAL(15,2) AS debit_mov,
      COALESCE(SUM(jel.credit), 0)::DECIMAL(15,2) AS credit_mov
    FROM public.journal_entry_lines jel
    WHERE jel.entry_id = p_entry_id
    GROUP BY jel.account_id
  )
  INSERT INTO public.account_balances (
    account_id, fiscal_period_id,
    opening_balance, debit_movement, credit_movement, closing_balance,
    created_at, updated_at
  )
  SELECT
    mov.account_id,
    v_period_id,
    0,
    mov.debit_mov,
    mov.credit_mov,
    (0 + mov.debit_mov - mov.credit_mov),
    NOW(), NOW()
  FROM mov
  ON CONFLICT (account_id, fiscal_period_id)
  DO UPDATE SET
    debit_movement = public.account_balances.debit_movement + EXCLUDED.debit_movement,
    credit_movement = public.account_balances.credit_movement + EXCLUDED.credit_movement,
    closing_balance = public.account_balances.opening_balance
      + (public.account_balances.debit_movement + EXCLUDED.debit_movement)
      - (public.account_balances.credit_movement + EXCLUDED.credit_movement),
    updated_at = NOW();
END;
$$;

-- Trigger: when journal entry is posted, update balances
CREATE OR REPLACE FUNCTION public.trg_on_post_update_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Detect transition to posted
  IF (NEW.status = 'posted' AND (OLD.status IS DISTINCT FROM 'posted'))
     OR (NEW.is_posted = true AND (OLD.is_posted IS DISTINCT FROM true)) THEN
    PERFORM public.update_account_balances(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_post_updates_balances ON public.journal_entries;
CREATE TRIGGER trg_journal_post_updates_balances
AFTER UPDATE OF status, is_posted ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_post_update_balances();

-- ----------------------------
-- 6) AI tables (chat + suggestions)
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_journal_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  source VARCHAR(30) DEFAULT 'chat' CHECK (source IN ('chat', 'telegram', 'whatsapp', 'system')),
  external_message_id TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'posted')),
  title TEXT,
  description TEXT,
  suggestion JSONB NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------
-- 7) RLS for AI tables
-- ----------------------------
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_journal_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_sessions_isolation ON public.ai_chat_sessions;
CREATE POLICY ai_sessions_isolation ON public.ai_chat_sessions
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS ai_messages_isolation ON public.ai_chat_messages;
CREATE POLICY ai_messages_isolation ON public.ai_chat_messages
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.ai_chat_sessions s
      WHERE s.restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS ai_suggestions_isolation ON public.ai_journal_suggestions;
CREATE POLICY ai_suggestions_isolation ON public.ai_journal_suggestions
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

COMMIT;

