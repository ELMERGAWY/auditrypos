import { describe, expect, it } from 'vitest';
import {
  opsHealthIssueCount,
  opsHealthStatus,
  RECONCILIATION_STATES,
} from '@/lib/opsHealth';

describe('ops health rules', () => {
  it('returns healthy only when the database reports healthy and all queues are empty', () => {
    expect(opsHealthIssueCount({ health_status: 'healthy' })).toBe(0);
    expect(opsHealthStatus({ health_status: 'healthy' })).toBe('healthy');
    expect(opsHealthStatus({ health_status: 'healthy', outbox_open_count: 1 })).toBe('attention_required');
  });

  it('counts all operational anomaly buckets and clamps negative values', () => {
    expect(opsHealthIssueCount({
      outbox_open_count: 2,
      outbox_failed_count: 1,
      posting_failures_open_count: 3,
      order_invoice_anomaly_count: 4,
      stock_scope_anomaly_count: -10,
    })).toBe(10);
  });

  it('keeps reconciliation states explicit and reviewable', () => {
    expect(RECONCILIATION_STATES).toContain('order_without_invoice');
    expect(RECONCILIATION_STATES).toContain('invoice_without_order_link');
    expect(RECONCILIATION_STATES).toContain('amount_mismatch');
  });
});
