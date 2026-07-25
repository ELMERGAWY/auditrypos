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

-- Migrate existing customer_id to actor_id
UPDATE public.receipt_vouchers 
SET actor_id = customer_id, actor_type = 'customer'
WHERE customer_id IS NOT NULL;

-- Make actor_id NOT NULL after migration
ALTER TABLE public.receipt_vouchers 
ALTER COLUMN actor_id SET NOT NULL;

-- Drop the old customer_id column (after migration)
ALTER TABLE public.receipt_vouchers 
DROP COLUMN IF EXISTS customer_id;

-- Add constraint to ensure actor_type is valid
ALTER TABLE public.receipt_vouchers 
ADD CONSTRAINT receipt_vouchers_actor_type_check 
CHECK (actor_type IN ('customer', 'supplier'));

-- Add foreign key constraints based on actor_type
ALTER TABLE public.receipt_vouchers 
ADD CONSTRAINT receipt_vouchers_actor_customer_fk 
FOREIGN KEY (actor_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.receipt_vouchers 
ADD CONSTRAINT receipt_vouchers_actor_supplier_fk 
FOREIGN KEY (actor_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

-- Add actor_type and actor_id columns to payment_vouchers
ALTER TABLE public.payment_vouchers 
ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'supplier',
ADD COLUMN IF NOT EXISTS actor_id UUID;

-- Migrate existing supplier_id to actor_id
UPDATE public.payment_vouchers 
SET actor_id = supplier_id, actor_type = 'supplier'
WHERE supplier_id IS NOT NULL;

-- Make actor_id NOT NULL after migration
ALTER TABLE public.payment_vouchers 
ALTER COLUMN actor_id SET NOT NULL;

-- Drop the old supplier_id column (after migration)
ALTER TABLE public.payment_vouchers 
DROP COLUMN IF EXISTS supplier_id;

-- Add constraint to ensure actor_type is valid
ALTER TABLE public.payment_vouchers 
ADD CONSTRAINT payment_vouchers_actor_type_check 
CHECK (actor_type IN ('customer', 'supplier'));

-- Add foreign key constraints based on actor_type
ALTER TABLE public.payment_vouchers 
ADD CONSTRAINT payment_vouchers_actor_customer_fk 
FOREIGN KEY (actor_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

ALTER TABLE public.payment_vouchers 
ADD CONSTRAINT payment_vouchers_actor_supplier_fk 
FOREIGN KEY (actor_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

-- Update indexes
DROP INDEX IF EXISTS idx_receipt_vouchers_restaurant;
CREATE INDEX idx_receipt_vouchers_restaurant ON public.receipt_vouchers(restaurant_id, actor_type, voucher_date DESC);

DROP INDEX IF EXISTS idx_payment_vouchers_restaurant;
CREATE INDEX idx_payment_vouchers_restaurant ON public.payment_vouchers(restaurant_id, actor_type, voucher_date DESC);

-- Update the save_receipt_voucher function to use actor_id
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
  v_voucher_number TEXT;
  v_voucher_id UUID;
BEGIN
  IF p_voucher_id IS NOT NULL THEN
    -- Update existing voucher
    UPDATE public.receipt_vouchers
    SET 
      actor_id = p_customer_id,
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
    SELECT 'RV-' || LPAD(COALESCE(MAX(SUBSTRING(voucher_number FROM 4 FOR 6))::INTEGER, 0) + 1::TEXT, 6, '0')
    INTO v_voucher_number
    FROM public.receipt_vouchers
    WHERE restaurant_id = p_restaurant_id;

    -- Create new voucher
    INSERT INTO public.receipt_vouchers (
      restaurant_id, voucher_number, voucher_date, actor_id, actor_type,
      amount, payment_method, notes, account_id, counter_account_id
    ) VALUES (
      p_restaurant_id, v_voucher_number, p_voucher_date, p_customer_id, 'customer',
      p_amount, p_payment_method, p_notes, p_account_id, p_counter_account_id
    ) RETURNING id INTO v_voucher_id;
  END IF;

  RETURN v_voucher_id;
END;
$$;

-- Update the save_payment_voucher function to use actor_id
CREATE OR REPLACE FUNCTION public.save_payment_voucher(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_amount NUMERIC,
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
      actor_id = p_supplier_id,
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
    SELECT 'PV-' || LPAD(COALESCE(MAX(SUBSTRING(voucher_number FROM 4 FOR 6))::INTEGER, 0) + 1::TEXT, 6, '0')
    INTO v_voucher_number
    FROM public.payment_vouchers
    WHERE restaurant_id = p_restaurant_id;

    -- Create new voucher
    INSERT INTO public.payment_vouchers (
      restaurant_id, voucher_number, voucher_date, actor_id, actor_type,
      amount, payment_method, notes, account_id, counter_account_id, reference_number
    ) VALUES (
      p_restaurant_id, v_voucher_number, p_voucher_date, p_supplier_id, 'supplier',
      p_amount, p_payment_method, p_notes, p_account_id, p_counter_account_id, p_reference_number
    ) RETURNING id INTO v_voucher_id;
  END IF;

  RETURN v_voucher_id;
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
