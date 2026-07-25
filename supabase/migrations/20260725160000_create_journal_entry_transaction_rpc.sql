-- Create RPC function for creating journal entries with full transaction integrity
-- This ensures all related operations (entry creation, line creation, account balance updates) happen atomically

CREATE OR REPLACE FUNCTION create_journal_entry_with_transaction(
  p_restaurant_id UUID,
  p_entry_date TIMESTAMP WITH TIME ZONE,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_source TEXT,
  p_is_posted BOOLEAN DEFAULT TRUE,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line RECORD;
  v_account_id UUID;
  v_debit NUMERIC;
  v_credit NUMERIC;
  v_account_current_balance NUMERIC;
  v_result JSONB := '{"success": false}'::JSONB;
BEGIN
  -- Start transaction (implicit in RPC function)
  
  -- Validate debit/credit balance before proceeding
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS t(
    account_id UUID,
    debit NUMERIC,
    credit NUMERIC,
    description TEXT,
    line_order INT,
    customer_id UUID,
    vendor_id UUID
  )
  LOOP
    v_total_debit := v_total_debit + COALESCE(v_line.debit, 0);
    v_total_credit := v_total_credit + COALESCE(v_line.credit, 0);
  END LOOP;
  
  -- Check if debit equals credit (allow small floating point differences)
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', 'Debit and credit amounts do not balance',
      'total_debit', v_total_debit,
      'total_credit', v_total_credit
    );
    RETURN v_result;
  END IF;
  
  -- Generate entry number
  SELECT COALESCE(MAX(entry_number), 'JE-0000') INTO v_entry_number
  FROM journal_entries
  WHERE restaurant_id = p_restaurant_id;
  
  -- Increment entry number (simple increment for now, could be more sophisticated)
  v_entry_number := 'JE-' || LPAD((CAST(SUBSTRING(v_entry_number FROM 4) AS INT) + 1)::TEXT, 4, '0');
  
  -- Insert journal entry header
  INSERT INTO journal_entries (
    restaurant_id,
    entry_number,
    entry_date,
    reference_type,
    reference_id,
    description,
    source,
    total_debit,
    total_credit,
    is_posted,
    created_at
  ) VALUES (
    p_restaurant_id,
    v_entry_number,
    p_entry_date,
    p_reference_type,
    p_reference_id,
    p_description,
    p_source,
    v_total_debit,
    v_total_credit,
    p_is_posted,
    NOW()
  )
  RETURNING id INTO v_entry_id;
  
  -- Insert journal entry lines
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS t(
    account_id UUID,
    debit NUMERIC,
    credit NUMERIC,
    description TEXT,
    line_order INT,
    customer_id UUID,
    vendor_id UUID
  )
  LOOP
    INSERT INTO journal_entry_lines (
      entry_id,
      account_id,
      debit,
      credit,
      description,
      line_order,
      customer_id,
      vendor_id,
      created_at
    ) VALUES (
      v_entry_id,
      v_line.account_id,
      v_line.debit,
      v_line.credit,
      v_line.description,
      v_line.line_order,
      v_line.customer_id,
      v_line.vendor_id,
      NOW()
    );
    
    -- Update account balance if entry is posted
    IF p_is_posted THEN
      UPDATE chart_of_accounts
      SET current_balance = current_balance + COALESCE(v_line.debit, 0) - COALESCE(v_line.credit, 0),
          updated_at = NOW()
      WHERE id = v_line.account_id;
    END IF;
  END LOOP;
  
  -- Return success with entry details
  v_result := jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'entry_number', v_entry_number,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit
  );
  
  -- Transaction commits automatically on successful completion
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction rolls back automatically on error
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_journal_entry_with_transaction TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_journal_entry_with_transaction IS 
'Creates a journal entry with all lines and updates account balances in a single atomic transaction. 
Ensures debit/credit balance validation and proper error handling with rollback.';
