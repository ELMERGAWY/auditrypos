/**
 * FINANCIAL REPORTING ENGINE
 * Generates all standard financial reports
 */

import { supabase } from '@/integrations/supabase/client';

// Report types
export type ReportType = 
  | 'balance_sheet'
  | 'profit_loss'
  | 'cash_flow'
  | 'trial_balance'
  | 'general_ledger'
  | 'account_balance'
  | 'inventory_valuation'
  | 'cogs_analysis';

// Standard financial reports
export interface BalanceSheetReport {
  as_of_date: string;
  company_id: string;
  fiscal_period_id: string;
  
  assets: {
    current_assets: BalanceSheetItem[];
    fixed_assets: BalanceSheetItem[];
    total_current_assets: number;
    total_fixed_assets: number;
    total_assets: number;
  };
  
  liabilities: {
    current_liabilities: BalanceSheetItem[];
    long_term_liabilities: BalanceSheetItem[];
    total_current_liabilities: number;
    total_long_term_liabilities: number;
    total_liabilities: number;
  };
  
  equity: {
    items: BalanceSheetItem[];
    total_equity: number;
  };
  
  total_liabilities_and_equity: number;
  difference: number;
}

export interface BalanceSheetItem {
  account_id: string;
  account_code: string;
  account_name: string;
  balance: number;
}

export interface ProfitLossReport {
  start_date: string;
  end_date: string;
  company_id: string;
  fiscal_period_id: string;
  
  revenue: {
    items: PLItem[];
    total: number;
  };
  
  cogs: {
    items: PLItem[];
    total: number;
  };
  
  gross_profit: number;
  gross_profit_margin: number;
  
  operating_expenses: {
    items: PLItem[];
    total: number;
  };
  
  operating_profit: number;
  operating_margin: number;
  
  other_income: {
    items: PLItem[];
    total: number;
  };
  
  other_expenses: {
    items: PLItem[];
    total: number;
  };
  
  net_profit_before_tax: number;
  tax_expense: number;
  net_profit: number;
  net_margin: number;
}

export interface PLItem {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
  percent_of_revenue?: number;
}

export interface TrialBalanceReport {
  as_of_date: string;
  company_id: string;
  fiscal_period_id: string;
  
  accounts: {
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    opening_balance: number;
    debit_movement: number;
    credit_movement: number;
    closing_balance: number;
  }[];
  
  totals: {
    opening_debits: number;
    opening_credits: number;
    movement_debits: number;
    movement_credits: number;
    closing_debits: number;
    closing_credits: number;
  };
  
  is_balanced: boolean;
  difference: number;
}

/**
 * Financial Reporting Service
 */
export class FinancialReportingService {
  private companyId: string;
  
  constructor(companyId: string) {
    this.companyId = companyId;
  }
  
  /**
   * Generate Balance Sheet
   */
  async generateBalanceSheet(
    fiscal_period_id: string,
    as_of_date?: string
  ): Promise<BalanceSheetReport> {
    const date = as_of_date || new Date().toISOString().split('T')[0];
    
    // Get all accounts with balances for this period
    const { data: balances } = await supabase
      .from('account_balances')
      .select(`
        opening_balance,
        debit_movement,
        credit_movement,
        closing_balance,
        account:account_id (
          id,
          code,
          name,
          account_type,
          subtype
        )
      `)
      .eq('fiscal_period_id', fiscal_period_id)
      .order('account(code)');
    
    if (!balances) {
      throw new Error('No account balances found');
    }
    
    // Organize by category
    const currentAssets: BalanceSheetItem[] = [];
    const fixedAssets: BalanceSheetItem[] = [];
    const currentLiabilities: BalanceSheetItem[] = [];
    const longTermLiabilities: BalanceSheetItem[] = [];
    const equity: BalanceSheetItem[] = [];
    
    let totalCurrentAssets = 0;
    let totalFixedAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalLongTermLiabilities = 0;
    let totalEquity = 0;
    
    for (const bal of balances) {
      const item: BalanceSheetItem = {
        account_id: bal.account.id,
        account_code: bal.account.code,
        account_name: bal.account.name,
        balance: bal.closing_balance
      };
      
      switch (bal.account.account_type) {
        case 'asset':
          if (bal.account.subtype === 'current_asset' || bal.account.subtype === 'inventory' || 
              bal.account.subtype === 'receivable' || bal.account.subtype === 'cash' || bal.account.subtype === 'bank') {
            currentAssets.push(item);
            totalCurrentAssets += item.balance;
          } else {
            fixedAssets.push(item);
            totalFixedAssets += item.balance;
          }
          break;
          
        case 'liability':
          if (bal.account.subtype === 'current_liability' || bal.account.subtype === 'payable') {
            currentLiabilities.push(item);
            totalCurrentLiabilities += item.balance;
          } else {
            longTermLiabilities.push(item);
            totalLongTermLiabilities += item.balance;
          }
          break;
          
        case 'equity':
          equity.push(item);
          totalEquity += item.balance;
          break;
      }
    }
    
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    
    return {
      as_of_date: date,
      company_id: this.companyId,
      fiscal_period_id,
      assets: {
        current_assets: currentAssets,
        fixed_assets: fixedAssets,
        total_current_assets: totalCurrentAssets,
        total_fixed_assets: totalFixedAssets,
        total_assets: totalAssets
      },
      liabilities: {
        current_liabilities: currentLiabilities,
        long_term_liabilities: longTermLiabilities,
        total_current_liabilities: totalCurrentLiabilities,
        total_long_term_liabilities: totalLongTermLiabilities,
        total_liabilities: totalLiabilities
      },
      equity: {
        items: equity,
        total_equity: totalEquity
      },
      total_liabilities_and_equity: totalLiabilitiesAndEquity,
      difference: totalAssets - totalLiabilitiesAndEquity
    };
  }
  
  /**
   * Generate Profit & Loss Statement
   */
  async generateProfitLoss(
    fiscal_period_id: string,
    start_date?: string,
    end_date?: string
  ): Promise<ProfitLossReport> {
    // Get period info
    const { data: period } = await supabase
      .from('fiscal_periods')
      .select('start_date, end_date')
      .eq('id', fiscal_period_id)
      .single();
    
    const start = start_date || period?.start_date;
    const end = end_date || period?.end_date;
    
    // Get revenue accounts
    const { data: revenueBalances } = await supabase
      .from('account_balances')
      .select(`
        credit_movement,
        account:account_id (id, code, name, account_type)
      `)
      .eq('fiscal_period_id', fiscal_period_id)
      .eq('account.account_type', 'revenue');
    
    // Get COGS accounts
    const { data: cogsBalances } = await supabase
      .from('account_balances')
      .select(`
        debit_movement,
        account:account_id (id, code, name)
      `)
      .eq('fiscal_period_id', fiscal_period_id)
      .eq('account.account_type', 'cogs');
    
    // Get expense accounts
    const { data: expenseBalances } = await supabase
      .from('account_balances')
      .select(`
        debit_movement,
        account:account_id (id, code, name, subtype)
      `)
      .eq('fiscal_period_id', fiscal_period_id)
      .eq('account.account_type', 'expense');
    
    // Build P&L
    const revenue: PLItem[] = revenueBalances?.map(b => ({
      account_id: b.account.id,
      account_code: b.account.code,
      account_name: b.account.name,
      amount: b.credit_movement
    })) || [];
    
    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    
    // Add percentages
    revenue.forEach(r => {
      r.percent_of_revenue = totalRevenue > 0 ? (r.amount / totalRevenue) * 100 : 0;
    });
    
    const cogs: PLItem[] = cogsBalances?.map(b => ({
      account_id: b.account.id,
      account_code: b.account.code,
      account_name: b.account.name,
      amount: b.debit_movement,
      percent_of_revenue: totalRevenue > 0 ? (b.debit_movement / totalRevenue) * 100 : 0
    })) || [];
    
    const totalCOGS = cogs.reduce((sum, c) => sum + c.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Operating expenses
    const operatingExpenses: PLItem[] = expenseBalances
      ?.filter(b => b.account.subtype === 'operating_expense')
      .map(b => ({
        account_id: b.account.id,
        account_code: b.account.code,
        account_name: b.account.name,
        amount: b.debit_movement,
        percent_of_revenue: totalRevenue > 0 ? (b.debit_movement / totalRevenue) * 100 : 0
      })) || [];
    
    const totalOperatingExpenses = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
    
    // Other income (for simplicity, empty)
    const otherIncome: PLItem[] = [];
    
    // Other expenses
    const otherExpenses: PLItem[] = expenseBalances
      ?.filter(b => b.account.subtype !== 'operating_expense')
      .map(b => ({
        account_id: b.account.id,
        account_code: b.account.code,
        account_name: b.account.name,
        amount: b.debit_movement,
        percent_of_revenue: totalRevenue > 0 ? (b.debit_movement / totalRevenue) * 100 : 0
      })) || [];
    
    const totalOtherIncome = otherIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const netProfitBeforeTax = operatingProfit + totalOtherIncome - totalOtherExpenses;
    const taxExpense = 0; // Simplified
    const netProfit = netProfitBeforeTax - taxExpense;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return {
      start_date: start,
      end_date: end,
      company_id: this.companyId,
      fiscal_period_id,
      revenue: {
        items: revenue,
        total: totalRevenue
      },
      cogs: {
        items: cogs,
        total: totalCOGS
      },
      gross_profit: grossProfit,
      gross_profit_margin: grossMargin,
      operating_expenses: {
        items: operatingExpenses,
        total: totalOperatingExpenses
      },
      operating_profit: operatingProfit,
      operating_margin: operatingMargin,
      other_income: {
        items: otherIncome,
        total: totalOtherIncome
      },
      other_expenses: {
        items: otherExpenses,
        total: totalOtherExpenses
      },
      net_profit_before_tax: netProfitBeforeTax,
      tax_expense: taxExpense,
      net_profit: netProfit,
      net_margin: netMargin
    };
  }
  
  /**
   * Generate Trial Balance
   */
  async generateTrialBalance(fiscal_period_id: string): Promise<TrialBalanceReport> {
    const { data: balances } = await supabase
      .from('account_balances')
      .select(`
        opening_balance,
        debit_movement,
        credit_movement,
        closing_balance,
        account:account_id (id, code, name, account_type)
      `)
      .eq('fiscal_period_id', fiscal_period_id)
      .order('account(code)');
    
    if (!balances) {
      throw new Error('No balances found');
    }
    
    const accounts = balances.map(b => ({
      account_id: b.account.id,
      account_code: b.account.code,
      account_name: b.account.name,
      account_type: b.account.account_type,
      opening_balance: b.opening_balance,
      debit_movement: b.debit_movement,
      credit_movement: b.credit_movement,
      closing_balance: b.closing_balance
    }));
    
    const totals = {
      opening_debits: accounts.reduce((sum, a) => sum + (a.opening_balance > 0 ? a.opening_balance : 0), 0),
      opening_credits: accounts.reduce((sum, a) => sum + (a.opening_balance < 0 ? Math.abs(a.opening_balance) : 0), 0),
      movement_debits: accounts.reduce((sum, a) => sum + a.debit_movement, 0),
      movement_credits: accounts.reduce((sum, a) => sum + a.credit_movement, 0),
      closing_debits: accounts.reduce((sum, a) => sum + (a.closing_balance > 0 ? a.closing_balance : 0), 0),
      closing_credits: accounts.reduce((sum, a) => sum + (a.closing_balance < 0 ? Math.abs(a.closing_balance) : 0), 0)
    };
    
    const { data: period } = await supabase
      .from('fiscal_periods')
      .select('end_date')
      .eq('id', fiscal_period_id)
      .single();
    
    return {
      as_of_date: period?.end_date || new Date().toISOString().split('T')[0],
      company_id: this.companyId,
      fiscal_period_id,
      accounts,
      totals,
      is_balanced: Math.abs(totals.closing_debits - totals.closing_credits) < 0.01,
      difference: totals.closing_debits - totals.closing_credits
    };
  }
}

// Export factory
export function createFinancialReporting(companyId: string): FinancialReportingService {
  return new FinancialReportingService(companyId);
}
