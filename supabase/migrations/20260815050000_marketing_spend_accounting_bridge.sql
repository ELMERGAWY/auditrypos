-- AuditryPOS marketing spend accounting bridge
-- Additive and isolated: does not alter the core accounting outbox worker.
-- Spend is materialized and posted only through an explicit server-side action.

BEGIN;

ALTER TABLE public.marketing_ad_spend_expenses
  ADD COLUMN IF NOT EXISTS external_metric_key TEXT,
  ADD COLUMN IF NOT EXISTS source_metric_id UUID,
  ADD COLUMN IF NOT EXISTS accounting_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accounting_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accounting_error TEXT,
  ADD COLUMN IF NOT EXISTS accounting_posted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.marketing_ad_spend_expenses'::regclass
      AND conname = 'marketing_ad_spend_accounting_status_check'
  ) THEN
    ALTER TABLE public.marketing_ad_spend_expenses
      ADD CONSTRAINT marketing_ad_spend_accounting_status_check
      CHECK (accounting_status IN ('pending', 'queued', 'posted', 'failed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_ad_spend_external_metric
  ON public.marketing_ad_spend_expenses (restaurant_id, external_metric_key)
  WHERE external_metric_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketing_accounting_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES public.marketing_ad_spend_expenses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  posted_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_accounting_outbox_ready
  ON public.marketing_accounting_outbox (status, available_at);

ALTER TABLE public.marketing_accounting_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY marketing_accounting_outbox_read ON public.marketing_accounting_outbox FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = marketing_accounting_outbox.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'finance.access'))
  )
);

CREATE OR REPLACE FUNCTION public.process_marketing_accounting_outbox(p_batch_size INTEGER DEFAULT 25)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_expense RECORD;
  v_expense_account UUID;
  v_cash_account UUID;
  v_entry UUID;
  v_lines JSONB;
  v_processed INTEGER := 0;
  v_amount NUMERIC;
BEGIN
  FOR v_row IN
    SELECT * FROM public.marketing_accounting_outbox
    WHERE status IN ('pending', 'failed') AND available_at <= NOW()
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_batch_size, 25), 100))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.marketing_accounting_outbox
    SET status = 'processing', attempts = attempts + 1, locked_at = NOW(), updated_at = NOW()
    WHERE id = v_row.id;

    BEGIN
      SELECT * INTO v_expense
      FROM public.marketing_ad_spend_expenses
      WHERE id = v_row.expense_id
      FOR UPDATE;
      IF v_expense.id IS NULL THEN RAISE EXCEPTION 'Marketing spend expense % not found', v_row.expense_id; END IF;

      IF v_expense.accounting_entry_id IS NOT NULL THEN
        UPDATE public.marketing_accounting_outbox
        SET status = 'posted', posted_entry_id = v_expense.accounting_entry_id, last_error = NULL, updated_at = NOW()
        WHERE id = v_row.id;
        CONTINUE;
      END IF;

      v_amount := ROUND(COALESCE(v_expense.base_currency_amount, 0), 2);
      IF v_amount <= 0 THEN RAISE EXCEPTION 'Marketing spend amount must be positive'; END IF;

      SELECT id INTO v_expense_account
      FROM public.chart_of_accounts
      WHERE restaurant_id = v_expense.restaurant_id
        AND code = '6900'
        AND account_type = 'expense'
      LIMIT 1;
      IF v_expense_account IS NULL THEN
        INSERT INTO public.chart_of_accounts (restaurant_id, code, name, account_type, notes)
        VALUES (v_expense.restaurant_id, '6900', 'مصروف إعلانات وتسويق', 'expense', 'Created by AuditryPOS marketing spend bridge')
        ON CONFLICT (restaurant_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_expense_account;
      END IF;

      SELECT id INTO v_cash_account
      FROM public.chart_of_accounts
      WHERE restaurant_id = v_expense.restaurant_id
        AND (is_cash_account = TRUE OR code IN ('1100', '1000'))
        AND account_type = 'asset'
      ORDER BY is_cash_account DESC, code
      LIMIT 1;
      IF v_cash_account IS NULL THEN
        INSERT INTO public.chart_of_accounts (restaurant_id, code, name, account_type, is_cash_account, notes)
        VALUES (v_expense.restaurant_id, '1100', 'النقدية والبنوك', 'asset', TRUE, 'Created by AuditryPOS marketing spend bridge')
        ON CONFLICT (restaurant_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_cash_account;
      END IF;

      v_lines := jsonb_build_array(
        jsonb_build_object('account_id', v_expense_account, 'debit', v_amount, 'credit', 0, 'description', 'مصروف إعلانات وتسويق - ' || COALESCE(v_expense.campaign_name, v_expense.platform)),
        jsonb_build_object('account_id', v_cash_account, 'debit', 0, 'credit', v_amount, 'description', 'سداد مصروف إعلاني - ' || COALESCE(v_expense.platform_account_id, 'Meta'))
      );

      v_entry := public.fn_upsert_doc_journal(
        v_expense.restaurant_id,
        'marketing_ad_spend',
        v_expense.id,
        v_expense.spend_date,
        'قيد مصروف إعلاني - ' || COALESCE(v_expense.campaign_name, v_expense.platform),
        'marketing',
        v_lines
      );

      UPDATE public.marketing_ad_spend_expenses
      SET accounting_entry_id = v_entry, accounting_status = 'posted', accounting_error = NULL, accounting_posted_at = NOW(), updated_at = NOW()
      WHERE id = v_expense.id;
      UPDATE public.marketing_accounting_outbox
      SET status = 'posted', posted_entry_id = v_entry, last_error = NULL, updated_at = NOW()
      WHERE id = v_row.id;
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.marketing_ad_spend_expenses
      SET accounting_status = 'failed', accounting_error = LEFT(SQLERRM, 2000), updated_at = NOW()
      WHERE id = v_row.expense_id;
      UPDATE public.marketing_accounting_outbox
      SET status = 'failed', last_error = LEFT(SQLERRM, 2000), available_at = NOW() + make_interval(secs => LEAST(3600, GREATEST(30, attempts * 60))), updated_at = NOW()
      WHERE id = v_row.id;
    END;
  END LOOP;
  RETURN v_processed;
END;
$$;

REVOKE ALL ON FUNCTION public.process_marketing_accounting_outbox(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_marketing_accounting_outbox(INTEGER) TO service_role;

COMMENT ON TABLE public.marketing_accounting_outbox IS
  'Isolated retryable accounting outbox for explicitly materialized advertising spend.';
COMMENT ON COLUMN public.marketing_ad_spend_expenses.accounting_status IS
  'Posting status; no journal entry is created until an authorized explicit posting action runs.';

COMMIT;
