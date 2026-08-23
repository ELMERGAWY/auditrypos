-- ============================================================
-- REMOVE PROBLEMATIC TRIGGERS CAUSING STACK DEPTH LIMIT
-- ============================================================
-- This migration removes triggers from old migrations that cause
-- "stack depth limit exceeded" errors
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DROP TRIGGERS ON journal_entry_lines (CAUSE STACK DEPTH)
-- ============================================================

-- These triggers from migration 20260619000007 cause stack depth issues
DROP TRIGGER IF EXISTS trg_journal_entry_lines_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_delete ON public.journal_entry_lines;

-- Also drop any similar triggers from other migrations
DROP TRIGGER IF EXISTS trg_journal_line_update_balance ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_line_balance ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_line_balance_check ON public.journal_entry_lines;

-- ============================================================
-- 2. DROP TRIGGERS ON journal_entries (KEEP ONLY VALIDATION)
-- ============================================================

-- Keep only the balance validation trigger, remove others that might cause issues
DROP TRIGGER IF EXISTS trg_journal_entry_balance_check ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_validate_journal_entry_balance ON public.journal_entries;

-- ============================================================
-- 3. RECREATE SIMPLE BALANCE VALIDATION TRIGGER (NO SIDE EFFECTS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_journal_entry_balance_simple()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
  v_tolerance NUMERIC := 0.01;
BEGIN
  -- Only check balance, don't update anything
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM public.journal_entry_lines
  WHERE entry_id = NEW.id;
  
  -- Check balance with tolerance
  IF ABS(v_total_debit - v_total_credit) > v_tolerance THEN
    RAISE EXCEPTION 'Journal entry must balance: Debit=%, Credit=%, Difference=%', 
      v_total_debit, v_total_credit, ABS(v_total_debit - v_total_credit);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only for validation (no side effects)
DROP TRIGGER IF EXISTS trg_journal_entry_balance_validation ON public.journal_entries;
CREATE TRIGGER trg_journal_entry_balance_validation
AFTER INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
WHEN (NEW.is_posted = true OR NEW.is_posted IS NULL)
EXECUTE FUNCTION public.check_journal_entry_balance_simple();

-- ============================================================
-- 4. DROP FUNCTIONS THAT CAUSE ISSUES
-- ============================================================

-- Drop the problematic function that was called by triggers
DROP FUNCTION IF EXISTS public.update_account_balance_from_journal_lines() CASCADE;

-- ============================================================
-- 5. KEEP HELPER FUNCTIONS (FOR MANUAL USE)
-- ============================================================

-- Keep recalculate functions for manual use only
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

-- Preserve the legacy VOID-returning function; expose the counted variant separately.
CREATE OR REPLACE FUNCTION public.recalculate_all_account_balances_count(p_restaurant_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_restaurant_id IS NOT NULL THEN
    UPDATE public.chart_of_accounts
    SET current_balance = public.recalculate_account_balance(id)
    WHERE restaurant_id = p_restaurant_id;
    
    SELECT COUNT(*) INTO v_count
    FROM public.chart_of_accounts
    WHERE restaurant_id = p_restaurant_id;
  ELSE
    UPDATE public.chart_of_accounts
    SET current_balance = public.recalculate_account_balance(id);
    
    SELECT COUNT(*) INTO v_count
    FROM public.chart_of_accounts;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PROBLEMATIC TRIGGERS REMOVED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Removed triggers on journal_entry_lines (stack depth fix)';
  RAISE NOTICE '2. Kept only simple validation trigger on journal_entries';
  RAISE NOTICE '3. Account balances will be recalculated manually on demand';
  RAISE NOTICE '============================================================';
END $$;
