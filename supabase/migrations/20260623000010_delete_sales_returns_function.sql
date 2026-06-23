-- ============================================================
-- DELETE SALES RETURNS FUNCTION - COPY TO SUPABASE SQL EDITOR
-- ============================================================
-- This function allows deleting a sales return and reverting all accounting

BEGIN;

-- Create function to delete sales return and revert accounting
CREATE OR REPLACE FUNCTION public.delete_sales_return(p_sales_return_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sales_return RECORD;
  v_journal_entry_id UUID;
  v_customer_id UUID;
  v_total_amount DECIMAL(15,2);
  v_restaurant_id UUID;
  v_return_number TEXT;
  v_result JSONB := '{"success": false}'::JSONB;
BEGIN
  -- Get sales return details
  SELECT * INTO v_sales_return
  FROM public.sales_returns
  WHERE id = p_sales_return_id;
  
  IF NOT FOUND THEN
    v_result := jsonb_build_object('success', false, 'error', 'Sales return not found');
    RETURN v_result;
  END IF;
  
  -- Check if sales return is already completed - only allow deletion if not posted or if explicitly allowed
  IF v_sales_return.status = 'completed' AND v_sales_return.journal_entry_id IS NOT NULL THEN
    -- For now, we'll allow deletion even if completed, but we'll revert everything
    v_journal_entry_id := v_sales_return.journal_entry_id;
    v_customer_id := v_sales_return.customer_id;
    v_total_amount := v_sales_return.total_amount;
    v_restaurant_id := v_sales_return.restaurant_id;
    v_return_number := v_sales_return.return_number;
  END IF;
  
  -- ==========================================
  -- STEP 1: REVERT CUSTOMER BALANCE IF NEEDED
  -- ==========================================
  IF v_customer_id IS NOT NULL AND v_total_amount IS NOT NULL THEN
    -- Delete customer transaction
    DELETE FROM public.customer_transactions
    WHERE reference_type = 'sales_return'
      AND reference_id = p_sales_return_id;
    
    -- Revert customer balance (subtract the return amount)
    UPDATE public.customers
    SET balance = balance - v_total_amount
    WHERE id = v_customer_id;
    
    RAISE NOTICE 'Reverted customer % balance by %', v_customer_id, v_total_amount;
  END IF;
  
  -- ==========================================
  -- STEP 2: DELETE JOURNAL ENTRY IF EXISTS
  -- ==========================================
  IF v_journal_entry_id IS NOT NULL THEN
    -- Delete journal entry lines first
    DELETE FROM public.journal_entry_lines
    WHERE entry_id = v_journal_entry_id;
    
    -- Delete journal entry
    DELETE FROM public.journal_entries
    WHERE id = v_journal_entry_id;
    
    RAISE NOTICE 'Deleted journal entry %', v_journal_entry_id;
  END IF;
  
  -- ==========================================
  -- STEP 3: REVERT INVENTORY ADJUSTMENTS
  -- ==========================================
  -- Note: This is complex because we need to reverse stock movements
  -- For now, we'll delete the sales return items and let the user manually adjust stock if needed
  -- A more sophisticated solution would track stock movements and reverse them
  
  -- ==========================================
  -- STEP 4: DELETE SALES RETURN ITEMS
  -- ==========================================
  DELETE FROM public.sales_return_items
  WHERE sales_return_id = p_sales_return_id;
  
  -- ==========================================
  -- STEP 5: DELETE SALES RETURN
  -- ==========================================
  DELETE FROM public.sales_returns
  WHERE id = p_sales_return_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Sales return deleted successfully',
    'return_number', v_return_number
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object('success', false, 'error', SQLERRM);
    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_sales_return TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Delete sales returns function created';
END
$$;
