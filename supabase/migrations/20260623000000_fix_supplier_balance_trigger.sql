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
  -- Calculate balance from all supplier transactions
  -- Positive amounts increase balance (we owe them), negative amounts decrease balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('purchase', 'invoice', 'purchase_invoice') THEN COALESCE(amount, 0)
      WHEN type IN ('payment', 'payment_voucher') THEN -COALESCE(amount, 0)
      WHEN type IN ('purchase_return') THEN -COALESCE(amount, 0)
      WHEN type IN ('opening_balance') THEN COALESCE(amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.supplier_transactions
  WHERE supplier_id = p_supplier_id;
  
  RETURN v_balance;
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

-- 4. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_supplier_transaction_insert ON public.supplier_transactions;
DROP TRIGGER IF EXISTS trg_supplier_transaction_update ON public.supplier_transactions;
DROP TRIGGER IF EXISTS trg_supplier_transaction_delete ON public.supplier_transactions;

-- 5. Create new triggers
CREATE TRIGGER trg_supplier_transaction_insert
AFTER INSERT ON public.supplier_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_balance_from_transaction();

CREATE TRIGGER trg_supplier_transaction_update
AFTER UPDATE ON public.supplier_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_balance_from_transaction();

CREATE TRIGGER trg_supplier_transaction_delete
AFTER DELETE ON public.supplier_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_balance_from_transaction();

-- 6. Recalculate all supplier balances
DO $$
DECLARE
  v_supplier RECORD;
BEGIN
  FOR v_supplier IN SELECT id FROM public.suppliers LOOP
    PERFORM public.recalculate_supplier_balance(v_supplier.id);
  END LOOP;
  
  RAISE NOTICE '✅ Recalculated all supplier balances';
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
