import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260815190000_contracting_project_controls.sql'),
  'utf8',
);
const sqlOnly = migration
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

describe('contracting controls contract', () => {
  it('adds branch scope and operational project controls', () => {
    expect(sqlOnly).toContain('projects');
    expect(sqlOnly).toContain('workspace_id uuid');
    expect(sqlOnly).toContain('completion_percent numeric');
    expect(sqlOnly).toContain('cost_control_method text');
  });

  it('uses archive RPC rather than deleting project entities', () => {
    expect(sqlOnly).toContain('archive_contracting_entity');
    expect(sqlOnly).toContain("status = 'archived'");
    expect(sqlOnly).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  });

  it('restricts archive execution and grants no anonymous access', () => {
    expect(sqlOnly).toContain('check_user_permission');
    expect(sqlOnly).toContain('projects.manage');
    expect(sqlOnly).toContain('REVOKE ALL ON FUNCTION');
    expect(sqlOnly).toContain('GRANT EXECUTE ON FUNCTION');
    expect(sqlOnly).not.toMatch(/GRANT .* TO anon|GRANT .* TO PUBLIC/i);
  });
});
