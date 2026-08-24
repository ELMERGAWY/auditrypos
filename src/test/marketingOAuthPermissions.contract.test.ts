import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const oauth = readFileSync(
  resolve(process.cwd(), 'supabase/functions/social-oauth/index.ts'),
  'utf8',
);
const publish = readFileSync(
  resolve(process.cwd(), 'supabase/functions/social-publish/index.ts'),
  'utf8',
);
const ads = readFileSync(
  resolve(process.cwd(), 'supabase/functions/social-ads/index.ts'),
  'utf8',
);

describe('marketing OAuth permission contract', () => {
  it('uses the existing company permission dictionary for Meta access', () => {
    expect(oauth).toContain('marketing.content.create');
    expect(oauth).toContain('marketing.content.publish');
    expect(oauth).toContain('marketing.ads.read');
    expect(oauth).toContain('marketing.ads.manage');
    expect(oauth).toContain("admin.rpc('check_user_permission'");
    expect(oauth).toContain('assertMetaMarketingPermission');
  });

  it('protects the full Meta lifecycle, not only ad analytics', () => {
    expect(oauth).toContain("if (meta.isMeta) await assertMetaMarketingPermission(admin, requestedRestaurantId, user.id);");
    expect(oauth).toContain("if (meta.isMeta) await assertMetaMarketingPermission(admin, state.restaurant_id, user.id);");
    expect(oauth).toContain("if (action === 'list_assets') {");
    expect(oauth).toContain("if (action === 'connect_asset') {");
  });

  it('does not force pending assets to the discovering employee', () => {
    expect(oauth).not.toContain(".eq('created_by', user.id)");
    expect(oauth).toContain(".eq('status', 'pending')");
  });

  it('keeps publishing and ads actions behind the same permission dictionary', () => {
    expect(publish).toContain('marketing.content.publish');
    expect(ads).toContain('marketing.ads.read');
    expect(ads).toContain('marketing.ads.manage');
    expect(ads).toContain('finance.access');
  });
});
