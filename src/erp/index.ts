/**
 * ERP SYSTEM - Main Export Index
 * Professional-grade ERP with financial core
 */

// Financial Core
export * from './financial_core/types';

// Posting Engine
export { 
  PostingEngine, 
  createPostingEngine,
  TransactionContext,
  TransactionLineItem,
  PostingResult
} from './posting_engine/services/postingEngine';

export {
  STANDARD_POSTING_RULES,
  getPostingRule,
  TransactionType,
  PostingRule
} from './posting_engine/rules/postingRules';

// Inventory Costing Engine
export {
  InventoryCostingEngine,
  createCostingEngine,
  CostingResult,
  ConsumptionResult
} from './inventory_costing_engine/services/costingEngine';

export * from './inventory_costing_engine/types/inventory';

// POS Engine
export * from './pos_engine/services/posIntegration';

// Operations Modules
export * from './operations_modules/retail/retailOperations';
export * from './operations_modules/restaurant/restaurantOperations';

// Reporting Engine
export * from './reporting_engine/services/financialReports';
