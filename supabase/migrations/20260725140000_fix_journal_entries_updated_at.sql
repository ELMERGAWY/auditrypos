-- Migration: Fix Journal Entries updated_at Column
-- This migration adds the missing updated_at column to journal_entries and journal_entry_lines tables
-- to fix the trigger error: "record 'new' has no field 'updated_at'"

-- Add updated_at column to journal_entries if it doesn't exist
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column to journal_entry_lines if it doesn't exist
ALTER TABLE public.journal_entry_lines 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 1. Drop old triggers that might cause loops
DROP TRIGGER IF EXISTS set_journal_entries_updated_at ON public.journal_entries;
DROP TRIGGER IF EXISTS handle_journal_entries_updated_at ON public.journal_entries;
DROP TRIGGER IF EXISTS journal_entries_updated_at ON public.journal_entries;

-- 2. Create a simple and safe trigger function (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. Attach the safe trigger to journal_entries table
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Attach the same trigger to journal_entry_lines table
DROP TRIGGER IF EXISTS set_journal_entry_lines_updated_at ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS handle_journal_entry_lines_updated_at ON public.journal_entry_lines;
DROP TRIGGER IF EXISTS journal_entry_lines_updated_at ON public.journal_entry_lines;

CREATE TRIGGER update_journal_entry_lines_updated_at
BEFORE UPDATE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to document the fix
COMMENT ON COLUMN public.journal_entries.updated_at IS 'Timestamp for last update, required for trigger functionality';
COMMENT ON COLUMN public.journal_entry_lines.updated_at IS 'Timestamp for last update, required for trigger functionality';
