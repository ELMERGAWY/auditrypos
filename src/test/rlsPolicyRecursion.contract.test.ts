import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260825140000_fix_rls_policy_recursion.sql'),
  'utf8',
);

describe('RLS recursion repair contract', () => {
  it('uses security-definer membership helpers instead of self-referencing policy subqueries', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.is_active_company_member');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.can_manage_company_users');
    expect(migration.match(/SECURITY\s+DEFINER/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain('restaurants_select_scoped');
    expect(migration).toContain('company_users_select_scoped');
    expect(migration).not.toContain('FROM public.company_users AS cu2');
  });

  it('drops the known recursive policies and preserves role gates', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS company_users_members_can_read ON public.company_users;');
    expect(migration).toContain('DROP POLICY IF EXISTS "Users and Super Admin can view company memberships" ON public.company_users;');
    expect(migration).toContain("public.has_role(auth.uid(), 'super_admin'::public.app_role)");
    expect(migration).toContain('owner_id = auth.uid()');
  });
});
