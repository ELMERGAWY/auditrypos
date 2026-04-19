
// ============================================================
// ACCOUNTING SYSTEM EXPORTS
// Ventro Pro Double-Entry Accounting
// ============================================================

export { default as journalService } from './journalService';
export { default as inventoryCosting } from './inventoryCosting';
export { default as taxService } from './taxService';
export { default as checkoutIntegration } from './checkoutIntegration';

export * from './types';

// Re-export types for convenience
export type {
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  CostCenter,
  TaxConfig,
  InventoryCostLayer,
  TrialBalance,
  ProfitLossReport,
  BalanceSheetReport,
  BusinessAccountMapping,
} from './types';

// Version
export const ACCOUNTING_SYSTEM_VERSION = '1.0.0-ventro-pro';
