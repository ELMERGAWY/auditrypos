-- ============================================================
-- AUDITRY POS: Auto-Posting Hardening + Failure Queue
-- ============================================================
-- Goal:
-- - Never lose operational transaction when posting fails
-- - Record rich failure details for retry/audit
-- - Make triggers resilient across schema variations

BEGIN;

-- ============================================================
-- 1) Failure queue table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_posting_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  workspace_id uuid NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
  restaurant_id uuid NULL REFERENCES public.restaurants(id) ON DELETE SET NULL,

  source_table text NOT NULL,
  source_event text NOT NULL,
  source_id uuid NOT NULL,

  movement_type text NULL,
  movement_subtype text NULL,
  payment_method text NULL,
  amount numeric NULL,

  error_message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  retry_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'cancelled')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_gl_posting_failures_pending
  ON public.gl_posting_failures(status, created_at);

CREATE INDEX IF NOT EXISTS idx_gl_posting_failures_source
  ON public.gl_posting_failures(source_table, source_id);

ALTER TABLE public.gl_posting_failures ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gl_posting_failures_updated_at ON public.gl_posting_failures;
CREATE TRIGGER trg_gl_posting_failures_updated_at
BEFORE UPDATE ON public.gl_posting_failures
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_timestamp_updated_at();

-- ============================================================
-- 2) Logging helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_posting_failure(
  p_company_id uuid,
  p_workspace_id uuid,
  p_restaurant_id uuid,
  p_source_table text,
  p_source_event text,
  p_source_id uuid,
  p_movement_type text,
  p_movement_subtype text,
  p_payment_method text,
  p_amount numeric,
  p_error_message text,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.gl_posting_failures (
    company_id,
    workspace_id,
    restaurant_id,
    source_table,
    source_event,
    source_id,
    movement_type,
    movement_subtype,
    payment_method,
    amount,
    error_message,
    payload
  )
  VALUES (
    p_company_id,
    p_workspace_id,
    p_restaurant_id,
    p_source_table,
    p_source_event,
    p_source_id,
    p_movement_type,
    p_movement_subtype,
    p_payment_method,
    p_amount,
    left(COALESCE(p_error_message, 'unknown posting error'), 2000),
    COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 3) Replace trigger functions with resilient versions
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_autopost_orders_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_profile_code text;
  v_payment text;
  v_subtype text;
  v_entry_id uuid;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
    v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
    v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);
    v_payment := public.fn_normalize_payment_method(to_jsonb(NEW)->>'payment_method');
    v_subtype := v_payment || '_sale';

    v_entry_id := public.fn_autopost_transaction(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      v_profile_code,
      'sale',
      v_subtype,
      v_payment,
      COALESCE(NEW.total, 0),
      COALESCE(NEW.created_at::date, current_date),
      'Order sale #' || COALESCE(NEW.order_number, NEW.id::text),
      'orders',
      'status_completed',
      NEW.id,
      NULL
    );

    UPDATE public.orders
    SET journal_entry_id = v_entry_id
    WHERE id = NEW.id
      AND (journal_entry_id IS NULL OR journal_entry_id <> v_entry_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_log_posting_failure(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      'orders',
      'status_completed',
      NEW.id,
      'sale',
      COALESCE(v_subtype, 'cash_sale'),
      COALESCE(v_payment, 'cash'),
      COALESCE(NEW.total, 0),
      SQLERRM,
      to_jsonb(NEW)
    );
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_autopost_retail_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_profile_code text;
  v_payment text;
  v_subtype text;
  v_entry_id uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
    v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
    v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);
    v_payment := public.fn_normalize_payment_method(NEW.payment_method);
    v_subtype := v_payment || '_sale';

    v_entry_id := public.fn_autopost_transaction(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      v_profile_code,
      'sale',
      v_subtype,
      v_payment,
      COALESCE(NEW.total_amount, 0),
      COALESCE(NEW.sale_date, current_date),
      'Retail sale #' || COALESCE(NEW.invoice_number, NEW.id::text),
      'retail_sales',
      'inserted',
      NEW.id,
      NULL
    );

    NEW.journal_entry_id := v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_log_posting_failure(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      'retail_sales',
      'inserted',
      NEW.id,
      'sale',
      COALESCE(v_subtype, 'cash_sale'),
      COALESCE(v_payment, 'cash'),
      COALESCE(NEW.total_amount, 0),
      SQLERRM,
      to_jsonb(NEW)
    );
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_autopost_service_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_profile_code text;
  v_payment text;
  v_subtype text;
  v_entry_id uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, 'unpaid') NOT IN ('paid', 'partial') THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
    v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
    v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);
    v_payment := public.fn_normalize_payment_method(NEW.payment_method);
    v_subtype := v_payment || '_sale';

    v_entry_id := public.fn_autopost_transaction(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      v_profile_code,
      'sale',
      v_subtype,
      v_payment,
      COALESCE(NEW.total_amount, 0),
      COALESCE(NEW.invoice_date, current_date),
      'Service invoice #' || COALESCE(NEW.invoice_number, NEW.id::text),
      'service_invoices',
      'inserted_paid',
      NEW.id,
      NULL
    );

    NEW.journal_entry_id := v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_log_posting_failure(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      'service_invoices',
      'inserted_paid',
      NEW.id,
      'sale',
      COALESCE(v_subtype, 'cash_sale'),
      COALESCE(v_payment, 'cash'),
      COALESCE(NEW.total_amount, 0),
      SQLERRM,
      to_jsonb(NEW)
    );
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_autopost_inventory_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_profile_code text;
  v_payment text;
  v_subtype text;
  v_entry_id uuid;
BEGIN
  IF NEW.status <> 'posted' OR OLD.status = 'posted' THEN
    RETURN NEW;
  END IF;

  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
    v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
    v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);
    v_payment := CASE
      WHEN COALESCE(NEW.paid_amount, 0) <= 0 THEN 'credit'
      WHEN COALESCE(NEW.paid_amount, 0) >= COALESCE(NEW.net_amount, NEW.total_amount, 0) THEN 'cash'
      ELSE 'mixed'
    END;

    v_subtype := CASE
      WHEN v_payment = 'credit' THEN 'credit_purchase'
      WHEN v_payment = 'bank' THEN 'bank_purchase'
      ELSE 'cash_purchase'
    END;

    v_entry_id := public.fn_autopost_transaction(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      v_profile_code,
      'purchase',
      v_subtype,
      v_payment,
      COALESCE(NEW.net_amount, NEW.total_amount, 0),
      COALESCE(NEW.receipt_date, current_date),
      'Inventory receipt #' || COALESCE(NEW.receipt_number, NEW.id::text),
      'inventory_receipts',
      'status_posted',
      NEW.id,
      NEW.created_by
    );

    NEW.journal_entry_id := v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_log_posting_failure(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      'inventory_receipts',
      'status_posted',
      NEW.id,
      'purchase',
      COALESCE(v_subtype, 'cash_purchase'),
      COALESCE(v_payment, 'cash'),
      COALESCE(NEW.net_amount, NEW.total_amount, 0),
      SQLERRM,
      to_jsonb(NEW)
    );
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_autopost_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_workspace_id uuid;
  v_profile_code text;
  v_entry_id uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_company_id := public.fn_company_id_from_restaurant(NEW.restaurant_id);
    v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
    v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);

    v_entry_id := public.fn_autopost_transaction(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      v_profile_code,
      'expense',
      'cash_expense',
      'cash',
      COALESCE(NEW.amount, 0),
      COALESCE(NEW.date::date, current_date),
      'Expense - ' || COALESCE(NEW.category, 'General'),
      'expenses',
      'inserted',
      NEW.id,
      NULL
    );

    NEW.journal_entry_id := v_entry_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_log_posting_failure(
      v_company_id,
      v_workspace_id,
      NEW.restaurant_id,
      'expenses',
      'inserted',
      NEW.id,
      'expense',
      'cash_expense',
      'cash',
      COALESCE(NEW.amount, 0),
      SQLERRM,
      to_jsonb(NEW)
    );
  END;

  RETURN NEW;
END;
$$;

COMMIT;
