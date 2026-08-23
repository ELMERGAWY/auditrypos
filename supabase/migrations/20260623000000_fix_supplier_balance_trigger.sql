-- ============================================================
-- FIX SUPPLIER BALANCE CALCULATION - DYNAMIC FROM TRANSACTIONS
-- ============================================================

BEGIN;

-- 1. Create function to calculate supplier balance dynamically from transactions
CREATE OR REPLACE FUNCTION public.get_supplier_balance(p_supplier_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Some service deployments do not have the legacy supplier_transactions table.
  -- Return a safe zero until that optional transaction ledger is installed.
  IF to_regclass('public.supplier_transactions') IS NULL THEN
    RETURN 0;
  END IF;

  EXECUTE 'SELECT COALESCE(SUM(
    CASE
      WHEN type IN (''purchase'', ''invoice'', ''purchase_invoice'') THEN COALESCE(amount, 0)
      WHEN type IN (''payment'', ''payment_voucher'') THEN -COALESCE(amount, 0)
      WHEN type IN (''purchase_return'') THEN -COALESCE(amount, 0)
      WHEN type IN (''opening_balance'') THEN COALESCE(amount, 0)
      ELSE 0
    END
  ), 0)
  FROM public.supplier_transactions
  WHERE supplier_id = $1'
  INTO v_balance USING p_supplier_id;

  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Create function to recalculate and update supplier balance
CREATE OR REPLACE FUNCTION public.recalculate_supplier_balance(p_supplier_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Calculate balance from transactions
  v_balance := public.get_supplier_balance(p_supplier_id);
  
  -- Update supplier balance
  UPDATE public.suppliers
  SET balance = v_balance
  WHERE id = p_supplier_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger function to update supplier balance on transaction changes
CREATE OR REPLACE FUNCTION public.update_supplier_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update supplier balance when transaction is inserted, updated, or deleted
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_supplier_balance(NEW.supplier_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If supplier_id changed, update both old and new
    IF OLD.supplier_id != NEW.supplier_id THEN
      PERFORM public.recalculate_supplier_balance(OLD.supplier_id);
      PERFORM public.recalculate_supplier_balance(NEW.supplier_id);
    ELSE
      PERFORM public.recalculate_supplier_balance(NEW.supplier_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_supplier_balance(OLD.supplier_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4-5. Legacy transaction triggers are optional in the service schema.
DO $trigger_setup$
BEGIN
  IF to_regclass('public.supplier_transactions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_supplier_transaction_insert ON public.supplier_transactions';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_supplier_transaction_update ON public.supplier_transactions';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_supplier_transaction_delete ON public.supplier_transactions';

    EXECUTE 'CREATE TRIGGER trg_supplier_transaction_insert
      AFTER INSERT ON public.supplier_transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_supplier_balance_from_transaction()';
    EXECUTE 'CREATE TRIGGER trg_supplier_transaction_update
      AFTER UPDATE ON public.supplier_transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_supplier_balance_from_transaction()';
    EXECUTE 'CREATE TRIGGER trg_supplier_transaction_delete
      AFTER DELETE ON public.supplier_transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_supplier_balance_from_transaction()';
  ELSE
    RAISE NOTICE 'supplier_transactions is not installed; skipping legacy supplier balance triggers';
  END IF;
END;
$trigger_setup$;

-- 6. Recalculate all supplier balances only when the ledger exists.
DO $$
DECLARE
  v_supplier RECORD;
BEGIN
  IF to_regclass('public.supplier_transactions') IS NOT NULL
     AND to_regclass('public.suppliers') IS NOT NULL THEN
    FOR v_supplier IN SELECT id FROM public.suppliers LOOP
      PERFORM public.recalculate_supplier_balance(v_supplier.id);
    END LOOP;
    RAISE NOTICE '✅ Recalculated all supplier balances';
  ELSE
    RAISE NOTICE 'supplier_transactions or suppliers is not installed; skipped supplier balance recalculation';
  END IF;
END
$$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_supplier_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_supplier_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_supplier_balance_from_transaction TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Supplier balance calculation fix applied';
  RAISE NOTICE '✅ All supplier balances recalculated from transactions';
END
$$;
