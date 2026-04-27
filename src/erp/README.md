# ERP System Architecture

## Professional-Grade ERP with Central Financial Engine

### 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│         (React Components, Dashboards, Reports)             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    ERP CORE SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 1: FINANCIAL CORE (Mandatory Foundation)      │   │
│  │  • Chart of Accounts (Hierarchical)                  │   │
│  │  • Journal Entries (Double-Entry)                   │   │
│  │  • Fiscal Periods (Monthly/Annual)                   │   │
│  │  • Account Balances (Real-time)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 2: POSTING ENGINE (Rule-Based)                │   │
│  │  • Transaction Rules (Sales, Purchase, Expense)        │   │
│  │  • Automatic Journal Entry Creation                   │   │
│  │  • Validation & Balance Enforcement                 │   │
│  │  • Source Document Linking                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 3: INVENTORY COSTING ENGINE                   │   │
│  │  • FIFO Cost Tracking                                 │   │
│  │  • Weighted Average Cost                              │   │
│  │  • Multi-Warehouse Support                             │   │
│  │  • Bill of Materials (Recipes)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 4: POS ENGINE                                   │   │
│  │  • Fast Checkout                                       │   │
│  │  • Automatic Accounting Integration                   │   │
│  │  • Inventory Deduction                                 │   │
│  │  • Multi-Payment Methods                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 5: OPERATIONS MODULES (Industry-Specific)     │   │
│  │  • Retail (Barcode, Inventory)                        │   │
│  │  • Restaurant (Recipes, Table Management)             │   │
│  │  • Pharmacy (Batches, Expiry)                         │   │
│  │  • Warehouse (Multi-location)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 6: REPORTING ENGINE                            │   │
│  │  • Balance Sheet                                       │   │
│  │  • Profit & Loss                                        │   │
│  │  • Trial Balance                                        │   │
│  │  • Inventory Valuation                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
│         • Relational Integrity • Audit Trails             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
src/erp/
├── financial_core/
│   ├── types/
│   │   ├── accounts.ts          # Chart of accounts types
│   │   ├── journal.ts           # Journal entry types
│   │   ├── fiscal.ts            # Fiscal period types
│   │   └── index.ts             # Types export
│   └── services/
│       └── (to be implemented)  # Core financial services
│
├── posting_engine/
│   ├── rules/
│   │   └── postingRules.ts      # Transaction posting rules
│   └── services/
│       └── postingEngine.ts     # Rule execution engine
│
├── inventory_costing_engine/
│   ├── types/
│   │   └── inventory.ts         # Inventory types
│   └── services/
│       └── costingEngine.ts     # FIFO, Weighted Average
│
├── pos_engine/
│   └── services/
│       └── posIntegration.ts    # POS-to-accounting bridge
│
├── operations_modules/
│   ├── retail/
│   │   └── retailOperations.ts  # Retail workflows
│   ├── restaurant/
│   │   └── restaurantOperations.ts # Restaurant + recipe costing
│   ├── pharmacy/
│   └── warehouse/
│
├── reporting_engine/
│   ├── types/
│   └── services/
│       └── financialReports.ts  # Standard reports
│
├── examples/
│   └── endToEndTransactions.ts  # Complete workflow examples
│
├── shared/
│   ├── utils/                   # Shared utilities
│   └── validators/              # Validation helpers
│
└── index.ts                     # Main exports
```

---

## 🎯 Core Principles

### 1. Every Transaction Creates Journal Entries

**RULE:** No transaction is valid unless it creates balanced journal entries.

```typescript
// Example: Sales Invoice
const sale = await posIntegration.processOrder({
  items: [...],
  payment_method: 'cash'
});

// Automatically creates:
// Entry 1: Revenue Recognition
//   Dr Cash           $200  (Asset ↑)
//   Cr Revenue        $200  (Revenue ↑)
//
// Entry 2: Cost Recognition  
//   Dr COGS           $120  (Expense ↑)
//   Cr Inventory      $120  (Asset ↓)
```

### 2. Posting Rules are Centralized

All transaction types use predefined posting rules:

```typescript
// Sales Invoice Rule
{
  transaction_type: 'SALE_INVOICE',
  source: 'sales_invoice',
  description_template: 'فاتورة مبيعات رقم {{invoice_number}}',
  
  debit_accounts: [
    { account_selector: 'from_transaction', account_field: 'cash_account_id', ... },
  ],
  credit_accounts: [
    { account_selector: 'fixed', account_code: '4.01', ... }, // Revenue
  ]
}
```

### 3. Inventory Affects Accounting

Every inventory movement updates both quantities AND accounts:

```typescript
// Purchase adds inventory
await costingEngine.recordReceipt({
  product_id: 'prod-001',
  quantity: 100,
  unit_cost: 30
});

// Creates:
//   Dr Inventory        $3000
//   Cr Accounts Payable $3000
```

### 4. Restaurant Recipe Costing

```typescript
// Burger Recipe Costing
const costing = await restaurantOps.calculateRecipeCost('burger-001', 1);

// Result:
{
  menu_item_name: 'Classic Burger',
  theoretical_cost: 25.00,  // From BOM
  actual_cost: 26.50,       // Current ingredient costs
  variance: 1.50,
  variance_percent: 6%,
  components: [
    { product_name: 'Beef Patty', quantity: 0.15, unit_cost: 80, total_cost: 12 },
    { product_name: 'Bun', quantity: 1, unit_cost: 3, total_cost: 3 },
    { product_name: 'Cheese', quantity: 1, unit_cost: 5, total_cost: 5 },
    { product_name: 'Veggies', quantity: 1, unit_cost: 5.50, total_cost: 5.50 }
  ]
}
```

---

## 🔧 Usage Examples

### Initialize System

```typescript
import { 
  createPostingEngine,
  createCostingEngine, 
  createPOSIntegration,
  createRetailOperations,
  createRestaurantOperations,
  createFinancialReporting
} from '@/erp';

// Initialize services for a company
const companyId = 'company-123';
const userId = 'user-456';

const postingEngine = createPostingEngine(companyId, userId);
const costingEngine = createCostingEngine(companyId);
const posIntegration = createPOSIntegration(companyId, userId);
const retailOps = createRetailOperations(companyId, userId);
const restaurantOps = createRestaurantOperations(companyId, userId);
const reporting = createFinancialReporting(companyId);
```

### Process Sale (Retail)

```typescript
const result = await retailOps.processRetailSale({
  company_id: companyId,
  warehouse_id: 'warehouse-001',
  customer_id: 'customer-001',
  items: [
    { product_id: 'prod-001', quantity: 2, unit_price: 50 },
    { product_id: 'prod-002', quantity: 1, unit_price: 100 }
  ],
  payment_method: 'cash',
  amount_paid: 200,
  created_by: userId
});

console.log(result);
// {
//   success: true,
//   invoice_id: 'inv-001',
//   journal_entry_id: 'je-001',
//   change_amount: 0,
//   errors: []
// }
```

### Process Order (Restaurant)

```typescript
const result = await restaurantOps.processRestaurantOrder({
  company_id: companyId,
  warehouse_id: 'kitchen',
  table_number: 'Table 5',
  items: [
    { menu_item_id: 'burger-001', quantity: 2, unit_price: 80 },
    { menu_item_id: 'fries-001', quantity: 2, unit_price: 30 }
  ],
  payment_method: 'cash',
  amount_paid: 220,
  created_by: userId
});

// Returns recipe costing analysis
console.log(result.recipe_costs);
```

### Purchase Inventory

```typescript
// Record receipt with cost layer
await costingEngine.recordReceipt({
  product_id: 'prod-001',
  warehouse_id: 'warehouse-001',
  quantity: 100,
  unit_cost: 30,
  reference_type: 'purchase_invoice',
  reference_id: 'pi-001',
  movement_date: '2024-01-15'
});
```

### Generate Reports

```typescript
// Balance Sheet
const balanceSheet = await reporting.generateBalanceSheet(periodId);
console.log('Total Assets:', balanceSheet.assets.total_assets);

// Profit & Loss
const pl = await reporting.generateProfitLoss(periodId);
console.log('Net Profit:', pl.net_profit);
console.log('Net Margin:', pl.net_margin + '%');

// Trial Balance
const tb = await reporting.generateTrialBalance(periodId);
console.log('Is Balanced:', tb.is_balanced);
```

---

## 📊 Database Schema

### Key Tables

| Layer | Table | Purpose |
|-------|-------|---------|
| **Financial Core** | `companies` | Multi-tenant companies |
| | `fiscal_years` | Annual accounting periods |
| | `fiscal_periods` | Monthly periods |
| | `chart_of_accounts` | Hierarchical COA |
| | `journal_entries` | Double-entry records |
| | `journal_entry_lines` | Entry detail lines |
| | `account_balances` | Period balances |
| **Inventory** | `warehouses` | Storage locations |
| | `inventory_products` | Trackable items |
| | `inventory_levels` | Stock per warehouse |
| | `cost_layers` | FIFO cost tracking |
| | `inventory_movements` | All transactions |
| | `bill_of_materials` | Recipe definitions |
| **Operations** | `customers` | Client accounts |
| | `suppliers` | Vendor accounts |
| | `sales_invoices` | Revenue documents |
| | `purchase_invoices` | Expense documents |
| | `payments` | Cash transactions |

---

## 🔄 Transaction Flow

### Sales Invoice Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────▶│   POS UI    │────▶│  POS Engine │
│   Order     │     │   (React)   │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                       ┌────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Posting Engine │
              │   (Rules-based) │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Sales   │ │ Revenue  │ │   COGS   │
    │ Invoice  │ │  Entry   │ │  Entry   │
    │  (AR)    │ │(Dr/Cr)   │ │(Dr/Cr)   │
    └──────────┘ └──────────┘ └──────────┘
                       │            │
                       ▼            ▼
              ┌─────────────────────────┐
              │   Inventory Engine      │
              │  (FIFO/Weighted Avg)    │
              └─────────────────────────┘
```

---

## 🚀 Getting Started

1. **Run Database Migration**
   ```bash
   # Execute the complete ERP schema
   supabase/migrations/20260422000000_erp_complete_system.sql
   ```

2. **Initialize Chart of Accounts**
   ```typescript
   // Use standard template
   import { STANDARD_CHART_OF_ACCOUNTS } from '@/erp/financial_core/types';
   ```

3. **Process Your First Transaction**
   ```typescript
   import { ERPExamples } from '@/erp/examples/endToEndTransactions';
   
   // Run complete workflow
   await ERPExamples.runCompleteWorkflow();
   ```

---

## 📈 Future Enhancements

- [ ] Multi-currency support
- [ ] Advanced tax engine
- [ ] Budget management
- [ ] Fixed assets module
- [ ] Payroll integration
- [ ] Bank reconciliation
- [ ] Advanced analytics
- [ ] AI-powered insights

---

## 📞 Support

For technical questions or issues:
1. Check the examples in `src/erp/examples/`
2. Review the posting rules in `src/erp/posting_engine/rules/`
3. Consult the database schema documentation

---

**Built with ❤️ for professional accounting compliance**
