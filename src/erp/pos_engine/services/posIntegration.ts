/**
 * POS ENGINE - Integration with Financial Core
 * Ensures every POS transaction creates proper accounting entries
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  PostingEngine, 
  TransactionContext,
  PostingResult 
} from '../../posting_engine/services/postingEngine';
import { 
  InventoryCostingEngine 
} from '../../inventory_costing_engine/services/costingEngine';

export interface POSOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  warehouse_id: string;
}

export interface POSOrderContext {
  restaurant_id: string;
  fiscal_period_id: string;
  warehouse_id: string;
  customer_id?: string;
  order_date: string;
  payment_method: 'cash' | 'card' | 'other';
  
  items: POSOrderItem[];
  
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  
  // Account mappings
  cash_account_id: string;
  receivable_account_id?: string;
  revenue_account_id: string;
  tax_account_id?: string;
  cogs_account_id: string;
  inventory_account_id: string;
  
  created_by: string;
}

export interface POSOrderResult {
  success: boolean;
  order_id?: string;
  invoice_id?: string;
  journal_entry_id?: string;
  errors: string[];
}

/**
 * POS Integration Service
 * Handles checkout and ensures all accounting entries are created
 */
export class POSIntegrationService {
  private postingEngine: PostingEngine;
  private costingEngine: InventoryCostingEngine;
  private restaurantId: string;
  private userId: string;
  
  constructor(restaurantId: string, userId: string) {
    this.restaurantId = restaurantId;
    this.userId = userId;
    this.postingEngine = new PostingEngine(restaurantId, userId);
    this.costingEngine = new InventoryCostingEngine(restaurantId);
  }
  
  /**
   * Process POS order - MAIN ENTRY POINT
   * Creates: Sales Invoice + Inventory Movement + Journal Entries
   */
  async processOrder(context: POSOrderContext): Promise<POSOrderResult> {
    const errors: string[] = [];
    
    try {
      // 1. Calculate inventory costs for all items
      const itemsWithCost = await this.calculateItemCosts(context.items);
      
      // 2. Create Sales Invoice
      const invoiceResult = await this.createSalesInvoice(context, itemsWithCost);
      if (!invoiceResult.success) {
        return { success: false, errors: invoiceResult.errors };
      }
      
      // 3. Record inventory issues for all items
      const inventoryResults = await this.recordInventoryIssues(context, itemsWithCost, invoiceResult.invoice_id!);
      const failedInventory = inventoryResults.filter(r => !r.success);
      if (failedInventory.length > 0) {
        errors.push(...failedInventory.map(f => f.errors.join(', ')));
        // Continue - we can handle stockouts
      }
      
      // 4. Post Sales Revenue Journal Entry
      const revenuePosting = await this.postRevenueEntry(context, invoiceResult.invoice_id!);
      if (!revenuePosting.success) {
        errors.push(...revenuePosting.errors);
      }
      
      // 5. Post COGS Journal Entry
      const cogsPosting = await this.postCOGSEntry(context, itemsWithCost, invoiceResult.invoice_id!);
      if (!cogsPosting.success) {
        errors.push(...cogsPosting.errors);
      }
      
      // 6. Update invoice with accounting links
      await supabase
        .from('sales_invoices')
        .update({
          journal_entry_id: revenuePosting.entry_id,
          cogs_entry_id: cogsPosting.entry_id,
          status: context.amount_paid >= context.total_amount ? 'paid' : 'partial'
        })
        .eq('id', invoiceResult.invoice_id!);
      
      return {
        success: errors.length === 0,
        order_id: invoiceResult.invoice_id,
        invoice_id: invoiceResult.invoice_id,
        journal_entry_id: revenuePosting.entry_id,
        errors
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Unknown error processing POS order']
      };
    }
  }
  
  /**
   * Calculate costs for all order items
   */
  private async calculateItemCosts(items: POSOrderItem[]): Promise<(POSOrderItem & { unit_cost: number; total_cost: number })[]> {
    const itemsWithCost: (POSOrderItem & { unit_cost: number; total_cost: number })[] = [];
    
    for (const item of items) {
      // Get product's current average cost
      const { data: product } = await supabase
        .from('inventory_products')
        .select('average_cost')
        .eq('id', item.product_id)
        .single();
      
      const unit_cost = product?.average_cost || 0;
      const total_cost = unit_cost * item.quantity;
      
      itemsWithCost.push({
        ...item,
        unit_cost,
        total_cost
      });
    }
    
    return itemsWithCost;
  }
  
  /**
   * Create Sales Invoice record
   */
  private async createSalesInvoice(
    context: POSOrderContext,
    items: (POSOrderItem & { unit_cost: number; total_cost: number })[]
  ): Promise<{ success: boolean; invoice_id?: string; errors: string[] }> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();
      
      // Create invoice
      const { data: invoice, error } = await supabase
        .from('sales_invoices')
        .insert({
          company_id: context.company_id,
          fiscal_period_id: context.fiscal_period_id,
          invoice_number: invoiceNumber,
          invoice_date: context.order_date,
          due_date: context.order_date,
          customer_id: context.customer_id,
          subtotal: context.subtotal,
          discount_amount: context.discount_amount,
          tax_amount: context.tax_amount,
          total_amount: context.total_amount,
          amount_paid: context.amount_paid,
          status: 'draft',
          created_by: context.created_by
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create invoice lines
      const lines = items.map((item, index) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: `Item ${index + 1}`,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        line_order: index
      }));
      
      await supabase.from('sales_invoice_lines').insert(lines);
      
      return { success: true, invoice_id: invoice.id, errors: [] };
      
    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }
  
  /**
   * Record inventory issues for all items
   */
  private async recordInventoryIssues(
    context: POSOrderContext,
    items: (POSOrderItem & { unit_cost: number; total_cost: number })[],
    invoice_id: string
  ): Promise<{ success: boolean; errors: string[] }[]> {
    const results: { success: boolean; errors: string[] }[] = [];
    
    for (const item of items) {
      const result = await this.costingEngine.recordIssue({
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        quantity: item.quantity,
        reference_type: 'sales_invoice',
        reference_id: invoice_id,
        movement_date: context.order_date,
        costing_method: 'weighted_average'
      });
      
      results.push({
        success: result.success,
        errors: result.errors
      });
    }
    
    return results;
  }
  
  /**
   * Post Revenue Journal Entry
   * Dr Cash/Receivable | Cr Revenue + Tax
   */
  private async postRevenueEntry(
    context: POSOrderContext,
    invoice_id: string
  ): Promise<{ success: boolean; entry_id?: string; errors: string[] }> {
    const isCashSale = context.payment_method === 'cash' && context.amount_paid >= context.total_amount;
    
    const transactionContext: TransactionContext = {
      company_id: context.company_id,
      fiscal_period_id: context.fiscal_period_id,
      transaction_type: 'SALE_INVOICE',
      transaction_date: context.order_date,
      reference_type: 'sales_invoices',
      reference_id: invoice_id,
      description: `POS Sale - Invoice ${invoice_id}`,
      
      total_amount: context.total_amount,
      subtotal: context.subtotal,
      tax_amount: context.tax_amount,
      
      // Accounts
      cash_account_id: isCashSale ? context.cash_account_id : undefined,
      receivable_account_id: !isCashSale ? context.receivable_account_id : undefined,
      revenue_account_id: context.revenue_account_id,
      
      created_by: context.created_by
    };
    
    const result = await this.postingEngine.postTransaction(transactionContext);
    
    return {
      success: result.success,
      entry_id: result.entry_id,
      errors: result.errors
    };
  }
  
  /**
   * Post COGS Journal Entry
   * Dr COGS | Cr Inventory
   */
  private async postCOGSEntry(
    context: POSOrderContext,
    items: (POSOrderItem & { unit_cost: number; total_cost: number })[],
    invoice_id: string
  ): Promise<{ success: boolean; entry_id?: string; errors: string[] }> {
    const totalCOGS = items.reduce((sum, item) => sum + item.total_cost, 0);
    
    const transactionContext: TransactionContext = {
      company_id: context.company_id,
      fiscal_period_id: context.fiscal_period_id,
      transaction_type: 'SALE_INVOICE',
      transaction_date: context.order_date,
      reference_type: 'sales_invoices',
      reference_id: invoice_id,
      description: `COGS for POS Sale - Invoice ${invoice_id}`,
      
      total_amount: totalCOGS,
      inventory_cost: totalCOGS,
      
      // Accounts
      cogs_account_id: context.cogs_account_id,
      inventory_account_id: context.inventory_account_id,
      
      created_by: context.created_by
    };
    
    const result = await this.postingEngine.postTransaction(transactionContext);
    
    return {
      success: result.success,
      entry_id: result.entry_id,
      errors: result.errors
    };
  }
  
  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    const { count } = await supabase
      .from('sales_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', this.companyId)
      .gte('invoice_date', `${year}-01-01`);
    
    const sequence = (count || 0) + 1;
    return `SI-${year}-${sequence.toString().padStart(6, '0')}`;
  }
}

// Export factory function
export function createPOSIntegration(companyId: string, userId: string): POSIntegrationService {
  return new POSIntegrationService(companyId, userId);
}
