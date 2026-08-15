import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815100000_accounting_standards_layer.sql'),
  'utf8',
);

describe('accounting standards migration contract', () => {
  it('restricts standards to EAS, IFRS, and US_GAAP', () => {
    expect(migration).toContain("CHECK (reporting_standard IN ('EAS', 'IFRS', 'US_GAAP'))");
    expect(migration).toContain("IF v_standard NOT IN ('EAS', 'IFRS', 'US_GAAP') THEN");
    expect(migration).toContain("IF upper(p_inventory_cost_method) = 'LIFO' AND upper(replace(p_reporting_standard, '-', '_')) <> 'US_GAAP' THEN");
  });

  it('returns bounded, standard-aware financial statements', () => {
    expect(migration).toContain("'income_statement', jsonb_build_object");
    expect(migration).toContain("'balance_sheet', jsonb_build_object");
    expect(migration).toContain("'cash_flow', jsonb_build_object");
    expect(migration).toContain("'trial_balance', jsonb_build_object");
    expect(migration).toContain('LIMIT 500');
  });

  it('protects company scope and hides direct view access from end users', () => {
    expect(migration).toContain('Company access required');
    expect(migration).toContain('company_users');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON public.v_financial_report_by_standard FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_financial_report_by_standard(UUID,TEXT,JSONB) TO authenticated, service_role');
  });
});
