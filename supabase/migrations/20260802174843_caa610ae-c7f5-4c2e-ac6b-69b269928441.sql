-- 1) Fix the unbalanced-line trigger: totals recalc per row (no raise), balance validated at COMMIT
CREATE OR REPLACE FUNCTION public.recalc_journal_totals(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dr numeric(15,2); v_cr numeric(15,2);
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO v_dr, v_cr
  FROM public.journal_entry_lines WHERE entry_id = p_entry_id;
  UPDATE public.journal_entries SET total_debit = v_dr, total_credit = v_cr WHERE id = p_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_je_lines_balance_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_entry uuid; v_dr numeric(15,2); v_cr numeric(15,2); v_cnt int;
BEGIN
  v_entry := COALESCE(NEW.entry_id, OLD.entry_id);
  IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE id = v_entry) THEN
    RETURN NULL;
  END IF;
  SELECT COUNT(*), COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO v_cnt, v_dr, v_cr
  FROM public.journal_entry_lines WHERE entry_id = v_entry;
  IF v_cnt > 0 AND ROUND(v_dr,2) <> ROUND(v_cr,2) THEN
    RAISE EXCEPTION 'Unbalanced JE %, DR %, CR %', v_entry, v_dr, v_cr;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_je_lines_balance_check ON public.journal_entry_lines;
CREATE CONSTRAINT TRIGGER trg_je_lines_balance_check
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.trg_je_lines_balance_check();

-- 2) Generic document posting helper
CREATE OR REPLACE FUNCTION public.fn_upsert_doc_journal(
  p_restaurant_id uuid,
  p_ref_type text,
  p_ref_id uuid,
  p_date date,
  p_description text,
  p_source text,
  p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_company uuid;
  v_dr numeric(15,2);
  v_cr numeric(15,2);
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM((l->>'debit')::numeric),0), COALESCE(SUM((l->>'credit')::numeric),0)
    INTO v_dr, v_cr
  FROM jsonb_array_elements(p_lines) l;

  IF ROUND(v_dr,2) <> ROUND(v_cr,2) OR ROUND(v_dr,2) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT company_id INTO v_company FROM public.restaurants WHERE id = p_restaurant_id;

  DELETE FROM public.journal_entries
  WHERE restaurant_id = p_restaurant_id
    AND reference_type = p_ref_type
    AND reference_id = p_ref_id;

  INSERT INTO public.journal_entries (
    restaurant_id, entry_date, reference_type, reference_id, description,
    source, source_module, source_event, source_id,
    is_posted, posted_at, workflow_status, company_id
  ) VALUES (
    p_restaurant_id, COALESCE(p_date, CURRENT_DATE), p_ref_type, p_ref_id, p_description,
    p_source, p_source, 'auto_post', p_ref_id,
    TRUE, now(), 'posted', v_company
  ) RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description, line_order, company_id)
  SELECT v_entry_id,
         (l->>'account_id')::uuid,
         ROUND(COALESCE((l->>'debit')::numeric,0),2),
         ROUND(COALESCE((l->>'credit')::numeric,0),2),
         COALESCE(l->>'description', p_description),
         COALESCE((l->>'line_order')::int, ord::int),
         v_company
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ord)
  WHERE (l->>'account_id') IS NOT NULL
    AND (COALESCE((l->>'debit')::numeric,0) <> 0 OR COALESCE((l->>'credit')::numeric,0) <> 0);

  PERFORM public.recalc_journal_totals(v_entry_id);
  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_upsert_doc_journal(uuid,text,uuid,date,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_upsert_doc_journal(uuid,text,uuid,date,text,text,jsonb) TO authenticated, service_role;

-- 3) Auto-post POS orders (insert + update), fail-safe
CREATE OR REPLACE FUNCTION public.fn_autopost_order_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lines jsonb := '[]'::jsonb;
  v_entry uuid;
  v_total numeric(15,2);
  v_paid numeric(15,2);
  v_credit numeric(15,2);
  v_cost numeric(15,2);
  v_cash uuid; v_ar uuid; v_sales uuid; v_cogs uuid; v_inv uuid;
BEGIN
  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.journal_entries
      WHERE restaurant_id = NEW.restaurant_id AND reference_type = 'order' AND reference_id = NEW.id;
    RETURN NULL;
  END IF;

  v_total := ROUND(COALESCE(NEW.total,0),2);
  IF v_total <= 0 THEN RETURN NULL; END IF;

  v_paid := LEAST(v_total, ROUND(GREATEST(COALESCE(NEW.paid_amount,0), COALESCE(NEW.direct_paid_amount,0)),2));
  v_credit := ROUND(v_total - v_paid, 2);
  v_cost := ROUND(COALESCE(NEW.total_cost,0),2);

  v_sales := public.get_sales_account(NEW.restaurant_id);
  v_cash  := public.get_cash_account(NEW.restaurant_id);
  v_ar    := public.get_accounts_receivable(NEW.restaurant_id);

  IF v_paid > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_cash, 'debit', v_paid, 'credit', 0, 'description', 'تحصيل طلب ' || NEW.order_number);
  END IF;
  IF v_credit > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_ar, 'debit', v_credit, 'credit', 0, 'description', 'آجل طلب ' || NEW.order_number);
  END IF;
  v_lines := v_lines || jsonb_build_object('account_id', v_sales, 'debit', 0, 'credit', v_total, 'description', 'مبيعات طلب ' || NEW.order_number);

  IF v_cost > 0 THEN
    v_cogs := public.get_cogs_account(NEW.restaurant_id);
    v_inv  := public.get_inventory_account(NEW.restaurant_id);
    v_lines := v_lines
      || jsonb_build_object('account_id', v_cogs, 'debit', v_cost, 'credit', 0, 'description', 'تكلفة مبيعات ' || NEW.order_number)
      || jsonb_build_object('account_id', v_inv, 'debit', 0, 'credit', v_cost, 'description', 'صرف مخزون ' || NEW.order_number);
  END IF;

  v_entry := public.fn_upsert_doc_journal(
    NEW.restaurant_id, 'order', NEW.id, COALESCE(NEW.created_at::date, CURRENT_DATE),
    'قيد مبيعات - طلب رقم ' || NEW.order_number, 'sales', v_lines
  );

  IF v_entry IS NOT NULL AND NEW.journal_entry_id IS DISTINCT FROM v_entry THEN
    UPDATE public.orders SET journal_entry_id = v_entry WHERE id = NEW.id;
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Auto-post order % failed: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_autopost_order_journal ON public.orders;
CREATE TRIGGER trg_autopost_order_journal
  AFTER INSERT OR UPDATE OF total, paid_amount, direct_paid_amount, total_cost, status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_autopost_order_journal();

-- 4) Auto-post sales invoices
CREATE OR REPLACE FUNCTION public.fn_autopost_sales_invoice_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lines jsonb := '[]'::jsonb;
  v_rest uuid; v_entry uuid;
  v_total numeric(15,2); v_paid numeric(15,2); v_credit numeric(15,2); v_tax numeric(15,2);
  v_cash uuid; v_ar uuid; v_sales uuid; v_taxacc uuid;
BEGIN
  v_rest := NEW.restaurant_id;
  IF v_rest IS NULL THEN
    SELECT id INTO v_rest FROM public.restaurants WHERE company_id = NEW.company_id LIMIT 1;
  END IF;
  IF v_rest IS NULL THEN RETURN NULL; END IF;

  IF NEW.status = 'cancelled' OR NEW.status = 'void' THEN
    DELETE FROM public.journal_entries WHERE restaurant_id = v_rest AND reference_type = 'sales_invoice' AND reference_id = NEW.id;
    RETURN NULL;
  END IF;

  -- avoid double posting when invoice mirrors an order already posted
  IF NEW.order_id IS NOT NULL THEN RETURN NULL; END IF;

  v_total := ROUND(COALESCE(NEW.total_amount,0),2);
  IF v_total <= 0 THEN RETURN NULL; END IF;
  v_tax := ROUND(COALESCE(NEW.tax_amount,0),2);
  v_paid := LEAST(v_total, ROUND(COALESCE(NEW.paid_amount,0),2));
  v_credit := ROUND(v_total - v_paid, 2);

  v_sales := public.get_sales_account(v_rest);
  v_cash  := public.get_cash_account(v_rest);
  v_ar    := public.get_accounts_receivable(v_rest);

  IF v_paid > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_cash, 'debit', v_paid, 'credit', 0, 'description', 'تحصيل فاتورة ' || NEW.invoice_number);
  END IF;
  IF v_credit > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_ar, 'debit', v_credit, 'credit', 0, 'description', 'ذمم فاتورة ' || NEW.invoice_number);
  END IF;

  IF v_tax > 0 THEN
    v_taxacc := public._get_or_create_account(v_rest, '2100', 'ضريبة القيمة المضافة المستحقة', 'liability', 'current_liability', 'vat_payable', 'credit', FALSE, FALSE);
    v_lines := v_lines
      || jsonb_build_object('account_id', v_sales, 'debit', 0, 'credit', ROUND(v_total - v_tax,2), 'description', 'مبيعات فاتورة ' || NEW.invoice_number)
      || jsonb_build_object('account_id', v_taxacc, 'debit', 0, 'credit', v_tax, 'description', 'ضريبة فاتورة ' || NEW.invoice_number);
  ELSE
    v_lines := v_lines || jsonb_build_object('account_id', v_sales, 'debit', 0, 'credit', v_total, 'description', 'مبيعات فاتورة ' || NEW.invoice_number);
  END IF;

  v_entry := public.fn_upsert_doc_journal(v_rest, 'sales_invoice', NEW.id, COALESCE(NEW.invoice_date, CURRENT_DATE),
    'قيد فاتورة مبيعات ' || NEW.invoice_number, 'sales_invoice', v_lines);

  IF v_entry IS NOT NULL AND NEW.journal_entry_id IS DISTINCT FROM v_entry THEN
    UPDATE public.sales_invoices SET journal_entry_id = v_entry WHERE id = NEW.id;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Auto-post sales invoice % failed: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_autopost_sales_invoice_journal ON public.sales_invoices;
CREATE TRIGGER trg_autopost_sales_invoice_journal
  AFTER INSERT OR UPDATE OF total_amount, tax_amount, paid_amount, status ON public.sales_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_autopost_sales_invoice_journal();

-- 5) Auto-post purchase invoices
CREATE OR REPLACE FUNCTION public.fn_autopost_purchase_invoice_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lines jsonb := '[]'::jsonb;
  v_entry uuid;
  v_total numeric(15,2); v_tax numeric(15,2); v_net numeric(15,2);
  v_paid numeric(15,2); v_credit numeric(15,2);
  v_inv uuid; v_ap uuid; v_cash uuid; v_taxacc uuid;
BEGIN
  IF NEW.status IN ('cancelled','void') THEN
    DELETE FROM public.journal_entries WHERE restaurant_id = NEW.restaurant_id AND reference_type = 'purchase_invoice' AND reference_id = NEW.id;
    RETURN NULL;
  END IF;

  v_total := ROUND(COALESCE(NEW.total_amount,0),2);
  IF v_total <= 0 THEN RETURN NULL; END IF;
  v_tax := ROUND(COALESCE(NEW.tax_amount,0),2);
  v_net := ROUND(v_total - v_tax, 2);
  IF v_net < 0 THEN v_net := v_total; v_tax := 0; END IF;
  v_paid := LEAST(v_total, ROUND(COALESCE(NEW.paid_amount,0),2));
  v_credit := ROUND(v_total - v_paid, 2);

  v_inv  := public.get_inventory_account(NEW.restaurant_id);
  v_ap   := public.get_accounts_payable(NEW.restaurant_id);
  v_cash := public.get_cash_account(NEW.restaurant_id);

  v_lines := v_lines || jsonb_build_object('account_id', v_inv, 'debit', v_net, 'credit', 0, 'description', 'مشتريات مخزون فاتورة ' || NEW.invoice_number);

  IF v_tax > 0 THEN
    v_taxacc := public._get_or_create_account(NEW.restaurant_id, '1400', 'ضريبة القيمة المضافة المدفوعة', 'asset', 'current_asset', 'vat_receivable', 'debit', FALSE, FALSE);
    v_lines := v_lines || jsonb_build_object('account_id', v_taxacc, 'debit', v_tax, 'credit', 0, 'description', 'ضريبة مشتريات ' || NEW.invoice_number);
  END IF;

  IF v_paid > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_cash, 'debit', 0, 'credit', v_paid, 'description', 'سداد فاتورة مشتريات ' || NEW.invoice_number);
  END IF;
  IF v_credit > 0 THEN
    v_lines := v_lines || jsonb_build_object('account_id', v_ap, 'debit', 0, 'credit', v_credit, 'description', 'مستحق لمورد - فاتورة ' || NEW.invoice_number);
  END IF;

  v_entry := public.fn_upsert_doc_journal(NEW.restaurant_id, 'purchase_invoice', NEW.id, COALESCE(NEW.invoice_date, CURRENT_DATE),
    'قيد فاتورة مشتريات ' || NEW.invoice_number, 'purchase', v_lines);

  IF v_entry IS NOT NULL AND NEW.journal_entry_id IS DISTINCT FROM v_entry THEN
    UPDATE public.purchase_invoices SET journal_entry_id = v_entry WHERE id = NEW.id;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Auto-post purchase invoice % failed: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_autopost_purchase_invoice_journal ON public.purchase_invoices;
CREATE TRIGGER trg_autopost_purchase_invoice_journal
  AFTER INSERT OR UPDATE OF total_amount, tax_amount, paid_amount, status ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_autopost_purchase_invoice_journal();

-- 6) Disable the legacy order posting trigger (superseded)
DROP TRIGGER IF EXISTS trg_post_order_to_journal ON public.orders;

-- 7) Clean up previously created empty (line-less) auto entries
DELETE FROM public.journal_entries je
WHERE NOT EXISTS (SELECT 1 FROM public.journal_entry_lines l WHERE l.entry_id = je.id)
  AND je.total_debit = 0 AND je.total_credit = 0;