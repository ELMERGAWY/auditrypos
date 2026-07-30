-- Add journal entry creation to save_payment_voucher function
-- The current function only updates balances but doesn't create journal entries

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.save_payment_voucher CASCADE;

-- Recreate function with journal entry support
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_actor_id UUID,
  p_amount NUMERIC,
  p_actor_type TEXT DEFAULT 'supplier',
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_number TEXT;
  v_voucher_id UUID;
  v_payment_account_id UUID;
  v_ap_account_id UUID;
  v_journal_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  IF p_voucher_id IS NOT NULL THEN
    -- Update existing voucher
    UPDATE public.payment_vouchers
    SET 
      actor_id = p_actor_id,
      actor_type = p_actor_type,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      reference_number = p_reference_number,
      updated_at = NOW()
    WHERE id = p_voucher_id
    RETURNING id INTO v_voucher_id;
  ELSE
    -- Generate voucher number
    SELECT 'PV-' || LPAD((COALESCE(MAX(SUBSTRING(voucher_number FROM 4 FOR 6))::INTEGER, 0) + 1)::TEXT, 6, '0')
    INTO v_voucher_number
    FROM public.payment_vouchers
    WHERE restaurant_id = p_restaurant_id;

    -- Create new voucher
    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, actor_id, actor_type,
      amount, payment_method, notes, account_id, counter_account_id, reference_number
    ) VALUES (
      p_restaurant_id, v_voucher_number, p_voucher_date, p_actor_id, p_actor_type,
      p_amount, p_payment_method, p_notes, p_account_id, p_counter_account_id, p_reference_number
    ) RETURNING id INTO v_voucher_id;
    
    -- Update contractor balance if actor_type is 'contractor' (payment decreases balance)
    IF p_actor_type = 'contractor' THEN
      UPDATE public.contractors
      SET balance = COALESCE(balance, 0) - p_amount
      WHERE id = p_actor_id;
    END IF;
    
    -- Update customer balance if actor_type is 'customer' (refund increases balance)
    IF p_actor_type = 'customer' THEN
      UPDATE public.customers
      SET balance = COALESCE(balance, 0) + p_amount
      WHERE id = p_actor_id;
    END IF;
    
    -- Update supplier balance if actor_type is 'supplier' (payment decreases balance)
    IF p_actor_type = 'supplier' THEN
      UPDATE public.suppliers
      SET balance = COALESCE(balance, 0) - p_amount
      WHERE id = p_actor_id;
    END IF;

    -- Get payment account based on payment method
    IF p_payment_method = 'bank' OR p_payment_method = 'bank_transfer' THEN
      SELECT id INTO v_payment_account_id 
      FROM public.chart_of_accounts 
      WHERE restaurant_id = p_restaurant_id AND code = '1200' LIMIT 1;
    ELSE
      -- Default to cash
      SELECT id INTO v_payment_account_id 
      FROM public.chart_of_accounts 
      WHERE restaurant_id = p_restaurant_id AND code = '1100' LIMIT 1;
    END IF;

    -- Get accounts payable account for suppliers/contractors
    IF p_actor_type IN ('supplier', 'contractor') THEN
      SELECT id INTO v_ap_account_id 
      FROM public.chart_of_accounts 
      WHERE restaurant_id = p_restaurant_id AND code = '2100' LIMIT 1;
    ELSIF p_actor_type = 'customer' THEN
      -- For customer refunds, use accounts receivable
      SELECT id INTO v_ap_account_id 
      FROM public.chart_of_accounts 
      WHERE restaurant_id = p_restaurant_id AND code = '1101' LIMIT 1;
    END IF;

    -- Generate journal entry number
    SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('journal_entry_seq')::TEXT, 4, '0')
    INTO v_entry_number;

    -- Create journal entry
    INSERT INTO public.journal_entries (
      restaurant_id, entry_number, entry_date, reference_type, reference_id,
      description, source, total_debit, total_credit, is_posted, status
    ) VALUES (
      p_restaurant_id, 
      v_entry_number,
      p_voucher_date,
      'payment_voucher',
      v_voucher_id,
      COALESCE(p_notes, 'إذن دفع'),
      'payment_vouchers',
      p_amount,
      p_amount,
      true,
      'posted'
    ) RETURNING id INTO v_journal_entry_id;

    -- Update voucher with journal entry
    UPDATE public.payment_vouchers 
    SET journal_entry_id = v_journal_entry_id 
    WHERE id = v_voucher_id;

    -- Create journal entry lines
    -- Debit: Accounts Payable/Receivable (reduces what we owe or increases what they owe us)
    INSERT INTO public.journal_entry_lines (
      entry_id, account_id, debit, credit, description
    ) VALUES (
      v_journal_entry_id,
      v_ap_account_id,
      p_amount,
      0,
      COALESCE(p_notes, 'إذن دفع')
    );

    -- Credit: Cash/Bank (money goes out)
    INSERT INTO public.journal_entry_lines (
      entry_id, account_id, debit, credit, description
    ) VALUES (
      v_journal_entry_id,
      v_payment_account_id,
      0,
      p_amount,
      COALESCE(p_notes, 'إذن دفع')
    );
  END IF;

  RETURN v_voucher_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;

COMMIT;
