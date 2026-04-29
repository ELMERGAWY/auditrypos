
// ============================================================
// FIFO INVENTORY COSTING SYSTEM
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type { InventoryCostLayer, InventoryConsumption } from './types';
import type { OrderItem } from '@/pages/dashboard/types';

export type CostingMethod = 'fifo' | 'lifo' | 'wac' | 'specific';

class InventoryCostingService {
  private costingMethod: CostingMethod = 'fifo';

  // ============================================================
  // COSTING METHOD CONFIGURATION
  // ============================================================

  async getCostingMethod(restaurantId: string): Promise<CostingMethod> {
    const { data, error } = await supabase
      .from('inventory_settings')
      .select('costing_method')
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      return 'fifo'; // Default
    }

    return (data.costing_method as CostingMethod) || 'fifo';
  }

  async setCostingMethod(restaurantId: string, method: CostingMethod): Promise<void> {
    const { error } = await supabase
      .from('inventory_settings')
      .upsert({
        restaurant_id: restaurantId,
        costing_method: method,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to set costing method:', error);
    }
  }

  // ============================================================
  // COST LAYER MANAGEMENT
  // ============================================================

  async addCostLayer(
    restaurantId: string,
    productId: string,
    quantity: number,
    unitCost: number,
    layerType: InventoryCostLayer['layer_type'] = 'purchase',
    referenceId?: string
  ): Promise<InventoryCostLayer | null> {
    const { data, error } = await supabase
      .from('inventory_cost_layers')
      .insert({
        restaurant_id: restaurantId,
        product_id: productId,
        quantity,
        unit_cost: unitCost,
        remaining_qty: quantity,
        layer_type: layerType,
        reference_id: referenceId,
        layer_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add cost layer:', error);
      return null;
    }

    return data as InventoryCostLayer;
  }

  async getCostLayers(
    productId: string, 
    method: CostingMethod = 'fifo'
  ): Promise<InventoryCostLayer[]> {
    let query = supabase
      .from('inventory_cost_layers')
      .select('*')
      .eq('product_id', productId)
      .gt('remaining_qty', 0);

    // Order based on costing method
    if (method === 'fifo') {
      query = query.order('layer_date', { ascending: true }).order('created_at', { ascending: true });
    } else if (method === 'lifo') {
      query = query.order('layer_date', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('layer_date', { ascending: true });
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
    productId: string, 
    requestedQty: number
  ): Promise<{ totalCost: number; avgUnitCost: number; layersConsumed: number; remainingQty: number }> {
    const layers = await this.getCostLayers(productId, 'fifo');
    
    let totalCost = 0;
    let remainingToConsume = requestedQty;
    let layersConsumed = 0;
    const consumedLayers: { layerId: string; qty: number }[] = [];

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;

      const qtyFromLayer = Math.min(remainingToConsume, layer.remaining_qty);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingToConsume -= qtyFromLayer;
      layersConsumed++;

      consumedLayers.push({ layerId: layer.id, qty: qtyFromLayer });
    }

    const actualConsumed = requestedQty - remainingToConsume;
    const avgUnitCost = actualConsumed > 0 ? totalCost / actualConsumed : 0;

    // Update consumed layers in database IN PARALLEL for speed
    await Promise.all(consumedLayers.map(consumed => 
      this.consumeFromLayer(consumed.layerId, consumed.qty)
    ));

    return {
      totalCost,
      avgUnitCost,
      layersConsumed,
      remainingQty: remainingToConsume, // This is unfilled quantity (if stock insufficient)
    };
  }

  private async consumeFromLayer(layerId: string, qty: number): Promise<void> {
    const { error } = await supabase
      .from('inventory_cost_layers')
      .update({
        remaining_qty: supabase.rpc('decrement_remaining_qty', { 
          p_layer_id: layerId, 
          p_qty: qty 
        }),
        is_consumed: supabase.rpc('check_layer_consumed', { p_layer_id: layerId }),
        consumed_at: new Date().toISOString(),
      })
      .eq('id', layerId);

    if (error) {
      // Fallback: direct update
      await supabase
        .from('inventory_cost_layers')
        .update({
          remaining_qty: 0,
          is_consumed: true,
          consumed_at: new Date().toISOString(),
        })
        .eq('id', layerId);
    }
  }

  // ============================================================
  // COGS CALCULATION FOR ORDERS
  // ============================================================

  async calculateOrderCOGS(
    items: OrderItem[],
    restaurantId: string
  ): Promise<{ totalCOGS: number; itemsWithCost: (OrderItem & { cogs: number; unitCost: number })[] }> {
    const costingMethod = await this.getCostingMethod(restaurantId);
    let totalCOGS = 0;
    const itemsWithCost: (OrderItem & { cogs: number; unitCost: number })[] = [];

    for (const item of items) {
      // Skip non-inventory items (services, etc.)
      if (!item.product_id && !item.menu_item_id) {
        itemsWithCost.push({ ...item, cogs: 0, unitCost: 0 });
        continue;
      }

      const productId = item.product_id || item.menu_item_id!;
      const requestedQty = item.quantity;

      let cogs = 0;
      let unitCost = 0;

      switch (costingMethod) {
        case 'fifo':
          const fifoResult = await this.calculateFIFO(productId, requestedQty);
          cogs = fifoResult.totalCost;
          unitCost = fifoResult.avgUnitCost;
          break;

        case 'lifo':
          // Similar to FIFO but reverse order
          const lifoResult = await this.calculateLIFO(productId, requestedQty);
          cogs = lifoResult.totalCost;
          unitCost = lifoResult.avgUnitCost;
          break;

        case 'wac':
          // Weighted Average Cost
          const wacResult = await this.calculateWAC(productId, requestedQty);
          cogs = wacResult.totalCost;
          unitCost = wacResult.avgUnitCost;
          break;

        case 'specific':
          // Use specific identification from item
          cogs = (item as any).specific_cost || 0;
          unitCost = requestedQty > 0 ? cogs / requestedQty : 0;
          break;
      }

      // Record consumption
      if (cogs > 0) {
        await this.recordConsumption(productId, item, cogs, unitCost);
      }

      totalCOGS += cogs;
      itemsWithCost.push({ ...item, cogs, unitCost });
    }

    return { totalCOGS, itemsWithCost };
  }

  private async calculateLIFO(
    productId: string, 
    requestedQty: number
  ): Promise<{ totalCost: number; avgUnitCost: number }> {
    const layers = await this.getCostLayers(productId, 'lifo');
    
    let totalCost = 0;
    let remainingToConsume = requestedQty;

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;

      const qtyFromLayer = Math.min(remainingToConsume, layer.remaining_qty);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingToConsume -= qtyFromLayer;

      // Update layer
      await supabase
        .from('inventory_cost_layers')
        .update({
          remaining_qty: layer.remaining_qty - qtyFromLayer,
          is_consumed: layer.remaining_qty - qtyFromLayer <= 0,
        })
        .eq('id', layer.id);
    }

    const actualConsumed = requestedQty - remainingToConsume;
    const avgUnitCost = actualConsumed > 0 ? totalCost / actualConsumed : 0;

    return { totalCost, avgUnitCost };
  }

  private async calculateWAC(
    productId: string, 
    requestedQty: number
  ): Promise<{ totalCost: number; avgUnitCost: number }> {
    const { data: product } = await supabase
      .from('products')
      .select('cost_price, quantity')
      .eq('id', productId)
      .single();

    if (!product) {
      return { totalCost: 0, avgUnitCost: 0 };
    }

    const avgUnitCost = product.cost_price || 0;
    const totalCost = requestedQty * avgUnitCost;

    return { totalCost, avgUnitCost };
  }

  private async recordConsumption(
    productId: string,
    item: OrderItem,
    cogs: number,
    unitCost: number
  ): Promise<void> {
    const { error } = await supabase
      .from('inventory_consumption')
      .insert({
        product_id: productId,
        order_id: (item as any).order_id,
        quantity: item.quantity,
        unit_cost: unitCost,
        total_cost: cogs,
      });

    if (error) {
      console.error('Failed to record inventory consumption:', error);
    }
  }

  // ============================================================
  // INVENTORY VALUATION REPORTS
  // ============================================================

  async getInventoryValuation(restaurantId: string): Promise<{
    totalCost: number;
    totalRetail: number;
    potentialProfit: number;
    items: Array<{
      product_id: string;
      name: string;
      quantity: number;
      avgCost: number;
      totalCost: number;
      retailPrice: number;
      totalRetail: number;
    }>;
  }> {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, quantity, price, cost_price')
      .eq('restaurant_id', restaurantId)
      .gt('quantity', 0);

    if (error || !products) {
      return { totalCost: 0, totalRetail: 0, potentialProfit: 0, items: [] };
    }

    let totalCost = 0;
    let totalRetail = 0;

    const items = products.map(p => {
      const qty = Number(p.quantity) || 0;
      const cost = Number(p.cost_price) || 0;
      const price = Number(p.price) || 0;

      const itemCost = qty * cost;
      const itemRetail = qty * price;

      totalCost += itemCost;
      totalRetail += itemRetail;

      return {
        product_id: p.id,
        name: p.name,
        quantity: qty,
        avgCost: cost,
        totalCost: itemCost,
        retailPrice: price,
        totalRetail: itemRetail,
      };
    });

    return {
      totalCost,
      totalRetail,
      potentialProfit: totalRetail - totalCost,
      items,
    };
  }

  // ============================================================
  // STOCK MOVEMENT & ADJUSTMENTS
  // ============================================================

  async recordStockAdjustment(
    restaurantId: string,
    productId: string,
    quantityChange: number,
    reason: string,
    unitCost?: number
  ): Promise<boolean> {
    try {
      // Record the movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          restaurant_id: restaurantId,
          product_id: productId,
          type: quantityChange > 0 ? 'in' : 'out',
          quantity: Math.abs(quantityChange),
          reason: `Adjustment: ${reason}`,
        });

      if (movementError) throw movementError;

      // If positive adjustment with cost, add new layer
      if (quantityChange > 0 && unitCost && unitCost > 0) {
        await this.addCostLayer(
          restaurantId,
          productId,
          quantityChange,
          unitCost,
          'adjustment'
        );
      }

      // If negative adjustment, consume from layers
      if (quantityChange < 0) {
        await this.calculateFIFO(productId, Math.abs(quantityChange));
      }

      return true;
    } catch (error) {
      console.error('Stock adjustment failed:', error);
      return false;
    }
  }

  // ============================================================
  // BATCH OPERATIONS
  // ============================================================

  async processPurchaseOrder(
    restaurantId: string,
    items: Array<{
      product_id: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }>,
    referenceId?: string
  ): Promise<boolean> {
    try {
      for (const item of items) {
        await this.addCostLayer(
          restaurantId,
          item.product_id,
          item.quantity,
          item.unit_cost,
          'purchase',
          referenceId
        );
      }
      return true;
    } catch (error) {
      console.error('Purchase order processing failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const inventoryCosting = new InventoryCostingService();
export default inventoryCosting;
