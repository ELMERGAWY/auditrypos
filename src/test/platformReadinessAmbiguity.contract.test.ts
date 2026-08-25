import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260825130000_fix_platform_module_readiness_ambiguity.sql'),
  'utf8',
);

describe('platform module readiness ambiguity guard', () => {
  it('qualifies registry criticality before selecting into RETURNS TABLE output', () => {
    expect(migration).toContain('pmr.criticality');
    expect(migration).toContain('FROM public.platform_module_registry AS pmr');
    expect(migration).toContain('tm.criticality');
    expect(migration).not.toContain('SELECT code, name_ar, criticality, display_order');
  });

  it('retains the Super Admin gate and execute grants', () => {
    expect(migration).toContain("public.has_role(auth.uid(), 'super_admin'::public.app_role)");
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_platform_module_readiness(INTEGER) TO authenticated, service_role;');
  });
});
