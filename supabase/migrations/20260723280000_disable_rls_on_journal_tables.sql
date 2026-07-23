-- Disable RLS on journal tables to test if RLS policies are causing stack depth error
-- RLS policies with subqueries can cause recursive calls

ALTER TABLE public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines DISABLE ROW LEVEL SECURITY;

-- Note: This temporarily disables security for testing purposes
-- If this fixes the issue, we need to create simpler RLS policies
