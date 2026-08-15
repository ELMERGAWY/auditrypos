import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const checkout = readFileSync(
  resolve(process.cwd(), 'src/lib/accounting/checkoutIntegration.ts'),
  'utf8',
);

describe('recipe consumption contract', () => {
  it('loads menu item components before POS inventory consumption', () => {
    expect(checkout).toContain("from('menu_item_components')");
    expect(checkout).toContain('recipeByMenuItem');
    expect(checkout).toContain('quantity_required');
    expect(checkout).toContain('recipeProductItems');
  });

  it('preserves unit factors when expanding a recipe', () => {
    expect(checkout).toContain('item.quantity * unitFactor * component.quantity_required');
    expect(checkout).toContain('directProductItems');
  });

  it('does not invent stock consumption for a menu item without components', () => {
    expect(checkout).toContain('recipeByMenuItem.get(item.menu_item_id) || []');
    expect(checkout).toContain('.filter(component => component.product_id && component.quantity_required > 0)');
  });
});
