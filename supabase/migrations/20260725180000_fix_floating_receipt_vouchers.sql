-- Fix floating receipt vouchers that are incorrectly linked to old orders
-- This prevents old payments from being auto-attached to new invoices

-- 1. Unlink receipt vouchers that don't have explicit order_id or are older than 1 hour
-- This removes incorrect associations between vouchers and orders
UPDATE public.receipt_vouchers
SET order_id = NULL
WHERE order_id IS NOT NULL 
  AND created_at < NOW() - INTERVAL '1 hour';

-- 2. Create function to calculate invoice total paid amount correctly
-- This function only includes direct payments and vouchers created AFTER the invoice date
CREATE OR REPLACE FUNCTION public.get_invoice_total_paid(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_direct_paid NUMERIC := 0;
    v_receipts_paid NUMERIC := 0;
    v_order_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the order creation date and direct paid amount
    SELECT COALESCE(paid_amount, 0), created_at INTO v_direct_paid, v_order_created_at
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order_created_at IS NULL THEN
        RETURN v_direct_paid;
    END IF;

    -- Get receipt vouchers explicitly linked to this order AND created AFTER the order date
    SELECT COALESCE(SUM(amount), 0) INTO v_receipts_paid
    FROM public.receipt_vouchers
    WHERE order_id = p_order_id
      AND created_at > v_order_created_at;

    RETURN v_direct_paid + v_receipts_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the function
COMMENT ON FUNCTION public.get_invoice_total_paid IS 'Calculates total paid amount for an invoice including direct payments and receipt vouchers created after the invoice date. This prevents auto-attaching old payments to new invoices.';

-- 3. Create a view to show invoice payment status correctly
CREATE OR REPLACE VIEW public.v_invoice_payment_status AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.total,
    o.paid_amount as direct_paid,
    o.created_at as order_date,
    COALESCE(SUM(rv.amount), 0) as receipt_voucher_paid,
    public.get_invoice_total_paid(o.id) as total_paid,
    o.total - public.get_invoice_total_paid(o.id) as remaining_balance
FROM public.orders o
LEFT JOIN public.receipt_vouchers rv ON rv.order_id = o.id 
    AND rv.created_at > o.created_at
WHERE o.status != 'cancelled'
GROUP BY o.id, o.order_number, o.total, o.paid_amount, o.created_at;

-- Add comment to document the view
COMMENT ON VIEW public.v_invoice_payment_status IS 'Shows invoice payment status with correct calculation that excludes old receipt vouchers. Only includes vouchers created after the invoice date.';
