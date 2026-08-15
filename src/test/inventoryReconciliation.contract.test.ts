import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815160000_inventory_reconciliation_controls.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('inventory reconciliation contract', () => {
  it('scopes reconciliation to restaurant and workspace and caps rows', () => {
    expect(sqlOnly).toContain('get_inventory_reconciliation');
    expect(sqlOnly).toContain('ws.workspace_id = p_workspace_id');
    expect(sqlOnly).toContain('w.workspace_id = p_workspace_id');
    expect(sqlOnly).toContain('LEAST(COALESCE(p_limit, 2000), 10000)');
  });

  it('compares warehouse stock with inventory balances and reports statuses', () => {
    expect(sqlOnly).toContain('FULL OUTER JOIN ledger');
    expect(sqlOnly).toContain("'matched'");
    expect(sqlOnly).toContain("'warehouse_only'");
    expect(sqlOnly).toContain("'ledger_only'");
    expect(sqlOnly).toContain("'quantity_or_value_difference'");
  });

  it('is read-only and does not contain destructive statements', () => {
    expect(sqlOnly).toContain('RETURNS TABLE');
    expect(sqlOnly).toMatch(/LANGUAGE\s+plpgsql\s+STABLE/i);
    expect(sqlOnly).not.toMatch(/INSERT\s+INTO|UPDATE\s+public|DELETE\s+FROM|DROP\s+TABLE|TRUNCATE/i);
  });
});
