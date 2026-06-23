/**
 * FINANCIAL CORE - FISCAL PERIOD TYPES
 * Period management and year-end closing
 */

export type FiscalPeriodStatus = 'open' | 'closing' | 'closed' | 'locked';
export type FiscalYearStatus = 'open' | 'closed' | 'locked';

export interface FiscalYear {
  id: string;
  company_id: string;
  year_number: number;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  
  // Opening balances
  opening_balances_posted: boolean;
  opening_balances_date?: string;
  
  // Closing
  closing_date?: string;
  closed_by?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface FiscalPeriod {
  id: string;
  company_id: string;
  fiscal_year_id: string;
  period_number: number; // 1-12 for monthly
  period_name: string;   // "January 2024", "Q1 2024"
  start_date: string;
  end_date: string;
  status: FiscalPeriodStatus;
  
  // Posting controls
  is_posting_allowed: boolean;
  posting_restriction_reason?: string;
  
  // Closing info
  closing_date?: string;
  closed_by?: string;
  
  // Summary data (denormalized for performance)
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  
  created_at: string;
  updated_at: string;
}

// Period closing checklist
export interface PeriodClosingChecklist {
  period_id: string;
  items: ClosingChecklistItem[];
  all_completed: boolean;
  can_close: boolean;
}

export interface ClosingChecklistItem {
  id: string;
  checklist_type: 
    | 'revenue_recognition'
    | 'expense_accrual'
    | 'inventory_count'
    | 'bank_reconciliation'
    | 'customer_reconciliation'
    | 'supplier_reconciliation'
    | 'depreciation'
    | 'payroll_accrual'
    | 'tax_provision'
    | 'adjusting_entries';
  description: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
}

// Year-end closing entries
export interface YearEndClosing {
  id: string;
  fiscal_year_id: string;
  closing_type: 'profit_allocation' | 'retained_earnings' | 'dividend';
  description: string;
  entry_id: string; // Reference to journal entry
  amount: number;
  created_at: string;
}

// Period comparison for reports
export interface PeriodComparison {
  current_period: FiscalPeriod;
  previous_period: FiscalPeriod;
  current_year_period: FiscalPeriod; // Same period last year
  
  // Variance analysis
  revenue_variance: number;
  revenue_variance_percent: number;
  expense_variance: number;
  expense_variance_percent: number;
  profit_variance: number;
  profit_variance_percent: number;
}

// Active period info (for UI)
export interface ActivePeriodInfo {
  fiscal_year: FiscalYear;
  current_period: FiscalPeriod;
  previous_period: FiscalPeriod;
  next_period: FiscalPeriod | null;
  is_posting_allowed: boolean;
  days_until_close: number;
}
