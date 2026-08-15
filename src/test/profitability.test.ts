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


  it('normalizes null and non-finite amounts without producing NaN', () => {
    const summary = buildOperationalProfitSummary(
      [{ total: null, total_cost: 'not-a-number' }, { total: 50, total_cost: 10 }],
      [{ amount: undefined }, { amount: 5 }],
    );
    expect(summary.sales).toBe(50);
    expect(summary.cogs).toBe(10);
    expect(summary.expenses).toBe(5);
    expect(summary.netProfit).toBe(35);
    expect(Number.isFinite(summary.margin)).toBe(true);
  });

  it('does not let negative cost or expense inputs inflate profit', () => {
    const summary = buildOperationalProfitSummary(
      [{ total: 100, total_cost: -100 }],
      [{ amount: -50 }],
    );
    expect(summary.cogs).toBe(0);
    expect(summary.expenses).toBe(0);
    expect(summary.netProfit).toBe(100);
  });

  it('returns zero margin when there are no qualifying sales', () => {
    const summary = buildOperationalProfitSummary(
      [{ total: 100, total_cost: 10, status: 'cancelled' }],
      [{ amount: 25 }],
    );
    expect(summary.sales).toBe(0);
    expect(summary.netProfit).toBe(-25);
    expect(summary.margin).toBe(0);
  });

  it('preserves reversal direction in signed balances', () => {
    expect(signedProfitBalance('revenue', '20', '0')).toBe(-20);
    expect(signedProfitBalance('expense', '0', '20')).toBe(-20);
  });

it('treats service revenue as profit when no service cost or expense exists', () => {
  const summary = buildOperationalProfitSummary([], [], [{ total_amount: 1250, cost_amount: 0, status: 'paid' }]);
  expect(summary.sales).toBe(1250);
  expect(summary.cogs).toBe(0);
  expect(summary.expenses).toBe(0);
  expect(summary.netProfit).toBe(1250);
  expect(summary.margin).toBe(100);
});

it('subtracts explicit service cost but does not invent a cost', () => {
  const summary = buildOperationalProfitSummary([], [], [{ total_amount: 1250, cost_amount: 300, status: 'paid' }]);
  expect(summary.netProfit).toBe(950);
});
