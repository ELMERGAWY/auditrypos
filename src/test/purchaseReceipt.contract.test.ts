import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815120000_purchase_receipt_costing_bridge.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('purchase receipt costing bridge contract', () => {
  it('uses atomic, replay-safe receipt posting', () => {
    expect(sqlOnly).toContain('post_purchase_invoice_receipt_v2');
    expect(sqlOnly).toContain('goods_received_at IS NOT NULL OR v_invoice.inventory_receipt_id IS NOT NULL');
    expect(sqlOnly).toContain('inventory_cost_layers');
    expect(sqlOnly).toContain("'purchase_receipt_posted'");
    expect(sqlOnly).toContain('ON CONFLICT (source_table, source_id, event_type) DO NOTHING');
    expect(sqlOnly).not.toContain('Number(');
  });

  it('validates company/workspace/warehouse scope before receiving stock', () => {
    expect(sqlOnly).toContain('w.id = p_workspace_id AND w.restaurant_id = p_restaurant_id');
    expect(sqlOnly).toContain('v_item.product_workspace <> p_workspace_id');
    expect(sqlOnly).toContain('w.workspace_id = p_workspace_id');
  });

  it('cancels received invoices through stock reversal instead of hard delete', () => {
    expect(sqlOnly).toContain('void_purchase_invoice_receipt_v2');
    expect(sqlOnly).toContain("'PURCHASE_RETURN'");
    expect(sqlOnly).toContain("SET status = 'cancelled'");
    expect(sqlOnly).toContain("'purchase_receipt_voided'");
    expect(sqlOnly).toContain('REVOKE ALL ON FUNCTION public.void_purchase_invoice_receipt_v2');
  });
});
