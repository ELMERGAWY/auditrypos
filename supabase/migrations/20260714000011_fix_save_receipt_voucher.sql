-- ============================================================
-- Fix save_receipt_voucher / save_payment_voucher numbering
-- ============================================================
-- Bug: accounting_fixes_critical used:
--   CAST(SUBSTRING(voucher_number FROM 5) AS INTEGER)
-- which fails when existing numbers are like "RV-60625-05031"
-- or any non-pure-numeric suffix → "invalid input syntax for type integer".
--
-- Also restore robust journal posting via _create_balanced_journal
-- and avoid returning the journal entry id instead of the voucher id.
-- ============================================================

-- Safer customer balance calc (amounts may be stored negative or positive)
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT COALESCE(SUM(
        CASE
          WHEN type IN ('invoice', 'sale', 'debit') THEN ABS(amount)
          WHEN type IN ('payment', 'sales_return', 'credit', 'credit_note') THEN -ABS(amount)
          ELSE 0
        END
      ), 0)
      FROM public.customer_transactions
      WHERE customer_id = p_customer_id
    ),
    0
  );
END;
$$;

DROP FUNCTION IF EXISTS public.save_receipt_voucher(
  UUID, UUID, NUMERIC, TEXT, DATE, TEXT, UUID, UUID, UUID
) CASCADE;

-- Drop any overload leftover from older migrations
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'save_receipt_voucher'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

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
  v_old_journal_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'يجب اختيار العميل';
  END IF;

  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name, customer_ref
  INTO v_customer_name, v_customer_ref
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'العميل غير موجود';
  END IF;

  -- Debit: cash/bank (UI p_account_id)  |  Credit: AR (UI p_counter_account_id)
  v_debit_account := COALESCE(p_account_id, public.get_cash_account(p_restaurant_id));
  v_credit_account := COALESCE(p_counter_account_id, public.get_accounts_receivable(p_restaurant_id));

  IF v_debit_account IS NULL OR v_credit_account IS NULL THEN
    RAISE EXCEPTION 'تعذر تحديد حسابات النقدية أو الذمم المدينة';
  END IF;

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, customer_id, journal_entry_id
    INTO v_old_amount, v_old_customer_id, v_old_journal_id
    FROM public.receipt_vouchers
    WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'سند القبض غير موجود';
    END IF;

    -- Remove previous linked CT + journal (balance trigger will recalc)
    DELETE FROM public.customer_transactions
    WHERE reference_type = 'receipt_voucher' AND reference_id = p_voucher_id;

    IF v_old_journal_id IS NOT NULL THEN
      DELETE FROM public.journal_entry_lines WHERE entry_id = v_old_journal_id;
      DELETE FROM public.journal_entries WHERE id = v_old_journal_id;
    END IF;

    UPDATE public.receipt_vouchers SET
      customer_id = p_customer_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = v_debit_account,
      counter_account_id = v_credit_account,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
    SELECT voucher_number INTO v_number FROM public.receipt_vouchers WHERE id = v_id;
  ELSE
    -- Unique text number — NEVER cast existing voucher_number to integer
    IF v_customer_ref IS NOT NULL AND TRIM(v_customer_ref) <> '' THEN
      v_number :=
        'RV-' || regexp_replace(TRIM(v_customer_ref), '[^A-Za-z0-9]+', '', 'g')
        || '-' || TO_CHAR(NOW(), 'YYMMDD')
        || '-' || LPAD((EXTRACT(EPOCH FROM clock_timestamp())::BIGINT % 100000)::TEXT, 5, '0');
    ELSE
      v_number :=
        'RV-' || TO_CHAR(NOW(), 'YYMMDD')
        || '-' || LPAD((EXTRACT(EPOCH FROM clock_timestamp())::BIGINT % 100000)::TEXT, 5, '0');
    END IF;

    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, customer_id,
      amount, payment_method, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_customer_id,
      p_amount, p_payment_method, v_debit_account, v_credit_account, p_notes
    )
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.customer_transactions (
    restaurant_id, customer_id, type, amount, description, payment_method,
    reference_type, reference_id
  ) VALUES (
    p_restaurant_id, p_customer_id, 'payment', -p_amount,
    COALESCE(NULLIF(TRIM(p_notes), ''), 'سند قبض رقم ' || v_number),
    p_payment_method, 'receipt_voucher', v_id
  );

  v_journal_id := public._create_balanced_journal(
    p_restaurant_id,
    p_voucher_date,
    'سند قبض من العميل: ' || COALESCE(v_customer_name, '') || COALESCE(' - ' || p_notes, ''),
    'receipt_voucher',
    v_id,
    'ar',
    v_debit_account,
    v_credit_account,
    p_amount
  );

  UPDATE public.receipt_vouchers
  SET journal_entry_id = v_journal_id
  WHERE id = v_id;

  -- Keep cached balance in sync (trigger may already do this)
  UPDATE public.customers
  SET balance = public.get_customer_balance(id)
  WHERE id = p_customer_id;

  IF v_old_customer_id IS NOT NULL AND v_old_customer_id <> p_customer_id THEN
    UPDATE public.customers
    SET balance = public.get_customer_balance(id)
    WHERE id = v_old_customer_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_receipt_voucher TO service_role;

-- Same numbering bug exists on payment vouchers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'save_payment_voucher'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

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
  v_old_journal_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  PERFORM public.seed_global_coa(p_restaurant_id, 'standard');

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = p_supplier_id;

  -- Debit AP, Credit cash/bank
  v_debit_account := COALESCE(p_counter_account_id, public.get_accounts_payable(p_restaurant_id));
  v_credit_account := COALESCE(p_account_id, public.get_cash_account(p_restaurant_id));

  IF p_voucher_id IS NOT NULL THEN
    SELECT amount, supplier_id, journal_entry_id
    INTO v_old_amount, v_old_supplier_id, v_old_journal_id
    FROM public.payment_vouchers
    WHERE id = p_voucher_id AND restaurant_id = p_restaurant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'سند الصرف غير موجود';
    END IF;

    IF v_old_journal_id IS NOT NULL THEN
      DELETE FROM public.journal_entry_lines WHERE entry_id = v_old_journal_id;
      DELETE FROM public.journal_entries WHERE id = v_old_journal_id;
    END IF;

    UPDATE public.payment_vouchers SET
      supplier_id = p_supplier_id,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      reference_number = p_reference_number,
      notes = p_notes,
      account_id = v_credit_account,
      counter_account_id = v_debit_account,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    v_id := p_voucher_id;
    SELECT voucher_number INTO v_number FROM public.payment_vouchers WHERE id = v_id;
  ELSE
    v_number :=
      'PAY-' || TO_CHAR(NOW(), 'YYMMDD')
      || '-' || LPAD((EXTRACT(EPOCH FROM clock_timestamp())::BIGINT % 100000)::TEXT, 5, '0');

    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, supplier_id,
      amount, payment_method, reference_number, account_id, counter_account_id, notes
    ) VALUES (
      p_restaurant_id, v_number, p_voucher_date, p_supplier_id,
      p_amount, p_payment_method, p_reference_number, v_credit_account, v_debit_account, p_notes
    )
    RETURNING id INTO v_id;
  END IF;

  v_journal_id := public._create_balanced_journal(
    p_restaurant_id,
    p_voucher_date,
    'سند صرف للمورد: ' || COALESCE(v_supplier_name, '') || COALESCE(' - ' || p_notes, ''),
    'payment_voucher',
    v_id,
    'ap',
    v_debit_account,
    v_credit_account,
    p_amount
  );

  UPDATE public.payment_vouchers
  SET journal_entry_id = v_journal_id
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_payment_voucher TO service_role;
