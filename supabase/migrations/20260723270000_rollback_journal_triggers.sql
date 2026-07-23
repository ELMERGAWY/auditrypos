-- Rollback: Restore essential journal triggers (simplified version without recursive calls)
-- This restores basic functionality without the problematic balance update triggers

-- Create a simple trigger function for journal entries (no balance updates)
CREATE OR REPLACE FUNCTION public.trg_journal_entries_set_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := 'JE-' || LPAD(NEXTVAL('journal_entry_number_seq')::TEXT, 6, '0');
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for journal entries
DROP TRIGGER IF EXISTS trg_journal_entries_before_insert ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_before_insert
BEFORE INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_journal_entries_set_defaults();

-- Create trigger for journal entries updates
DROP TRIGGER IF EXISTS trg_journal_entries_before_update ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_before_update
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.trg_journal_entries_set_defaults();

-- Note: We are NOT restoring the balance update triggers to avoid stack depth errors
-- Account balances will need to be updated manually or via a separate process
