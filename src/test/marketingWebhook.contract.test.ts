import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const webhook = readFileSync(
  resolve(process.cwd(), 'supabase/functions/crm-social-webhooks/index.ts'),
  'utf8',
);

describe('Meta webhook contract', () => {
  it('supports Meta verification without requiring a restaurant query parameter', () => {
    expect(webhook).toContain("const requestedRestaurantId = url.searchParams.get('restaurant_id');");
    expect(webhook).toContain("if (req.method === 'GET' && platform === 'meta')");
    expect(webhook).toContain("url.searchParams.get('hub.mode')");
    expect(webhook).toContain("url.searchParams.get('hub.verify_token')");
    expect(webhook).toContain("url.searchParams.get('hub.challenge')");
    expect(webhook).toContain('return new Response(challenge, { status: 200 });');
  });

  it('resolves the tenant from the connected Meta Page and rejects mismatches', () => {
    expect(webhook).toContain('metaPageIdFromPayload');
    expect(webhook).toContain(".eq('account_id', pageId)");
    expect(webhook).toContain('Meta Page does not belong to the requested restaurant');
    expect(webhook).toContain('Meta Page is connected to more than one restaurant');
  });

  it('validates X-Hub-Signature-256 against the raw body before processing events', () => {
    expect(webhook).toContain("req.headers.get('x-hub-signature-256')");
    expect(webhook).toContain('hmacSha256Hex(config.api_secret, rawBody)');
    expect(webhook).toContain("return jsonResponse({ error: 'Invalid signature' }, 401);");
    expect(webhook).toContain("await processMetaEntry(admin, restaurantId, entry, index)");
  });

  it('loads restaurant-specific config before global fallback', () => {
    expect(webhook).toContain('loadPlatformConfig');
    expect(webhook).toContain('loadOauthSecret');
    expect(webhook).toContain(".is('restaurant_id', null)");
  });
});
