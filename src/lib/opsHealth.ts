export type OpsHealthStatus = 'healthy' | 'attention_required';

export interface OpsHealthSnapshot {
  outbox_open_count?: number | null;
  outbox_failed_count?: number | null;
  posting_failures_open_count?: number | null;
  order_invoice_anomaly_count?: number | null;
  stock_scope_anomaly_count?: number | null;
  health_status?: string | null;
}

export function opsHealthIssueCount(snapshot: OpsHealthSnapshot | null | undefined): number {
  if (!snapshot) return 0;
  return [
    snapshot.outbox_open_count,
    snapshot.outbox_failed_count,
    snapshot.posting_failures_open_count,
    snapshot.order_invoice_anomaly_count,
    snapshot.stock_scope_anomaly_count,
  ].reduce((total, value) => total + Math.max(0, Number(value || 0)), 0);
}

export function opsHealthStatus(snapshot: OpsHealthSnapshot | null | undefined): OpsHealthStatus {
  if (!snapshot) return 'attention_required';
  return snapshot.health_status === 'healthy' && opsHealthIssueCount(snapshot) === 0
    ? 'healthy'
    : 'attention_required';
}

export const RECONCILIATION_STATES = [
  'linked',
  'order_without_invoice',
  'invoice_without_order_link',
  'linked_by_source_reference',
  'amount_mismatch',
] as const;

export type ReconciliationState = typeof RECONCILIATION_STATES[number];
