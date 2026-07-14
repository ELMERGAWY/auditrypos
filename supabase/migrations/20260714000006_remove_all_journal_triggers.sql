-- ============================================================
-- REMOVE ONLY PROBLEMATIC JOURNAL TRIGGERS (KEEP ESSENTIAL ONES)
-- ============================================================
-- This migration removes ONLY triggers that might cause side effects
-- while keeping validation triggers for accounting integrity
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REMOVE TRIGGERS THAT CAUSE SIDE EFFECTS
-- ============================================================

-- Balance update triggers (cause stack depth, can be done manually)
DROP TRIGGER IF EXISTS trg_journal_post_updates_balances ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_delete ON public.journal_entry_lines;

-- Company/workspace triggers (may cause issues)
DROP TRIGGER IF EXISTS trg_journal_entries_set_company_workspace ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_set_company_workspace ON public.journal_entry_lines;

-- ============================================================
-- 2. KEEP VALIDATION TRIGGERS (ESSENTIAL FOR ACCOUNTING)
-- ============================================================

-- KEEP: Balance validation triggers (ensure debit = credit)
-- These are essential for accounting integrity

-- ============================================================
-- 3. DROP FUNCTIONS FOR REMOVED TRIGGERS ONLY
-- ============================================================

DROP FUNCTION IF EXISTS public.update_account_balance_from_journal_lines() CASCADE;
DROP FUNCTION IF EXISTS public.trg_on_post_update_balances() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_workspace_from_restaurant() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_workspace_from_entry() CASCADE;

-- KEEP: Validation functions (check_journal_entry_balance_simple, validate_journal_entry_balance)

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PROBLEMATIC JOURNAL TRIGGERS REMOVED (ESSENTIAL KEPT)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Removed balance update triggers (can be done manually)';
  RAISE NOTICE '2. Removed company/workspace triggers';
  RAISE NOTICE '3. KEPT balance validation triggers (essential)';
  RAISE NOTICE '4. Accounting integrity maintained';
  RAISE NOTICE '============================================================';
END $$;
