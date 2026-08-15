import { describe, expect, it } from 'vitest';
import {
  buildOperationalProfitSummary,
  safeNetProfit,
  signedProfitBalance,
} from '@/lib/analytics/profitability';

describe('profitability calculations', () => {
  it('keeps revenue and expense balances signed', () => {
    expect(signedProfitBalance('revenue', 20, 100)).toBe(80);
    expect(signedProfitBalance('revenue', 120, 100)).toBe(-20);
    expect(signedProfitBalance('expense', 100, 20)).toBe(80);
    expect(signedProfitBalance('expense', 20, 100)).toBe(-80);
  });

  it('calculates operational net profit from the same period', () => {
    const summary = buildOperationalProfitSummary(
      [{ total: 1000, total_cost: 600 }, { total: 200, total_cost: 50, status: 'cancelled' }],
      [{ amount: 100 }, { amount: 25 }],
    );
    expect(summary.sales).toBe(1000);
    expect(summary.cogs).toBe(600);
    expect(summary.expenses).toBe(125);
    expect(summary.netProfit).toBe(275);
    expect(summary.netProfit).toBeLessThanOrEqual(summary.sales);
  });

  it('does not turn a loss into a profit', () => {
    expect(safeNetProfit(100, 140, 10)).toBe(-50);
    expect(safeNetProfit(0, 0, 25)).toBe(-25);
  });
});
