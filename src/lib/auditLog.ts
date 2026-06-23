// @ts-nocheck
// ============================================================
// AUDIT LOG SERVICE - Frontend integration for operation logging
// ============================================================

import { supabase } from '@/integrations/supabase/client';

export type OperationType = 
  | 'order_created'
  | 'order_cancelled'
  | 'order_status_changed'
  | 'payment_received'
  | 'payment_refunded'
  | 'inventory_adjustment'
  | 'journal_entry_created'
  | 'journal_entry_posted'
  | 'customer_created'
  | 'customer_updated'
  | 'product_created'
  | 'product_updated'
  | 'login'
  | 'logout'
  | 'error';

export type EntityType = 
  | 'order'
  | 'payment'
  | 'inventory'
  | 'journal_entry'
  | 'customer'
  | 'product'
  | 'user'
  | 'system';

export interface AuditLogEntry {
  id?: string;
  restaurant_id: string;
  user_id?: string;
  user_email?: string;
  operation_type: OperationType;
  entity_type: EntityType;
  entity_id?: string;
  details: Record<string, any>;
  amount?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
  created_at?: string;
}

class AuditLogService {
  /**
   * Log an operation manually
   */
  async logOperation(
    restaurantId: string,
    operationType: OperationType,
    entityType: EntityType,
    entityId?: string,
    details: Record<string, any> = {},
    amount?: number,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    status: 'success' | 'failed' | 'pending' = 'success'
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_operation', {
        p_restaurant_id: restaurantId,
        p_operation_type: operationType,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: details,
        p_amount: amount,
        p_old_values: oldValues,
        p_new_values: newValues,
        p_status: status
      });

      if (error) {
        console.error('Failed to log operation:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Audit log error:', err);
      return null;
    }
  }

  /**
   * Log order creation with full details
   */
  async logOrderCreated(
    restaurantId: string,
    orderId: string,
    orderNumber: string,
    total: number,
    status: string,
    paymentMethod: string,
    customerName?: string,
    orderType?: string
  ): Promise<void> {
    await this.logOperation(
      restaurantId,
      'order_created',
      'order',
      orderId,
      {
        order_number: orderNumber,
        status,
        payment_method: paymentMethod,
        customer_name: customerName,
        order_type: orderType
      },
      total,
      undefined,
      { status, total }
    );
  }

  /**
   * Log order cancellation
   */
  async logOrderCancelled(
    restaurantId: string,
    orderId: string,
    orderNumber: string,
    total: number,
    reason?: string
  ): Promise<void> {
    await this.logOperation(
      restaurantId,
      'order_cancelled',
      'order',
      orderId,
      {
        order_number: orderNumber,
        reason: reason || 'لم يتم التحديد'
      },
      total,
      { status: 'completed' },
      { status: 'cancelled' }
    );
  }

  /**
   * Log checkout error for debugging
   */
  async logCheckoutError(
    restaurantId: string,
    error: any,
    cartItems: any[],
    total: number
  ): Promise<void> {
    await this.logOperation(
      restaurantId,
      'error',
      'system',
      undefined,
      {
        error_code: error?.code,
        error_message: error?.message,
        cart_item_count: cartItems.length,
        error_details: error
      },
      total,
      undefined,
      undefined,
      'failed'
    );
  }

  /**
   * Get recent audit logs for a restaurant
   */
  async getRecentLogs(
    restaurantId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('operation_audit_log')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get daily summary for dashboard
   */
  async getDailySummary(restaurantId: string, date: string): Promise<any> {
    const { data, error } = await supabase
      .from('v_daily_audit_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('operation_date', date);

    if (error) {
      console.error('Failed to fetch daily summary:', error);
      return [];
    }

    return data || [];
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
