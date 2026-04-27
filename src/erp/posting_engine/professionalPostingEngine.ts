/**
 * PROFESSIONAL POSTING ENGINE
 * Business-Type Specific Accounting Entries
 * 
 * Core Principle: Each business type has UNIQUE posting logic
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export type BusinessType = 'services' | 'retail' | 'restaurant' | 'pharmacy';

export interface JournalEntry {
  id: string;
  restaurant_id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: string;
  description: string;
  total_debit: number;
  total_credit: number;
  lines: JournalEntryLine[];
}

export interface JournalEntryLine {
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
}

export interface PostingResult {
  success: boolean;
  entry_id?: string;
  entry_number?: string;
  errors: string[];
}

/**
 * Professional Posting Engine
 * Handles each business type with correct accounting entries
 */
export class ProfessionalPostingEngine {
  private restaurantId: string;
  private userId: string;
  private businessType: BusinessType;
  private accountCache: Map<string, string> = new Map(); // code -> id

  constructor(restaurantId: string, userId: string, businessType: BusinessType) {
    this.restaurantId = restaurantId;
    this.userId = userId;
    this.businessType = businessType;
  }

  // ============================================================
  // SERVICES BUSINESS (No Inventory)
  // ============================================================
  
  /**
   * Post Service Invoice
   * Dr. Cash/Bank | Cr. Service Revenue
   * NO COGS - No inventory in services!
   */
  async postServiceInvoice(params: {
    invoice_id: string;
    invoice_number: string;
    customer_name: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    payment_method: string;
    date: string;
  }): Promise<PostingResult> {
    try {
      // Get accounts
      const cashAccount = await this.getAccountByCode('1.01.001'); // Cash
      const bankAccount = await this.getAccountByCode('1.01.002'); // Bank
      const revenueAccount = await this.getAccountByCode('4.01.001'); // Service Revenue
      const taxAccount = await this.getAccountByCode('2.01.001'); // Tax Payable

      if (!revenueAccount) {
        return { success: false, errors: ['Service Revenue account (4.01.001) not found'] };
      }

      // Determine debit account based on payment method
      const debitAccount = params.payment_method === 'bank' ? bankAccount : cashAccount;
      if (!debitAccount) {
        return { success: false, errors: ['Cash/Bank account not found'] };
      }

      // Build journal entry
      const entry: JournalEntry = {
        id: uuidv4(),
        restaurant_id: this.restaurantId,
        entry_number: await this.generateEntryNumber(),
        entry_date: params.date,
        reference_type: 'service_invoice',
        reference_id: params.invoice_id,
        description: `فاتورة خدمات #${params.invoice_number} - ${params.customer_name}`,
        total_debit: params.total_amount,
        total_credit: params.total_amount,
        lines: []
      };

      // Line 1: Debit Cash/Bank
      entry.lines.push({
        account_id: debitAccount,
        debit: params.total_amount,
        credit: 0,
        description: `استلام نقدية - فاتورة #${params.invoice_number}`
      });

      // Line 2: Credit Revenue
      entry.lines.push({
        account_id: revenueAccount,
        debit: 0,
        credit: params.amount,
        description: `إيراد خدمات - ${params.customer_name}`
      });

      // Line 3: Credit Tax (if applicable)
      if (params.tax_amount > 0 && taxAccount) {
        entry.lines.push({
          account_id: taxAccount,
          debit: 0,
          credit: params.tax_amount,
          description: 'ضريبة القيمة المضافة'
        });
      }

      // Save and post
      return await this.saveAndPostEntry(entry);

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  // ============================================================
  // RETAIL BUSINESS (Inventory + COGS)
  // ============================================================

  /**
   * Post Retail Sale
   * Entry 1: Dr. Cash | Cr. Sales Revenue + Tax
   * Entry 2: Dr. COGS | Cr. Inventory (for each item!)
   */
  async postRetailSale(params: {
    sale_id: string;
    invoice_number: string;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    payment_method: string;
    items: {
      item_id: string;
      product_name: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }[];
    date: string;
  }): Promise<PostingResult> {
    try {
      const errors: string[] = [];

      // Get accounts
      const cashAccount = await this.getAccountByCode('1.01.001');
      const bankAccount = await this.getAccountByCode('1.01.002');
      const revenueAccount = await this.getAccountByCode('4.01.002'); // Sales Revenue
      const taxAccount = await this.getAccountByCode('2.01.001');
      const cogsAccount = await this.getAccountByCode('5.01.001'); // COGS
      const inventoryAccount = await this.getAccountByCode('1.01.004'); // Inventory

      if (!revenueAccount || !cogsAccount || !inventoryAccount) {
        return { 
          success: false, 
          errors: ['Missing required accounts: Sales Revenue (4.01.002), COGS (5.01.001), or Inventory (1.01.004)'] 
        };
      }

      const debitAccount = params.payment_method === 'bank' ? bankAccount : cashAccount;

      // ===== ENTRY 1: Revenue Recognition =====
      const revenueEntry: JournalEntry = {
        id: uuidv4(),
        restaurant_id: this.restaurantId,
        entry_number: await this.generateEntryNumber(),
        entry_date: params.date,
        reference_type: 'retail_sale',
        reference_id: params.sale_id,
        description: `فاتورة مبيعات #${params.invoice_number}`,
        total_debit: params.total_amount,
        total_credit: params.total_amount,
        lines: []
      };

      // Dr. Cash/Bank
      revenueEntry.lines.push({
        account_id: debitAccount!,
        debit: params.total_amount,
        credit: 0,
        description: `استلام نقدية - فاتورة #${params.invoice_number}`
      });

      // Cr. Sales Revenue
      revenueEntry.lines.push({
        account_id: revenueAccount,
        debit: 0,
        credit: params.subtotal,
        description: 'مبيعات بضاعة'
      });

      // Cr. Tax
      if (params.tax_amount > 0 && taxAccount) {
        revenueEntry.lines.push({
          account_id: taxAccount,
          debit: 0,
          credit: params.tax_amount,
          description: 'ضريبة القيمة المضافة'
        });
      }

      const revenueResult = await this.saveAndPostEntry(revenueEntry);
      if (!revenueResult.success) {
        errors.push(...revenueResult.errors);
      }

      // ===== ENTRY 2: COGS Recognition (Perpetual Inventory) =====
      const totalCOGS = params.items.reduce((sum, item) => sum + item.total_cost, 0);
      
      if (totalCOGS > 0) {
        const cogsEntry: JournalEntry = {
          id: uuidv4(),
          restaurant_id: this.restaurantId,
          entry_number: await this.generateEntryNumber(),
          entry_date: params.date,
          reference_type: 'retail_cogs',
          reference_id: params.sale_id,
          description: `تكلفة بضاعة مباعة - فاتورة #${params.invoice_number}`,
          total_debit: totalCOGS,
          total_credit: totalCOGS,
          lines: []
        };

        // Dr. COGS
        cogsEntry.lines.push({
          account_id: cogsAccount,
          debit: totalCOGS,
          credit: 0,
          description: `COGS - ${params.items.length} items`
        });

        // Cr. Inventory
        cogsEntry.lines.push({
          account_id: inventoryAccount,
          debit: 0,
          credit: totalCOGS,
          description: 'إنقاص المخزون'
        });

        // Add detail lines for audit
        for (const item of params.items) {
          cogsEntry.lines.push({
            account_id: cogsAccount,
            debit: 0, // Informational line
            credit: 0,
            description: `  - ${item.product_name}: ${item.quantity} × ${item.unit_cost} = ${item.total_cost}`
          });
        }

        const cogsResult = await this.saveAndPostEntry(cogsEntry);
        if (!cogsResult.success) {
          errors.push(...cogsResult.errors);
        }
      }

      return {
        success: errors.length === 0,
        entry_id: revenueResult.entry_id,
        entry_number: revenueResult.entry_number,
        errors
      };

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Post Purchase Invoice
   * Dr. Inventory | Cr. Accounts Payable/Cash
   */
  async postPurchase(params: {
    purchase_id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    items: {
      item_id: string;
      product_name: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }[];
    payment_method: string;
    date: string;
  }): Promise<PostingResult> {
    try {
      const inventoryAccount = await this.getAccountByCode('1.01.004');
      const cashAccount = await this.getAccountByCode('1.01.001');
      const bankAccount = await this.getAccountByCode('1.01.002');
      const payableAccount = await this.getAccountByCode('2.01.002'); // Accounts Payable

      if (!inventoryAccount) {
        return { success: false, errors: ['Inventory account (1.01.004) not found'] };
      }

      const creditAccount = params.payment_method === 'cash' ? cashAccount :
                           params.payment_method === 'bank' ? bankAccount : payableAccount;

      if (!creditAccount) {
        return { success: false, errors: ['Payment account not found'] };
      }

      const entry: JournalEntry = {
        id: uuidv4(),
        restaurant_id: this.restaurantId,
        entry_number: await this.generateEntryNumber(),
        entry_date: params.date,
        reference_type: 'purchase_invoice',
        reference_id: params.purchase_id,
        description: `فاتورة مشتريات #${params.invoice_number} - ${params.supplier_name}`,
        total_debit: params.total_amount,
        total_credit: params.total_amount,
        lines: []
      };

      // Dr. Inventory
      entry.lines.push({
        account_id: inventoryAccount,
        debit: params.total_amount,
        credit: 0,
        description: `زيادة المخزون - ${params.supplier_name}`
      });

      // Cr. Cash/Bank/Payable
      const creditText = params.payment_method === 'credit' ? 'ذمم دائنة' : 'دفع نقدي';
      entry.lines.push({
        account_id: creditAccount,
        debit: 0,
        credit: params.total_amount,
        description: `${creditText} - ${params.supplier_name}`
      });

      // Detail lines
      for (const item of params.items) {
        entry.lines.push({
          account_id: inventoryAccount,
          debit: 0,
          credit: 0,
          description: `  - ${item.product_name}: ${item.quantity} × ${item.unit_cost}`
        });
      }

      return await this.saveAndPostEntry(entry);

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  // ============================================================
  // RESTAURANT BUSINESS (BOM + Recipe Costing)
  // ============================================================

  /**
   * Post Restaurant Order
   * Entry 1: Dr. Cash | Cr. Food Revenue
   * Entry 2: Dr. Food COGS | Cr. Inventory (from recipe consumption)
   */
  async postRestaurantOrder(params: {
    order_id: string;
    order_number: string;
    table_number: string;
    total_amount: number;
    items: {
      menu_item_id: string;
      menu_item_name: string;
      quantity: number;
      unit_price: number;
      theoretical_cogs: number;
      actual_cogs: number;
      components: {
        inventory_item_id: string;
        item_name: string;
        consumed_qty: number;
        unit_cost: number;
      }[];
    }[];
    payment_method: string;
    date: string;
  }): Promise<PostingResult> {
    try {
      const errors: string[] = [];

      const cashAccount = await this.getAccountByCode('1.01.001');
      const bankAccount = await this.getAccountByCode('1.01.002');
      const revenueAccount = await this.getAccountByCode('4.01.003'); // Food Revenue
      const cogsAccount = await this.getAccountByCode('5.01.002'); // Food COGS
      const inventoryAccount = await this.getAccountByCode('1.01.005'); // Restaurant Inventory

      if (!revenueAccount || !cogsAccount) {
        return { 
          success: false, 
          errors: ['Missing Food Revenue (4.01.003) or Food COGS (5.01.002) accounts'] 
        };
      }

      const debitAccount = params.payment_method === 'bank' ? bankAccount : cashAccount;

      // ===== ENTRY 1: Revenue =====
      const revenueEntry: JournalEntry = {
        id: uuidv4(),
        restaurant_id: this.restaurantId,
        entry_number: await this.generateEntryNumber(),
        entry_date: params.date,
        reference_type: 'restaurant_order',
        reference_id: params.order_id,
        description: `طلب طعام #${params.order_number} - طاولة ${params.table_number}`,
        total_debit: params.total_amount,
        total_credit: params.total_amount,
        lines: []
      };

      revenueEntry.lines.push({
        account_id: debitAccount!,
        debit: params.total_amount,
        credit: 0,
        description: `استلام نقدية - طلب #${params.order_number}`
      });

      revenueEntry.lines.push({
        account_id: revenueAccount,
        debit: 0,
        credit: params.total_amount,
        description: 'إيراد مبيعات طعام'
      });

      const revenueResult = await this.saveAndPostEntry(revenueEntry);
      if (!revenueResult.success) errors.push(...revenueResult.errors);

      // ===== ENTRY 2: Recipe COGS (Sum of actual consumption) =====
      const totalActualCOGS = params.items.reduce((sum, item) => sum + item.actual_cogs, 0);

      if (totalActualCOGS > 0 && inventoryAccount) {
        const cogsEntry: JournalEntry = {
          id: uuidv4(),
          restaurant_id: this.restaurantId,
          entry_number: await this.generateEntryNumber(),
          entry_date: params.date,
          reference_type: 'restaurant_cogs',
          reference_id: params.order_id,
          description: `تكلفة مكونات - طلب #${params.order_number}`,
          total_debit: totalActualCOGS,
          total_credit: totalActualCOGS,
          lines: []
        };

        cogsEntry.lines.push({
          account_id: cogsAccount,
          debit: totalActualCOGS,
          credit: 0,
          description: 'COGS - استهلاك مكونات'
        });

        cogsEntry.lines.push({
          account_id: inventoryAccount,
          debit: 0,
          credit: totalActualCOGS,
          description: 'استهلاك مخزون المطبخ'
        });

        // Detail by menu item
        for (const item of params.items) {
          cogsEntry.lines.push({
            account_id: cogsAccount,
            debit: 0,
            credit: 0,
            description: `  - ${item.menu_item_name} × ${item.quantity}: نظري ${item.theoretical_cogs.toFixed(2)} | فعلي ${item.actual_cogs.toFixed(2)}`
          });
        }

        const cogsResult = await this.saveAndPostEntry(cogsEntry);
        if (!cogsResult.success) errors.push(...cogsResult.errors);
      }

      return {
        success: errors.length === 0,
        entry_id: revenueResult.entry_id,
        errors
      };

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  // ============================================================
  // EXPENSES (All Business Types)
  // ============================================================

  /**
   * Post Expense Voucher
   * Dr. Expense Account | Cr. Cash/Bank
   */
  async postExpense(params: {
    voucher_id: string;
    voucher_number: string;
    category: string;
    description: string;
    amount: number;
    tax_amount: number;
    expense_account_id: string;
    payment_method: string;
    date: string;
  }): Promise<PostingResult> {
    try {
      const cashAccount = await this.getAccountByCode('1.01.001');
      const bankAccount = await this.getAccountByCode('1.01.002');
      const taxAccount = await this.getAccountByCode('2.01.001');

      const creditAccount = params.payment_method === 'bank' ? bankAccount : cashAccount;
      if (!creditAccount) {
        return { success: false, errors: ['Cash/Bank account not found'] };
      }

      const totalAmount = params.amount + params.tax_amount;

      const entry: JournalEntry = {
        id: uuidv4(),
        restaurant_id: this.restaurantId,
        entry_number: await this.generateEntryNumber(),
        entry_date: params.date,
        reference_type: 'expense_voucher',
        reference_id: params.voucher_id,
        description: `سند صرف #${params.voucher_number} - ${params.category}: ${params.description}`,
        total_debit: totalAmount,
        total_credit: totalAmount,
        lines: []
      };

      // Dr. Expense
      entry.lines.push({
        account_id: params.expense_account_id,
        debit: params.amount,
        credit: 0,
        description: `${params.category} - ${params.description}`
      });

      // Dr. Tax (if applicable)
      if (params.tax_amount > 0 && taxAccount) {
        entry.lines.push({
          account_id: taxAccount,
          debit: params.tax_amount,
          credit: 0,
          description: 'ضريبة مدخلات'
        });
      }

      // Cr. Cash/Bank
      entry.lines.push({
        account_id: creditAccount,
        debit: 0,
        credit: totalAmount,
        description: `دفع نقدي - ${params.category}`
      });

      return await this.saveAndPostEntry(entry);

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async getAccountByCode(code: string): Promise<string | null> {
    // Check cache
    if (this.accountCache.has(code)) {
      return this.accountCache.get(code)!;
    }

    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('restaurant_id', this.restaurantId)
      .eq('code', code)
      .single();

    if (data) {
      this.accountCache.set(code, data.id);
      return data.id;
    }

    return null;
  }

  private async generateEntryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', this.restaurantId)
      .gte('entry_date', `${year}-01-01`);

    const sequence = (count || 0) + 1;
    return `JV-${year}-${sequence.toString().padStart(5, '0')}`;
  }

  private async saveAndPostEntry(entry: JournalEntry): Promise<PostingResult> {
    try {
      // Validate balance
      const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return { 
          success: false, 
          errors: [`Entry not balanced: Debit ${totalDebit} != Credit ${totalCredit}`] 
        };
      }

      // Save journal entry
      const { data: savedEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          id: entry.id,
          restaurant_id: entry.restaurant_id,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          reference_type: entry.reference_type,
          reference_id: entry.reference_id,
          description: entry.description,
          total_debit: totalDebit,
          total_credit: totalCredit,
          source: 'system',
          is_posted: false,
          created_by: this.userId
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Save lines
      const linesToInsert = entry.lines.map((line, index) => ({
        entry_id: entry.id,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description,
        line_order: index
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      // Post the entry
      await supabase
        .from('journal_entries')
        .update({ is_posted: true, posted_at: new Date().toISOString() })
        .eq('id', entry.id);

      // Update account balances
      await this.updateAccountBalances(entry);

      return {
        success: true,
        entry_id: entry.id,
        entry_number: entry.entry_number,
        errors: []
      };

    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  private async updateAccountBalances(entry: JournalEntry): Promise<void> {
    for (const line of entry.lines) {
      if (!line.account_id || (line.debit === 0 && line.credit === 0)) continue;

      const { data: account } = await supabase
        .from('chart_of_accounts')
        .select('account_type, current_balance')
        .eq('id', line.account_id)
        .single();

      if (!account) continue;

      // Calculate balance change based on account type
      let balanceChange = 0;
      
      if (['asset', 'expense'].includes(account.account_type)) {
        // Debit increases, Credit decreases
        balanceChange = (line.debit || 0) - (line.credit || 0);
      } else {
        // Credit increases, Debit decreases
        balanceChange = (line.credit || 0) - (line.debit || 0);
      }

      const newBalance = (account.current_balance || 0) + balanceChange;

      await supabase
        .from('chart_of_accounts')
        .update({ current_balance: newBalance })
        .eq('id', line.account_id);
    }
  }
}

// Factory function
export function createPostingEngine(
  restaurantId: string, 
  userId: string, 
  businessType: BusinessType
): ProfessionalPostingEngine {
  return new ProfessionalPostingEngine(restaurantId, userId, businessType);
}
