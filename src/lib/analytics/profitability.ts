export interface ProfitOrderRow {
  total?: number | string | null;
  total_cost?: number | string | null;
  status?: string | null;
}

export interface ProfitExpenseRow {
  amount?: number | string | null;
  date?: string | null;
}

export interface OperationalProfitSummary {
  sales: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  margin: number;
}

const toAmount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function sumOperationalSales(rows: ProfitOrderRow[] = []): number {
  return rows
    .filter((row) => row.status !== 'cancelled')
    .reduce((sum, row) => sum + toAmount(row.total), 0);
}

export function sumOperationalCogs(rows: ProfitOrderRow[] = []): number {
  return rows
    .filter((row) => row.status !== 'cancelled')
    .reduce((sum, row) => sum + Math.max(0, toAmount(row.total_cost)), 0);
}

export function sumOperatingExpenses(rows: ProfitExpenseRow[] = []): number {
  return rows.reduce((sum, row) => sum + Math.max(0, toAmount(row.amount)), 0);
}

export function buildOperationalProfitSummary(
  orders: ProfitOrderRow[] = [],
  expenses: ProfitExpenseRow[] = [],
): OperationalProfitSummary {
  const sales = sumOperationalSales(orders);
  const cogs = sumOperationalCogs(orders);
  const operatingExpenses = sumOperatingExpenses(expenses);
  const netProfit = sales - cogs - operatingExpenses;
  return {
    sales,
    cogs,
    expenses: operatingExpenses,
    netProfit,
    margin: sales > 0 ? (netProfit / sales) * 100 : 0,
  };
}

/**
 * P&L balances are signed: revenue is credit-positive, expense/COGS are debit-positive.
 * Never use Math.abs() here; returns and reversals must reduce the relevant line.
 */
export function signedProfitBalance(
  accountType: string,
  debit: unknown,
  credit: unknown,
): number {
  const dr = toAmount(debit);
  const cr = toAmount(credit);
  return accountType === 'revenue' ? cr - dr : dr - cr;
}

export function safeNetProfit(
  revenue: unknown,
  cogs: unknown,
  operatingExpenses: unknown,
  otherIncome = 0,
  otherExpenses = 0,
  tax = 0,
): number {
  return toAmount(revenue) - toAmount(cogs) - toAmount(operatingExpenses)
    + toAmount(otherIncome) - toAmount(otherExpenses) - toAmount(tax);
}
