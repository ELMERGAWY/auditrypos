import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815060000_crm_sales_automation.sql'),
  'utf8',
);

const automationBody = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.run_marketing_crm_automation'),
  migration.indexOf('REVOKE ALL ON FUNCTION public.assign_marketing_crm_lead'),
);

describe('CRM automation migration contract', () => {
  it('bounds the automation run and makes follow-up creation idempotent', () => {
    expect(automationBody).toContain('v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)');
    expect(automationBody).toContain('LIMIT v_limit');
    expect(automationBody).toContain('ON CONFLICT (automation_key) DO NOTHING');
    expect(automationBody).toContain("'lead-followup:' || v_lead.id::text");
  });

  it('keeps the automation inside the CRM data boundary', () => {
    expect(automationBody).toContain('marketing_crm_leads');
    expect(automationBody).toContain('marketing_crm_followups');
    expect(automationBody).not.toMatch(/UPDATE\s+public\.(orders|customers|sales_invoices)\b/i);
    expect(automationBody).not.toMatch(/DELETE\s+FROM\s+public\.(orders|customers|sales_invoices)\b/i);
  });

  it('does not expose the mutation functions to anonymous users', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.assign_marketing_crm_lead(UUID, TEXT) FROM PUBLIC, anon');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.run_marketing_crm_automation(UUID, INTEGER) FROM PUBLIC, anon');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.run_marketing_crm_automation(UUID, INTEGER) TO authenticated, service_role');
  });
});
