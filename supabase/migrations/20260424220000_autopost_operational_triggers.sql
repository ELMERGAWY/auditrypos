-- ============================================================
-- AUDITRY POS: Auto-Posting Operational Triggers
-- ============================================================
-- Goal:
-- - Connect operational movements (sale / purchase / expense) to GL auto-posting engine
-- - Resolve profile and payment mapping dynamically per company/workspace
-- - Keep posting idempotent and safe to rerun

BEGIN;

-- ============================================================
-- 1) Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_normalize_payment_method(p_method text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_method IS NULL OR btrim(p_method) = '' THEN 'cash'
    WHEN lower(p_method) IN ('cash', 'cash_on_delivery', 'cod') THEN 'cash'
    WHEN lower(p_method) IN ('card', 'visa', 'mastercard', 'mada', 'pos') THEN 'card'
    WHEN lower(p_method) IN ('bank', 'transfer', 'bank_transfer', 'wire') THEN 'bank'
    WHEN lower(p_method) IN ('credit', 'deferred', 'on_account', 'invoice') THEN 'credit'
    ELSE 'cash'
  END
$$;

CREATE OR REPLACE FUNCTION public.fn_get_profile_code(
  p_company_id uuid,
  p_workspace_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT cbp.profile_code
      FROM public.workspace_company_profiles wcp
      JOIN public.company_business_profiles cbp ON cbp.id = wcp.company_profile_id
      WHERE wcp.workspace_id = p_workspace_id
        AND wcp.is_active = true
        AND cbp.is_active = true
      LIMIT 1
    ),
    (
      SELECT cbp.profile_code
      FROM public.company_business_profiles cbp
      WHERE cbp.company_id = p_company_id
        AND cbp.is_active = true
      ORDER BY CASE WHEN cbp.is_default THEN 0 ELSE 1 END, cbp.created_at ASC
      LIMIT 1
    ),
    'restaurant'
  )
$$;

CREATE OR REPLACE FUNCTION public.fn_company_id_from_restaurant(p_restaurant_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT r.company_id
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id
  LIMIT 1
$$;

-- ============================================================
-- 2) Sale posting trigger functions
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

  v_company_id := COALESCE(NEW.company_id, public.fn_company_id_from_restaurant(NEW.restaurant_id));
  v_workspace_id := public.fn_default_workspace_id(NEW.restaurant_id);
  v_profile_code := public.fn_get_profile_code(v_company_id, v_workspace_id);
  v_payment := public.fn_normalize_payment_method(NULL);
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
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3) Purchase / expense posting trigger functions
-- ============================================================
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

  v_company_id := COALESCE(NEW.company_id, public.fn_company_id_from_restaurant(NEW.restaurant_id));
  v_workspace_id := COALESCE(NEW.workspace_id, public.fn_default_workspace_id(NEW.restaurant_id));
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

  v_company_id := COALESCE(NEW.company_id, public.fn_company_id_from_restaurant(NEW.restaurant_id));
  v_workspace_id := COALESCE(NEW.workspace_id, public.fn_default_workspace_id(NEW.restaurant_id));
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
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4) Trigger bindings (safe by table existence)
-- ============================================================
DO $$
BEGIN
  -- Disable legacy posting triggers to avoid duplicate journals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_post_order_sale_completed ON public.orders';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_autopost_orders_sale ON public.orders';
    EXECUTE 'CREATE TRIGGER trg_autopost_orders_sale AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_autopost_orders_sale()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='retail_sales') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_autopost_retail_sale ON public.retail_sales';
    EXECUTE 'CREATE TRIGGER trg_autopost_retail_sale BEFORE INSERT ON public.retail_sales FOR EACH ROW EXECUTE FUNCTION public.tg_autopost_retail_sale()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_invoices') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_autopost_service_invoice ON public.service_invoices';
    EXECUTE 'CREATE TRIGGER trg_autopost_service_invoice BEFORE INSERT ON public.service_invoices FOR EACH ROW EXECUTE FUNCTION public.tg_autopost_service_invoice()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_receipts') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_create_receipt_journal ON public.inventory_receipts';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_autopost_inventory_receipt ON public.inventory_receipts';
    EXECUTE 'CREATE TRIGGER trg_autopost_inventory_receipt BEFORE UPDATE ON public.inventory_receipts FOR EACH ROW EXECUTE FUNCTION public.tg_autopost_inventory_receipt()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_post_expense_journal ON public.expenses';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_create_expense_journal ON public.expenses';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_autopost_expense ON public.expenses';
    EXECUTE 'CREATE TRIGGER trg_autopost_expense BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.tg_autopost_expense()';
  END IF;
END $$;

COMMIT;
