-- ============================================================
-- CREATE UPDATE ORDER ITEM FUNCTION
-- ============================================================
-- This RPC function allows updating order items bypassing RLS
-- ============================================================

DROP FUNCTION IF EXISTS public.update_order_item;

CREATE OR REPLACE FUNCTION public.update_order_item(
  p_item_id UUID,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_menu_item_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.order_items
  SET 
    quantity = p_quantity,
    price = p_price,
    menu_item_name = p_menu_item_name
  WHERE id = p_item_id;
  
  RAISE NOTICE 'Order item updated successfully';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_order_item TO authenticated;
