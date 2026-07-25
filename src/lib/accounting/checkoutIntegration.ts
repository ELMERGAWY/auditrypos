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
import { queueOfflineOrder } from '@/lib/offlineEngine';
import { actorCreateFields } from '@/lib/actor';

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
      customerId?: string;
      tableNumber?: number;
      orderType: 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
      deliveryAddress?: string;
      deliveryDate?: string;
      deliveryAgentId?: string;
      paymentMethod: 'cash' | 'card' | 'instapay' | 'vodafone_cash';
      paidAmount?: number;
      discount?: number;
      discountType?: 'fixed' | 'percentage';
      notes?: string;
      destinationAccountId?: string | null;
      customOrderNumber?: string;
      // مُعرّف ثابت يمر من الواجهة لمنع إنشاء طلبين لنفس العملية
      // (مهم خصوصاً عند Retry/Double Click/تذبذب اتصال)
      clientOrderId?: string;
    }
  ): Promise<CheckoutResult> {
    // 7. Prepare order data first (so it's available in catch)
    const paidAmount = orderData.paidAmount ?? 0;
    // client_order_id ثابت من الواجهة — أساس منع التكرار عبر المحاولات
    const clientOrderId =
      orderData.clientOrderId ||
      `${context.restaurantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // رقم الطلب يجب أن يكون مشتقاً من clientOrderId (وليس Date.now) حتى لا يتغيّر عند إعادة المحاولة
    // وإلا UNIQUE(order_number) لن يمنع التكرار لأن كل retry يولّد رقماً جديداً.
    const stableSuffix = clientOrderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    const orderNum =
      orderData.customOrderNumber ||
      (orderData.customerRef
        ? `ORD-${orderData.customerRef}-${stableSuffix}`
        : `ORD-${stableSuffix}`);

    // نتذكر إذا تم إنشاء الطلب فعلياً حتى لا نضيفه لطابور الأوفلاين مرة أخرى
    let createdOrder: any = null;
    let customerId: string | null = null;
    
    let finalNotes = orderData.notes || '';
    if (orderData.customerRef) {
      finalNotes = finalNotes 
        ? `${finalNotes} | المرجع: ${orderData.customerRef}` 
        : `المرجع: ${orderData.customerRef}`;
    }

    // Customer deduplication logic: match by (name + phone)
    // 1. If customerId is provided from UI (selected from autocomplete), use it directly
    if (orderData.customerId) {
      customerId = orderData.customerId;
    }
    // 2. Otherwise, search for existing customer by name and phone
    else if (orderData.customerName && orderData.customerPhone) {
      try {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', context.restaurantId)
          .eq('name', orderData.customerName)
          .eq('phone', orderData.customerPhone)
          .limit(1)
          .maybeSingle();
        if (existingCustomer?.id) {
          customerId = existingCustomer.id;
        }
      } catch (e) {
        console.warn('[checkout] Failed to find existing customer:', e);
      }
    }

    let orderPayload: Record<string, unknown> = {
      restaurant_id: context.restaurantId,
      order_number: orderNum,
      total: 0,
      discount: 0,
      status: 'pending',
      table_number: orderData.tableNumber || null,
      order_type: orderData.orderType,
      customer_name: orderData.customerName || 'عميل نقدي',
      customer_phone: orderData.customerPhone || '',
      customer_ref: orderData.customerRef || null,
      delivery_address: orderData.deliveryAddress || '',
      delivery_date: orderData.deliveryDate || null,
      delivery_agent_id: orderData.deliveryAgentId || null,
      payment_method: orderData.paymentMethod,
      paid_amount: paidAmount,
      notes: finalNotes,
      client_order_id: clientOrderId,
      customer_id: customerId, // Use customer_id if found (will be null if not found yet)
    };

    try {
      // 0. Ensure accounting accounts exist (Self-healing) — non-blocking
      if (context.isOnline) {
        void journalService
          .ensureAccountingSetup(context.restaurantId, context.currency)
          .catch((e) => console.warn('[checkout] ensureAccountingSetup failed (continuing):', e));
      }

      const isDelivery = orderData.orderType === 'delivery';
      const inventoryItems = orderData.cart.filter(item => (item as any).product_id || item.menu_item_id);
      const inventoryItemsForCosting = inventoryItems.map(item => ({
        ...item,
        quantity: item.quantity * (item.unitFactor || 1),
      }));

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

      const safeCogs = this.calculateOrderCOGSNew(inventoryItemsForCosting, context.restaurantId)
        .catch((e) => {
          console.warn('[checkout] COGS calc failed:', e);
          return { totalCOGS: 0, itemsWithCost: [] as any[] };
        });

      // If customerId is still null, create new customer
      if (!customerId && orderData.customerName?.trim()) {
        customerId = await this.findOrCreateCustomer(context.restaurantId, orderData.customerName.trim(), orderData.customerPhone, orderData.customerRef)
          .catch((e) => { console.warn('[checkout] customer upsert failed:', e); return null; });
      }

      const [taxCalculation, cogsResult] = await Promise.all([safeTax, safeCogs]);

      const deliveryFee = isDelivery ? await this.getDeliveryFee(context.restaurantId).catch(() => 0) : 0;
      const cogs = cogsResult.totalCOGS;

      // 2. Calculate subtotal
      const subtotal = orderData.cart.reduce(
        (sum, item) => sum + (item.price * item.quantity),
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

      // 9. Create order (compatible with existing schema)
      // For non-food businesses or direct sell, use 'completed' status
      const isDirectSell = context.skipPreparation || 
        ['retail', 'grocery', 'pharmacy', 'wholesale', 'warehouse'].includes(context.businessType);

      // Update order payload with calculated values
      const actorFields = await actorCreateFields();
      orderPayload = {
        ...orderPayload,
        total: finalTotal,
        discount: discountAmount,
        status: isDirectSell ? 'completed' as const : 'pending' as const,
        paid_amount: paidAmount ?? finalTotal,
        customer_id: customerId,
        ...actorFields,
      };

      // مهم: Idempotent عبر RPC ذرّي على السيرفر (يمنع سباق النقر المزدوج)
      let order: any = null;
      let orderError: any = null;

      const upsertPayload = {
        restaurant_id: orderPayload.restaurant_id,
        order_number: orderPayload.order_number,
        total: orderPayload.total,
        discount: orderPayload.discount,
        status: orderPayload.status,
        table_number: orderPayload.table_number,
        order_type: orderPayload.order_type,
        customer_name: orderPayload.customer_name,
        customer_phone: orderPayload.customer_phone,
        customer_ref: orderPayload.customer_ref,
        delivery_address: orderPayload.delivery_address,
        delivery_date: orderPayload.delivery_date,
        delivery_agent_id: orderPayload.delivery_agent_id,
        payment_method: orderPayload.payment_method,
        paid_amount: orderPayload.paid_amount,
        notes: orderPayload.notes,
        client_order_id: clientOrderId,
        customer_id: orderPayload.customer_id,
        created_by_name: actorFields.created_by_name,
        updated_by_name: actorFields.updated_by_name,
        created_by: actorFields.created_by,
      };

      const { data: upserted, error: upsertErr } = await supabase.rpc('upsert_pos_order', {
        p_payload: upsertPayload,
      });

      if (!upsertErr && upserted) {
        order = Array.isArray(upserted) ? upserted[0] : upserted;
      } else {
        // fallback لو الـ RPC غير مطبّق بعد على قاعدة البيانات
        console.warn('[checkout] upsert_pos_order RPC unavailable, falling back:', upsertErr?.message);

        const { data: existingByClient } = await supabase
          .from('orders')
          .select('*')
          .eq('client_order_id', clientOrderId)
          .maybeSingle();

        if (existingByClient) {
          order = existingByClient;
          toast.info('ℹ️ تم اكتشاف طلب مُنشأ مسبقاً، جاري إكمال العملية بدون تكرار.');
          const patch: Record<string, unknown> = {};
          if (paidAmount > Number(existingByClient.paid_amount || 0)) {
            patch.paid_amount = paidAmount;
          }
          if (existingByClient.status !== orderPayload.status) {
            patch.status = orderPayload.status;
          }
          if (Number(existingByClient.total || 0) !== Number(orderPayload.total || 0) && Number(orderPayload.total || 0) > 0) {
            patch.total = orderPayload.total;
            patch.discount = orderPayload.discount;
          }
          if (Object.keys(patch).length > 0) {
            const { data: patched } = await supabase
              .from('orders')
              .update(patch)
              .eq('id', existingByClient.id)
              .select()
              .single();
            if (patched) order = patched;
          }
        } else {
          ({ data: order, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select()
            .single());

          if (orderError && (orderError.code === '23505' || String(orderError.message || '').includes('duplicate'))) {
            const { data: byClient } = await supabase
              .from('orders')
              .select('*')
              .eq('client_order_id', clientOrderId)
              .maybeSingle();

            if (byClient) {
              order = byClient;
              orderError = null;
            } else {
              const { data: byNumber } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderNum)
                .eq('restaurant_id', context.restaurantId)
                .maybeSingle();

              if (byNumber) {
                order = byNumber;
                orderError = null;
              }
            }
          }
        }
      }

      if (orderError || !order) {
        throw new Error(`فشل إنشاء الطلب: ${orderError?.message || upsertErr?.message || 'unknown'}`);
      }

      createdOrder = order;

      // 10. Create order items
      const orderItems = orderData.cart.map(item => ({
        order_id: order.id,
        menu_item_id: (item as any).product_id ? null : item.menu_item_id,
        product_id: (item as any).product_id || null,
        menu_item_name: item.menu_item_name || (item as any).name || 'صنف',
        menu_item_image: item.menu_item_image || '📦',
        quantity: item.quantity,
        price: item.price,
        sold_unit: item.unitMode || 'قطعة',
        unit_factor: item.unitFactor || 1,
        cost_price_snapshot: (item as any).unitCost || 0,
        variables: (item as any).variables || [],
      }));

      // تجنب تكرار أصناف الطلب إذا كانت العملية أعيدت بالخطأ
      const { data: existingItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order.id)
        .limit(1);

      const shouldInsertItems = !existingItems || existingItems.length === 0;

      const { error: itemsError } = shouldInsertItems
        ? await supabase.from('order_items').insert(orderItems)
        : { error: null as any };

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
        // Rollback the order so we don't end up with a header without items
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`فشل حفظ أصناف الفاتورة: ${itemsError.message}`);
      }

      // 11. Create tax records (once)
      if (taxCalculation.taxLines.length > 0) {
        const { data: existingTaxes } = await supabase
          .from('order_taxes')
          .select('id')
          .eq('order_id', order.id)
          .limit(1);

        if (!existingTaxes || existingTaxes.length === 0) {
          const taxRecords = taxCalculation.taxLines.map(line => ({
            order_id: order.id,
            tax_rate_id: line.tax_config_id,
            taxable_amount: line.taxable_amount,
            tax_amount: line.tax_amount,
            tax_type: 'vat',
          }));

          await supabase.from('order_taxes').insert(taxRecords);
        }
      }

      // 12. Create journal entries (Double Entry) — once per order
      let journalEntryId: string | undefined;

      if (context.isOnline) {
        const { data: existingJournal } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('restaurant_id', context.restaurantId)
          .eq('reference_type', 'order')
          .eq('reference_id', order.id)
          .limit(1)
          .maybeSingle();

        if (existingJournal?.id) {
          journalEntryId = existingJournal.id;
        } else {
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
      }

      // 13. Handle customer balance and transactions
      if (customerId) {
        // 13a. المدفوع عند الفاتورة يُحفظ في orders.paid_amount فقط.
        // لا ننشئ سند قبض تلقائيًا: قيد المبيعات يسجّل النقدية،
        // وكشف الحساب يعرض دفعة واحدة من paid_amount بدون تكرار مع سند/حركة.
        // سند القبض يبقى يدويًا من شاشة العملاء فقط.

        // 13b. Record remaining balance as credit (if any) — once
        if (paidAmount < finalTotal) {
          const remaining = finalTotal - paidAmount;
          const { data: existingSaleTx } = await supabase
            .from('customer_transactions')
            .select('id')
            .eq('order_id', order.id)
            .eq('type', 'sale')
            .limit(1);

          if (!existingSaleTx || existingSaleTx.length === 0) {
            await supabase.from('customer_transactions').insert({
              customer_id: customerId,
              restaurant_id: context.restaurantId,
              type: 'sale',
              amount: remaining,
              description: `فاتورة #${orderNum.slice(-4)} - متبقي`,
              order_id: order.id,
              payment_method: 'credit',
              reference_type: 'order',
              reference_id: order.id
            });
          }
        }
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
        await this.recordInventoryConsumption(order.id, context.restaurantId, inventoryItemsForCosting);
      }

      // 16. CRITICAL: أعِد تثبيت المدفوع في النهاية — بعض الـ triggers كانت تصفّر paid_amount
      // بعد الإدراج/مزامنة الفاتورة. بدون هذه الخطوة الواجهة تظهر المدفوع من الذاكرة ثم يختفي بعد الريفريش.
      if (paidAmount > 0) {
        const { data: paidFixed, error: paidFixErr } = await supabase
          .from('orders')
          .update({
            paid_amount: paidAmount,
            direct_paid_amount: paidAmount,
          })
          .eq('id', order.id)
          .select('*')
          .single();

        if (paidFixErr) {
          console.error('[checkout] Failed to persist paid_amount:', paidFixErr);
          toast.error('تحذير: فشل حفظ المبلغ المدفوع في قاعدة البيانات');
        } else if (paidFixed) {
          order = paidFixed;
          if (Number(paidFixed.paid_amount || 0) !== Number(paidAmount)) {
            console.error('[checkout] paid_amount mismatch after persist', {
              expected: paidAmount,
              actual: paidFixed.paid_amount,
            });
            toast.error(`تحذير: المدفوع لم يُحفظ (متوقع ${paidAmount} / فعلي ${paidFixed.paid_amount})`);
          }
        }
      }

      createdOrder = order;

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
        errorMsg = '📡 مشكلة في الاتصال بالخادم. سيتم الحفظ محلياً.';
        errorCode = 'CONNECTION_ERROR';
        isNetworkError = true;

        // لو الطلب اتخلق فعلاً على السيرفر — لا تضفه لطابور الأوفلاين (ده سبب التكرار!)
        // أرجِع النجاح الجزئي حتى لا يعيد المستخدم المحاولة ويُنشئ طلباً ثانياً.
        if (createdOrder) {
          toast.warning('تم حفظ الطلب على السيرفر، لكن بعض الخطوات المحاسبية تأخرت. لن يتم إنشاء طلب مكرر.');
          return {
            success: true,
            order: createdOrder as unknown as Order,
            error: undefined,
            errorCode: 'PARTIAL_NETWORK',
          };
        }

        const offlineOrderItems = orderData.cart.map(item => ({
            menu_item_id: (item as any).product_id ? null : item.menu_item_id,
            product_id: (item as any).product_id || null,
            menu_item_name: item.menu_item_name || (item as any).name || 'صنف',
            menu_item_image: item.menu_item_image || '📦',
            quantity: item.quantity,
            price: item.price,
            sold_unit: item.unitMode || 'قطعة',
            unit_factor: item.unitFactor || 1,
            cost_price_snapshot: (item as any).unitCost || 0,
            variables: (item as any).variables || null,
          }));

          // استخدم client_order_id كـ id للطابور حتى لا تتكرر نفس العملية في IndexedDB
          await queueOfflineOrder({
            id: clientOrderId,
            restaurantId: context.restaurantId,
            orderData: { ...orderPayload, client_order_id: clientOrderId },
            items: offlineOrderItems,
            timestamp: Date.now()
          });

          toast.success('✅ تم حفظ الطلب محلياً! سيتم مزامنته تلقائياً عند إعادة الاتصال.');
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
    phone?: string,
    customerRef?: string
  ): Promise<string | null> {
    try {
      if (!name || name === 'عميل نقدي' || name.trim() === '') return null;

      const trimmedName = name.trim();
      const trimmedPhone = phone?.trim();
      const trimmedCustomerRef = customerRef?.trim();

      // 1. Try to find existing customer by customer_ref first, then phone/name
      let query = supabase
        .from('customers')
        .select('id, name, phone, customer_ref')
        .eq('restaurant_id', restaurantId);
      
      if (trimmedCustomerRef) {
        query = query.eq('customer_ref', trimmedCustomerRef);
      } else if (trimmedPhone) {
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
        // Update customer info if needed
        const updates: any = {};
        if (trimmedPhone && !customer.phone) updates.phone = trimmedPhone;
        if (trimmedCustomerRef && !customer.customer_ref) updates.customer_ref = trimmedCustomerRef;
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('customers')
            .update(updates)
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
          customer_ref: trimmedCustomerRef || null,
          customer_type: 'regular',
          balance: 0
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[checkout] Failed to create customer:', insertError);
        // If it's a unique constraint error, try one last fetch by customer_ref or name
        if (insertError.code === '23505') {
          let fallbackQuery = supabase
            .from('customers')
            .select('id')
            .eq('restaurant_id', restaurantId);
          
          if (trimmedCustomerRef) {
            fallbackQuery = fallbackQuery.eq('customer_ref', trimmedCustomerRef);
          } else {
            fallbackQuery = fallbackQuery.ilike('name', trimmedName);
          }
          
          const { data: lastTry } = await fallbackQuery.single();
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

  // Note: updateCustomerBalance is no longer needed
  // The triggers on customer_transactions will handle balance updates automatically

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
    restaurantId: string,
    items: OrderItem[]
  ): Promise<void> {
    if (items.length === 0) return;
    
    // Bulk insert for better performance
    const records = items.map(item => ({
      order_id: orderId,
      item_id: (item as any).product_id || item.menu_item_id,
      restaurant_id: restaurantId,
      consumed_qty: item.quantity,
      unit_cost: (item as any).unitCost || (item as any).cost_price_snapshot || 0,
      total_cost: ((item as any).unitCost || (item as any).cost_price_snapshot || 0) * item.quantity,
    }));

    await supabase.from('inventory_consumption').insert(records as any);
  }

  // ============================================================
  // NEW COGS CALCULATION (using new inventoryCosting)
  // ============================================================

  private async calculateOrderCOGSNew(
    items: OrderItem[],
    restaurantId: string
  ): Promise<{ totalCOGS: number; itemsWithCost: (OrderItem & { cogs: number; unitCost: number })[] }> {
    let totalCOGS = 0;
    const itemsWithCost: (OrderItem & { cogs: number; unitCost: number })[] = [];

    for (const item of items) {
      const productId = (item as any).product_id || item.menu_item_id;
      
      if (!productId) {
        itemsWithCost.push({ ...item, cogs: 0, unitCost: 0 });
        continue;
      }

      try {
        // Get item warehouse assignments to find sub_warehouse_id
        const { data: assignments } = await supabase
          .from('item_warehouse_assignments')
          .select('sub_warehouse_id, costing_method, accounting_standard')
          .eq('item_id', productId)
          .eq('is_primary', true)
          .limit(1);

        if (!assignments || assignments.length === 0) {
          // Fallback: use product cost_price
          const { data: product } = await supabase
            .from('products')
            .select('cost_price')
            .eq('id', productId)
            .single();
          
          const unitCost = product?.cost_price || 0;
          const cogs = unitCost * item.quantity;
          totalCOGS += cogs;
          itemsWithCost.push({ ...item, cogs, unitCost });
          continue;
        }

        const assignment = assignments[0];
        const subWarehouseId = assignment.sub_warehouse_id;
        const costingMethod = assignment.costing_method as any;
        const accountingStandard = assignment.accounting_standard as any;

        if (subWarehouseId) {
          const result = await inventoryCosting.calculateCost(
            productId,
            subWarehouseId,
            item.quantity,
            costingMethod,
            accountingStandard
          );
          
          totalCOGS += result.totalCost;
          itemsWithCost.push({ ...item, cogs: result.totalCost, unitCost: result.avgUnitCost });
        } else {
          // Fallback: use product cost_price
          const { data: product } = await supabase
            .from('products')
            .select('cost_price')
            .eq('id', productId)
            .single();
          
          const unitCost = product?.cost_price || 0;
          const cogs = unitCost * item.quantity;
          totalCOGS += cogs;
          itemsWithCost.push({ ...item, cogs, unitCost });
        }
      } catch (error) {
        console.warn('[checkout] COGS calc failed for item:', productId, error);
        // Fallback: use product cost_price
        const { data: product } = await supabase
          .from('products')
          .select('cost_price')
          .eq('id', productId)
          .single();
        
        const unitCost = product?.cost_price || 0;
        const cogs = unitCost * item.quantity;
        totalCOGS += cogs;
        itemsWithCost.push({ ...item, cogs, unitCost });
      }
    }

    return { totalCOGS, itemsWithCost };
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
