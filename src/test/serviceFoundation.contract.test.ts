import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815170000_service_module_foundation.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('service foundation contract', () => {
  it('adds service cost and branch scope without rewriting invoices', () => {
    expect(sqlOnly).toContain('service_invoices');
    expect(sqlOnly).toContain('workspace_id uuid');
    expect(sqlOnly).toContain('cost_amount numeric NOT NULL DEFAULT 0');
    expect(sqlOnly).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  });

  it('persists service packages and their items in Supabase', () => {
    expect(sqlOnly).toContain('CREATE TABLE IF NOT EXISTS public.service_packages');
    expect(sqlOnly).toContain('CREATE TABLE IF NOT EXISTS public.service_package_items');
    expect(sqlOnly).toContain('ON DELETE CASCADE');
  });

  it('protects service definitions with authenticated RLS policies', () => {
    expect(sqlOnly).toContain('ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY');
    expect(sqlOnly).toContain('service_packages_owner_manage');
    expect(sqlOnly).toContain('service_package_items_owner_manage');
    expect(sqlOnly).not.toMatch(/GRANT .* TO anon|GRANT .* TO PUBLIC/i);
  });
});
