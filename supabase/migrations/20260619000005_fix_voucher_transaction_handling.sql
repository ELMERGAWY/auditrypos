-- ============================================================
-- FIX RECEIPT/PAYMENT VOUCHER TRANSACTION HANDLING
-- ============================================================

BEGIN;

-- 1. Fix save_receipt_voucher to use proper transaction handling
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_number TEXT;
  v_customer_name TEXT;
  v_debit_account UUID;
  v_credit_account UUID;
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_customer_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  -- Ensure COA is set up properly
  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name INTO v_customer_name FROM public.customers WHERE id = p_customer_id;

  -- DEBIT side: always Cash or Bank
  v_debit_account := public.get_cash_account(p_restaurant_id);

  -- CREDIT side: the routed account (AR 1200 by default, or user-selected)
  v_credit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public.get_accounts_receivable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    -- UPDATE EXISTING VOUCHER
    SELECT amount, customer_id INTO v_old_amount, v_old_customer_id
    FROM public.receipt_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

    -- Delete old journal entry if exists
    IF EXISTS (SELECT 1 FROM public.receipt_vouchers WHERE id = p_voucher_id AND journal_entry_id IS NOT NULL) THEN
      DELETE FROM public.journal_entry_lines WHERE entry_id = (SELECT journal_entry_id FROM public.receipt_vouchers WHERE id = p_voucher_id);
      DELETE FROM public.journal_entries WHERE id = (SELECT journal_entry_id FROM public.receipt_vouchers WHERE id = p_voucher_id);
    END IF;

    -- Delete old customer transaction if exists
    DELETE FROM public.customer_transactions 
    WHERE reference_type = 'receipt_voucher' AND reference_id = p_voucher_id;

    -- Update voucher
    UPDATE public.receipt_vouchers SET
      customer_id = p_customer_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    -- CREATE NEW VOUCHER
    v_number := 'RV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, customer_id,
      amount, payment_method, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_customer_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id, p_notes
    ) RETURNING id INTO v_id;
  END IF;

  -- Create customer transaction
  INSERT INTO public.customer_transactions (
    restaurant_id, customer_id, type, amount, description, payment_method,
    reference_type, reference_id
  ) VALUES (
    p_restaurant_id, p_customer_id, 'payment', -p_amount,
    COALESCE(p_notes, 'سند قبض'), p_payment_method,
    'receipt_voucher', v_id
  );

  -- Create journal entry
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'سند قبض من العميل: ' || COALESCE(v_customer_name, '') || COALESCE(' - ' || p_notes, ''),
    'receipt_voucher', v_id, 'ar',
    v_debit_account,
    v_credit_account,
    p_amount
  );

  UPDATE public.receipt_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- 2. Fix save_payment_voucher to use proper transaction handling
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_number TEXT;
  v_supplier_name TEXT;
  v_debit_account UUID;
  v_credit_account UUID;
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_supplier_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  -- Ensure COA is set up properly
  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  -- CREDIT side: always Cash or Bank
  v_credit_account := public.get_cash_account(p_restaurant_id);

  -- DEBIT side: the routed account (AP 2100 by default, or user-selected)
  v_debit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public.get_accounts_payable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    -- UPDATE EXISTING VOUCHER
    SELECT amount, supplier_id INTO v_old_amount, v_old_supplier_id
    FROM public.payment_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'إذن الدفع غير موجود'; END IF;

    -- Delete old journal entry if exists
    IF EXISTS (SELECT 1 FROM public.payment_vouchers WHERE id = p_voucher_id AND journal_entry_id IS NOT NULL) THEN
      DELETE FROM public.journal_entry_lines WHERE entry_id = (SELECT journal_entry_id FROM public.payment_vouchers WHERE id = p_voucher_id);
      DELETE FROM public.journal_entries WHERE id = (SELECT journal_entry_id FROM public.payment_vouchers WHERE id = p_voucher_id);
    END IF;

    -- Delete old supplier transaction if exists
    DELETE FROM public.supplier_transactions 
    WHERE reference_type = 'payment_voucher' AND reference_id = p_voucher_id;

    -- Update voucher
    UPDATE public.payment_vouchers SET
      supplier_id = p_supplier_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      reference_number = p_reference_number,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
  ELSE
    -- CREATE NEW VOUCHER
    v_number := 'PV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, supplier_id,
      amount, payment_method, account_id, counter_account_id,
      reference_number, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_supplier_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id,
      p_reference_number, p_notes
    ) RETURNING id INTO v_id;
  END IF;

  -- Create supplier transaction
  INSERT INTO public.supplier_transactions (
    restaurant_id, supplier_id, type, amount, description, payment_method,
    reference_type, reference_id
  ) VALUES (
    p_restaurant_id, p_supplier_id, 'payment', p_amount,
    COALESCE(p_notes, 'إذن دفع'), p_payment_method,
    'payment_voucher', v_id
  );

  -- Create journal entry
  v_journal_id := public._create_balanced_journal(
    p_restaurant_id, p_voucher_date,
    'إذن دفع للمورد: ' || COALESCE(v_supplier_name, '') || COALESCE(' - ' || p_notes, ''),
    'payment_voucher', v_id, 'ap',
    v_debit_account,
    v_credit_account,
    p_amount
  );

  UPDATE public.payment_vouchers SET journal_entry_id = v_journal_id WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- 3. Add reference_type and reference_id to customer_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customer_transactions'
    AND column_name = 'reference_type'
  ) THEN
    ALTER TABLE public.customer_transactions ADD COLUMN reference_type TEXT;
    ALTER TABLE public.customer_transactions ADD COLUMN reference_id UUID;
  END IF;
END
$$;

-- 4. Add reference_type and reference_id to supplier_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'supplier_transactions'
    AND column_name = 'reference_type'
  ) THEN
    ALTER TABLE public.supplier_transactions ADD COLUMN reference_type TEXT;
    ALTER TABLE public.supplier_transactions ADD COLUMN reference_id UUID;
  END IF;
END
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Receipt/Payment voucher transaction handling fixed';
END
$$;
