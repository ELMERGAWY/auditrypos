/**
 * RETAIL OPERATIONS MODULE
 * Specialized workflows for retail businesses
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  POSIntegrationService, 
  createPOSIntegration,
  POSOrderContext 
} from '../../pos_engine/services/posIntegration';

export interface RetailSaleInput {
  company_id: string;
  warehouse_id: string;
  customer_id?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
  }[];
  payment_method: 'cash' | 'card' | 'other';
  amount_paid: number;
  created_by: string;
}

/**
 * Retail Operations Service
 * Handles retail-specific workflows
 */
export class RetailOperationsService {
  private posIntegration: POSIntegrationService;
  private companyId: string;
  private userId: string;
  
  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
    this.posIntegration = createPOSIntegration(companyId, userId);
  }
  
  /**
   * Process retail sale with barcode scanning
   */
  async processRetailSale(input: RetailSaleInput): Promise<{
    success: boolean;
    invoice_id?: string;
    journal_entry_id?: string;
    change_amount?: number;
    errors: string[];
  }> {
    try {
      // 1. Get current fiscal period
      const { data: period } = await supabase
        .from('fiscal_periods')
        .select('id')
        .eq('company_id', input.company_id)
        .eq('status', 'open')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!period) {
        return { success: false, errors: ['No open fiscal period found'] };
      }
      
      // 2. Get account mappings
      const accounts = await this.getRetailAccounts(input.company_id);
      if (!accounts) {
        return { success: false, errors: ['Chart of accounts not configured'] };
      }
      
      // 3. Calculate totals
      const items = input.items.map((item, index) => {
        const line_total = item.quantity * item.unit_price;
        const discount_percent = item.discount_percent || 0;
        const discount_amount = line_total * (discount_percent / 100);
        const final_total = line_total - discount_amount;
        
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount,
          tax_amount: 0, // Simplified - add tax calculation
          line_total: final_total,
          warehouse_id: input.warehouse_id
        };
      });
      
      const subtotal = items.reduce((sum, item) => sum + item.line_total + item.discount_amount, 0);
      const discount_amount = items.reduce((sum, item) => sum + item.discount_amount, 0);
      const tax_amount = 0; // Add tax calculation
      const total_amount = subtotal - discount_amount + tax_amount;
      
      // 4. Build POS context
      const posContext: POSOrderContext = {
        company_id: input.company_id,
        fiscal_period_id: period.id,
        warehouse_id: input.warehouse_id,
        customer_id: input.customer_id,
        order_date: new Date().toISOString().split('T')[0],
        payment_method: input.payment_method,
        items,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        amount_paid: input.amount_paid,
        cash_account_id: accounts.cash_account_id,
        receivable_account_id: accounts.receivable_account_id,
        revenue_account_id: accounts.revenue_account_id,
        cogs_account_id: accounts.cogs_account_id,
        inventory_account_id: accounts.inventory_account_id,
        created_by: input.created_by
      };
      
      // 5. Process through POS integration
      const result = await this.posIntegration.processOrder(posContext);
      
      const change_amount = input.amount_paid > total_amount ? input.amount_paid - total_amount : 0;
      
      return {
        success: result.success,
        invoice_id: result.invoice_id,
        journal_entry_id: result.journal_entry_id,
        change_amount,
        errors: result.errors
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Retail sale processing failed']
      };
    }
  }
  
  /**
   * Get retail-specific account mappings
   */
  private async getRetailAccounts(company_id: string): Promise<{
    cash_account_id: string;
    receivable_account_id: string;
    revenue_account_id: string;
    cogs_account_id: string;
    inventory_account_id: string;
  } | null> {
    // Get accounts by code
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('company_id', company_id)
      .in('code', ['1.01.001', '1.01.003', '4.01', '5.01', '1.01.004']);
    
    if (!accounts || accounts.length === 0) return null;
    
    const map = Object.fromEntries(accounts.map(a => [a.code, a.id]));
    
    return {
      cash_account_id: map['1.01.001'],
      receivable_account_id: map['1.01.003'],
      revenue_account_id: map['4.01'],
      cogs_account_id: map['5.01'],
      inventory_account_id: map['1.01.004']
    };
  }
  
  /**
   * Quick sale for retail (barcode scan)
   */
  async quickBarcodeSale(
    barcode: string,
    quantity: number,
    warehouse_id: string,
    payment_method: 'cash' | 'card'
  ): Promise<{
    success: boolean;
    product_name?: string;
    sale_amount?: number;
    errors: string[];
  }> {
    try {
      // Find product by SKU/barcode
      const { data: product } = await supabase
        .from('inventory_products')
        .select('id, name, average_cost')
        .eq('company_id', this.companyId)
        .eq('sku', barcode)
        .single();
      
      if (!product) {
        return { success: false, errors: ['Product not found'] };
      }
      
      // Get current price (from menu_items or price list)
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('price')
        .eq('product_id', product.id)
        .limit(1)
        .single();
      
      const unit_price = menuItem?.price || product.average_cost * 1.3; // Default markup
      const sale_amount = unit_price * quantity;
      
      return {
        success: true,
        product_name: product.name,
        sale_amount
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
}

// Export factory
export function createRetailOperations(companyId: string, userId: string): RetailOperationsService {
  return new RetailOperationsService(companyId, userId);
}
