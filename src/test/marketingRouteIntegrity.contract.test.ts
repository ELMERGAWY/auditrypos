import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const marketingTab = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/MarketingTab.tsx'),
  'utf8',
);
const crm = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/AuditryCRM.tsx'),
  'utf8',
);

describe('marketing route integrity contract', () => {
  it('uses the active SocialMediaManager in the existing Facebook tab', () => {
    expect(marketingTab).toContain("import { SocialMediaManager } from '@/pages/dashboard/SocialMediaManager';");
    expect(marketingTab).toContain('<SocialMediaManager restaurantId={restaurantId} />');
    expect(marketingTab).not.toContain('FacebookIntegration');
  });

  it('builds the CRM webhook URL from the current Supabase project configuration', () => {
    expect(crm).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(crm).toContain('/functions/v1/crm-social-webhooks');
    expect(crm).not.toContain('lovable-auditry.supabase.co');
  });
});
