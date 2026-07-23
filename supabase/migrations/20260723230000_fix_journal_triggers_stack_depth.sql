-- Fix stack depth limit exceeded error by removing problematic triggers
-- These triggers were causing recursive calls when inserting journal entries

-- Drop all problematic triggers on journal_entry_lines
DROP TRIGGER IF EXISTS trg_journal_entry_lines_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_delete ON public.journal_entry_lines;

-- Drop the function that was called by triggers
DROP FUNCTION IF EXISTS public.update_account_balance_from_journal_lines() CASCADE;

-- Drop any other problematic triggers on journal_entries
DROP TRIGGER IF EXISTS trg_on_post_update_balances ON public.journal_entries;
DROP FUNCTION IF EXISTS public.trg_on_post_update_balances() CASCADE;

-- Note: Account balances should be updated via RPC functions manually
-- or through a separate background process, not via triggers
