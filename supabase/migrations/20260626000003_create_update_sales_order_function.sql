-- ============================================================
-- CREATE UPDATE SALES ORDER FUNCTION
-- ============================================================
-- This creates a function to update sales_orders that bypasses any
-- potential issues with direct updates
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_sales_order(
  p_order_id UUID,
  p_customer_name TEXT,
  p_customer_id UUID,
  p_total_amount NUMERIC,
  p_status TEXT,
  p_expected_delivery TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the sales order with all fields
  UPDATE public.sales_orders
  SET
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_id = p_customer_id,
    total_amount = COALESCE(p_total_amount, total_amount),
    status = COALESCE(p_status, status),
    expected_delivery = p_expected_delivery
  WHERE id = p_order_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_sales_order TO authenticated;
