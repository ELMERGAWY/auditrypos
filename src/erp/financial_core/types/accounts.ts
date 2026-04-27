/**
 * FINANCIAL CORE - ACCOUNT TYPES
 * Complete double-entry accounting system types
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountSubtype = 
  | 'current_asset' | 'fixed_asset' | 'inventory' | 'receivable' | 'bank' | 'cash'
  | 'current_liability' | 'long_term_liability' | 'payable'
  | 'equity' | 'retained_earnings'
  | 'sales_revenue' | 'other_revenue'
  | 'cogs' | 'operating_expense' | 'admin_expense' | 'financial_expense';

export interface ChartOfAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  subtype: AccountSubtype;
  parent_id: string | null;
  level: number; // Tree depth (1-5)
  path: string; // Full path like "1.01.001"
  is_bank_account: boolean;
  is_cash_account: boolean;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  budget_amount?: number;
  currency: string;
  cost_center_allowed: boolean;
  project_allowed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBalance {
  account_id: string;
  fiscal_period_id: string;
  opening_balance: number;
  debit_movement: number;
  credit_movement: number;
  closing_balance: number;
  budget_amount: number;
  variance_amount: number;
  variance_percent: number;
}

// Hierarchical account for tree display
export interface AccountNode extends ChartOfAccount {
  children: AccountNode[];
  total_debit: number;
  total_credit: number;
  balance: number;
}

// Standard chart of accounts template
export interface AccountTemplate {
  code: string;
  name: string;
  account_type: AccountType;
  subtype: AccountSubtype;
  level: number;
  parent_code?: string;
}

// Pre-defined templates for different industries
export const STANDARD_CHART_OF_ACCOUNTS: AccountTemplate[] = [
  // Assets (1)
  { code: '1', name: 'الأصول', account_type: 'asset', subtype: 'current_asset', level: 1 },
  { code: '1.01', name: 'الأصول المتداولة', account_type: 'asset', subtype: 'current_asset', level: 2, parent_code: '1' },
  { code: '1.01.001', name: 'النقدية', account_type: 'asset', subtype: 'cash', level: 3, parent_code: '1.01' },
  { code: '1.01.002', name: 'البنوك', account_type: 'asset', subtype: 'bank', level: 3, parent_code: '1.01' },
  { code: '1.01.003', name: 'العملاء', account_type: 'asset', subtype: 'receivable', level: 3, parent_code: '1.01' },
  { code: '1.01.004', name: 'المخزون', account_type: 'asset', subtype: 'inventory', level: 3, parent_code: '1.01' },
  { code: '1.02', name: 'الأصول الثابتة', account_type: 'asset', subtype: 'fixed_asset', level: 2, parent_code: '1' },
  
  // Liabilities (2)
  { code: '2', name: 'الخصوم', account_type: 'liability', subtype: 'current_liability', level: 1 },
  { code: '2.01', name: 'الموردين', account_type: 'liability', subtype: 'payable', level: 2, parent_code: '2' },
  { code: '2.02', name: 'القروض', account_type: 'liability', subtype: 'long_term_liability', level: 2, parent_code: '2' },
  
  // Equity (3)
  { code: '3', name: 'حقوق الملكية', account_type: 'equity', subtype: 'equity', level: 1 },
  { code: '3.01', name: 'رأس المال', account_type: 'equity', subtype: 'equity', level: 2, parent_code: '3' },
  { code: '3.02', name: 'الأرباح المحتجزة', account_type: 'equity', subtype: 'retained_earnings', level: 2, parent_code: '3' },
  
  // Revenue (4)
  { code: '4', name: 'الإيرادات', account_type: 'revenue', subtype: 'sales_revenue', level: 1 },
  { code: '4.01', name: 'مبيعات', account_type: 'revenue', subtype: 'sales_revenue', level: 2, parent_code: '4' },
  { code: '4.02', name: 'إيرادات أخرى', account_type: 'revenue', subtype: 'other_revenue', level: 2, parent_code: '4' },
  
  // COGS (5)
  { code: '5', name: 'تكلفة البضاعة المباعة', account_type: 'expense', subtype: 'cogs', level: 1 },
  { code: '5.01', name: 'تكلفة المبيعات', account_type: 'expense', subtype: 'cogs', level: 2, parent_code: '5' },
  
  // Expenses (6)
  { code: '6', name: 'المصروفات', account_type: 'expense', subtype: 'operating_expense', level: 1 },
  { code: '6.01', name: 'مصروفات تشغيلية', account_type: 'expense', subtype: 'operating_expense', level: 2, parent_code: '6' },
  { code: '6.02', name: 'مصروفات إدارية', account_type: 'expense', subtype: 'admin_expense', level: 2, parent_code: '6' },
  { code: '6.03', name: 'مصروفات مالية', account_type: 'expense', subtype: 'financial_expense', level: 2, parent_code: '6' },
];
