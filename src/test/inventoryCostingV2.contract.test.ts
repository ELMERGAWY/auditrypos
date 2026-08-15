import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815130000_inventory_costing_engine_v2.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('inventory costing v2 contract', () => {
  it('supports average, FIFO, and US GAAP-only LIFO', () => {
    expect(sqlOnly).toContain('rpc_inventory_issue_v2');
    expect(sqlOnly).toContain("v_method IN ('FIFO', 'LIFO')");
    expect(sqlOnly).toContain("v_method = 'LIFO' AND v_standard <> 'US_GAAP'");
    expect(sqlOnly).toContain('inventory_cost_layers');
  });

  it('updates warehouse balance, movement audit, and accounting outbox atomically', () => {
    expect(sqlOnly).toContain("movement_type, quantity, unit_cost, total_cost");
    expect(sqlOnly).toContain("'inventory_movements', v_move_id, 'inventory_issue_cogs'");
    expect(sqlOnly).toContain('ON CONFLICT (source_table, source_id, event_type) DO NOTHING');
    expect(sqlOnly).toContain('warehouse_id = p_warehouse_id');
  });

  it('is non-destructive and restricts execution to authenticated/service roles', () => {
    expect(sqlOnly).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
    expect(sqlOnly).toContain('REVOKE ALL ON FUNCTION public.rpc_inventory_issue_v2');
    expect(sqlOnly).toContain('GRANT EXECUTE ON FUNCTION public.rpc_inventory_issue_v2');
  });
});
