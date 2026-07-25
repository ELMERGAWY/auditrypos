-- Migration: Check Customer Dependencies Before Delete
-- This migration creates a function to check if a customer has any related records before deletion

-- Create function to check customer dependencies
CREATE OR REPLACE FUNCTION public.check_customer_dependencies(
    p_customer_id UUID,
    p_restaurant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT;
    v_has_dependencies BOOLEAN := FALSE;
    v_dependencies JSONB := '{}'::jsonb;
    v_order_count INT;
    v_receipt_voucher_count INT;
    v_customer_transaction_count INT;
    v_sales_return_count INT;
    v_sales_invoice_count INT;
    v_ar_open_item_count INT;
    v_crm_log_count INT;
    v_result JSONB;
BEGIN
    -- Get customer name
    SELECT name INTO v_customer_name 
    FROM public.customers 
    WHERE id = p_customer_id;
    
    IF v_customer_name IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Customer not found'
        );
    END IF;
    
    -- Check orders
    SELECT COUNT(*) INTO v_order_count
    FROM public.orders 
    WHERE customer_id = p_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    IF v_order_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{orders}', 
            jsonb_build_object(
                'count', v_order_count,
                'label', 'فواتير الطلبات',
                'route', '/orders'
            )
        );
    END IF;
    
    -- Check receipt_vouchers
    SELECT COUNT(*) INTO v_receipt_voucher_count
    FROM public.receipt_vouchers 
    WHERE customer_id = p_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    IF v_receipt_voucher_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{receipt_vouchers}', 
            jsonb_build_object(
                'count', v_receipt_voucher_count,
                'label', 'سندات القبض',
                'route', '/receipt-vouchers'
            )
        );
    END IF;
    
    -- Check customer_transactions
    SELECT COUNT(*) INTO v_customer_transaction_count
    FROM public.customer_transactions 
    WHERE customer_id = p_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    IF v_customer_transaction_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{customer_transactions}', 
            jsonb_build_object(
                'count', v_customer_transaction_count,
                'label', 'معاملات العملاء',
                'route', '/customer-transactions'
            )
        );
    END IF;
    
    -- Check sales_returns
    SELECT COUNT(*) INTO v_sales_return_count
    FROM public.sales_returns 
    WHERE customer_id = p_customer_id;
    
    IF v_sales_return_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{sales_returns}', 
            jsonb_build_object(
                'count', v_sales_return_count,
                'label', 'مردودات المبيعات',
                'route', '/sales-returns'
            )
        );
    END IF;
    
    -- Check sales_invoices
    SELECT COUNT(*) INTO v_sales_invoice_count
    FROM public.sales_invoices 
    WHERE customer_id = p_customer_id;
    
    IF v_sales_invoice_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{sales_invoices}', 
            jsonb_build_object(
                'count', v_sales_invoice_count,
                'label', 'فواتير المبيعات',
                'route', '/sales-invoices'
            )
        );
    END IF;
    
    -- Check ar_open_items
    SELECT COUNT(*) INTO v_ar_open_item_count
    FROM public.ar_open_items 
    WHERE customer_id = p_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    IF v_ar_open_item_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{ar_open_items}', 
            jsonb_build_object(
                'count', v_ar_open_item_count,
                'label', 'عناصر الذمم المفتوحة',
                'route', '/accounts-receivable'
            )
        );
    END IF;
    
    -- Check crm_communication_logs
    SELECT COUNT(*) INTO v_crm_log_count
    FROM public.crm_communication_logs 
    WHERE customer_id = p_customer_id 
    AND restaurant_id = p_restaurant_id;
    
    IF v_crm_log_count > 0 THEN
        v_has_dependencies := TRUE;
        v_dependencies := jsonb_set(v_dependencies, '{crm_communication_logs}', 
            jsonb_build_object(
                'count', v_crm_log_count,
                'label', 'سجلات التواصل CRM',
                'route', '/crm'
            )
        );
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'customer_id', p_customer_id,
        'customer_name', v_customer_name,
        'has_dependencies', v_has_dependencies,
        'dependencies', v_dependencies
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
GRANT EXECUTE ON FUNCTION public.check_customer_dependencies TO authenticated;
