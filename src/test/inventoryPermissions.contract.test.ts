import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815150000_inventory_permissions_guard.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('inventory permissions guard contract', () => {
  it('registers granular inventory permissions in the existing dictionary', () => {
    expect(sqlOnly).toContain("'inventory.warehouse.manage'");
    expect(sqlOnly).toContain("'inventory.transfer'");
    expect(sqlOnly).toContain("'inventory.receive'");
    expect(sqlOnly).toContain("'inventory.costing.manage'");
    expect(sqlOnly).toContain('ON CONFLICT (code) DO UPDATE');
  });

  it('checks warehouse_permissions, company role, and role_permissions', () => {
    expect(sqlOnly).toContain('warehouse_permission_granted');
    expect(sqlOnly).toContain('FROM public.warehouse_permissions wp');
    expect(sqlOnly).toContain('check_user_permission(auth.uid(), v_company_id');
  });

  it('guards inventory movements and transfers server-side without destructive SQL', () => {
    expect(sqlOnly).toContain('trg_enforce_inventory_movement_permission');
    expect(sqlOnly).toContain('trg_enforce_inventory_transfer_permission');
    expect(sqlOnly).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  });
});
