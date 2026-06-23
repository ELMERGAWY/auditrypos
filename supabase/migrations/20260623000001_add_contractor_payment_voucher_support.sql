-- ============================================================
-- ADD CONTRACTOR SUPPORT TO PAYMENT VOUCHERS
-- ============================================================

BEGIN;

-- 1. Add contractor_id column to payment_vouchers
ALTER TABLE public.payment_vouchers 
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL;

-- 2. Create index for contractor_id
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_contractor_id ON public.payment_vouchers(contractor_id);

-- 3. Drop existing save_payment_voucher function (all overloads)
DROP FUNCTION IF EXISTS public.save_payment_voucher CASCADE;

-- 4. Create new payment voucher function to support contractors
CREATE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_contractor_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_old_supplier_id UUID;
  v_old_contractor_id UUID;
  v_old_amount NUMERIC;
  v_payment_account_id UUID;
  v_ap_account_id UUID;
  v_entry_id UUID;
  v_journal_entry_id UUID;
BEGIN
  -- Validate that either supplier_id or contractor_id is provided
  IF p_supplier_id IS NULL AND p_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Either supplier_id or contractor_id must be provided';
  END IF;

  -- Get payment account based on payment method
  IF p_payment_method = 'cash' THEN
    SELECT id INTO v_payment_account_id 
    FROM public.chart_of_accounts 
    WHERE restaurant_id = p_restaurant_id AND code = '1100' LIMIT 1;
  ELSIF p_payment_method = 'bank' THEN
    SELECT id INTO v_payment_account_id 
    FROM public.chart_of_accounts 
    WHERE restaurant_id = p_restaurant_id AND code = '1400' LIMIT 1;
  ELSE
    -- Default to cash
    SELECT id INTO v_payment_account_id 
    FROM public.chart_of_accounts 
    WHERE restaurant_id = p_restaurant_id AND code = '1100' LIMIT 1;
  END IF;

  -- Get accounts payable account
  SELECT id INTO v_ap_account_id 
  FROM public.chart_of_accounts 
  WHERE restaurant_id = p_restaurant_id AND code = '2100' LIMIT 1;

  -- Check if voucher already exists (for updates)
  SELECT id, supplier_id, contractor_id, total_amount INTO v_id, v_old_supplier_id, v_old_contractor_id, v_old_amount
  FROM public.payment_vouchers
  WHERE reference_number = p_reference_number AND restaurant_id = p_restaurant_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- UPDATE EXISTING VOUCHER
    -- Restore old amount to old supplier/contractor balance (undo previous reduction)
    IF v_old_supplier_id IS NOT NULL THEN
      UPDATE public.suppliers 
      SET balance = COALESCE(balance, 0) + v_old_amount 
      WHERE id = v_old_supplier_id;
    ELSIF v_old_contractor_id IS NOT NULL THEN
      UPDATE public.contractors 
      SET balance = COALESCE(balance, 0) + v_old_amount 
      WHERE id = v_old_contractor_id;
    END IF;

    -- Update voucher
    UPDATE public.payment_vouchers SET
      supplier_id = p_supplier_id,
      contractor_id = p_contractor_id,
      total_amount = p_amount,
      payment_method = p_payment_method,
      notes = p_notes,
      updated_at = NOW()
    WHERE id = v_id;

    -- Delete old supplier transaction if exists
    DELETE FROM public.supplier_transactions 
    WHERE reference_type = 'payment_voucher' AND reference_id = v_id;

    -- Delete old contractor transaction if exists
    DELETE FROM public.contractor_payments 
    WHERE reference = p_reference_number AND restaurant_id = p_restaurant_id;
  ELSE
    -- CREATE NEW VOUCHER
    INSERT INTO public.payment_vouchers (
      restaurant_id, supplier_id, contractor_id, total_amount, 
      payment_method, reference_number, notes, status, created_at
    ) VALUES (
      p_restaurant_id, p_supplier_id, p_contractor_id, p_amount,
      p_payment_method, p_reference_number, p_notes, 'posted', NOW()
    ) RETURNING id INTO v_id;
  END IF;

  -- Create journal entry
  INSERT INTO public.journal_entries (
    restaurant_id, entry_number, entry_date, reference_type, reference_id,
    description, source, total_debit, total_credit, is_posted
  ) VALUES (
    p_restaurant_id, 
    'PV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('payment_voucher_seq')::TEXT, 4, '0'),
    NOW(),
    'payment_voucher',
    v_id,
    COALESCE(p_notes, 'إذن دفع'),
    'payment_vouchers',
    p_amount,
    p_amount,
    true
  ) RETURNING id INTO v_entry_id;

  -- Update voucher with journal entry
  UPDATE public.payment_vouchers SET journal_entry_id = v_entry_id WHERE id = v_id;

  -- Create journal lines
  IF v_payment_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_payment_account_id, p_amount, 0, 'دفع نقدية/بنكي', 1);
  END IF;

  IF v_ap_account_id IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
    VALUES (v_entry_id, v_ap_account_id, 0, p_amount, 'تخفيض ذمم موردين/صنايعية', 2);
  END IF;

  -- Update supplier/contractor balance
  IF p_supplier_id IS NOT NULL THEN
    UPDATE public.suppliers
    SET balance = COALESCE(balance, 0) - p_amount
    WHERE id = p_supplier_id;

    -- Create supplier transaction
    INSERT INTO public.supplier_transactions (
      restaurant_id, supplier_id, type, amount, description, payment_method,
      reference_type, reference_id
    ) VALUES (
      p_restaurant_id, p_supplier_id, 'payment', p_amount, 
      COALESCE(p_notes, 'إذن دفع'), p_payment_method,
      'payment_voucher', v_id
    );
  ELSIF p_contractor_id IS NOT NULL THEN
    UPDATE public.contractors
    SET balance = COALESCE(balance, 0) - p_amount
    WHERE id = p_contractor_id;

    -- Contractor payment is handled separately in contractor_payments table
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Contractor payment voucher support added';
  RAISE NOTICE '✅ payment_vouchers.contractor_id column added';
  RAISE NOTICE '✅ save_payment_voucher function updated to support contractors';
END
$$;
