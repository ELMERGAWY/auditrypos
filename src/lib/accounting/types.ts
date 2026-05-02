
// ============================================================
// ACCOUNTING TYPES & INTERFACES
// Double Entry Accounting System for Auditry ERP
// ============================================================

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense';
export type AccountSubtype = 
  | 'current_asset' | 'fixed_asset' | 'inventory' | 'receivable' | 'cash' | 'bank'
  | 'current_liability' | 'long_term_liability' | 'payable'
  | 'capital' | 'retained_earnings'
  | 'operating_revenue' | 'other_revenue'
  | 'direct_cogs' | 'indirect_cogs'
  | 'operating_expense' | 'admin_expense' | 'selling_expense';

export interface ChartOfAccount {
  id: string;
  restaurant_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  subtype?: AccountSubtype;
  parent_id?: string;
  is_bank_account: boolean;
  is_cash_account: boolean;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  currency: string;
}

export interface JournalEntry {
  id: string;
  restaurant_id: string;
  entry_number: string;
  entry_date: Date;
  reference_type: 'order' | 'payment' | 'expense' | 'inventory' | 'adjustment' | 'purchase' | 'return';
  reference_id?: string;
  description: string;
  source: 'pos' | 'auto' | 'import' | 'manual';
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  is_recurring: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: Date;
  lines: JournalEntryLine[];
  created_at: Date;
}

export interface JournalEntryLine {
  id: string;
  entry_id: string;
  account_id: string;
  account?: ChartOfAccount;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: string;
  line_order: number;
}

export interface CostCenter {
  id: string;
  restaurant_id: string;
  code: string;
  name: string;
  type: 'department' | 'project' | 'branch' | 'activity';
  parent_id?: string;
  budget_amount?: number;
  is_active: boolean;
}

// Business-Specific Account Mappings
// ============================================================

export interface BusinessAccountMapping {
  // Asset Accounts
  cashAccount: string;           // 1100
  bankAccount: string;         // 1400
  accountsReceivable: string;  // 1200
  inventoryAccount: string;    // 1300
  
  // Liability Accounts
  accountsPayable: string;     // 2100
  taxPayable: string;          // 2150
  accruedExpenses: string;     // 2200
  
  // Revenue Accounts
  salesRevenue: string;        // 4100
  serviceRevenue: string;      // 4200
  deliveryRevenue: string;   // 4300 (for restaurants)
  
  // COGS Accounts
  cogsAccount: string;         // 5100
  wastageAccount: string;      // 5200 (restaurants)
  
  // Expense Accounts
  salariesExpense: string;   // 6100
  rentExpense: string;       // 6200
  utilitiesExpense: string;  // 6300
  marketingExpense: string;    // 6400
}

export type BusinessType = 
  | 'services' | 'retail' | 'restaurant' | 'pharmacy' | 'grocery' 
  | 'wholesale' | 'warehouse' | 'shipping' | 'distribution' 
  | 'hospital' | 'factory' | 'general';

// Business-Specific Account Mappings
// ============================================================

export interface BusinessAccountMapping {
  // Asset Accounts
  cashAccount: string;           // 1100
  bankAccount: string;         // 1400
  accountsReceivable: string;  // 1200
  inventoryAccount: string;    // 1300
  
  // Liability Accounts
  accountsPayable: string;     // 2100
  taxPayable: string;          // 2150
  accruedExpenses: string;     // 2200
  
  // Revenue Accounts
  salesRevenue: string;        // 4100
  serviceRevenue: string;      // 4200
  deliveryRevenue?: string;    // 4300 (for restaurants)
  shippingRevenue?: string;    // 4400 (for shipping)
  
  // COGS Accounts
  cogsAccount: string;         // 5100
  wastageAccount?: string;     // 5200 (restaurants)
  productionCostAccount?: string; // 5300 (factories)
  
  // Expense Accounts
  salariesExpense: string;   // 6100
  rentExpense: string;       // 6200
  utilitiesExpense: string;  // 6300
  marketingExpense: string;    // 6400
  realEstateRevenue?: string;  // 4800
  contractingRevenue?: string; // 4900
  finishingRevenue?: string;   // 4210
  rentalRevenue?: string;      // 4220
  educationRevenue?: string;   // 4230
}

// Account mappings per business type
export const BUSINESS_ACCOUNT_MAPPINGS: Record<string, Partial<BusinessAccountMapping>> = {
  restaurant: {
    deliveryRevenue: '4300',
    wastageAccount: '5200',
    marketingExpense: '6400',
  },
  retail: {
    cogsAccount: '5100',
    wastageAccount: '5250',
  },
  grocery: {
    cogsAccount: '5100',
    wastageAccount: '5200',
    marketingExpense: '6400',
  },
  pharmacy: {
    cogsAccount: '5100',
    wastageAccount: '5300',
  },
  wholesale: {
    salesRevenue: '4100',
    cogsAccount: '5100',
    marketingExpense: '6400',
  },
  services: {
    inventoryAccount: undefined,
    cogsAccount: '5150',
    serviceRevenue: '4200',
  },
  warehouse: {
    cogsAccount: '5100',
    rentExpense: '6200',
  },
  shipping: {
    shippingRevenue: '4400',
    inventoryAccount: undefined, // Usually no inventory
    cogsAccount: '5160', // Direct shipping costs
  },
  distribution: {
    salesRevenue: '4100',
    cogsAccount: '5100',
    marketingExpense: '6500', // Distribution specific marketing/commissions
  },
  hospital: {
    serviceRevenue: '4200',
    inventoryAccount: '1350', // Medical supplies
    cogsAccount: '5170', // Medical costs
  },
  factory: {
    productionCostAccount: '5300',
    inventoryAccount: '1300', // Raw materials
    salesRevenue: '4100',
  },
  real_estate: {
    realEstateRevenue: '4800',
    serviceRevenue: '4200',
    inventoryAccount: undefined,
  },
  contracting: {
    contractingRevenue: '4900',
    inventoryAccount: '1300',
    cogsAccount: '5100',
  },
  finishing: {
    finishingRevenue: '4210',
    serviceRevenue: '4200',
    inventoryAccount: '1300',
  },
  rental: {
    rentalRevenue: '4220',
    serviceRevenue: '4200',
    inventoryAccount: undefined,
  },
  education: {
    educationRevenue: '4230',
    serviceRevenue: '4200',
    inventoryAccount: undefined,
  },
  law_firm: {
    serviceRevenue: '4240',
    inventoryAccount: undefined,
  },
  marketing_agency: {
    serviceRevenue: '4250',
    inventoryAccount: undefined,
  },
  auto_repair: {
    serviceRevenue: '4260',
    inventoryAccount: '1300',
    cogsAccount: '5150',
  },
  general: {
    salesRevenue: '4100',
    cogsAccount: '5100',
  }
};

// Journal Entry Templates by Business Type
// ============================================================

export interface JournalTemplate {
  template_id: string;
  name: string;
  description: string;
  business_types: string[];
  lines: JournalTemplateLine[];
}

export interface JournalTemplateLine {
  account_code: string;
  account_type: 'debit' | 'credit';
  amount_formula: string; // e.g., "{total}", "{cogs}", "{tax_amount}", "{discount}"
  description_template: string;
  condition?: string; // e.g., "{discount} > 0"
}

// Pre-defined journal entry templates
export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    template_id: 'sale_cash',
    name: 'Cash Sale',
    description: 'Record cash sale transaction',
    business_types: ['restaurant', 'retail', 'grocery', 'pharmacy', 'wholesale'],
    lines: [
      { account_code: '1100', account_type: 'debit', amount_formula: '{paid_amount}', description_template: 'Cash from sale #{order_number}' },
      { account_code: '1200', account_type: 'debit', amount_formula: '{remaining}', description_template: 'AR from sale #{order_number}', condition: '{remaining} > 0' },
      { account_code: '4100', account_type: 'credit', amount_formula: '{total} + {discount}', description_template: 'Sales revenue #{order_number}' },
      { account_code: '2150', account_type: 'credit', amount_formula: '{tax_amount}', description_template: 'VAT payable', condition: '{tax_amount} > 0' },
      { account_code: '4100', account_type: 'debit', amount_formula: '{discount}', description_template: 'Sales discount', condition: '{discount} > 0' },
    ],
  },
  {
    template_id: 'sale_service',
    name: 'Service Sale',
    description: 'Record service sale (no inventory)',
    business_types: ['services'],
    lines: [
      { account_code: '1100', account_type: 'debit', amount_formula: '{paid_amount}', description_template: 'Cash from service #{order_number}' },
      { account_code: '4200', account_type: 'credit', amount_formula: '{total} - {tax_amount}', description_template: 'Service revenue #{order_number}' },
      { account_code: '2150', account_type: 'credit', amount_formula: '{tax_amount}', description_template: 'VAT payable', condition: '{tax_amount} > 0' },
    ],
  },
  {
    template_id: 'cogs_sale',
    name: 'Cost of Goods Sold',
    description: 'Record COGS for inventory sale',
    business_types: ['restaurant', 'retail', 'grocery', 'pharmacy', 'wholesale'],
    lines: [
      { account_code: '5100', account_type: 'debit', amount_formula: '{cogs}', description_template: 'COGS for sale #{order_number}' },
      { account_code: '1300', account_type: 'credit', amount_formula: '{cogs}', description_template: 'Inventory reduction' },
    ],
  },
  {
    template_id: 'delivery_sale',
    name: 'Delivery Sale',
    description: 'Record delivery-specific sale',
    business_types: ['restaurant', 'grocery'],
    lines: [
      { account_code: '1100', account_type: 'debit', amount_formula: '{paid_amount}', description_template: 'Cash from delivery #{order_number}' },
      { account_code: '4300', account_type: 'credit', amount_formula: '{delivery_fee}', description_template: 'Delivery fee revenue', condition: '{delivery_fee} > 0' },
      { account_code: '4100', account_type: 'credit', amount_formula: '{subtotal} - {delivery_fee}', description_template: 'Food sales #{order_number}' },
      { account_code: '2150', account_type: 'credit', amount_formula: '{tax_amount}', description_template: 'VAT on delivery', condition: '{tax_amount} > 0' },
    ],
  },
  {
    template_id: 'inventory_purchase',
    name: 'Inventory Purchase',
    description: 'Record inventory purchase',
    business_types: ['retail', 'grocery', 'pharmacy', 'restaurant', 'wholesale'],
    lines: [
      { account_code: '1300', account_type: 'debit', amount_formula: '{purchase_amount}', description_template: 'Inventory purchase' },
      { account_code: '2100', account_type: 'credit', amount_formula: '{purchase_amount}', description_template: 'AP - Inventory supplier', condition: '{is_credit} == true' },
      { account_code: '1100', account_type: 'credit', amount_formula: '{purchase_amount}', description_template: 'Cash paid', condition: '{is_credit} == false' },
    ],
  },
  {
    template_id: 'expense_payment',
    name: 'Expense Payment',
    description: 'Record expense payment',
    business_types: ['*'], // All business types
    lines: [
      { account_code: '{expense_account}', account_type: 'debit', amount_formula: '{amount}', description_template: '{expense_description}' },
      { account_code: '1100', account_type: 'credit', amount_formula: '{amount}', description_template: 'Cash payment', condition: '{payment_method} == cash' },
      { account_code: '1400', account_type: 'credit', amount_formula: '{amount}', description_template: 'Bank payment', condition: '{payment_method} == bank' },
    ],
  },
];

// Tax Configuration
// ============================================================

export interface TaxConfig {
  id: string;
  restaurant_id: string;
  name: string;
  rate: number;
  type: 'vat' | 'sales' | 'service' | 'withholding';
  is_compound: boolean;
  is_included_in_price: boolean;
  applies_to: string[]; // product categories
  is_active: boolean;
}

export interface OrderTaxLine {
  tax_config_id: string;
  tax_name: string;
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
}

// FIFO Costing
// ============================================================

export interface InventoryCostLayer {
  id: string;
  restaurant_id: string;
  product_id: string;
  layer_date: Date;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  remaining_qty: number;
  layer_type: 'purchase' | 'opening' | 'adjustment' | 'transfer_in' | 'production';
  reference_id?: string;
  is_consumed: boolean;
  consumed_at?: Date;
}

export interface InventoryConsumption {
  id: string;
  product_id: string;
  order_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  layers_consumed: number;
  layers?: InventoryCostLayer[];
  created_at: Date;
}

// Financial Reporting
// ============================================================

export interface TrialBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  opening_balance: number;
  debit_movement: number;
  credit_movement: number;
  closing_balance: number;
}

export interface ProfitLossReport {
  period_start: Date;
  period_end: Date;
  revenue: {
    sales: number;
    services: number;
    other: number;
    total: number;
  };
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  expenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    depreciation: number;
    other: number;
    total: number;
  };
  net_profit: number;
  net_margin: number;
}

export interface BalanceSheetReport {
  as_of_date: Date;
  assets: {
    current: {
      cash: number;
      bank: number;
      receivables: number;
      inventory: number;
      other: number;
      total: number;
    };
    fixed: {
      equipment: number;
      furniture: number;
      vehicles: number;
      accumulated_depreciation: number;
      net: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      payables: number;
      taxes: number;
      short_term_loans: number;
      total: number;
    };
    long_term: {
      loans: number;
      other: number;
      total: number;
    };
    total: number;
  };
  equity: {
    capital: number;
    retained_earnings: number;
    current_earnings: number;
    total: number;
  };
  total_liabilities_equity: number;
}
