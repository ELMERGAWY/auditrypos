
// ============================================================
// ADVANCED INVENTORY COSTING SYSTEM
// Compatible with EAS, IFRS, and US GAAP
// ============================================================

import { supabase } from '@/integrations/supabase/client';

export type CostingMethod = 'FIFO' | 'AVERAGE' | 'SPECIFIC' | 'LIFO';
export type AccountingStandard = 'EAS' | 'IFRS' | 'US_GAAP';
export type InventoryValuationRule = 'IAS2_FIFO' | 'IAS2_AVERAGE' | 'IAS2_SPECIFIC' | 'GAAP_FIFO' | 'GAAP_AVERAGE' | 'GAAP_LIFO';
export type MovementType = 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN_IN' | 'RETURN_OUT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'VOICE' | 'LOSS';

interface InventoryCostLayer {
  id: string;
  item_id: string;
  sub_warehouse_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  layer_type: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  purchase_date?: string;
  accounting_standard: AccountingStandard;
  is_consumed: boolean;
  consumed_quantity: number;
  remaining_quantity: number;
  created_at: string;
  consumed_at?: string;
}

interface InventoryBalance {
  id: string;
  item_id: string;
  sub_warehouse_id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  quantity_incoming: number;
  quantity_reserved: number;
  unit_cost: number;
  average_cost: number;
  last_purchase_cost: number;
  total_value: number;
  valuation_method: CostingMethod;
  accounting_standard: AccountingStandard;
  inventory_valuation_rule: InventoryValuationRule;
  net_realizable_value?: number;
  lcm_adjustment: number;
  is_lcm_applied: boolean;
  last_movement_id?: string;
  last_movement_at?: string;
  last_purchase_at?: string;
  updated_at: string;
}

interface InventoryMovement {
  id: string;
  item_id: string;
  sub_warehouse_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  from_sub_warehouse_id?: string;
  to_sub_warehouse_id?: string;
  cost_layer_id?: string;
  batch_number?: string;
  lot_number?: string;
  serial_number?: string;
  quality_status: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  movement_date: string;
  posting_date: string;
  accounting_entry_id?: string;
  is_posted: boolean;
  accounting_standard: AccountingStandard;
  created_by: string;
  notes?: string;
  reason?: string;
  created_at: string;
}

class InventoryCostingService {
  // ============================================================
  // COST LAYER MANAGEMENT
  // ============================================================

  async addCostLayer(
    itemId: string,
    subWarehouseId: string,
    quantity: number,
    unitCost: number,
    layerType: string = 'PURCHASE',
    referenceType?: string,
    referenceId?: string,
    referenceNumber?: string,
    accountingStandard: AccountingStandard = 'IFRS'
  ): Promise<InventoryCostLayer | null> {
    const totalCost = quantity * unitCost;
    
    const { data, error } = await supabase
      .from('inventory_cost_layers')
      .insert({
        item_id: itemId,
        sub_warehouse_id: subWarehouseId,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        layer_type: layerType,
        reference_type: referenceType,
        reference_id: referenceId,
        reference_number: referenceNumber,
        purchase_date: new Date().toISOString(),
        accounting_standard: accountingStandard,
        is_consumed: false,
        consumed_quantity: 0,
        remaining_quantity: quantity,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add cost layer:', error);
      return null;
    }

    // Update inventory balance
    await this.updateInventoryBalance(itemId, subWarehouseId, quantity, unitCost, accountingStandard);

    return data as InventoryCostLayer;
  }

  async getCostLayers(
    itemId: string,
    subWarehouseId: string,
    method: CostingMethod = 'FIFO'
  ): Promise<InventoryCostLayer[]> {
    let query = supabase
      .from('inventory_cost_layers')
      .select('*')
      .eq('item_id', itemId)
      .eq('sub_warehouse_id', subWarehouseId)
      .gt('remaining_quantity', 0);

    // Order based on costing method
    if (method === 'FIFO') {
      query = query.order('purchase_date', { ascending: true }).order('created_at', { ascending: true });
    } else if (method === 'LIFO') {
      query = query.order('purchase_date', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('purchase_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get cost layers:', error);
      return [];
    }

    return (data || []) as InventoryCostLayer[];
  }

  // ============================================================
  // FIFO COST CALCULATION
  // ============================================================

  async calculateFIFO(
    itemId: string,
    subWarehouseId: string,
    requestedQty: number,
    accountingStandard: AccountingStandard = 'IFRS'
  ): Promise<{ totalCost: number; avgUnitCost: number; layersConsumed: number; remainingQty: number }> {
    const layers = await this.getCostLayers(itemId, subWarehouseId, 'FIFO');
    
    let totalCost = 0;
    let remainingToConsume = requestedQty;
    let layersConsumed = 0;
    const consumedLayers: { layerId: string; qty: number }[] = [];

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;

      const qtyFromLayer = Math.min(remainingToConsume, layer.remaining_quantity);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingToConsume -= qtyFromLayer;
      layersConsumed++;

      consumedLayers.push({ layerId: layer.id, qty: qtyFromLayer });
    }

    const actualConsumed = requestedQty - remainingToConsume;
    const avgUnitCost = actualConsumed > 0 ? totalCost / actualConsumed : 0;

    // Update consumed layers in database
    await Promise.all(consumedLayers.map(consumed => 
      this.consumeFromLayer(consumed.layerId, consumed.qty)
    ));

    return {
      totalCost,
      avgUnitCost,
      layersConsumed,
      remainingQty: remainingToConsume,
    };
  }

  // ============================================================
  // AVERAGE COST CALCULATION
  // ============================================================

  async calculateAverage(
    itemId: string,
    subWarehouseId: string,
    requestedQty: number,
    accountingStandard: AccountingStandard = 'IFRS'
  ): Promise<{ totalCost: number; avgUnitCost: number }> {
    const balance = await this.getInventoryBalance(itemId, subWarehouseId);
    
    if (!balance || balance.quantity_available <= 0) {
      return { totalCost: 0, avgUnitCost: 0 };
    }

    const avgUnitCost = balance.average_cost;
    const totalCost = Math.min(requestedQty, balance.quantity_available) * avgUnitCost;

    // Consume from layers (FIFO order) to track stock correctly
    const layers = await this.getCostLayers(itemId, subWarehouseId, 'FIFO');
    let remainingToConsume = Math.min(requestedQty, balance.quantity_available);
    const consumedLayers: { layerId: string; qty: number }[] = [];

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;
      const qtyFromLayer = Math.min(remainingToConsume, layer.remaining_quantity);
      remainingToConsume -= qtyFromLayer;
      consumedLayers.push({ layerId: layer.id, qty: qtyFromLayer });
    }

    await Promise.all(consumedLayers.map(c => this.consumeFromLayer(c.layerId, c.qty)));

    return { totalCost, avgUnitCost };
  }

  // ============================================================
  // LIFO COST CALCULATION (US GAAP Only)
  // ============================================================

  async calculateLIFO(
    itemId: string,
    subWarehouseId: string,
    requestedQty: number,
    accountingStandard: AccountingStandard = 'US_GAAP'
  ): Promise<{ totalCost: number; avgUnitCost: number }> {
    if (accountingStandard !== 'US_GAAP') {
      console.warn('LIFO is only allowed under US GAAP');
      return this.calculateFIFO(itemId, subWarehouseId, requestedQty, accountingStandard);
    }

    const layers = await this.getCostLayers(itemId, subWarehouseId, 'LIFO');
    
    let totalCost = 0;
    let remainingToConsume = requestedQty;

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;

      const qtyFromLayer = Math.min(remainingToConsume, layer.remaining_quantity);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingToConsume -= qtyFromLayer;

      await this.consumeFromLayer(layer.id, qtyFromLayer);
    }

    const actualConsumed = requestedQty - remainingToConsume;
    const avgUnitCost = actualConsumed > 0 ? totalCost / actualConsumed : 0;

    return { totalCost, avgUnitCost };
  }

  // ============================================================
  // LAYER CONSUMPTION
  // ============================================================

  private async consumeFromLayer(layerId: string, qty: number): Promise<void> {
    const { data: layer } = await supabase
      .from('inventory_cost_layers')
      .select('remaining_quantity')
      .eq('id', layerId)
      .single();
    
    if (!layer) return;

    const newQty = Math.max(0, layer.remaining_quantity - qty);
    const { error } = await supabase
      .from('inventory_cost_layers')
      .update({
        remaining_quantity: newQty,
        consumed_quantity: (layer.consumed_quantity || 0) + qty,
        is_consumed: newQty <= 0,
        consumed_at: newQty <= 0 ? new Date().toISOString() : null,
      })
      .eq('id', layerId);

    if (error) {
      console.error('Failed to consume from layer:', error);
    }
  }

  // ============================================================
  // INVENTORY BALANCE MANAGEMENT
  // ============================================================

  async getInventoryBalance(itemId: string, subWarehouseId: string): Promise<InventoryBalance | null> {
    const { data, error } = await supabase
      .from('inventory_balances')
      .select('*')
      .eq('item_id', itemId)
      .eq('sub_warehouse_id', subWarehouseId)
      .single();

    if (error) {
      console.error('Failed to get inventory balance:', error);
      return null;
    }

    return data as InventoryBalance;
  }

  async updateInventoryBalance(
    itemId: string,
    subWarehouseId: string,
    quantityChange: number,
    unitCost: number,
    accountingStandard: AccountingStandard = 'IFRS',
    valuationMethod: CostingMethod = 'AVERAGE'
  ): Promise<void> {
    const balance = await this.getInventoryBalance(itemId, subWarehouseId);

    if (!balance) {
      // Create new balance
      const { error } = await supabase
        .from('inventory_balances')
        .insert({
          item_id: itemId,
          sub_warehouse_id: subWarehouseId,
          quantity_on_hand: quantityChange,
          quantity_allocated: 0,
          quantity_available: quantityChange,
          quantity_incoming: 0,
          quantity_reserved: 0,
          unit_cost: unitCost,
          average_cost: unitCost,
          last_purchase_cost: unitCost,
          total_value: quantityChange * unitCost,
          valuation_method: valuationMethod,
          accounting_standard: accountingStandard,
          inventory_valuation_rule: this.getDefaultValuationRule(accountingStandard, valuationMethod),
          lcm_adjustment: 0,
          is_lcm_applied: false,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to create inventory balance:', error);
      }
      return;
    }

    // Update existing balance
    const newQuantityOnHand = balance.quantity_on_hand + quantityChange;
    const newQuantityAvailable = balance.quantity_available + quantityChange;
    
    // Calculate new average cost
    const totalValue = balance.total_value + (quantityChange * unitCost);
    const newAverageCost = newQuantityOnHand > 0 ? totalValue / newQuantityOnHand : unitCost;

    const { error } = await supabase
      .from('inventory_balances')
      .update({
        quantity_on_hand: newQuantityOnHand,
        quantity_available: newQuantityAvailable,
        unit_cost: unitCost,
        average_cost: newAverageCost,
        last_purchase_cost: unitCost,
        total_value: totalValue,
        last_purchase_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', balance.id);

    if (error) {
      console.error('Failed to update inventory balance:', error);
    }
  }

  // ============================================================
  // MOVEMENT RECORDING
  // ============================================================

  async recordMovement(
    itemId: string,
    subWarehouseId: string,
    movementType: MovementType,
    quantity: number,
    unitCost: number,
    referenceType?: string,
    referenceId?: string,
    referenceNumber?: string,
    fromSubWarehouseId?: string,
    toSubWarehouseId?: string,
    accountingStandard: AccountingStandard = 'IFRS',
    createdBy?: string
  ): Promise<InventoryMovement | null> {
    const totalCost = quantity * unitCost;
    
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        item_id: itemId,
        sub_warehouse_id: subWarehouseId,
        movement_type: movementType,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_type: referenceType,
        reference_id: referenceId,
        reference_number: referenceNumber,
        from_sub_warehouse_id: fromSubWarehouseId,
        to_sub_warehouse_id: toSubWarehouseId,
        movement_date: new Date().toISOString(),
        posting_date: new Date().toISOString(),
        accounting_standard: accountingStandard,
        is_posted: false,
        created_by: createdBy,
        quality_status: 'GOOD',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to record movement:', error);
      return null;
    }

    return data as InventoryMovement;
  }

  // ============================================================
  // COST CALCULATION BASED ON METHOD
  // ============================================================

  async calculateCost(
    itemId: string,
    subWarehouseId: string,
    quantity: number,
    costingMethod: CostingMethod,
    accountingStandard: AccountingStandard = 'IFRS'
  ): Promise<{ totalCost: number; avgUnitCost: number }> {
    switch (costingMethod) {
      case 'FIFO':
        const fifoResult = await this.calculateFIFO(itemId, subWarehouseId, quantity, accountingStandard);
        return { totalCost: fifoResult.totalCost, avgUnitCost: fifoResult.avgUnitCost };
      
      case 'AVERAGE':
        return await this.calculateAverage(itemId, subWarehouseId, quantity, accountingStandard);
      
      case 'LIFO':
        if (accountingStandard !== 'US_GAAP') {
          console.warn('LIFO is only allowed under US GAAP, falling back to FIFO');
          const fifoFallback = await this.calculateFIFO(itemId, subWarehouseId, quantity, accountingStandard);
          return { totalCost: fifoFallback.totalCost, avgUnitCost: fifoFallback.avgUnitCost };
        }
        return await this.calculateLIFO(itemId, subWarehouseId, quantity, accountingStandard);
      
      case 'SPECIFIC':
        // Specific identification - requires external cost input
        return { totalCost: 0, avgUnitCost: 0 };
      
      default:
        return await this.calculateAverage(itemId, subWarehouseId, quantity, accountingStandard);
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getDefaultValuationRule(
    accountingStandard: AccountingStandard,
    costingMethod: CostingMethod
  ): InventoryValuationRule {
    if (accountingStandard === 'US_GAAP') {
      if (costingMethod === 'LIFO') return 'GAAP_LIFO';
      if (costingMethod === 'FIFO') return 'GAAP_FIFO';
      return 'GAAP_AVERAGE';
    } else {
      // EAS and IFRS
      if (costingMethod === 'FIFO') return 'IAS2_FIFO';
      if (costingMethod === 'SPECIFIC') return 'IAS2_SPECIFIC';
      return 'IAS2_AVERAGE';
    }
  }

  // ============================================================
  // STOCK ADJUSTMENT
  // ============================================================

  async recordStockAdjustment(
    itemId: string,
    subWarehouseId: string,
    quantityChange: number,
    unitCost: number,
    reason: string,
    accountingStandard: AccountingStandard = 'IFRS',
    costingMethod: CostingMethod = 'AVERAGE',
    createdBy?: string
  ): Promise<boolean> {
    try {
      const movementType = quantityChange > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      const absQuantity = Math.abs(quantityChange);

      // Record movement
      await this.recordMovement(
        itemId,
        subWarehouseId,
        movementType,
        absQuantity,
        unitCost,
        'ADJUSTMENT',
        undefined,
        undefined,
        undefined,
        undefined,
        accountingStandard,
        createdBy
      );

      // If positive adjustment, add cost layer
      if (quantityChange > 0) {
        await this.addCostLayer(
          itemId,
          subWarehouseId,
          quantityChange,
          unitCost,
          'ADJUSTMENT_POSITIVE',
          'ADJUSTMENT',
          undefined,
          undefined,
          accountingStandard
        );
      } else {
        // If negative adjustment, consume from layers
        await this.calculateCost(
          itemId,
          subWarehouseId,
          absQuantity,
          costingMethod,
          accountingStandard
        );
      }

      return true;
    } catch (error) {
      console.error('Stock adjustment failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const inventoryCosting = new InventoryCostingService();
export default inventoryCosting;
