/**
 * FINANCIAL CORE - JOURNAL ENTRY TYPES
 * Complete double-entry journal system
 */

export type JournalSource = 
  | 'manual'           // Manual journal entry
  | 'sales_invoice'    // From sales invoice
  | 'sales_return'     // From sales return
  | 'purchase_invoice' // From purchase invoice
  | 'purchase_return'  // From purchase return
  | 'payment'          // Payment transaction
  | 'receipt'          // Receipt transaction
  | 'expense'          // Expense voucher
  | 'inventory'        // Inventory adjustment
  | 'costing'          // Cost allocation
  | 'payroll'          // Payroll entry
  | 'closing'          // Period closing
  | 'opening'          // Opening balances
  | 'system';          // System-generated

export type JournalStatus = 'draft' | 'posted' | 'reversed';

export interface JournalEntry {
  id: string;
  company_id: string;
  fiscal_period_id: string;
  entry_number: string;
  entry_date: string;
  source: JournalSource;
  reference_type: string | null; // Table name
  reference_id: string | null;   // Record ID
  description: string;
  notes?: string;
  
  // Financial totals
  total_debit: number;
  total_credit: number;
  difference: number; // Must be 0 for balanced entry
  
  // Status
  status: JournalStatus;
  is_recurring: boolean;
  recurring_template_id?: string;
  
  // Audit
  created_by: string;
  posted_by?: string;
  posted_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  reverse_reason?: string;
  original_entry_id?: string; // For reversed entries
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Related data
  lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  entry_id: string;
  account_id: string;
  
  // Double-entry amounts
  debit: number;
  credit: number;
  
  // Dimensions
  cost_center_id?: string;
  project_id?: string;
  branch_id?: string;
  
  // Reference
  description: string;
  line_reference?: string;
  
  // Order for display
  line_order: number;
  
  // Account info (populated on fetch)
  account?: {
    id: string;
    code: string;
    name: string;
    account_type: string;
  };
  
  created_at: string;
}

export interface JournalTemplate {
  id: string;
  company_id: string;
  template_name: string;
  description?: string;
  source: JournalSource;
  
  // Template lines
  template_lines: JournalTemplateLine[];
  
  is_active: boolean;
  created_at: string;
}

export interface JournalTemplateLine {
  account_code: string;
  description_template: string;
  debit_formula: 'fixed' | 'percentage' | 'variable';
  debit_value?: number;
  credit_formula: 'fixed' | 'percentage' | 'variable';
  credit_value?: number;
  line_order: number;
}

// For recurring entries
export interface RecurringJournal {
  id: string;
  template_id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  last_run?: string;
  next_run: string;
  is_active: boolean;
}

// Validation result
export interface JournalValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  debit_total: number;
  credit_total: number;
  difference: number;
  line_count: number;
}

// Search/filter params
export interface JournalFilter {
  company_id: string;
  fiscal_period_id?: string;
  start_date?: string;
  end_date?: string;
  source?: JournalSource;
  status?: JournalStatus;
  account_id?: string;
  reference_type?: string;
  reference_id?: string;
  cost_center_id?: string;
  project_id?: string;
  created_by?: string;
  search_term?: string;
}

// Entry summary for lists
export interface JournalEntrySummary {
  id: string;
  entry_number: string;
  entry_date: string;
  source: JournalSource;
  description: string;
  total_debit: number;
  total_credit: number;
  status: JournalStatus;
  line_count: number;
  created_by_name: string;
}
