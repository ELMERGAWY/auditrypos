/**
 * POSTING ENGINE SERVICE
 * Executes posting rules and creates journal entries
 * 
 * CRITICAL: All transactions must go through this engine
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  JournalEntry, 
  JournalEntryLine, 
  JournalValidationResult,
  JournalSource 
} from '../../financial_core/types';
import { 
  PostingRule, 
  PostingAccountRule, 
  TransactionType, 
  getPostingRule 
} from '../rules/postingRules';
import { v4 as uuidv4 } from 'uuid';

// Transaction context - data needed to execute posting rules
export interface TransactionContext {
  company_id: string;
  fiscal_period_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  reference_type: string;
  reference_id: string;
  description: string;
  
  // Financial amounts
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  
  // Account references (can be IDs or codes)
  debit_account_id?: string;
  credit_account_id?: string;
  cash_account_id?: string;
  receivable_account_id?: string;
  payable_account_id?: string;
  expense_account_id?: string;
  inventory_account_id?: string;
  revenue_account_id?: string;
  cogs_account_id?: string;
  
  // For inventory transactions
  inventory_cost?: number;
  unit_cost?: number;
  quantity?: number;
  
  // Dimensions
  cost_center_id?: string;
  project_id?: string;
  branch_id?: string;
  
  // Related entities
  customer_id?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  
  // Line items for complex transactions
  line_items?: TransactionLineItem[];
  
  // Additional fields for templates
  [key: string]: any;
}

export interface TransactionLineItem {
  item_id: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price?: number;
  account_id?: string;
  expense_category?: string;
}

// Posting result
export interface PostingResult {
  success: boolean;
  entry_id?: string;
  entry_number?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Main Posting Engine
 */
export class PostingEngine {
  private companyId: string;
  private userId: string;
  
  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
  }
  
  /**
   * Post a transaction - MAIN ENTRY POINT
   * All financial transactions MUST go through this method
   */
  async postTransaction(context: TransactionContext): Promise<PostingResult> {
    try {
      // 1. Get posting rule
      const rule = getPostingRule(context.transaction_type, context);
      if (!rule) {
        return {
          success: false,
          errors: [`No posting rule found for transaction type: ${context.transaction_type}`],
          warnings: []
        };
      }
      
      // 2. Validate transaction
      const validation = await this.validateTransaction(context, rule);
      if (!validation.is_valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }
      
      // 3. Build journal entry from rule
      const entry = await this.buildJournalEntry(context, rule);
      
      // 4. Validate journal balance
      const balanceValidation = this.validateJournalBalance(entry);
      if (!balanceValidation.is_valid) {
        return {
          success: false,
          errors: balanceValidation.errors,
          warnings: balanceValidation.warnings
        };
      }
      
      // 5. Save to database
      const result = await this.saveJournalEntry(entry);
      
      if (result.error) {
        return {
          success: false,
          errors: [result.error.message],
          warnings: []
        };
      }
      
      // 6. Post the entry (make it permanent)
      await this.postEntry(result.data!.id);
      
      return {
        success: true,
        entry_id: result.data!.id,
        entry_number: result.data!.entry_number,
        errors: [],
        warnings: validation.warnings
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Unknown posting error'],
        warnings: []
      };
    }
  }
  
  /**
   * Validate transaction against posting rule
   */
  private async validateTransaction(
    context: TransactionContext, 
    rule: PostingRule
  ): Promise<JournalValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check period is open
    const { data: period } = await supabase
      .from('fiscal_periods')
      .select('status, is_posting_allowed')
      .eq('id', context.fiscal_period_id)
      .single();
    
    if (!period) {
      errors.push('Fiscal period not found');
    } else if (period.status !== 'open' || !period.is_posting_allowed) {
      errors.push('Fiscal period is closed or posting not allowed');
    }
    
    // Validate positive amounts
    if (context.total_amount <= 0) {
      errors.push('Transaction amount must be positive');
    }
    
    // Validate required accounts exist
    for (const debit of rule.debit_accounts) {
      if (debit.account_selector === 'fixed' && debit.account_code) {
        const exists = await this.accountExists(debit.account_code);
        if (!exists) {
          errors.push(`Debit account ${debit.account_code} does not exist`);
        }
      }
    }
    
    for (const credit of rule.credit_accounts) {
      if (credit.account_selector === 'fixed' && credit.account_code) {
        const exists = await this.accountExists(credit.account_code);
        if (!exists) {
          errors.push(`Credit account ${credit.account_code} does not exist`);
        }
      }
    }
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      debit_total: 0,
      credit_total: 0,
      difference: 0,
      line_count: 0
    };
  }
  
  /**
   * Build journal entry from posting rule
   */
  private async buildJournalEntry(
    context: TransactionContext,
    rule: PostingRule
  ): Promise<Partial<JournalEntry>> {
    const lines: Partial<JournalEntryLine>[] = [];
    let lineOrder = 1;
    
    // Process debit accounts
    for (const debitRule of rule.debit_accounts) {
      const amount = this.calculateAmount(debitRule, context);
      if (amount > 0) {
        const accountId = await this.resolveAccountId(debitRule, context);
        if (accountId) {
          lines.push({
            id: uuidv4(),
            account_id: accountId,
            debit: amount,
            credit: 0,
            description: this.applyTemplate(debitRule.description_template || rule.description_template, context),
            cost_center_id: context.cost_center_id,
            project_id: context.project_id,
            line_order: lineOrder++
          });
        }
      }
    }
    
    // Process credit accounts
    for (const creditRule of rule.credit_accounts) {
      const amount = this.calculateAmount(creditRule, context);
      if (amount > 0) {
        const accountId = await this.resolveAccountId(creditRule, context);
        if (accountId) {
          lines.push({
            id: uuidv4(),
            account_id: accountId,
            debit: 0,
            credit: amount,
            description: this.applyTemplate(creditRule.description_template || rule.description_template, context),
            cost_center_id: context.cost_center_id,
            project_id: context.project_id,
            line_order: lineOrder++
          });
        }
      }
    }
    
    // Calculate totals
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    
    return {
      id: uuidv4(),
      company_id: context.company_id,
      fiscal_period_id: context.fiscal_period_id,
      entry_number: await this.generateEntryNumber(),
      entry_date: context.transaction_date,
      source: rule.source,
      reference_type: context.reference_type,
      reference_id: context.reference_id,
      description: this.applyTemplate(rule.description_template, context),
      total_debit: totalDebit,
      total_credit: totalCredit,
      difference: totalDebit - totalCredit,
      status: 'draft',
      is_recurring: false,
      created_by: this.userId,
      lines: lines as JournalEntryLine[]
    };
  }
  
  /**
   * Calculate amount based on rule formula
   */
  private calculateAmount(rule: PostingAccountRule, context: TransactionContext): number {
    switch (rule.amount_formula) {
      case 'full':
        return context.total_amount;
      
      case 'percentage':
        return context.total_amount * (rule.amount_value || 0) / 100;
      
      case 'fixed':
        return rule.amount_value || 0;
      
      case 'calculated':
        // Handle specific calculations
        switch (rule.amount_calculation) {
          case 'subtotal':
            return context.subtotal || context.total_amount - (context.tax_amount || 0);
          case 'tax_amount':
            return context.tax_amount || 0;
          case 'inventory_cost':
            return context.inventory_cost || 0;
          case 'unit_cost * quantity':
            return (context.unit_cost || 0) * (context.quantity || 0);
          case 'inventory_amount':
            return context.subtotal || context.total_amount - (context.tax_amount || 0);
          default:
            return 0;
        }
      
      default:
        return 0;
    }
  }
  
  /**
   * Resolve account ID from rule
   */
  private async resolveAccountId(
    rule: PostingAccountRule, 
    context: TransactionContext
  ): Promise<string | null> {
    switch (rule.account_selector) {
      case 'fixed':
        if (rule.account_code) {
          const { data } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', this.companyId)
            .eq('code', rule.account_code)
            .single();
          return data?.id || null;
        }
        return null;
      
      case 'from_transaction':
        if (rule.account_field) {
          return context[rule.account_field] || null;
        }
        return null;
      
      case 'from_item':
        // For line items - would need to process each item
        return null;
      
      default:
        return null;
    }
  }
  
  /**
   * Apply template string with context variables
   */
  private applyTemplate(template: string, context: TransactionContext): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }
  
  /**
   * Validate journal entry balances
   */
  private validateJournalBalance(entry: Partial<JournalEntry>): JournalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const debitTotal = entry.total_debit || 0;
    const creditTotal = entry.total_credit || 0;
    const difference = debitTotal - creditTotal;
    
    if (Math.abs(difference) > 0.01) {
      errors.push(`Journal entry is not balanced. Difference: ${difference.toFixed(2)}`);
    }
    
    if (debitTotal === 0 || creditTotal === 0) {
      errors.push('Journal entry must have non-zero debit and credit amounts');
    }
    
    const lineCount = entry.lines?.length || 0;
    if (lineCount < 2) {
      errors.push('Journal entry must have at least 2 lines');
    }
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      debit_total: debitTotal,
      credit_total: creditTotal,
      difference,
      line_count: lineCount
    };
  }
  
  /**
   * Save journal entry to database
   */
  private async saveJournalEntry(
    entry: Partial<JournalEntry>
  ): Promise<{ data?: JournalEntry; error?: any }> {
    // Start transaction
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        id: entry.id,
        company_id: entry.company_id,
        fiscal_period_id: entry.fiscal_period_id,
        entry_number: entry.entry_number,
        entry_date: entry.entry_date,
        source: entry.source,
        reference_type: entry.reference_type,
        reference_id: entry.reference_id,
        description: entry.description,
        total_debit: entry.total_debit,
        total_credit: entry.total_credit,
        status: 'draft',
        is_recurring: false,
        created_by: entry.created_by
      })
      .select()
      .single();
    
    if (entryError) {
      return { error: entryError };
    }
    
    // Insert lines
    if (entry.lines && entry.lines.length > 0) {
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(
          entry.lines.map(line => ({
            id: line.id,
            entry_id: entry.id,
            account_id: line.account_id,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
            cost_center_id: line.cost_center_id,
            project_id: line.project_id,
            line_order: line.line_order
          }))
        );
      
      if (linesError) {
        return { error: linesError };
      }
    }
    
    return { data: journalEntry as JournalEntry };
  }
  
  /**
   * Post the journal entry (make it permanent)
   */
  private async postEntry(entryId: string): Promise<void> {
    await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: this.userId,
        posted_at: new Date().toISOString()
      })
      .eq('id', entryId);
    
    // Trigger account balance update
    await this.updateAccountBalances(entryId);
  }
  
  /**
   * Update account balances after posting
   */
  private async updateAccountBalances(entryId: string): Promise<void> {
    // This would be handled by database triggers
    // But we can call a stored procedure here
    await supabase.rpc('update_account_balances', { p_entry_id: entryId });
  }
  
  /**
   * Generate unique entry number
   */
  private async generateEntryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Get count of entries for this year
    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', this.companyId)
      .gte('entry_date', `${year}-01-01`)
      .lte('entry_date', `${year}-12-31`);
    
    const sequence = (count || 0) + 1;
    return `JV-${year}-${sequence.toString().padStart(6, '0')}`;
  }
  
  /**
   * Check if account exists
   */
  private async accountExists(accountCode: string): Promise<boolean> {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', this.companyId)
      .eq('code', accountCode)
      .single();
    
    return !!data;
  }
}

// Export singleton instance creator
export function createPostingEngine(companyId: string, userId: string): PostingEngine {
  return new PostingEngine(companyId, userId);
}
