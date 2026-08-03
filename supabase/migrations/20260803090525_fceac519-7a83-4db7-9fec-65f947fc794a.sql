CREATE OR REPLACE FUNCTION public.fn_autopost_voucher_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_receipt boolean := (TG_TABLE_NAME = 'receipt_vouchers');
  v_debit_acc uuid;
  v_credit_acc uuid;
  v_entry_id uuid;
  v_lines jsonb;
  v_desc text;
BEGIN
  IF COALESCE(NEW.amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_is_receipt THEN
    v_debit_acc  := COALESCE(NEW.account_id, public._resolve_payment_account(NEW.restaurant_id, NEW.payment_method));
    v_credit_acc := COALESCE(NEW.counter_account_id, public.get_accounts_receivable(NEW.restaurant_id));
    v_desc := 'سند قبض رقم ' || COALESCE(NEW.voucher_number, '');
  ELSE
    v_debit_acc  := COALESCE(NEW.counter_account_id, public.get_accounts_payable(NEW.restaurant_id));
    v_credit_acc := COALESCE(NEW.account_id, public._resolve_payment_account(NEW.restaurant_id, NEW.payment_method));
    v_desc := 'سند صرف رقم ' || COALESCE(NEW.voucher_number, '');
  END IF;

  IF v_debit_acc IS NULL OR v_credit_acc IS NULL OR v_debit_acc = v_credit_acc THEN
    RETURN NEW;
  END IF;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', v_debit_acc,  'debit', NEW.amount, 'credit', 0, 'description', v_desc, 'line_order', 1),
    jsonb_build_object('account_id', v_credit_acc, 'debit', 0, 'credit', NEW.amount, 'description', v_desc, 'line_order', 2)
  );

  v_entry_id := public.fn_upsert_doc_journal(
    NEW.restaurant_id,
    CASE WHEN v_is_receipt THEN 'receipt_voucher' ELSE 'payment_voucher' END,
    NEW.id,
    NEW.voucher_date,
    v_desc,
    CASE WHEN v_is_receipt THEN 'ar' ELSE 'ap' END,
    v_lines
  );

  IF v_entry_id IS NOT NULL AND NEW.journal_entry_id IS DISTINCT FROM v_entry_id THEN
    IF v_is_receipt THEN
      UPDATE public.receipt_vouchers SET journal_entry_id = v_entry_id WHERE id = NEW.id;
    ELSE
      UPDATE public.payment_vouchers SET journal_entry_id = v_entry_id WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'voucher autopost failed for % %: %', TG_TABLE_NAME, NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

DO $backfill$
DECLARE
  r record;
  v_debit uuid;
  v_credit uuid;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT * FROM public.receipt_vouchers rv
    WHERE COALESCE(rv.amount,0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries je
                      WHERE je.reference_type = 'receipt_voucher' AND je.reference_id = rv.id)
  LOOP
    v_debit  := COALESCE(r.account_id, public._resolve_payment_account(r.restaurant_id, r.payment_method));
    v_credit := COALESCE(r.counter_account_id, public.get_accounts_receivable(r.restaurant_id));
    CONTINUE WHEN v_debit IS NULL OR v_credit IS NULL OR v_debit = v_credit;

    v_id := public.fn_upsert_doc_journal(
      r.restaurant_id, 'receipt_voucher', r.id, r.voucher_date,
      'سند قبض رقم ' || COALESCE(r.voucher_number, ''), 'ar',
      jsonb_build_array(
        jsonb_build_object('account_id', v_debit,  'debit', r.amount, 'credit', 0, 'line_order', 1),
        jsonb_build_object('account_id', v_credit, 'debit', 0, 'credit', r.amount, 'line_order', 2)
      )
    );
    IF v_id IS NOT NULL THEN
      UPDATE public.receipt_vouchers SET journal_entry_id = v_id WHERE id = r.id;
    END IF;
  END LOOP;

  FOR r IN
    SELECT * FROM public.payment_vouchers pv
    WHERE COALESCE(pv.amount,0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries je
                      WHERE je.reference_type = 'payment_voucher' AND je.reference_id = pv.id)
  LOOP
    v_debit  := COALESCE(r.counter_account_id, public.get_accounts_payable(r.restaurant_id));
    v_credit := COALESCE(r.account_id, public._resolve_payment_account(r.restaurant_id, r.payment_method));
    CONTINUE WHEN v_debit IS NULL OR v_credit IS NULL OR v_debit = v_credit;

    v_id := public.fn_upsert_doc_journal(
      r.restaurant_id, 'payment_voucher', r.id, r.voucher_date,
      'سند صرف رقم ' || COALESCE(r.voucher_number, ''), 'ap',
      jsonb_build_array(
        jsonb_build_object('account_id', v_debit,  'debit', r.amount, 'credit', 0, 'line_order', 1),
        jsonb_build_object('account_id', v_credit, 'debit', 0, 'credit', r.amount, 'line_order', 2)
      )
    );
    IF v_id IS NOT NULL THEN
      UPDATE public.payment_vouchers SET journal_entry_id = v_id WHERE id = r.id;
    END IF;
  END LOOP;
END;
$backfill$;