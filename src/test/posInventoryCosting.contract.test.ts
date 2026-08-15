import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815140000_pos_inventory_costing_bridge.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('POS inventory costing bridge contract', () => {
  it('routes POS consumption through the warehouse-scoped costing RPC', () => {
    expect(sqlOnly).toContain('consume_pos_inventory_v2');
    expect(sqlOnly).toContain('rpc_inventory_issue_v2');
    expect(sqlOnly).toContain("'SALE'");
    expect(sqlOnly).not.toContain('UPDATE public.products SET quantity');
  });

  it('is idempotent across legacy and new movement ledgers', () => {
    expect(sqlOnly).toContain('FROM public.inventory_movements im');
    expect(sqlOnly).toContain('FROM public.stock_movements sm');
    expect(sqlOnly).toContain("im.movement_type = 'OUT'");
    expect(sqlOnly).toContain('ON CONFLICT (source_table, source_id, event_type) DO UPDATE');
  });

  it('requires an active warehouse scoped to the restaurant workspace', () => {
    expect(sqlOnly).toContain('workspace is required for POS inventory consumption');
    expect(sqlOnly).toContain('warehouse does not belong to restaurant workspace');
    expect(sqlOnly).toContain('REVOKE ALL ON FUNCTION public.consume_pos_inventory_v2');
  });
});
