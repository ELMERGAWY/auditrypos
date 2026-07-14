-- ============================================================
-- REMOVE ALL TRIGGERS ON JOURNAL_ENTRIES AND JOURNAL_ENTRY_LINES
-- ============================================================
-- This migration removes ALL triggers on journal_entries and journal_entry_lines
-- to prevent any side effects that might create duplicate orders
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DROP ALL TRIGGERS ON JOURNAL_ENTRIES
-- ============================================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'journal_entries'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.journal_entries';
        RAISE NOTICE 'Dropped trigger: % on journal_entries', trigger_record.trigger_name;
    END LOOP;
END $$;

-- ============================================================
-- 2. DROP ALL TRIGGERS ON JOURNAL_ENTRY_LINES
-- ============================================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'journal_entry_lines'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.journal_entry_lines';
        RAISE NOTICE 'Dropped trigger: % on journal_entry_lines', trigger_record.trigger_name;
    END LOOP;
END $$;

-- ============================================================
-- 3. DROP FUNCTIONS USED BY REMOVED TRIGGERS
-- ============================================================

DROP FUNCTION IF EXISTS public.check_journal_entry_balance_simple() CASCADE;
DROP FUNCTION IF EXISTS public.validate_journal_entry_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_account_balance_from_journal_lines() CASCADE;
DROP FUNCTION IF EXISTS public.trg_on_post_update_balances() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_workspace_from_restaurant() CASCADE;
DROP FUNCTION IF EXISTS public.tg_set_company_workspace_from_entry() CASCADE;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'ALL JOURNAL TRIGGERS REMOVED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '1. Removed ALL triggers on journal_entries';
  RAISE NOTICE '2. Removed ALL triggers on journal_entry_lines';
  RAISE NOTICE '3. Removed all trigger functions';
  RAISE NOTICE '4. No more side effects from journal operations';
  RAISE NOTICE '============================================================';
END $$;
