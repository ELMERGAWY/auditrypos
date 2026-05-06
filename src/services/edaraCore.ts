
import { supabase } from '@/integrations/supabase/client';
import { journalService } from '@/lib/accounting/journalService';
import { queueTransaction } from '@/lib/offlineEngine';
import { toast } from 'sonner';

export interface TransactionData {
  restaurantId: string;
  customerId?: string;
  items: Array<{
    id: string;
    productId?: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  orderId?: string;
  orderNumber: string;
}

export const edaraCore = {
  /**
   * Check if online to determine whether to execute immediately or queue.
   */
  isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  /**
   * Unified Processor for Sales & Invoices
   */
  async processTransaction(data: TransactionData) {
    if (!this.isOnline()) {
      await queueTransaction({
        id: crypto.randomUUID(),
        type: 'sales_order',
        payload: data,
        timestamp: Date.now()
      });
      toast.info('تم حفظ العملية محلياً وسيتم المزامنة عند توفر الإنترنت');
      return { success: true, offline: true };
    }

    try {
      console.log('Starting Edara Chain Reaction...', data);

      // 1. Update Inventory (Stock Movements)
      await this.updateInventory(data);

      // 2. Update CRM (Customer loyalty, total spend, and logs)
      if (data.customerId) {
        await this.updateCRM(data);
      }

      // 3. Generate Finance Entry (Journal Entries)
      await this.generateFinanceEntry(data);

      console.log('Edara Chain Reaction completed successfully.');
      return { success: true };
    } catch (error: any) {
      console.error('Edara Chain Reaction failed:', error);
      toast.error('فشل معالجة العملية: ' + error.message);
      throw error;
    }
  },

  async processExpense(data: {
    restaurantId: string;
    amount: number;
    description: string;
    category: string;
    paymentMethod: 'cash' | 'bank' | 'credit';
    date?: Date;
  }) {
    if (!this.isOnline()) {
      await queueTransaction({
        id: crypto.randomUUID(),
        type: 'expense',
        payload: data,
        timestamp: Date.now()
      });
      toast.info('تم حفظ المصروف محلياً');
      return { success: true, offline: true };
    }

    try {
      // 1. Create Expense Record
      const { error: expErr } = await supabase.from('expenses').insert({
        restaurant_id: data.restaurantId,
        amount: data.amount,
        description: data.description,
        category: data.category,
        payment_method: data.paymentMethod,
        date: data.date?.toISOString() || new Date().toISOString()
      });
      if (expErr) throw expErr;

      // 2. Journal Entry
      await journalService.createExpenseJournalEntry(data.restaurantId, {
        amount: data.amount,
        description: data.description,
        category: data.category,
        payment_method: data.paymentMethod,
        date: data.date
      });

      toast.success('تم تسجيل المصروف والقيود المحاسبية بنجاح');
      return { success: true };
    } catch (error: any) {
      toast.error('خطأ في معالجة المصروف: ' + error.message);
      throw error;
    }
  },

  async updateInventory(data: TransactionData) {
    const movements = data.items
      .filter(item => item.productId)
      .map(item => ({
        restaurant_id: data.restaurantId,
        product_id: item.productId,
        quantity: -item.quantity, // Deduction
        movement_type: 'sale',
        reference_id: data.orderId,
        notes: `عملية بيع رقم: ${data.orderNumber}`
      }));

    if (movements.length > 0) {
      const { error } = await supabase.from('stock_movements').insert(movements);
      if (error) throw new Error('Inventory update failed: ' + error.message);
    }
  },

  async updateCRM(data: TransactionData) {
    if (!data.customerId) return;

    // Fetch current customer data
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('total_spent, loyalty_points')
      .eq('id', data.customerId)
      .single();

    if (fetchError) throw fetchError;

    const newTotalSpent = (customer.total_spent || 0) + data.totalAmount;
    const newPoints = (customer.loyalty_points || 0) + Math.floor(data.totalAmount / 10);

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_spent: newTotalSpent,
        loyalty_points: newPoints,
        last_purchase_date: new Date().toISOString()
      })
      .eq('id', data.customerId);

    if (updateError) throw updateError;

    await supabase.from('crm_communication_logs').insert({
      restaurant_id: data.restaurantId,
      customer_id: data.customerId,
      type: 'transaction',
      summary: `عملية شراء جديدة بقيمة ${data.totalAmount}`,
      details: `رقم الطلب: ${data.orderNumber}`,
      contact_date: new Date().toISOString()
    });
  },

  async generateFinanceEntry(data: TransactionData) {
    const businessType = 'retail'; // Fallback
    
    await journalService.createSalesJournalEntry(
      data.restaurantId,
      {
        orderId: data.orderId || '',
        orderNumber: data.orderNumber,
        amount: data.totalAmount,
        paymentMethod: data.paymentMethod === 'credit' ? 'credit' : 'cash',
        customerId: data.customerId,
        taxAmount: 0 
      },
      businessType
    );

    if (data.paymentMethod === 'credit' && data.customerId) {
      await supabase.from('ar_open_items').insert({
        restaurant_id: data.restaurantId,
        customer_id: data.customerId,
        source_id: data.orderId || '',
        source_type: 'sale',
        doc_no: data.orderNumber,
        doc_date: new Date().toISOString().split('T')[0],
        original_amount: data.totalAmount,
        paid_amount: 0,
        balance_amount: data.totalAmount,
        status: 'open'
      });
    }
  }
};
