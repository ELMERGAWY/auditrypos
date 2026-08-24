import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260824120000_inventory_release_safety.sql'),
  'utf8',
);
const inventoryTab = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/InventoryTab.tsx'),
  'utf8',
);

describe('inventory release safety contract', () => {
  it('provides a scoped, replay-safe receive RPC for the existing UI service', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.rpc_inventory_receive(');
    expect(migration).toContain('p_sub_warehouse_id uuid');
    expect(migration).toContain('v_product_workspace_id');
    expect(migration).toContain('v_warehouse_workspace_id');
    expect(migration).toContain('ON CONFLICT (warehouse_id, product_id) DO UPDATE');
    expect(migration).toContain("'inventory_adjustment_in'");
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.rpc_inventory_receive');
  });

  it('keeps accounting outbox support for inventory receive and issue events', () => {
    expect(migration).toContain("v_row.event_type IN ('inventory_issue_cogs','inventory_adjustment_in')");
    expect(migration).toContain("'inventory_movement'");
    expect(migration).toContain("'inventory_adjustment_in'");
    expect(migration).toContain("'inventory_issue_cogs'");
  });

  it('archives products instead of deleting stock history', () => {
    expect(inventoryTab).toContain(".update({ available: false, updated_at: new Date().toISOString() })");
    expect(inventoryTab).toContain('Never delete products, stock balances, or movement history from the UI.');
    expect(inventoryTab).not.toContain(".from('stock_movements').delete()");
    expect(inventoryTab).not.toContain(".from('warehouse_stock').delete()");
    expect(inventoryTab).not.toContain(".from('products').delete()");
  });

  it('filters product movement history by the active tenant scope', () => {
    expect(inventoryTab).toContain("movementQuery = movementQuery.eq('workspace_id', workspaceId)");
    expect(inventoryTab).toContain(".eq('restaurant_id', restaurantId)");
  });
});
