/**
 * FINANCIAL REPORTING ENGINE
 * Professional Financial Statements by Business Type
 * 
 * Reports:
 * - Profit & Loss (P&L)
 * - Balance Sheet (BS)
 * - Cash Flow Statement (CF)
 * - Trial Balance (TB)
 * - Financial Indicators (KPIs)
 */

import { supabase } from '@/integrations/supabase/client';

export interface TrialBalanceReport {
  as_of_date: string;
  accounts: {
    account_id: string;
    code: string;
    name: string;
    account_type: string;
    opening_balance: number;
    debit_movement: number;
    credit_movement: number;
    net_movement: number;
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
}

export interface ProfitLossReport {
  period_start: string;
  period_end: string;
  revenue: {
    service_revenue: number;
    sales_revenue: number;
    food_revenue: number;
    other_revenue: number;
    total: number;
  };
  cogs: {
    materials: number;
    food_cost: number;
    other: number;
    total: number;
  };
  gross_profit: number;
  gross_margin: number;
  operating_expenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    depreciation: number;
    other: number;
    total: number;
  };
  operating_profit: number;
  operating_margin: number;
  other_income: number;
  other_expenses: number;
  net_profit_before_tax: number;
  tax: number;
  net_profit: number;
  net_margin: number;
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: {
    current: {
      cash: number;
      bank: number;
      receivables: number;
      inventory: number;
      prepayments: number;
      total_current: number;
    };
    non_current: {
      fixed_assets: number;
      accumulated_depreciation: number;
      net_fixed: number;
      investments: number;
      total_non_current: number;
    };
    total_assets: number;
  };
  liabilities: {
    current: {
      payables: number;
      short_term_loans: number;
      taxes_payable: number;
      total_current: number;
    };
    non_current: {
      long_term_loans: number;
      other: number;
      total_non_current: number;
    };
    total_liabilities: number;
  };
  equity: {
    capital: number;
    retained_earnings: number;
    current_profit: number;
    total_equity: number;
  };
  total_liabilities_equity: number;
  difference: number;
}

export interface CashFlowReport {
  period_start: string;
  period_end: string;
  operating: {
    net_profit: number;
    adjustments: {
      depreciation: number;
      inventory_change: number;
      receivables_change: number;
      payables_change: number;
    };
    net_operating: number;
  };
  investing: {
    asset_purchases: number;
    asset_sales: number;
    net_investing: number;
  };
  financing: {
    capital_injected: number;
    loans_received: number;
    loans_repaid: number;
    dividends: number;
    net_financing: number;
  };
  net_change: number;
  opening_cash: number;
  closing_cash: number;
}

export interface FinancialIndicators {
  as_of_date: string;
  profitability: {
    gross_margin: number; // (Revenue - COGS) / Revenue
    operating_margin: number; // Operating Profit / Revenue
    net_margin: number; // Net Profit / Revenue
    return_on_assets: number; // Net Profit / Total Assets
    return_on_equity: number; // Net Profit / Total Equity
  };
  liquidity: {
    current_ratio: number; // Current Assets / Current Liabilities
    quick_ratio: number; // (Cash + Receivables) / Current Liabilities
    cash_ratio: number; // Cash / Current Liabilities
    working_capital: number; // Current Assets - Current Liabilities
  };
  efficiency: {
    inventory_turnover: number; // COGS / Average Inventory
    days_inventory: number; // 365 / Inventory Turnover
    receivables_turnover: number; // Revenue / Average Receivables
    days_receivables: number; // 365 / Receivables Turnover
    asset_turnover: number; // Revenue / Total Assets
  };
  solvency: {
    debt_ratio: number; // Total Liabilities / Total Assets
    debt_to_equity: number; // Total Liabilities / Total Equity
    equity_ratio: number; // Total Equity / Total Assets
  };
}

/**
 * Financial Reporting Engine
 */
export class FinancialReportingEngine {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  // ============================================================
  // TRIAL BALANCE
  // ============================================================
  
  async generateTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
    const date = asOfDate || new Date().toISOString().split('T')[0];

    // Get all accounts with their current balances
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type, opening_balance, current_balance')
      .eq('restaurant_id', this.restaurantId)
      .order('code');

    if (error) throw error;

    const report: TrialBalanceReport = {
      as_of_date: date,
      accounts: [],
      totals: {
        opening_debits: 0,
        opening_credits: 0,
        movement_debits: 0,
        movement_credits: 0,
        closing_debits: 0,
        closing_credits: 0
      },
      is_balanced: true
    };

    // 1. Get all movements for ALL accounts in this restaurant in ONE query
    const { data: allMovements, error: mvError } = await supabase
      .from('journal_entry_lines')
      .select(`
        account_id,
        debit,
        credit,
        journal_entries!inner(entry_date, is_posted, restaurant_id)
      `)
      .eq('journal_entries.restaurant_id', this.restaurantId)
      .eq('journal_entries.is_posted', true)
      .lte('journal_entries.entry_date', date);

    if (mvError) throw mvError;

    // 2. Aggregate movements by account_id in memory
    const movementMap = new Map<string, { debit: number; credit: number }>();
    allMovements?.forEach(mv => {
      const existing = movementMap.get(mv.account_id) || { debit: 0, credit: 0 };
      movementMap.set(mv.account_id, {
        debit: existing.debit + (mv.debit || 0),
        credit: existing.credit + (mv.credit || 0)
      });
    });

    // 3. Build report
    for (const acc of accounts || []) {
      const movements = movementMap.get(acc.id) || { debit: 0, credit: 0 };
      const debitMovement = movements.debit;
      const creditMovement = movements.credit;

      // Determine normal balance
      const isDebitNormal = ['asset', 'expense'].includes(acc.account_type);
      
      const openingBalance = acc.opening_balance || 0;
      const netMovement = isDebitNormal 
        ? debitMovement - creditMovement 
        : creditMovement - debitMovement;
      const closingBalance = openingBalance + netMovement;

      report.accounts.push({
        account_id: acc.id,
        code: acc.code,
        name: acc.name,
        account_type: acc.account_type,
        opening_balance: openingBalance,
        debit_movement: debitMovement,
        credit_movement: creditMovement,
        net_movement: netMovement,
        closing_balance: closingBalance
      });

      // Add to totals
      if (isDebitNormal) {
        report.totals.opening_debits += Math.abs(openingBalance);
        report.totals.closing_debits += Math.abs(closingBalance);
      } else {
        report.totals.opening_credits += Math.abs(openingBalance);
        report.totals.closing_credits += Math.abs(closingBalance);
      }
      report.totals.movement_debits += debitMovement;
      report.totals.movement_credits += creditMovement;
    }

    // Check balance
    report.is_balanced = 
      Math.abs(report.totals.closing_debits - report.totals.closing_credits) < 0.01;

    return report;
  }

  // ============================================================
  // PROFIT & LOSS
  // ============================================================

  async generateProfitLoss(periodStart?: string, periodEnd?: string): Promise<ProfitLossReport> {
    const endDate = periodEnd || new Date().toISOString().split('T')[0];
    const startDate = periodStart || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    // Get revenue/expense accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type')
      .eq('restaurant_id', this.restaurantId)
      .in('account_type', ['revenue', 'expense']);

    // Sum journal lines within period
    const accountIds = (accounts || []).map(a => a.id);
    const balanceMap = new Map<string, number>();
    if (accountIds.length) {
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit, journal_entries!inner(entry_date, is_posted, restaurant_id)')
        .eq('journal_entries.restaurant_id', this.restaurantId)
        .eq('journal_entries.is_posted', true)
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', endDate)
        .in('account_id', accountIds);
      lines?.forEach((l: any) => {
        const acc = (accounts || []).find(a => a.id === l.account_id);
        if (!acc) return;
        const isRev = acc.account_type === 'revenue';
        // revenue normal credit -> credit-debit; expense normal debit -> debit-credit
        const delta = isRev ? (l.credit - l.debit) : (l.debit - l.credit);
        balanceMap.set(l.account_id, (balanceMap.get(l.account_id) || 0) + delta);
      });
    }
    // Inject computed balances back
    (accounts || []).forEach((a: any) => { a.current_balance = balanceMap.get(a.id) || 0; });

    const report: ProfitLossReport = {
      period_start: startDate,
      period_end: endDate,
      revenue: {
        service_revenue: 0,
        sales_revenue: 0,
        food_revenue: 0,
        other_revenue: 0,
        total: 0
      },
      cogs: {
        materials: 0,
        food_cost: 0,
        other: 0,
        total: 0
      },
      gross_profit: 0,
      gross_margin: 0,
      operating_expenses: {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        other: 0,
        total: 0
      },
      operating_profit: 0,
      operating_margin: 0,
      other_income: 0,
      other_expenses: 0,
      net_profit_before_tax: 0,
      tax: 0,
      net_profit: 0,
      net_margin: 0
    };

    for (const acc of accounts || []) {
      const balance = Math.abs((acc as any).current_balance || 0);

      // Revenue classification
      if (acc.account_type === 'revenue') {
        if (acc.code.startsWith('4.01')) report.revenue.service_revenue += balance;
        else if (acc.code.startsWith('4.02')) report.revenue.sales_revenue += balance;
        else if (acc.code.startsWith('4.03')) report.revenue.food_revenue += balance;
        else report.revenue.other_revenue += balance;
        report.revenue.total += balance;
      }
      // COGS classification
      else if (acc.code.startsWith('5.01')) {
        if (acc.name.toLowerCase().includes('food')) {
          report.cogs.food_cost += balance;
        } else if (acc.name.toLowerCase().includes('material')) {
          report.cogs.materials += balance;
        } else {
          report.cogs.other += balance;
        }
        report.cogs.total += balance;
      }
      // Expense classification
      else if (acc.account_type === 'expense') {
        if (acc.code.startsWith('6.01')) report.operating_expenses.salaries += balance;
        else if (acc.code.startsWith('6.02')) report.operating_expenses.rent += balance;
        else if (acc.code.startsWith('6.03')) report.operating_expenses.utilities += balance;
        else if (acc.code.startsWith('6.04')) report.operating_expenses.marketing += balance;
        else if (acc.code.startsWith('6.05')) report.operating_expenses.depreciation += balance;
        else report.operating_expenses.other += balance;
        report.operating_expenses.total += balance;
      }
    }

    // Calculate derived values
    report.gross_profit = report.revenue.total - report.cogs.total;
    report.gross_margin = report.revenue.total > 0 
      ? (report.gross_profit / report.revenue.total) * 100 
      : 0;
    
    report.operating_profit = report.gross_profit - report.operating_expenses.total;
    report.operating_margin = report.revenue.total > 0 
      ? (report.operating_profit / report.revenue.total) * 100 
      : 0;
    
    report.net_profit_before_tax = report.operating_profit + report.other_income - report.other_expenses;
    report.net_profit = report.net_profit_before_tax - report.tax;
    report.net_margin = report.revenue.total > 0 
      ? (report.net_profit / report.revenue.total) * 100 
      : 0;

    return report;
  }

  // ============================================================
  // BALANCE SHEET
  // ============================================================

  async generateBalanceSheet(asOfDate?: string): Promise<BalanceSheetReport> {
    const date = asOfDate || new Date().toISOString().split('T')[0];

    // Get balance sheet accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type, opening_balance')
      .eq('restaurant_id', this.restaurantId)
      .in('account_type', ['asset', 'liability', 'equity']);

    // Compute balance from journal entries up to date
    const accountIds = (accounts || []).map(a => a.id);
    const balMap = new Map<string, number>();
    if (accountIds.length) {
      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit, journal_entries!inner(entry_date, is_posted, restaurant_id)')
        .eq('journal_entries.restaurant_id', this.restaurantId)
        .eq('journal_entries.is_posted', true)
        .lte('journal_entries.entry_date', date)
        .in('account_id', accountIds);
      lines?.forEach((l: any) => {
        const acc = (accounts || []).find(a => a.id === l.account_id);
        if (!acc) return;
        const isDebitNormal = acc.account_type === 'asset';
        const delta = isDebitNormal ? (l.debit - l.credit) : (l.credit - l.debit);
        balMap.set(l.account_id, (balMap.get(l.account_id) || 0) + delta);
      });
    }
    (accounts || []).forEach((a: any) => {
      a.current_balance = (a.opening_balance || 0) + (balMap.get(a.id) || 0);
    });

    const report: BalanceSheetReport = {
      as_of_date: date,
      assets: {
        current: {
          cash: 0,
          bank: 0,
          receivables: 0,
          inventory: 0,
          prepayments: 0,
          total_current: 0
        },
        non_current: {
          fixed_assets: 0,
          accumulated_depreciation: 0,
          net_fixed: 0,
          investments: 0,
          total_non_current: 0
        },
        total_assets: 0
      },
      liabilities: {
        current: {
          payables: 0,
          short_term_loans: 0,
          taxes_payable: 0,
          total_current: 0
        },
        non_current: {
          long_term_loans: 0,
          other: 0,
          total_non_current: 0
        },
        total_liabilities: 0
      },
      equity: {
        capital: 0,
        retained_earnings: 0,
        current_profit: 0,
        total_equity: 0
      },
      total_liabilities_equity: 0,
      difference: 0
    };

    for (const acc of accounts || []) {
      const balance = acc.current_balance || 0;

      // Asset classification
      if (acc.account_type === 'asset') {
        if (acc.code === '1.01.001') report.assets.current.cash = balance;
        else if (acc.code === '1.01.002') report.assets.current.bank = balance;
        else if (acc.code.startsWith('1.02')) report.assets.current.receivables = balance;
        else if (acc.code.startsWith('1.03')) report.assets.current.inventory = balance;
        else if (acc.code.startsWith('1.04')) report.assets.current.prepayments = balance;
        else if (acc.code.startsWith('1.05')) report.assets.non_current.fixed_assets = balance;
        else if (acc.code.startsWith('1.06')) report.assets.non_current.investments = balance;
      }
      // Liability classification
      else if (acc.account_type === 'liability') {
        if (acc.code.startsWith('2.01')) report.liabilities.current.payables = balance;
        else if (acc.code.startsWith('2.02')) report.liabilities.current.short_term_loans = balance;
        else if (acc.code.startsWith('2.03')) report.liabilities.current.taxes_payable = balance;
        else if (acc.code.startsWith('2.04')) report.liabilities.non_current.long_term_loans = balance;
        else report.liabilities.non_current.other = balance;
      }
      // Equity classification
      else if (acc.account_type === 'equity') {
        if (acc.code.startsWith('3.01')) report.equity.capital = balance;
        else if (acc.code.startsWith('3.02')) report.equity.retained_earnings = balance;
      }
    }

    // Calculate current profit from current year
    const pl = await this.generateProfitLoss(
      new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      date
    );
    report.equity.current_profit = pl.net_profit;

    // Calculate totals
    report.assets.current.total_current = 
      report.assets.current.cash + 
      report.assets.current.bank + 
      report.assets.current.receivables + 
      report.assets.current.inventory + 
      report.assets.current.prepayments;
    
    report.assets.non_current.net_fixed = 
      report.assets.non_current.fixed_assets + 
      report.assets.non_current.accumulated_depreciation;
    
    report.assets.non_current.total_non_current = 
      report.assets.non_current.net_fixed + 
      report.assets.non_current.investments;
    
    report.assets.total_assets = report.assets.current.total_current + report.assets.non_current.total_non_current;

    report.liabilities.current.total_current = 
      report.liabilities.current.payables + 
      report.liabilities.current.short_term_loans + 
      report.liabilities.current.taxes_payable;
    
    report.liabilities.non_current.total_non_current = 
      report.liabilities.non_current.long_term_loans + 
      report.liabilities.non_current.other;
    
    report.liabilities.total_liabilities = 
      report.liabilities.current.total_current + 
      report.liabilities.non_current.total_non_current;

    report.equity.total_equity = 
      report.equity.capital + 
      report.equity.retained_earnings + 
      report.equity.current_profit;

    report.total_liabilities_equity = report.liabilities.total_liabilities + report.equity.total_equity;
    report.difference = report.assets.total_assets - report.total_liabilities_equity;

    return report;
  }

  // ============================================================
  // CASH FLOW STATEMENT (Indirect Method)
  // ============================================================

  async generateCashFlow(periodStart?: string, periodEnd?: string): Promise<CashFlowReport> {
    const endDate = periodEnd || new Date().toISOString().split('T')[0];
    const startDate = periodStart || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    // Get P&L for net profit
    const pl = await this.generateProfitLoss(startDate, endDate);

    // Get balance sheets for changes
    const bsStart = await this.generateBalanceSheet(startDate);
    const bsEnd = await this.generateBalanceSheet(endDate);

    const report: CashFlowReport = {
      period_start: startDate,
      period_end: endDate,
      operating: {
        net_profit: pl.net_profit,
        adjustments: {
          depreciation: 0,
          inventory_change: 0,
          receivables_change: 0,
          payables_change: 0
        },
        net_operating: 0
      },
      investing: {
        asset_purchases: 0,
        asset_sales: 0,
        net_investing: 0
      },
      financing: {
        capital_injected: 0,
        loans_received: 0,
        loans_repaid: 0,
        dividends: 0,
        net_financing: 0
      },
      net_change: 0,
      opening_cash: bsStart.assets.current.cash + bsStart.assets.current.bank,
      closing_cash: bsEnd.assets.current.cash + bsEnd.assets.current.bank
    };

    // Calculate working capital changes
    report.operating.adjustments.inventory_change = 
      bsStart.assets.current.inventory - bsEnd.assets.current.inventory;
    
    report.operating.adjustments.receivables_change = 
      bsStart.assets.current.receivables - bsEnd.assets.current.receivables;
    
    report.operating.adjustments.payables_change = 
      bsEnd.liabilities.current.payables - bsStart.liabilities.current.payables;

    // Get depreciation from P&L
    report.operating.adjustments.depreciation = pl.operating_expenses.depreciation;

    // Calculate net operating
    report.operating.net_operating = 
      report.operating.net_profit + 
      report.operating.adjustments.depreciation +
      report.operating.adjustments.inventory_change +
      report.operating.adjustments.receivables_change +
      report.operating.adjustments.payables_change;

    // Calculate net changes
    report.investing.net_investing = report.investing.asset_sales - report.investing.asset_purchases;
    report.financing.net_financing = 
      report.financing.capital_injected + 
      report.financing.loans_received - 
      report.financing.loans_repaid - 
      report.financing.dividends;

    report.net_change = 
      report.operating.net_operating + 
      report.investing.net_investing + 
      report.financing.net_financing;

    return report;
  }

  // ============================================================
  // FINANCIAL INDICATORS (KPIs)
  // ============================================================

  async generateFinancialIndicators(asOfDate?: string): Promise<FinancialIndicators> {
    const date = asOfDate || new Date().toISOString().split('T')[0];

    // Get required reports
    const bs = await this.generateBalanceSheet(date);
    const pl = await this.generateProfitLoss(
      new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      date
    );

    const indicators: FinancialIndicators = {
      as_of_date: date,
      profitability: {
        gross_margin: 0,
        operating_margin: 0,
        net_margin: 0,
        return_on_assets: 0,
        return_on_equity: 0
      },
      liquidity: {
        current_ratio: 0,
        quick_ratio: 0,
        cash_ratio: 0,
        working_capital: 0
      },
      efficiency: {
        inventory_turnover: 0,
        days_inventory: 0,
        receivables_turnover: 0,
        days_receivables: 0,
        asset_turnover: 0
      },
      solvency: {
        debt_ratio: 0,
        debt_to_equity: 0,
        equity_ratio: 0
      }
    };

    const revenue = pl.revenue.total;
    const totalAssets = bs.assets.total_assets;
    const totalEquity = bs.equity.total_equity;
    const totalLiabilities = bs.liabilities.total_liabilities;

    // Profitability Ratios
    if (revenue > 0) {
      indicators.profitability.gross_margin = (pl.gross_profit / revenue) * 100;
      indicators.profitability.operating_margin = (pl.operating_profit / revenue) * 100;
      indicators.profitability.net_margin = (pl.net_profit / revenue) * 100;
    }
    if (totalAssets > 0) {
      indicators.profitability.return_on_assets = (pl.net_profit / totalAssets) * 100;
    }
    if (totalEquity > 0) {
      indicators.profitability.return_on_equity = (pl.net_profit / totalEquity) * 100;
    }

    // Liquidity Ratios
    const currentAssets = bs.assets.current.total_current;
    const currentLiabilities = bs.liabilities.current.total_current;
    const quickAssets = bs.assets.current.cash + bs.assets.current.bank + bs.assets.current.receivables;

    if (currentLiabilities > 0) {
      indicators.liquidity.current_ratio = currentAssets / currentLiabilities;
      indicators.liquidity.quick_ratio = quickAssets / currentLiabilities;
      indicators.liquidity.cash_ratio = (bs.assets.current.cash + bs.assets.current.bank) / currentLiabilities;
    }
    indicators.liquidity.working_capital = currentAssets - currentLiabilities;

    // Efficiency Ratios
    const avgInventory = bs.assets.current.inventory; // Simplified
    const avgReceivables = bs.assets.current.receivables; // Simplified

    if (avgInventory > 0) {
      indicators.efficiency.inventory_turnover = pl.cogs.total / avgInventory;
      indicators.efficiency.days_inventory = 365 / indicators.efficiency.inventory_turnover;
    }
    if (avgReceivables > 0) {
      indicators.efficiency.receivables_turnover = revenue / avgReceivables;
      indicators.efficiency.days_receivables = 365 / indicators.efficiency.receivables_turnover;
    }
    if (totalAssets > 0) {
      indicators.efficiency.asset_turnover = revenue / totalAssets;
    }

    // Solvency Ratios
    if (totalAssets > 0) {
      indicators.solvency.debt_ratio = (totalLiabilities / totalAssets) * 100;
      indicators.solvency.equity_ratio = (totalEquity / totalAssets) * 100;
    }
    if (totalEquity > 0) {
      indicators.solvency.debt_to_equity = (totalLiabilities / totalEquity);
    }

    return indicators;
  }
}

// Factory function
export function createFinancialReporting(restaurantId: string): FinancialReportingEngine {
  return new FinancialReportingEngine(restaurantId);
}
