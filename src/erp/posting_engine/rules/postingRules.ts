/**
 * POSTING ENGINE - ACCOUNTING RULES
 * Defines how business transactions map to journal entries
 * 
 * RULE: Every transaction MUST create balanced journal entries
 */

import { JournalSource } from '../../financial_core/types';

// Transaction types that require posting
export type TransactionType = 
  | 'SALE_INVOICE'
  | 'SALE_RETURN'
  | 'PURCHASE_INVOICE'
  | 'PURCHASE_RETURN'
  | 'CASH_RECEIPT'
  | 'CASH_PAYMENT'
  | 'EXPENSE_VOUCHER'
  | 'INVENTORY_RECEIPT'
  | 'INVENTORY_ISSUE'
  | 'INVENTORY_ADJUSTMENT'
  | 'COST_ALLOCATION'
  | 'PAYROLL'
  | 'DEPRECIATION'
  | 'BANK_TRANSFER';

// Account mapping for each transaction type
export interface PostingRule {
  transaction_type: TransactionType;
  source: JournalSource;
  description_template: string;
  
  // Debits (can be multiple)
  debit_accounts: PostingAccountRule[];
  
  // Credits (can be multiple)
  credit_accounts: PostingAccountRule[];
  
  // Validation
  validation_rules: ValidationRule[];
  
  // Additional dimensions
  requires_cost_center: boolean;
  requires_project: boolean;
}

export interface PostingAccountRule {
  account_selector: 'fixed' | 'from_transaction' | 'from_item' | 'calculated';
  account_code?: string; // For fixed accounts
  account_field?: string; // Field in transaction that contains account
  amount_formula: 'full' | 'percentage' | 'fixed' | 'calculated';
  amount_value?: number; // For percentage or fixed
  amount_calculation?: string; // For calculated amounts
  description_template?: string;
  line_order: number;
}

export interface ValidationRule {
  rule_type: 'balance' | 'positive_amount' | 'account_active' | 'period_open';
  error_message: string;
  condition?: string;
}

// PRE-DEFINED POSTING RULES
export const STANDARD_POSTING_RULES: PostingRule[] = [
  // ===========================================
  // SALES INVOICE (Credit Sale)
  // ===========================================
  {
    transaction_type: 'SALE_INVOICE',
    source: 'sales_invoice',
    description_template: 'فاتورة مبيعات رقم {{invoice_number}} - {{customer_name}}',
    debit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'receivable_account_id',
        amount_formula: 'full',
        description_template: 'ذمم العملاء - {{customer_name}}',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '4.01', // Sales Revenue
        amount_formula: 'calculated',
        amount_calculation: 'subtotal',
        description_template: 'مبيعات',
        line_order: 2
      },
      {
        account_selector: 'fixed',
        account_code: '2.03', // Tax Payable (if applicable)
        amount_formula: 'calculated',
        amount_calculation: 'tax_amount',
        description_template: 'ضريبة القيمة المضافة',
        line_order: 3
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' },
      { rule_type: 'period_open', error_message: 'الفترة المالية مغلقة' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // SALES INVOICE - CASH SALE
  // ===========================================
  {
    transaction_type: 'SALE_INVOICE',
    source: 'sales_invoice',
    description_template: 'فاتورة مبيعات نقدية رقم {{invoice_number}}',
    debit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '1.01.001', // Cash
        amount_formula: 'full',
        description_template: 'الصندوق',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '4.01', // Sales Revenue
        amount_formula: 'calculated',
        amount_calculation: 'subtotal',
        description_template: 'مبيعات نقدية',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // COST OF GOODS SOLD (with every sale)
  // ===========================================
  {
    transaction_type: 'SALE_INVOICE',
    source: 'sales_invoice',
    description_template: 'تكلفة بضاعة مباعة - فاتورة {{invoice_number}}',
    debit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '5.01', // COGS
        amount_formula: 'calculated',
        amount_calculation: 'inventory_cost',
        description_template: 'تكلفة البضاعة المباعة',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '1.01.004', // Inventory
        amount_formula: 'calculated',
        amount_calculation: 'inventory_cost',
        description_template: 'مخزون البضاعة',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // PURCHASE INVOICE
  // ===========================================
  {
    transaction_type: 'PURCHASE_INVOICE',
    source: 'purchase_invoice',
    description_template: 'فاتورة مشتريات رقم {{invoice_number}} - {{supplier_name}}',
    debit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '1.01.004', // Inventory
        amount_formula: 'calculated',
        amount_calculation: 'inventory_amount',
        description_template: 'مشتريات بضاعة',
        line_order: 1
      },
      {
        account_selector: 'fixed',
        account_code: '2.03', // Tax Recoverable
        amount_formula: 'calculated',
        amount_calculation: 'tax_amount',
        description_template: 'ضريبة مدخلة',
        line_order: 2
      }
    ],
    credit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'payable_account_id',
        amount_formula: 'full',
        description_template: 'مورد - {{supplier_name}}',
        line_order: 3
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' },
      { rule_type: 'balance', error_message: 'القيود غير متوازنة' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // EXPENSE VOUCHER
  // ===========================================
  {
    transaction_type: 'EXPENSE_VOUCHER',
    source: 'expense',
    description_template: 'سند صرف رقم {{voucher_number}} - {{expense_category}}',
    debit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'expense_account_id',
        amount_formula: 'full',
        description_template: '{{expense_category}}',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'payment_account_id',
        amount_formula: 'full',
        description_template: 'الصندوق/البنك',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' },
      { rule_type: 'account_active', error_message: 'حساب المصروفات غير نشط' }
    ],
    requires_cost_center: true,
    requires_project: false
  },
  
  // ===========================================
  // CASH RECEIPT from Customer
  // ===========================================
  {
    transaction_type: 'CASH_RECEIPT',
    source: 'receipt',
    description_template: 'قبض من العميل {{customer_name}} - {{reference}}',
    debit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'cash_account_id',
        amount_formula: 'full',
        description_template: 'الصندوق/البنك',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'receivable_account_id',
        amount_formula: 'full',
        description_template: 'ذمم العملاء - {{customer_name}}',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // CASH PAYMENT to Supplier
  // ===========================================
  {
    transaction_type: 'CASH_PAYMENT',
    source: 'payment',
    description_template: 'صرف للمورد {{supplier_name}} - {{reference}}',
    debit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'payable_account_id',
        amount_formula: 'full',
        description_template: 'مورد - {{supplier_name}}',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'cash_account_id',
        amount_formula: 'full',
        description_template: 'الصندوق/البنك',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // INVENTORY RECEIPT (increase inventory)
  // ===========================================
  {
    transaction_type: 'INVENTORY_RECEIPT',
    source: 'inventory',
    description_template: 'إضافة مخزون - {{product_name}}',
    debit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '1.01.004', // Inventory
        amount_formula: 'calculated',
        amount_calculation: 'unit_cost * quantity',
        description_template: '{{product_name}} - {{quantity}} {{unit}}',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'account_id', // Could be payable, cash, or adjustment
        amount_formula: 'calculated',
        amount_calculation: 'unit_cost * quantity',
        description_template: '{{source_description}}',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' }
    ],
    requires_cost_center: false,
    requires_project: false
  },
  
  // ===========================================
  // INVENTORY ISSUE (decrease inventory)
  // ===========================================
  {
    transaction_type: 'INVENTORY_ISSUE',
    source: 'inventory',
    description_template: 'صرف مخزون - {{product_name}}',
    debit_accounts: [
      {
        account_selector: 'from_transaction',
        account_field: 'account_id', // COGS or expense
        amount_formula: 'calculated',
        amount_calculation: 'unit_cost * quantity',
        description_template: '{{destination_description}}',
        line_order: 1
      }
    ],
    credit_accounts: [
      {
        account_selector: 'fixed',
        account_code: '1.01.004', // Inventory
        amount_formula: 'calculated',
        amount_calculation: 'unit_cost * quantity',
        description_template: '{{product_name}} - {{quantity}} {{unit}}',
        line_order: 2
      }
    ],
    validation_rules: [
      { rule_type: 'positive_amount', error_message: 'يجب أن يكون المبلغ موجباً' },
      { rule_type: 'balance', error_message: 'القيود غير متوازنة' }
    ],
    requires_cost_center: true,
    requires_project: true
  }
];

// Rule lookup helper
export function getPostingRule(transactionType: TransactionType, context?: any): PostingRule | undefined {
  // In a real implementation, this would look up rules from database
  // and allow for customization per company
  return STANDARD_POSTING_RULES.find(r => r.transaction_type === transactionType);
}
