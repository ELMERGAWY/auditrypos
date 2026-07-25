-- Migration: Merge Duplicate Customers Function
-- This migration creates a function to merge duplicate customers by moving all references from one customer to another

-- Create function to merge duplicate customers
CREATE OR REPLACE FUNCTION public.merge_duplicate_customers(
    p_duplicate_customer_id UUID,
    p_target_customer_id UUID,
    p_restaurant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_duplicate_name TEXT;
    v_target_name TEXT;
    v_updated_orders INT;
    v_updated_receipt_vouchers INT;
    v_updated_customer_transactions INT;
    v_updated_sales_returns INT;
    v_updated_sales_invoices INT;
    v_updated_ar_open_items INT;
    v_updated_crm_logs INT;
    v_result JSONB;
BEGIN
    -- Validate inputs
    IF p_duplicate_customer_id IS NULL OR p_target_customer_id IS NULL THEN
        RAISE EXCEPTION 'Both customer IDs must be provided';
    END IF;
    
    IF p_duplicate_customer_id = p_target_customer_id THEN
        RAISE EXCEPTION 'Duplicate and target customer IDs cannot be the same';
    END IF;
    
    -- Get customer names for logging
    SELECT name INTO v_duplicate_name FROM public.customers WHERE id = p_duplicate_customer_id;
    SELECT name INTO v_target_name FROM public.customers WHERE id = p_target_customer_id;
    
    IF v_duplicate_name IS NULL THEN
        RAISE EXCEPTION 'Duplicate customer not found';
    END IF;
    
    IF v_target_name IS NULL THEN
        RAISE EXCEPTION 'Target customer not found';
    END IF;
    
    -- Update orders
    UPDATE public.orders 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    GET DIAGNOSTICS v_updated_orders = ROW_COUNT;
    
    -- Update receipt_vouchers (this is the main constraint issue)
    UPDATE public.receipt_vouchers 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    GET DIAGNOSTICS v_updated_receipt_vouchers = ROW_COUNT;
    
    -- Update customer_transactions
    UPDATE public.customer_transactions 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    GET DIAGNOSTICS v_updated_customer_transactions = ROW_COUNT;
    
    -- Update sales_returns
    UPDATE public.sales_returns 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id;
    
    GET DIAGNOSTICS v_updated_sales_returns = ROW_COUNT;
    
    -- Update sales_invoices
    UPDATE public.sales_invoices 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id;
    
    GET DIAGNOSTICS v_updated_sales_invoices = ROW_COUNT;
    
    -- Update ar_open_items
    UPDATE public.ar_open_items 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    GET DIAGNOSTICS v_updated_ar_open_items = ROW_COUNT;
    
    -- Update crm_communication_logs
    UPDATE public.crm_communication_logs 
    SET customer_id = p_target_customer_id 
    WHERE customer_id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    GET DIAGNOSTICS v_updated_crm_logs = ROW_COUNT;
    
    -- Delete the duplicate customer
    DELETE FROM public.customers 
    WHERE id = p_duplicate_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'duplicate_customer_id', p_duplicate_customer_id,
        'target_customer_id', p_target_customer_id,
        'duplicate_name', v_duplicate_name,
        'target_name', v_target_name,
        'updated_orders', v_updated_orders,
        'updated_receipt_vouchers', v_updated_receipt_vouchers,
        'updated_customer_transactions', v_updated_customer_transactions,
        'updated_sales_returns', v_updated_sales_returns,
        'updated_sales_invoices', v_updated_sales_invoices,
        'updated_ar_open_items', v_updated_ar_open_items,
        'updated_crm_logs', v_updated_crm_logs
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.merge_duplicate_customers TO authenticated;
