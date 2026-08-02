CREATE SEQUENCE IF NOT EXISTS public.journal_entry_number_seq START WITH 1 INCREMENT BY 1;
GRANT USAGE, SELECT ON SEQUENCE public.journal_entry_number_seq TO authenticated, service_role;
SELECT setval('public.journal_entry_number_seq', GREATEST((SELECT COUNT(*) FROM public.journal_entries), 1));