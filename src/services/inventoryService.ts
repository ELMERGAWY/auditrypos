// @ts-nocheck
/**
 * INVENTORY SERVICE — Phase 2
 * Typed wrapper around the atomic, race-free inventory RPCs.
 * Every stock mutation MUST go through this layer so that:
 *  - the balance row is locked (no race conditions on concurrent sales)
 *  - Weighted Average Cost (WAC) is recomputed inside the same transaction
 *  - a movement record is always written with the real cost
 */
import { supabase } from '@/integrations/supabase/client';

export interface InventoryResult {
  success: boolean;
  error?: string;
  movement_id?: string;
  unit_cost?: number;
  cogs?: number;
  average_cost?: number;
  total_value?: number;
  quantity_on_hand?: number;
  [key: string]: unknown;
}

const unwrap = (data: unknown, error: unknown): InventoryResult => {
  if (error) return { success: false, error: (error as { message?: string }).message ?? 'خطأ غير متوقع' };
  return (data as InventoryResult) ?? { success: false, error: 'لا توجد استجابة من الخادم' };
};

/** Receive stock (purchase, production output, customer return). Recomputes WAC. */
export async function receiveStock(params: {
  itemId: string;
  subWarehouseId: string;
  quantity: number;
  unitCost: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  movementType?: 'RECEIPT' | 'PRODUCTION_IN' | 'RETURN_IN' | 'ADJUSTMENT_IN';
}): Promise<InventoryResult> {
  const { data, error } = await supabase.rpc('rpc_inventory_receive', {
    p_item_id: params.itemId,
    p_sub_warehouse_id: params.subWarehouseId,
    p_quantity: params.quantity,
    p_unit_cost: params.unitCost,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_reference_number: params.referenceNumber ?? null,
    p_movement_type: params.movementType ?? 'RECEIPT',
  });
  return unwrap(data, error);
}

/** Issue stock (sale, consumption, supplier return). Returns the COGS at current WAC. */
export async function issueStock(params: {
  itemId: string;
  subWarehouseId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  movementType?: 'ISSUE' | 'SALE' | 'CONSUMPTION' | 'RETURN_OUT' | 'ADJUSTMENT_OUT';
  allowNegative?: boolean;
}): Promise<InventoryResult> {
  const { data, error } = await supabase.rpc('rpc_inventory_issue', {
    p_item_id: params.itemId,
    p_sub_warehouse_id: params.subWarehouseId,
    p_quantity: params.quantity,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_reference_number: params.referenceNumber ?? null,
    p_movement_type: params.movementType ?? 'ISSUE',
    p_allow_negative: params.allowNegative ?? false,
  });
  return unwrap(data, error);
}

/** Set an item's on-hand quantity to an exact figure (stock count / write-off). */
export async function adjustStock(params: {
  itemId: string;
  subWarehouseId: string;
  newQuantity: number;
  reason?: string;
  unitCost?: number;
}): Promise<InventoryResult> {
  const { data, error } = await supabase.rpc('rpc_inventory_adjust', {
    p_item_id: params.itemId,
    p_sub_warehouse_id: params.subWarehouseId,
    p_new_quantity: params.newQuantity,
    p_reason: params.reason ?? null,
    p_unit_cost: params.unitCost ?? null,
  });
  return unwrap(data, error);
}

/** Move stock between sub-warehouses while preserving its cost. */
export async function transferStock(params: {
  itemId: string;
  fromSubWarehouseId: string;
  toSubWarehouseId: string;
  quantity: number;
  notes?: string;
}): Promise<InventoryResult> {
  const { data, error } = await supabase.rpc('rpc_inventory_transfer', {
    p_item_id: params.itemId,
    p_from_sub_warehouse_id: params.fromSubWarehouseId,
    p_to_sub_warehouse_id: params.toSubWarehouseId,
    p_quantity: params.quantity,
    p_notes: params.notes ?? null,
  });
  return unwrap(data, error);
}

export interface ItemCardRow {
  movement_id: string;
  movement_date: string;
  movement_type: string;
  reference_type: string | null;
  reference_number: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  running_quantity: number;
  running_value: number;
}

/** Item card: every movement for an item in a sub-warehouse with running qty & value. */
export async function getItemCard(params: {
  itemId: string;
  subWarehouseId: string;
  from?: string;
  to?: string;
}): Promise<ItemCardRow[]> {
  const { data, error } = await supabase.rpc('fn_inventory_item_card', {
    p_item_id: params.itemId,
    p_sub_warehouse_id: params.subWarehouseId,
    p_from: params.from ?? null,
    p_to: params.to ?? null,
  });
  if (error) throw error;
  return (data as ItemCardRow[]) ?? [];
}

export default {
  receiveStock,
  issueStock,
  adjustStock,
  transferStock,
  getItemCard,
};
