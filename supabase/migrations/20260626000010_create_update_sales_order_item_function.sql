-- ============================================================
-- CREATE UPDATE SALES ORDER ITEM FUNCTION
-- ============================================================
-- This RPC function allows updating sales order items bypassing RLS
-- ============================================================

DROP FUNCTION IF EXISTS public.update_sales_order_item;

CREATE OR REPLACE FUNCTION public.update_sales_order_item(
  p_item_id UUID,
  p_item_name TEXT,
  p_quantity NUMERIC,
  p_unit_price NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.sales_order_items
  SET 
    item_name = p_item_name,
    quantity = p_quantity,
    unit_price = p_unit_price
  WHERE id = p_item_id;
  
  RAISE NOTICE 'Sales order item updated successfully';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_sales_order_item TO authenticated;
