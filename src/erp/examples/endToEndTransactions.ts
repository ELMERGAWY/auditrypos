/**
 * END-TO-END TRANSACTION EXAMPLES
 * Demonstrates complete flow through all ERP layers
 */

import { createPostingEngine, TransactionContext } from '../posting_engine/services/postingEngine';
import { createCostingEngine } from '../inventory_costing_engine/services/costingEngine';
import { createPOSIntegration, POSOrderContext } from '../pos_engine/services/posIntegration';
import { createRetailOperations } from '../operations_modules/retail/retailOperations';
import { createRestaurantOperations } from '../operations_modules/restaurant/restaurantOperations';
import { createFinancialReporting } from '../reporting_engine/services/financialReports';
import { supabase } from '@/integrations/supabase/client';

/**
 * ===========================================
 * EXAMPLE 1: RETAIL SALES FLOW
 * ===========================================
 * 
 * Flow:
 * 1. Customer buys products
 * 2. POS creates sales invoice
 * 3. Inventory is reduced (FIFO/Weighted Average)
 * 4. Revenue entry: Dr Cash | Cr Revenue
 * 5. COGS entry: Dr COGS | Cr Inventory
 */

export async function exampleRetailSale() {
  const companyId = 'company-123';
  const userId = 'user-456';
  const warehouseId = 'warehouse-789';
  
  // Initialize services
  const retailOps = createRetailOperations(companyId, userId);
  const posIntegration = createPOSIntegration(companyId, userId);
  const costingEngine = createCostingEngine(companyId);
  
  // Get current fiscal period
  const { data: period } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();
  
  const fiscalPeriodId = period?.id || 'period-001';
  
  // Step 1: Process sale through POS
  const saleResult = await retailOps.processRetailSale({
    company_id: companyId,
    warehouse_id: warehouseId,
    customer_id: 'customer-001',
    items: [
      { product_id: 'prod-001', quantity: 2, unit_price: 50 },
      { product_id: 'prod-002', quantity: 1, unit_price: 100 }
    ],
    payment_method: 'cash',
    amount_paid: 200,
    created_by: userId
  });
  
  console.log('Retail Sale Result:', {
    success: saleResult.success,
    invoice_id: saleResult.invoice_id,
    journal_entry_id: saleResult.journal_entry_id,
    change_amount: saleResult.change_amount,
    errors: saleResult.errors
  });
  
  // Expected Journal Entries Created:
  // Entry 1 - Revenue:
  //   Dr Cash           200  (Asset +)
  //   Cr Revenue        200  (Revenue +)
  //
  // Entry 2 - COGS:
  //   Dr COGS           120  (Expense +)
  //   Cr Inventory      120  (Asset -)
  //
  // Note: COGS amount depends on inventory costing method
  
  return saleResult;
}

/**
 * ===========================================
 * EXAMPLE 2: PURCHASE FLOW
 * ===========================================
 * 
 * Flow:
 * 1. Receive goods from supplier
 * 2. Create purchase invoice
 * 3. Inventory increases
 * 4. Cost layers created (for FIFO)
 * 5. Journal entry: Dr Inventory | Cr Accounts Payable
 */

export async function examplePurchaseFlow() {
  const companyId = 'company-123';
  const userId = 'user-456';
  const warehouseId = 'warehouse-789';
  const supplierId = 'supplier-001';
  
  const postingEngine = createPostingEngine(companyId, userId);
  const costingEngine = createCostingEngine(companyId);
  
  // Get current fiscal period
  const { data: period } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();
  
  const fiscalPeriodId = period?.id || 'period-001';
  
  // Step 1: Record inventory receipt with cost layer
  const receiptResult = await costingEngine.recordReceipt({
    product_id: 'prod-001',
    warehouse_id: warehouseId,
    quantity: 100,
    unit_cost: 30, // $30 per unit
    reference_type: 'purchase_invoice',
    reference_id: 'invoice-001',
    movement_date: new Date().toISOString().split('T')[0]
  });
  
  console.log('Inventory Receipt Result:', receiptResult);
  
  // Step 2: Post purchase invoice to accounting
  const purchaseContext: TransactionContext = {
    company_id: companyId,
    fiscal_period_id: fiscalPeriodId,
    transaction_type: 'PURCHASE_INVOICE',
    transaction_date: new Date().toISOString().split('T')[0],
    reference_type: 'purchase_invoices',
    reference_id: 'invoice-001',
    description: 'Purchase from Supplier XYZ',
    
    total_amount: 3000, // 100 units × $30
    subtotal: 3000,
    tax_amount: 0,
    
    // Accounts
    inventory_account_id: 'acc-inventory',
    payable_account_id: 'acc-payable-001',
    
    created_by: userId
  };
  
  const purchaseResult = await postingEngine.postTransaction(purchaseContext);
  
  console.log('Purchase Posting Result:', {
    success: purchaseResult.success,
    entry_id: purchaseResult.entry_id,
    entry_number: purchaseResult.entry_number,
    errors: purchaseResult.errors
  });
  
  // Expected Journal Entry:
  //   Dr Inventory           3000  (Asset +)
  //   Cr Accounts Payable    3000  (Liability +)
  
  return { receiptResult, purchaseResult };
}

/**
 * ===========================================
 * EXAMPLE 3: RESTAURANT ORDER FLOW
 * ===========================================
 * 
 * Flow:
 * 1. Customer orders meals
 * 2. Recipe costing calculated
 * 3. Inventory reduced based on BOM
 * 4. COGS calculated from actual ingredient costs
 * 5. Variance analysis (actual vs theoretical)
 */

export async function exampleRestaurantOrder() {
  const companyId = 'company-123';
  const userId = 'user-456';
  const warehouseId = 'warehouse-kitchen';
  
  const restaurantOps = createRestaurantOperations(companyId, userId);
  
  // Get current fiscal period
  const { data: period } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();
  
  const fiscalPeriodId = period?.id || 'period-001';
  
  // Step 1: Process restaurant order
  const orderResult = await restaurantOps.processRestaurantOrder({
    company_id: companyId,
    warehouse_id: warehouseId,
    table_number: 'Table 5',
    items: [
      { menu_item_id: 'menu-burger-001', quantity: 2, unit_price: 80 },
      { menu_item_id: 'menu-fries-001', quantity: 2, unit_price: 30 }
    ],
    payment_method: 'cash',
    amount_paid: 220,
    created_by: userId
  });
  
  console.log('Restaurant Order Result:', {
    success: orderResult.success,
    invoice_id: orderResult.invoice_id,
    journal_entry_id: orderResult.journal_entry_id
  });
  
  // Step 2: Recipe Costing Analysis
  if (orderResult.recipe_costs) {
    console.log('Recipe Costing Analysis:');
    for (const recipe of orderResult.recipe_costs) {
      console.log(`\n${recipe.menu_item_name}:`);
      console.log(`  Theoretical Cost: $${recipe.theoretical_cost.toFixed(2)}`);
      console.log(`  Actual Cost: $${recipe.actual_cost.toFixed(2)}`);
      console.log(`  Variance: $${recipe.variance.toFixed(2)} (${recipe.variance_percent.toFixed(1)}%)`);
      console.log('  Components:');
      for (const comp of recipe.components) {
        console.log(`    - ${comp.product_name}: ${comp.quantity_required} × $${comp.unit_cost.toFixed(2)} = $${comp.total_cost.toFixed(2)}`);
      }
    }
  }
  
  // Expected Results:
  // - Sales Revenue: 220 (Dr Cash, Cr Revenue)
  // - COGS: Actual cost of ingredients (varies based on current inventory costs)
  // - Inventory reduced for each component in recipes
  // - Variance report shows actual vs theoretical cost
  
  return orderResult;
}

/**
 * ===========================================
 * EXAMPLE 4: EXPENSE VOUCHER FLOW
 * ===========================================
 * 
 * Flow:
 * 1. Record expense (rent, salaries, etc.)
 * 2. Post to expense account
 * 3. Reduce cash/bank
 */

export async function exampleExpenseVoucher() {
  const companyId = 'company-123';
  const userId = 'user-456';
  
  const postingEngine = createPostingEngine(companyId, userId);
  
  // Get current fiscal period
  const { data: period } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();
  
  const fiscalPeriodId = period?.id || 'period-001';
  
  // Post rent expense
  const expenseContext: TransactionContext = {
    company_id: companyId,
    fiscal_period_id: fiscalPeriodId,
    transaction_type: 'EXPENSE_VOUCHER',
    transaction_date: new Date().toISOString().split('T')[0],
    reference_type: 'expense_vouchers',
    reference_id: 'voucher-001',
    description: 'Monthly Rent Payment',
    
    total_amount: 3000,
    
    // Accounts
    expense_account_id: 'acc-rent-expense',
    cash_account_id: 'acc-cash',
    cost_center_id: 'cc-head-office',
    
    created_by: userId
  };
  
  const expenseResult = await postingEngine.postTransaction(expenseContext);
  
  console.log('Expense Posting Result:', {
    success: expenseResult.success,
    entry_id: expenseResult.entry_id,
    entry_number: expenseResult.entry_number
  });
  
  // Expected Journal Entry:
  //   Dr Rent Expense      3000  (Expense +)
  //   Cr Cash              3000  (Asset -)
  
  return expenseResult;
}

/**
 * ===========================================
 * EXAMPLE 5: FINANCIAL REPORTING
 * ===========================================
 * 
 * Generate standard financial reports after transactions
 */

export async function exampleFinancialReports() {
  const companyId = 'company-123';
  const fiscalPeriodId = 'period-001';
  
  const reporting = createFinancialReporting(companyId);
  
  // Generate all reports
  const balanceSheet = await reporting.generateBalanceSheet(fiscalPeriodId);
  const profitLoss = await reporting.generateProfitLoss(fiscalPeriodId);
  const trialBalance = await reporting.generateTrialBalance(fiscalPeriodId);
  
  // Display Balance Sheet Summary
  console.log('\n=== BALANCE SHEET ===');
  console.log(`As of: ${balanceSheet.as_of_date}`);
  console.log(`\nASSETS:`);
  console.log(`  Current Assets: $${balanceSheet.assets.total_current_assets.toLocaleString()}`);
  console.log(`  Fixed Assets: $${balanceSheet.assets.total_fixed_assets.toLocaleString()}`);
  console.log(`  TOTAL ASSETS: $${balanceSheet.assets.total_assets.toLocaleString()}`);
  
  console.log(`\nLIABILITIES:`);
  console.log(`  Current Liabilities: $${balanceSheet.liabilities.total_current_liabilities.toLocaleString()}`);
  console.log(`  Long-term Liabilities: $${balanceSheet.liabilities.total_long_term_liabilities.toLocaleString()}`);
  console.log(`  TOTAL LIABILITIES: $${balanceSheet.liabilities.total_liabilities.toLocaleString()}`);
  
  console.log(`\nEQUITY:`);
  console.log(`  Total Equity: $${balanceSheet.equity.total_equity.toLocaleString()}`);
  
  console.log(`\nCHECK: ${balanceSheet.difference === 0 ? '✓ BALANCED' : `⚠ DIFFERENCE: ${balanceSheet.difference}`}`);
  
  // Display Profit & Loss Summary
  console.log('\n=== PROFIT & LOSS STATEMENT ===');
  console.log(`Period: ${profitLoss.start_date} to ${profitLoss.end_date}`);
  console.log(`\nRevenue: $${profitLoss.revenue.total.toLocaleString()}`);
  console.log(`COGS: $${profitLoss.cogs.total.toLocaleString()}`);
  console.log(`Gross Profit: $${profitLoss.gross_profit.toLocaleString()} (${profitLoss.gross_profit_margin.toFixed(1)}%)`);
  console.log(`Operating Expenses: $${profitLoss.operating_expenses.total.toLocaleString()}`);
  console.log(`Operating Profit: $${profitLoss.operating_profit.toLocaleString()} (${profitLoss.operating_margin.toFixed(1)}%)`);
  console.log(`\nNET PROFIT: $${profitLoss.net_profit.toLocaleString()} (${profitLoss.net_margin.toFixed(1)}%)`);
  
  // Display Trial Balance
  console.log('\n=== TRIAL BALANCE ===');
  console.log(`As of: ${trialBalance.as_of_date}`);
  console.log(`Accounts: ${trialBalance.accounts.length}`);
  console.log(`\nMOVEMENTS:`);
  console.log(`  Debits: $${trialBalance.totals.movement_debits.toLocaleString()}`);
  console.log(`  Credits: $${trialBalance.totals.movement_credits.toLocaleString()}`);
  console.log(`CLOSING BALANCES:`);
  console.log(`  Debits: $${trialBalance.totals.closing_debits.toLocaleString()}`);
  console.log(`  Credits: $${trialBalance.totals.closing_credits.toLocaleString()}`);
  console.log(`\nCHECK: ${trialBalance.is_balanced ? '✓ BALANCED' : `⚠ DIFFERENCE: ${trialBalance.difference}`}`);
  
  return {
    balanceSheet,
    profitLoss,
    trialBalance
  };
}

/**
 * ===========================================
 * COMPLETE WORKFLOW DEMONSTRATION
 * ===========================================
 * Run all examples in sequence
 */

export async function runCompleteWorkflow() {
  console.log('='.repeat(60));
  console.log('ERP SYSTEM - COMPLETE WORKFLOW DEMONSTRATION');
  console.log('='.repeat(60));
  
  try {
    // 1. Purchase inventory
    console.log('\n📦 STEP 1: Purchase Inventory');
    await examplePurchaseFlow();
    
    // 2. Make retail sales
    console.log('\n🛒 STEP 2: Retail Sale');
    await exampleRetailSale();
    
    // 3. Process restaurant order
    console.log('\n🍽️ STEP 3: Restaurant Order');
    await exampleRestaurantOrder();
    
    // 4. Record expenses
    console.log('\n💸 STEP 4: Expense Voucher');
    await exampleExpenseVoucher();
    
    // 5. Generate reports
    console.log('\n📊 STEP 5: Financial Reports');
    await exampleFinancialReports();
    
    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW COMPLETE ✓');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

// Export all examples
export const ERPExamples = {
  exampleRetailSale,
  examplePurchaseFlow,
  exampleRestaurantOrder,
  exampleExpenseVoucher,
  exampleFinancialReports,
  runCompleteWorkflow
};
