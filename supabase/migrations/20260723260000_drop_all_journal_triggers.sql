-- Drop all triggers on journal_entries and journal_entry_lines to fix stack depth error
-- These triggers are causing recursive calls even on simple updates

-- Drop triggers on journal_entries
DROP TRIGGER IF EXISTS trg_journal_entries_before_insert ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entries_after_insert ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entries_before_update ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entries_after_update ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entries_before_delete ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entries_after_delete ON public.journal_entries;
DROP TRIGGER IF EXISTS trg_on_post_update_balances ON public.journal_entries;

-- Drop triggers on journal_entry_lines
DROP TRIGGER IF EXISTS trg_journal_entry_lines_before_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_after_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_before_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_after_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_before_delete ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_after_delete ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_insert ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_update ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_delete ON public.journal_entry_lines;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.trg_journal_entries_before_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trg_journal_entries_after_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trg_journal_entries_before_update() CASCADE;
DROP FUNCTION IF EXISTS public.trg_journal_entries_after_update() CASCADE;
DROP FUNCTION IF EXISTS public.trg_journal_entries_before_delete() CASCADE;
DROP FUNCTION IF EXISTS public.trg_journal_entries_after_delete() CASCADE;
DROP FUNCTION IF EXISTS public.trg_on_post_update_balances() CASCADE;
DROP FUNCTION IF EXISTS public.update_account_balance_from_journal_lines() CASCADE;
