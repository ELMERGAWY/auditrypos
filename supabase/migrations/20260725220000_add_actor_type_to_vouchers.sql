-- ============================================================
-- Add actor_type to vouchers to support both customers and suppliers
-- ============================================================

BEGIN;

-- Drop dependent view first
DROP VIEW IF EXISTS public.v_order_payments;

-- Add actor_type and actor_id columns to receipt_vouchers
ALTER TABLE public.receipt_vouchers 
ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS actor_id UUID;

-- Migrate existing customer_id to actor_id (only if customer_id still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receipt_vouchers' 
    AND column_name = 'customer_id'
    AND table_schema = 'public'
  ) THEN
    UPDATE public.receipt_vouchers 
    SET actor_id = customer_id, actor_type = 'customer'
    WHERE customer_id IS NOT NULL;
    
    -- Make actor_id NOT NULL after migration
    ALTER TABLE public.receipt_vouchers 
    ALTER COLUMN actor_id SET NOT NULL;
    
    -- Drop the old customer_id column (after migration)
    ALTER TABLE public.receipt_vouchers 
    DROP COLUMN IF EXISTS customer_id;
  END IF;
END $$;

-- Add constraint to ensure actor_type is valid (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'receipt_vouchers_actor_type_check'
  ) THEN
    ALTER TABLE public.receipt_vouchers 
    ADD CONSTRAINT receipt_vouchers_actor_type_check 
    CHECK (actor_type IN ('customer', 'supplier'));
  END IF;
END $$;

-- Note: We cannot add foreign key constraints that depend on actor_type
-- Foreign key validation will be handled at application level or via triggers

-- Add actor_type and actor_id columns to payment_vouchers
ALTER TABLE public.payment_vouchers 
ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'supplier',
ADD COLUMN IF NOT EXISTS actor_id UUID;

-- Migrate existing supplier_id to actor_id (only if supplier_id still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_vouchers' 
    AND column_name = 'supplier_id'
    AND table_schema = 'public'
  ) THEN
    UPDATE public.payment_vouchers 
    SET actor_id = supplier_id, actor_type = 'supplier'
    WHERE supplier_id IS NOT NULL;
    
    -- Make actor_id NOT NULL after migration
    ALTER TABLE public.payment_vouchers 
    ALTER COLUMN actor_id SET NOT NULL;
    
    -- Drop the old supplier_id column (after migration)
    ALTER TABLE public.payment_vouchers 
    DROP COLUMN IF EXISTS supplier_id;
  END IF;
END $$;

-- Add constraint to ensure actor_type is valid (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_vouchers_actor_type_check'
  ) THEN
    ALTER TABLE public.payment_vouchers 
    ADD CONSTRAINT payment_vouchers_actor_type_check 
    CHECK (actor_type IN ('customer', 'supplier'));
  END IF;
END $$;

-- Note: We cannot add foreign key constraints that depend on actor_type
-- Foreign key validation will be handled at application level or via triggers

-- Update indexes
DROP INDEX IF EXISTS idx_receipt_vouchers_restaurant;
CREATE INDEX idx_receipt_vouchers_restaurant ON public.receipt_vouchers(restaurant_id, actor_type, voucher_date DESC);

DROP INDEX IF EXISTS idx_payment_vouchers_restaurant;
CREATE INDEX idx_payment_vouchers_restaurant ON public.payment_vouchers(restaurant_id, actor_type, voucher_date DESC);

-- Update the save_receipt_voucher function to use actor_id and actor_type
CREATE OR REPLACE FUNCTION public.save_receipt_voucher(
  p_restaurant_id UUID,
  p_actor_id UUID,
  p_amount NUMERIC,
  p_actor_type TEXT DEFAULT 'customer',
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
  v_voucher_number TEXT;
  v_voucher_id UUID;
BEGIN
  IF p_voucher_id IS NOT NULL THEN
    -- Update existing voucher
    UPDATE public.receipt_vouchers
    SET 
      actor_id = p_actor_id,
      actor_type = p_actor_type,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      updated_at = NOW()
    WHERE id = p_voucher_id
    RETURNING id INTO v_voucher_id;
  ELSE
    -- Generate voucher number
    SELECT 'RV-' || LPAD((COALESCE(MAX(SUBSTRING(voucher_number FROM 4 FOR 6))::INTEGER, 0) + 1)::TEXT, 6, '0')
    INTO v_voucher_number
    FROM public.receipt_vouchers
    WHERE restaurant_id = p_restaurant_id;

    -- Create new voucher
    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, actor_id, actor_type,
      amount, payment_method, notes, account_id, counter_account_id
    ) VALUES (
      p_restaurant_id, v_voucher_number, p_voucher_date, p_actor_id, p_actor_type,
      p_amount, p_payment_method, p_notes, p_account_id, p_counter_account_id
    ) RETURNING id INTO v_voucher_id;
    
    -- Update customer balance if actor_type is 'customer' (payment reduces balance)
    IF p_actor_type = 'customer' THEN
      UPDATE public.customers
      SET balance = balance - p_amount
      WHERE id = p_actor_id;
    END IF;
    
    -- Update supplier balance if actor_type is 'supplier' (payment reduces balance)
    IF p_actor_type = 'supplier' THEN
      UPDATE public.suppliers
      SET balance = balance - p_amount
      WHERE id = p_actor_id;
    END IF;
  END IF;

  RETURN v_voucher_id;
END;
$$;

-- Update the save_payment_voucher function to use actor_id and actor_type
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_actor_id UUID,
  p_amount NUMERIC,
  p_actor_type TEXT DEFAULT 'supplier',
  p_payment_method TEXT DEFAULT 'cash',
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_counter_account_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_voucher_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher_number TEXT;
  v_voucher_id UUID;
BEGIN
  IF p_voucher_id IS NOT NULL THEN
    -- Update existing voucher
    UPDATE public.payment_vouchers
    SET 
      actor_id = p_actor_id,
      actor_type = p_actor_type,
      amount = p_amount,
      payment_method = p_payment_method,
      voucher_date = p_voucher_date,
      notes = p_notes,
      account_id = p_account_id,
      counter_account_id = p_counter_account_id,
      reference_number = p_reference_number,
      updated_at = NOW()
    WHERE id = p_voucher_id
    RETURNING id INTO v_voucher_id;
  ELSE
    -- Generate voucher number
    SELECT 'PV-' || LPAD((COALESCE(MAX(SUBSTRING(voucher_number FROM 4 FOR 6))::INTEGER, 0) + 1)::TEXT, 6, '0')
    INTO v_voucher_number
    FROM public.payment_vouchers
    WHERE restaurant_id = p_restaurant_id;

    -- Create new voucher
    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, actor_id, actor_type,
      amount, payment_method, notes, account_id, counter_account_id, reference_number
    ) VALUES (
      p_restaurant_id, v_voucher_number, p_voucher_date, p_actor_id, p_actor_type,
      p_amount, p_payment_method, p_notes, p_account_id, p_counter_account_id, p_reference_number
    ) RETURNING id INTO v_voucher_id;
    
    -- Update customer balance if actor_type is 'customer' (refund reduces balance)
    IF p_actor_type = 'customer' THEN
      UPDATE public.customers
      SET balance = balance - p_amount
      WHERE id = p_actor_id;
    END IF;
    
    -- Update supplier balance if actor_type is 'supplier' (refund reduces balance)
    IF p_actor_type = 'supplier' THEN
      UPDATE public.suppliers
      SET balance = balance - p_amount
      WHERE id = p_actor_id;
    END IF;
  END IF;

  RETURN v_voucher_id;
END;
$$;

-- Update delete_payment_voucher to use actor_id and actor_type
CREATE OR REPLACE FUNCTION public.delete_payment_voucher(p_voucher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.payment_vouchers WHERE id = p_voucher_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'إذن الدفع غير موجود'; END IF;

  -- Update balance based on actor_type
  IF v.actor_type = 'supplier' THEN
    UPDATE public.suppliers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.actor_id;
  ELSIF v.actor_type = 'customer' THEN
    UPDATE public.customers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.actor_id;
  END IF;

  IF v.journal_entry_id IS NOT NULL THEN
    DELETE FROM public.journal_entry_lines WHERE entry_id = v.journal_entry_id;
    DELETE FROM public.journal_entries WHERE id = v.journal_entry_id;
  END IF;

  DELETE FROM public.payment_vouchers WHERE id = p_voucher_id;
END;
$$;

-- Update delete_receipt_voucher to use actor_id and actor_type
CREATE OR REPLACE FUNCTION public.delete_receipt_voucher(p_voucher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.receipt_vouchers WHERE id = p_voucher_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'سند القبض غير موجود'; END IF;

  -- Update balance based on actor_type
  IF v.actor_type = 'customer' THEN
    UPDATE public.customers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.actor_id;
  ELSIF v.actor_type = 'supplier' THEN
    UPDATE public.suppliers SET balance = COALESCE(balance, 0) + v.amount WHERE id = v.actor_id;
  END IF;

  IF v.journal_entry_id IS NOT NULL THEN
    DELETE FROM public.journal_entry_lines WHERE entry_id = v.journal_entry_id;
    DELETE FROM public.journal_entries WHERE id = v.journal_entry_id;
  END IF;

  DELETE FROM public.receipt_vouchers WHERE id = p_voucher_id;
END;
$$;

-- Recreate the v_order_payments view with new column names
CREATE OR REPLACE VIEW public.v_order_payments AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.total as order_total,
  o.paid_amount as direct_paid,
  COALESCE(SUM(rv.amount), 0) as receipt_voucher_total,
  COALESCE(o.paid_amount, 0) + COALESCE(SUM(rv.amount), 0) as total_paid,
  o.total - (COALESCE(o.paid_amount, 0) + COALESCE(SUM(rv.amount), 0)) as remaining_balance
FROM public.orders o
LEFT JOIN public.receipt_vouchers rv ON rv.actor_id = o.customer_id
  AND rv.restaurant_id = o.restaurant_id
  AND rv.voucher_date >= o.created_at
  AND rv.actor_type = 'customer'
GROUP BY o.id, o.order_number, o.total, o.paid_amount;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Added actor_type to vouchers to support both customers and suppliers';
END;
$$;
