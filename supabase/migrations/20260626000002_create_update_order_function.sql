-- ============================================================
-- CREATE UPDATE ORDER FUNCTION
-- ============================================================
-- This creates a function to update orders that bypasses any
-- potential issues with direct updates
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order(
  p_order_id UUID,
  p_customer_name TEXT,
  p_customer_ref TEXT,
  p_total NUMERIC,
  p_paid_amount NUMERIC,
  p_discount NUMERIC,
  p_notes TEXT,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the order with all fields
  UPDATE public.orders
  SET
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_ref = p_customer_ref,
    total = COALESCE(p_total, total),
    paid_amount = COALESCE(p_paid_amount, paid_amount),
    discount = COALESCE(p_discount, discount),
    notes = COALESCE(p_notes, notes),
    payment_method = COALESCE(p_payment_method, payment_method)
  WHERE id = p_order_id
  RETURNING row_to_json(orders.*)::jsonb;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_order TO authenticated;
