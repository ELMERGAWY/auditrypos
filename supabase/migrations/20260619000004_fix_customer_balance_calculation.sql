-- ============================================================
-- FIX CUSTOMER BALANCE CALCULATION - DYNAMIC FROM TRANSACTIONS
-- ============================================================

BEGIN;

-- 1. Create function to calculate customer balance dynamically from transactions
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Calculate balance from all customer transactions
  -- Positive amounts increase balance (debt), negative amounts decrease balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('invoice', 'sale', 'service_invoice') THEN COALESCE(amount, 0)
      WHEN type IN ('payment', 'receipt_voucher') THEN -COALESCE(amount, 0)
      WHEN type IN ('sales_return') THEN -COALESCE(amount, 0)
      WHEN type IN ('opening_balance') THEN COALESCE(amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.customer_transactions
  WHERE customer_id = p_customer_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Create function to recalculate and update customer balance
CREATE OR REPLACE FUNCTION public.recalculate_customer_balance(p_customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Calculate balance from transactions
  v_balance := public.get_customer_balance(p_customer_id);
  
  -- Update customer balance
  UPDATE public.customers
  SET balance = v_balance,
      updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger function to update customer balance on transaction changes
CREATE OR REPLACE FUNCTION public.update_customer_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer balance when transaction is inserted, updated, or deleted
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_customer_balance(NEW.customer_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If customer_id changed, update both old and new
    IF OLD.customer_id != NEW.customer_id THEN
      PERFORM public.recalculate_customer_balance(OLD.customer_id);
      PERFORM public.recalculate_customer_balance(NEW.customer_id);
    ELSE
      PERFORM public.recalculate_customer_balance(NEW.customer_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_customer_balance(OLD.customer_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_customer_transaction_insert ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_update ON public.customer_transactions;
DROP TRIGGER IF EXISTS trg_customer_transaction_delete ON public.customer_transactions;

-- 5. Create new triggers
CREATE TRIGGER trg_customer_transaction_insert
AFTER INSERT ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

CREATE TRIGGER trg_customer_transaction_update
AFTER UPDATE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

CREATE TRIGGER trg_customer_transaction_delete
AFTER DELETE ON public.customer_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_balance_from_transaction();

-- 6. Recalculate all customer balances
DO $$
DECLARE
  v_customer RECORD;
BEGIN
  FOR v_customer IN SELECT id FROM public.customers LOOP
    PERFORM public.recalculate_customer_balance(v_customer.id);
  END LOOP;
  
  RAISE NOTICE '✅ Recalculated all customer balances';
END
$$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_customer_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_balance_from_transaction TO authenticated;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Customer balance calculation fix applied';
  RAISE NOTICE '✅ All customer balances recalculated from transactions';
END
$$;
