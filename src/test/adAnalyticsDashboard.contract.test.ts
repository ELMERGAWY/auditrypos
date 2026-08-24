import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(
  resolve(process.cwd(), 'src/components/marketing/AdAnalyticsDashboard.tsx'),
  'utf8',
);

describe('ad analytics dashboard contract', () => {
  it('keeps synchronized campaigns separate from derived campaign IDs', () => {
    expect(dashboard).toContain('const [campaigns, setCampaigns] = useState<any[]>([]);');
    expect(dashboard).toContain('const campaignIds = Array.from');
    expect(dashboard).toContain('{campaignIds.map(campaignId => (');
    expect(dashboard).not.toContain('const campaigns = Array.from');
  });

  it('keeps analytics and accounting operations tenant-scoped through the existing functions', () => {
    expect(dashboard).toContain("body: { action: 'sync', restaurantId, socialAccountId: selectedAdAccount");
    expect(dashboard).toContain("body: { action: 'materialize_spend', restaurantId");
    expect(dashboard).toContain("body: { action: 'post_accounting', restaurantId");
    expect(dashboard).toContain("body: { action: 'update_status', restaurantId, campaignId: campaign.id");
  });
});
