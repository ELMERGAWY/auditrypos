import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815110000_inventory_scope_and_transfer_safety.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('inventory scope and transfer safety migration contract', () => {
  it('is additive and preserves the product master across warehouses', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS item_type_id uuid');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS batch_number text');
    expect(sqlOnly).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
    expect(migration).toContain('upsert_product_warehouse_stock');
    expect(migration).toContain('ON CONFLICT (warehouse_id, product_id) DO UPDATE');
  });

  it('requires restaurant/workspace/warehouse scope for stock assignment', () => {
    expect(migration).toContain('_inventory_scope_access');
    expect(migration).toContain('p.restaurant_id = p_restaurant_id');
    expect(migration).toContain('w.workspace_id = p_workspace_id');
    expect(migration).toContain('get_product_warehouse_stock');
  });

  it('voids transfers through reversal movements and accounting outbox', () => {
    expect(migration).toContain('void_inventory_transfer_v2');
    expect(migration).toContain("SET status = 'voided'");
    expect(migration).toContain("'transfer_reversal_out'");
    expect(migration).toContain("'transfer_reversal_in'");
    expect(migration).toContain("'inventory_transfer_voided'");
    expect(migration).toContain('ON CONFLICT (source_table, source_id, event_type) DO NOTHING');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.void_inventory_transfer_v2');
  });
});
