/**
 * ERP SYSTEM - Main Export Index
 * Professional-grade ERP with financial core
 */

// Financial Core
export * from './financial_core/types';

// Professional Posting Engine (New)
export {
  ProfessionalPostingEngine,
  createPostingEngine,
} from './posting_engine/professionalPostingEngine';

export type { BusinessType } from './posting_engine/professionalPostingEngine';

export type {
  JournalEntry,
  JournalEntryLine,
  PostingResult,
} from './posting_engine/professionalPostingEngine';

// Legacy Posting Engine
export {
  PostingEngine,
  createPostingEngine as createLegacyPostingEngine,
} from './posting_engine/services/postingEngine';

export type {
  TransactionContext,
  TransactionLineItem,
  PostingResult as LegacyPostingResult,
} from './posting_engine/services/postingEngine';

// Inventory Costing Engine
export {
  InventoryCostingEngine,
  createCostingEngine,
} from './inventory_costing_engine/services/costingEngine';

export type {
  CostingResult,
  ConsumptionResult,
} from './inventory_costing_engine/services/costingEngine';

export * from './inventory_costing_engine/types/inventory';

// POS Engine
export * from './pos_engine/services/posIntegration';

// Operations Modules
export * from './operations_modules/retail/retailOperations';
export * from './operations_modules/restaurant/restaurantOperations';

// Reporting Engine
export {
  FinancialReportingEngine,
  createFinancialReporting,
} from './reporting_engine/financialReports';

export type {
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  FinancialIndicators,
} from './reporting_engine/financialReports';
