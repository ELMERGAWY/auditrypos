-- ============================================================
-- CREATE INSERT ITEM WAREHOUSE ASSIGNMENT FUNCTION
-- ============================================================
-- This RPC function allows inserting item warehouse assignments bypassing RLS
-- ============================================================

DROP FUNCTION IF EXISTS public.insert_item_warehouse_assignment;

CREATE OR REPLACE FUNCTION public.insert_item_warehouse_assignment(
  p_item_id UUID,
  p_sub_warehouse_id UUID,
  p_costing_method TEXT,
  p_accounting_standard TEXT,
  p_inventory_valuation_rule TEXT,
  p_is_primary BOOLEAN,
  p_min_stock_level NUMERIC,
  p_max_stock_level NUMERIC,
  p_reorder_point NUMERIC,
  p_reorder_quantity NUMERIC,
  p_stock_unit TEXT,
  p_sales_unit TEXT,
  p_purchase_unit TEXT,
  p_lead_time_days INTEGER,
  p_low_stock_alert BOOLEAN,
  p_overstock_alert BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.item_warehouse_assignments (
    item_id,
    sub_warehouse_id,
    costing_method,
    accounting_standard,
    inventory_valuation_rule,
    is_primary,
    min_stock_level,
    max_stock_level,
    reorder_point,
    reorder_quantity,
    stock_unit,
    sales_unit,
    purchase_unit,
    lead_time_days,
    low_stock_alert,
    overstock_alert
  ) VALUES (
    p_item_id,
    p_sub_warehouse_id,
    p_costing_method,
    p_accounting_standard,
    p_inventory_valuation_rule,
    p_is_primary,
    p_min_stock_level,
    p_max_stock_level,
    p_reorder_point,
    p_reorder_quantity,
    p_stock_unit,
    p_sales_unit,
    p_purchase_unit,
    p_lead_time_days,
    p_low_stock_alert,
    p_overstock_alert
  );
  
  RAISE NOTICE 'Item warehouse assignment inserted successfully';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_item_warehouse_assignment TO authenticated;
