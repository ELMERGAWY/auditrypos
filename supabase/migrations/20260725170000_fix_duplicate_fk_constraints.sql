-- Fix duplicate foreign key constraints between journal_entries and journal_entry_lines
-- This error occurs when Supabase finds multiple FK relationships and can't determine which to use

-- First, check for existing constraints on journal_entry_lines
-- This will help identify any duplicate foreign key constraints

-- Drop any duplicate foreign key constraints that reference journal_entries
-- We'll keep only one properly named constraint

-- Drop the constraint you manually added (if it exists)
ALTER TABLE public.journal_entry_lines
DROP CONSTRAINT IF EXISTS fk_journal_entry;

-- Check for and drop any other duplicate constraints
-- Common naming patterns for auto-generated constraints
ALTER TABLE public.journal_entry_lines
DROP CONSTRAINT IF EXISTS journal_entry_lines_entry_id_fkey;

ALTER TABLE public.journal_entry_lines
DROP CONSTRAINT IF EXISTS journal_entry_lines_entry_id_fkey1;

ALTER TABLE public.journal_entry_lines
DROP CONSTRAINT IF EXISTS journal_entry_lines_entry_id_fkey2;

-- Add a single, properly named foreign key constraint
ALTER TABLE public.journal_entry_lines
ADD CONSTRAINT journal_entry_lines_entry_id_fkey
FOREIGN KEY (entry_id) 
REFERENCES public.journal_entries(id) 
ON DELETE CASCADE;

-- Force Supabase to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Add comment to document this constraint
COMMENT ON CONSTRAINT journal_entry_lines_entry_id_fkey ON public.journal_entry_lines IS 
'Foreign key constraint linking journal entry lines to their parent journal entry. This is the only FK constraint between these tables to avoid Supabase embedding ambiguity.';
