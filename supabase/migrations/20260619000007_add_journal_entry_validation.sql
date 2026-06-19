-- ============================================================
-- ADD JOURNAL ENTRY BALANCE VALIDATION AND ACCOUNT BALANCE UPDATES
-- ============================================================

BEGIN;

-- 1. Add trigger function to validate journal entry balance
CREATE OR REPLACE FUNCTION public.validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  -- Calculate totals from journal entry lines
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE entry_id = NEW.id;

  -- Check if balanced (allow small rounding differences)
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry not balanced: Debit=%, Credit=%, Difference=%',
      v_total_debit, v_total_credit, ABS(v_total_debit - v_total_credit);
  END IF;

  -- Update journal entry with calculated totals
  NEW.total_debit := v_total_debit;
  NEW.total_credit := v_total_credit;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add trigger function to update account balance when journal entry lines change
CREATE OR REPLACE FUNCTION public.update_account_balance_from_journal_lines()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_account_id := NEW.account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If account changed, update both old and new
    IF OLD.account_id != NEW.account_id THEN
      PERFORM public.recalculate_account_balance(OLD.account_id);
      v_account_id := NEW.account_id;
    ELSE
      v_account_id := NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_account_id := OLD.account_id;
  END IF;

  -- Recalculate account balance
  PERFORM public.recalculate_account_balance(v_account_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to recalculate account balance
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
  v_account_type TEXT;
  v_opening_balance NUMERIC;
BEGIN
  -- Get account type and opening balance
  SELECT account_type, COALESCE(opening_balance, 0)
  INTO v_account_type, v_opening_balance
  FROM public.chart_of_accounts
  WHERE id = p_account_id;

  -- Calculate balance from journal entry lines
  SELECT COALESCE(SUM(debit) - SUM(credit), 0)
  INTO v_balance
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON jel.entry_id = je.id
  WHERE jel.account_id = p_account_id AND je.is_posted = true;

  -- For liability, equity, and revenue accounts, credit increases balance
  IF v_account_type IN ('liability', 'equity', 'revenue') THEN
    v_balance := v_opening_balance - v_balance;
  ELSE
    -- For asset and expense accounts, debit increases balance
    v_balance := v_opening_balance + v_balance;
  END IF;

  -- Update account balance
  UPDATE public.chart_of_accounts
  SET current_balance = v_balance,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to recalculate all account balances
CREATE OR REPLACE FUNCTION public.recalculate_all_account_balances(p_restaurant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_account RECORD;
BEGIN
  FOR v_account IN SELECT id FROM public.chart_of_accounts WHERE restaurant_id = p_restaurant_id LOOP
    PERFORM public.recalculate_account_balance(v_account.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_validate_journal_entry_balance ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_delete ON public.journal_entry_lines;

-- 6. Create new triggers
CREATE TRIGGER trg_validate_journal_entry_balance
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.validate_journal_entry_balance();

CREATE TRIGGER trg_journal_entry_lines_insert
AFTER INSERT ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance_from_journal_lines();

CREATE TRIGGER trg_journal_entry_lines_update
AFTER UPDATE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance_from_journal_lines();

CREATE TRIGGER trg_journal_entry_lines_delete
AFTER DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_account_balance_from_journal_lines();

-- 7. Add updated_at column to chart_of_accounts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'chart_of_accounts'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.chart_of_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END
$$;

-- 8. Recalculate all account balances for all restaurants
DO $$
DECLARE
  v_restaurant RECORD;
BEGIN
  FOR v_restaurant IN SELECT id FROM public.restaurants LOOP
    PERFORM public.recalculate_all_account_balances(v_restaurant.id);
  END LOOP;
  
  RAISE NOTICE '✅ Recalculated all account balances for all restaurants';
END
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_journal_entry_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_account_balance_from_journal_lines TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_account_balances TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Journal entry validation and account balance update triggers added';
  RAISE NOTICE '✅ All account balances recalculated';
END
$$;
