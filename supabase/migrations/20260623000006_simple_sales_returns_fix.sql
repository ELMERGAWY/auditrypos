-- ============================================================
-- SIMPLE SALES RETURNS FIX - COPY TO SUPABASE SQL EDITOR
-- ============================================================
-- This is a simplified version to debug the issue

BEGIN;

-- First, disable the trigger temporarily
DROP TRIGGER IF EXISTS trg_create_sales_return_journal ON public.sales_returns;

-- Create a very simple version that just logs what's happening
CREATE OR REPLACE FUNCTION public.create_sales_return_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_sales_returns_account UUID;
  v_receivable_account UUID;
  v_cash_account UUID;
BEGIN
  -- Only process when status changes to 'approved' or 'completed'
  IF NEW.status NOT IN ('approved', 'completed') OR OLD.status IN ('approved', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Skip if already has journal entry
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Log basic info
  RAISE NOTICE '=== SALES RETURN DEBUG ===';
  RAISE NOTICE 'Restaurant ID: %', NEW.restaurant_id;
  RAISE NOTICE 'Total Amount: %', NEW.total_amount;
  RAISE NOTICE 'Customer ID: %', NEW.customer_id;
  
  -- Get accounts
  v_sales_returns_account := public.get_sales_returns_account(NEW.restaurant_id);
  v_receivable_account := public.get_accounts_receivable(NEW.restaurant_id);
  v_cash_account := public.get_cash_account(NEW.restaurant_id);
  
  RAISE NOTICE 'Sales Returns Account: %', v_sales_returns_account;
  RAISE NOTICE 'Receivable Account: %', v_receivable_account;
  RAISE NOTICE 'Cash Account: %', v_cash_account;
  
  -- Check if sales returns account exists
  IF v_sales_returns_account IS NULL THEN
    RAISE EXCEPTION 'Sales returns account is NULL!';
  END IF;
  
  -- Determine credit account
  IF NEW.customer_id IS NOT NULL AND v_receivable_account IS NOT NULL THEN
    RAISE NOTICE 'Using receivable account for credit';
  ELSIF v_cash_account IS NOT NULL THEN
    RAISE NOTICE 'Using cash account for credit';
  ELSE
    RAISE EXCEPTION 'No valid credit account available!';
  END IF;
  
  -- For now, just return without creating journal entry to see if we get this far
  RAISE NOTICE '=== END DEBUG ===';
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in sales returns trigger: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trg_create_sales_return_journal
BEFORE UPDATE OF status ON public.sales_returns
FOR EACH ROW
EXECUTE FUNCTION public.create_sales_return_journal_entry();

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Simple debug trigger installed';
END
$$;
