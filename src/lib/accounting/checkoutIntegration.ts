// @ts-nocheck

// ============================================================
// CHECKOUT INTEGRATION WITH DOUBLE-ENTRY ACCOUNTING
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import journalService from './journalService';
import inventoryCosting from './inventoryCosting';
import taxService from './taxService';
import type { Order, OrderItem } from '@/pages/dashboard/types';
import type { BusinessType } from '@/lib/businessTypes';

export interface CheckoutContext {
  restaurantId: string;
  businessType: BusinessType;
  currency: string;
  isOnline: boolean;
  userId?: string;
  skipPreparation?: boolean; // For direct sell (retail, warehouse, etc.)
}

export interface CheckoutResult {
  success: boolean;
  order?: Order;
  journalEntryId?: string;
  cogs?: number;
  taxAmount?: number;
  error?: string;
  errorCode?: string;
}

class CheckoutIntegration {
  // ============================================================
  // MAIN CHECKOUT FLOW
  // ============================================================

  async processCheckout(
    context: CheckoutContext,
    orderData: {
      cart: Array<OrderItem & { unitFactor?: number; unitMode?: string }>;
      customerName?: string;
      customerPhone?: string;
      customerRef?: string;
      tableNumber?: number;
      orderType: 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
      deliveryAddress?: string;
      deliveryAgentId?: string;
      paymentMethod: 'cash' | 'card' | 'instapay' | 'vodafone_cash';
      paidAmount?: number;
      discount?: number;
      discountType?: 'fixed' | 'percentage';
      notes?: string;
      destinationAccountId?: string | null;
      customOrderNumber?: string;
    }
  ): Promise<CheckoutResult> {
    try {
      // 0. Ensure accounting accounts exist (Self-healing) — non-blocking
      if (context.isOnline) {
        void journalService
          .ensureAccountingSetup(context.restaurantId, context.currency)
          .catch((e) => console.warn('[checkout] ensureAccountingSetup failed (continuing):', e));
      }

      const isDelivery = orderData.orderType === 'delivery';
      const inventoryItems = orderData.cart.filter(item => (item as any).product_id || item.menu_item_id);

      // 1, 6, 8. Run independent calculations in parallel — each isolated so a single failure does NOT abort the sale
      const safeTax = taxService.calculateOrderTaxes(
        context.restaurantId,
        orderData.cart.map(item => ({
          product_id: (item as any).product_id || item.menu_item_id,
          category: (item as any).category || 'general',
          price: item.price,
          quantity: item.quantity,
        })),
        {
          isDelivery,
          deliveryFee: isDelivery ? await this.getDeliveryFee(context.restaurantId).catch(() => 0) : 0,
          discount: orderData.discount || 0,
        }
      ).catch((e) => {
        console.warn('[checkout] tax calc failed:', e);
        return { subtotal: 0, taxAmount: 0, total: 0, isInclusive: true, taxLines: [] as any[] };
      });

      const safeCogs = inventoryCosting.calculateOrderCOGS(inventoryItems, context.restaurantId)
        .catch((e) => {
          console.warn('[checkout] COGS calc failed:', e);
          return { totalCOGS: 0, itemsWithCost: [] as any[] };
        });

      const safeCustomer = orderData.customerName?.trim()
        ? this.findOrCreateCustomer(context.restaurantId, orderData.customerName.trim(), orderData.customerPhone)
            .catch((e) => { console.warn('[checkout] customer upsert failed:', e); return null; })
        : Promise.resolve(null);

      const [taxCalculation, cogsResult, customerId] = await Promise.all([safeTax, safeCogs, safeCustomer]);

      const deliveryFee = isDelivery ? await this.getDeliveryFee(context.restaurantId).catch(() => 0) : 0;
      const cogs = cogsResult.totalCOGS;

      // 2. Calculate subtotal
      const subtotal = orderData.cart.reduce(
        (sum, item) => sum + (item.price * item.quantity * (item.unitFactor || 1)),
        0
      );

      // 3. Apply discount
      let finalTotal = subtotal;
      let discountAmount = 0;

      if (orderData.discount && orderData.discount > 0) {
        if (orderData.discountType === 'percentage') {
          discountAmount = (subtotal * orderData.discount) / 100;
        } else {
          discountAmount = orderData.discount;
        }
        finalTotal = Math.max(0, finalTotal - discountAmount);
      }

      // 4. Add delivery fee
      finalTotal += deliveryFee;

      // 5. Add tax (if exclusive)
      if (!taxCalculation.isInclusive) {
        finalTotal += taxCalculation.taxAmount;
      }

      // 7. Prepare order data
      const paidAmount = orderData.paidAmount ?? finalTotal;
      const orderNum = orderData.customOrderNumber || `ORD-${Date.now().toString().slice(-6)}`;
      const clientOrderId = `${context.restaurantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;


      // 9. Create order (compatible with existing schema)
      // For non-food businesses or direct sell, use 'completed' status
      const isDirectSell = context.skipPreparation || 
        ['retail', 'grocery', 'pharmacy', 'wholesale', 'warehouse'].includes(context.businessType);
      
      // Merge customer reference into notes if provided
      let finalNotes = orderData.notes || '';
      if (orderData.customerRef) {
        finalNotes = finalNotes 
          ? `${finalNotes} | المرجع: ${orderData.customerRef}` 
          : `المرجع: ${orderData.customerRef}`;
      }

      const orderPayload = {
        restaurant_id: context.restaurantId,
        order_number: orderNum,
        total: finalTotal,
        discount: discountAmount,
        status: isDirectSell ? 'completed' as const : 'pending' as const,
        table_number: orderData.tableNumber || null,
        order_type: orderData.orderType,
        customer_name: orderData.customerName || 'عميل نقدي',
        customer_phone: orderData.customerPhone || '',
        delivery_address: orderData.deliveryAddress || '',
        delivery_agent_id: orderData.deliveryAgentId || null,
        payment_method: orderData.paymentMethod,
        paid_amount: paidAmount,
        notes: finalNotes,
        client_order_id: clientOrderId,
        customer_id: customerId,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError || !order) {
        throw new Error(`فشل إنشاء الطلب: ${orderError?.message}`);
      }

      // 10. Create order items
      const orderItems = orderData.cart.map(item => ({
        order_id: order.id,
        menu_item_id: (item as any).product_id ? null : item.menu_item_id,
        product_id: (item as any).product_id || null,
        menu_item_name: item.menu_item_name || (item as any).name || 'صنف',
        menu_item_image: item.menu_item_image || '📦',
        quantity: item.quantity,
        price: item.price * (item.unitFactor || 1),
        sold_unit: item.unitMode || 'قطعة',
        unit_factor: item.unitFactor || 1,
        cost_price_snapshot: (item as any).unitCost || 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
        // Rollback the order so we don't end up with a header without items
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`فشل حفظ أصناف الفاتورة: ${itemsError.message}`);
      }

      // 11. Create tax records
      if (taxCalculation.taxLines.length > 0) {
        const taxRecords = taxCalculation.taxLines.map(line => ({
          order_id: order.id,
          tax_rate_id: line.tax_config_id,
          taxable_amount: line.taxable_amount,
          tax_amount: line.tax_amount,
          tax_type: 'vat',
        }));

        await supabase.from('order_taxes').insert(taxRecords);
      }

      // 12. Create journal entries (Double Entry)
      let journalEntryId: string | undefined;

      if (context.isOnline) {
        const journalEntry = await journalService.createSaleJournalEntry(
          context.restaurantId,
          { ...order, items: orderItems } as Order,
          context.businessType,
          cogs,
          taxCalculation.taxAmount,
          orderData.destinationAccountId
        );

        if (journalEntry) {
          journalEntryId = journalEntry.id;
        }
      }

      // 13. Handle customer balance if partial payment
      if (customerId && paidAmount < finalTotal) {
        const remaining = finalTotal - paidAmount;
        await this.updateCustomerBalance(customerId, context.restaurantId, remaining, order.id, orderNum);
      }

      // 14. Update delivery agent status if applicable
      if (isDelivery && orderData.deliveryAgentId) {
        await supabase
          .from('delivery_agents')
          .update({ status: 'busy' })
          .eq('id', orderData.deliveryAgentId);
      }

      // 15. Record inventory consumption
      if (cogs > 0) {
        await this.recordInventoryConsumption(order.id, inventoryItems);
      }

      toast.success(`✅ تم إنشاء الطلب #${orderNum.slice(-4)} - ${finalTotal.toFixed(2)} ${context.currency}`);

      return {
        success: true,
        order: order as unknown as Order,
        journalEntryId,
        cogs,
        taxAmount: taxCalculation.taxAmount,
      };

    } catch (error: any) {
      console.error('Checkout failed:', error);
      
      let errorMsg = error?.message || 'فشل في إتمام الطلب';
      let errorCode = error?.code || 'UNKNOWN';
      let isNetworkError = false;
      
      // Categorize error
      if (error?.message?.includes('upstream connect error') || 
          error?.message?.includes('connection termination') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('Failed to fetch') ||
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT' ||
          !navigator.onLine) {
        errorMsg = '📡 مشكلة في الاتصال بالخادم. جاري المحاولة مرة أخرى...';
        errorCode = 'CONNECTION_ERROR';
        isNetworkError = true;
        
        // Auto-retry once for connection errors
        toast.info('🔄 إعادة المحاولة...');
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return await this.processCheckout(context, orderData);
        } catch (retryError) {
          errorMsg = '❌ فشل الاتصال بعد إعادة المحاولة. سيتم الحفظ محلياً.';
          errorCode = 'CONNECTION_FAILED';
          isNetworkError = true;
        }
      }
      // RLS/Permission
      else if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMsg = '⛔ ليس لديك صلاحية كافية لإنشاء الطلب';
        errorCode = 'PERMISSION_DENIED';
      }
      // Inventory
      else if (error?.code === '23514' || error?.code === 'P0001' || error?.message?.includes('stock')) {
        errorMsg = '⚠️ المخزون غير كافٍ للكمية المطلوبة';
        errorCode = 'INVENTORY_ERROR';
      }
      // Duplicate
      else if (error?.code === '23505') {
        errorMsg = '⚠️ رقم الطلب مكرر - يرجى المحاولة مرة أخرى';
        errorCode = 'DUPLICATE';
      }

      return {
        success: false,
        error: errorMsg,
        errorCode,
        isNetworkError
      };
    }
  }

  // ============================================================
  // BUSINESS-SPECIFIC ADJUSTMENTS
  // ============================================================

  async applyBusinessSpecificLogic(
    context: CheckoutContext,
    orderData: any
  ): Promise<any> {
    const adjustments: any = {};

    switch (context.businessType) {
      case 'restaurant':
        // Restaurant: Track kitchen preparation time
        adjustments.estimated_prep_time = await this.estimatePrepTime(orderData.cart);
        // Track table occupancy
        if (orderData.tableNumber) {
          await this.updateTableStatus(orderData.tableNumber, 'occupied');
        }
        break;

      case 'retail':
        // Retail: Check for promotions/loyalty
        adjustments.loyalty_points = this.calculateLoyaltyPoints(orderData.total);
        // Check for barcode scanning accuracy
        adjustments.requires_stock_check = true;
        break;

      case 'grocery':
        // Grocery: Check expiry dates
        adjustments.expiry_warnings = await this.checkExpiryDates(orderData.cart);
        // Weighable items validation
        adjustments.weight_validation = orderData.cart.some((item: any) => item.is_weighable);
        break;

      case 'pharmacy':
        // Pharmacy: Prescription validation
        adjustments.requires_prescription = orderData.cart.some(
          (item: any) => item.requires_prescription
        );
        // Drug interaction check
        adjustments.drug_interactions = await this.checkDrugInteractions(orderData.cart);
        break;

      case 'wholesale':
        // Wholesale: Minimum order quantities
        adjustments.meets_minimum_order = this.checkMinimumOrder(orderData.cart);
        // Bulk pricing tiers
        adjustments.pricing_tier = this.calculatePricingTier(orderData.total);
        break;

      case 'services':
        // Services: No inventory impact
        adjustments.no_inventory = true;
        // Service duration estimation
        adjustments.service_duration = this.estimateServiceDuration(orderData.cart);
        // Technician assignment
        adjustments.assigned_staff = await this.assignServiceStaff(context.restaurantId, orderData);
        break;

      case 'warehouse':
        // Warehouse: Storage fee calculation
        adjustments.storage_fees = this.calculateStorageFees(orderData.cart);
        // Pick & pack validation
        adjustments.requires_pick_confirmation = true;
        break;

      default:
        break;
    }

    return adjustments;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async findOrCreateCustomer(
    restaurantId: string,
    name: string,
    phone?: string
  ): Promise<string | null> {
    try {
      if (!name || name === 'عميل نقدي' || name.trim() === '') return null;

      const trimmedName = name.trim();
      const trimmedPhone = phone?.trim();

      // 1. Try to find existing customer
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .eq('restaurant_id', restaurantId);
      
      if (trimmedPhone) {
        query = query.or(`phone.eq.${trimmedPhone},name.ilike.${trimmedName}`);
      } else {
        query = query.ilike('name', trimmedName);
      }

      const { data: existing, error: searchError } = await query.limit(1);

      if (searchError) {
        console.warn('[checkout] customer search error:', searchError);
      }

      if (existing && existing.length > 0) {
        const customer = existing[0];
        // If customer exists but phone was missing, update it
        if (trimmedPhone && !customer.phone) {
          await supabase
            .from('customers')
            .update({ phone: trimmedPhone })
            .eq('id', customer.id);
        }
        return customer.id;
      }

      // 2. Create new customer if not found
      console.log(`[checkout] Creating new customer: ${trimmedName}`);
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          restaurant_id: restaurantId,
          name: trimmedName,
          phone: trimmedPhone || null,
          customer_type: 'regular',
          balance: 0
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[checkout] Failed to create customer:', insertError);
        // If it's a unique constraint error on name+restaurant_id, try one last fetch
        if (insertError.code === '23505') {
           const { data: lastTry } = await supabase
             .from('customers')
             .select('id')
             .eq('restaurant_id', restaurantId)
             .ilike('name', trimmedName)
             .single();
           return lastTry?.id || null;
        }
        return null;
      }

      return newCustomer?.id || null;
    } catch (error) {
      console.error('[checkout] Customer lookup/creation failed:', error);
      return null;
    }
  }

  private async updateCustomerBalance(
    customerId: string,
    restaurantId: string,
    amount: number,
    orderId: string,
    orderNumber: string
  ): Promise<void> {
    // Update customer balance
    const { data: customer } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', customerId)
      .single();

    if (customer) {
      await supabase
        .from('customers')
        .update({ balance: (customer.balance || 0) + amount })
        .eq('id', customerId);
    }

    // Record transaction
    await supabase.from('customer_transactions').insert({
      customer_id: customerId,
      restaurant_id: restaurantId,
      type: 'sale',
      amount,
      description: `فاتورة #${orderNumber.slice(-4)} - متبقي`,
      order_id: orderId,
      payment_method: 'credit',
    });
  }

  private async getDeliveryFee(restaurantId: string): Promise<number> {
    const { data } = await supabase
      .from('restaurants')
      .select('delivery_fee')
      .eq('id', restaurantId)
      .single();

    return data?.delivery_fee || 0;
  }

  private async recordInventoryConsumption(
    orderId: string,
    items: OrderItem[]
  ): Promise<void> {
    if (items.length === 0) return;
    
    // Bulk insert for better performance
    const records = items.map(item => ({
      order_id: orderId,
      product_id: (item as any).product_id || item.menu_item_id,
      quantity: item.quantity,
    }));

    await supabase.from('inventory_consumption').insert(records as any);
  }

  // Business-specific helpers
  private async estimatePrepTime(cart: OrderItem[]): Promise<number> {
    // Estimate based on item complexity
    return cart.length * 5; // 5 minutes per item (simplified)
  }

  private async updateTableStatus(tableNumber: number, status: string): Promise<void> {
    await supabase
      .from('tables')
      .update({ status })
      .eq('table_number', tableNumber);
  }

  private calculateLoyaltyPoints(total: number): number {
    return Math.floor(total / 100); // 1 point per 100 EGP
  }

  private async checkExpiryDates(cart: OrderItem[]): Promise<string[]> {
    // Check for items nearing expiry
    return [];
  }

  private async checkDrugInteractions(cart: OrderItem[]): Promise<string[]> {
    // Check for drug interactions
    return [];
  }

  private checkMinimumOrder(cart: OrderItem[]): boolean {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return total >= 1000; // Minimum 1000 EGP for wholesale
  }

  private calculatePricingTier(total: number): string {
    if (total >= 50000) return 'platinum';
    if (total >= 20000) return 'gold';
    if (total >= 5000) return 'silver';
    return 'bronze';
  }

  private estimateServiceDuration(cart: OrderItem[]): number {
    return cart.length * 30; // 30 minutes per service
  }

  private async assignServiceStaff(restaurantId: string, orderData: any): Promise<string | null> {
    // Find available staff
    const { data } = await supabase
      .from('staff')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'available')
      .limit(1);

    return data?.[0]?.id || null;
  }

  private calculateStorageFees(cart: OrderItem[]): number {
    // Calculate storage fees based on volume/duration
    return 0;
  }
}

// Singleton instance
export const checkoutIntegration = new CheckoutIntegration();
export default checkoutIntegration;
