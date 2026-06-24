-- Update save_receipt_voucher to include customer reference in voucher number
BEGIN;

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
  v_customer_ref TEXT;
  v_debit_account UUID;
  v_credit_account UUID;
  v_journal_id UUID;
  v_old_amount NUMERIC := 0;
  v_old_customer_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر'; END IF;

  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name, customer_ref INTO v_customer_name, v_customer_ref FROM public.customers WHERE id = p_customer_id;

  v_debit_account := public.get_cash_account(p_restaurant_id);

  v_credit_account := COALESCE(
    p_account_id,
    p_counter_account_id,
    public.get_accounts_receivable(p_restaurant_id)
  );

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, customer_id INTO v_old_amount, v_old_customer_id
    FROM public.receipt_vouchers WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

    UPDATE public.customers SET balance = COALESCE(balance, 0) + v_old_amount WHERE id = v_old_customer_id;

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
    -- Generate voucher number with customer ref if available
    IF v_customer_ref IS NOT NULL AND TRIM(v_customer_ref) <> '' THEN
      v_number := 'RV-' || TRIM(v_customer_ref) || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');
    ELSE
      v_number := 'RV-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');
    END IF;

    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, customer_id,
      amount, payment_method, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_customer_id,
      p_amount, p_payment_method, p_account_id, p_counter_account_id, p_notes
    ) RETURNING id INTO v_id;

    INSERT INTO public.customer_transactions (
      restaurant_id, customer_id, type, amount, description, payment_method, reference_type, reference_id
    ) VALUES (
      p_restaurant_id, p_customer_id, 'payment', -p_amount,
      COALESCE(p_notes, 'سند قبض'), p_payment_method, 'receipt_voucher', v_id
    );
  END IF;

  UPDATE public.customers
  SET balance = COALESCE(balance, 0) - p_amount
  WHERE id = p_customer_id;

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

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Updated save_receipt_voucher to use customer ref in numbering and added reference_type/reference_id to customer_transactions';
END $$;
