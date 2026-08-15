import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appearance = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/settings/AppearanceSettings.tsx'),
  'utf8',
);

describe('appearance settings contract', () => {
  it('persists tenant-scoped theme and layout settings', () => {
    expect(appearance).toContain('theme_settings');
    expect(appearance).toContain('layout_config');
    expect(appearance).toContain(".from('restaurants')");
    expect(appearance).toContain(".update({ theme_settings: themeSettings, layout_config: layoutConfig }");
  });

  it('supports multiple presets and configurable dashboard density', () => {
    expect(appearance).toContain('THEME_PRESETS');
    expect(appearance).toContain('primary_hsl');
    expect(appearance).toContain('value="compact"');
    expect(appearance).toContain('value="icon"');
  });

  it('stores deterministic card order and table view preferences', () => {
    expect(appearance).toContain('card_order');
    expect(appearance).toContain('table_views');
    expect(appearance).toContain('table_views: { ...DEFAULT_CONFIG.table_views');
    expect(appearance).toContain('value="cards"');
    expect(appearance).toContain('value="compact"');
  });
});
