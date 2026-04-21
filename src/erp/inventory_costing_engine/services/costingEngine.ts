/**
 * INVENTORY COSTING ENGINE
 * Handles FIFO, Weighted Average, and Standard Cost methods
 * 
 * Every inventory movement affects accounting
 */

import { supabase } from '@/integrations/supabase/client';
import {
  CostLayer,
  InventoryMovement,
  InventoryLevel,
  CostingMethod,
  InventoryMovementType
} from '../types/inventory';

export interface CostingResult {
  success: boolean;
  unit_cost: number;
  total_cost: number;
  cost_layers?: CostLayer[];
  errors: string[];
}

export interface ConsumptionResult {
  success: boolean;
  consumed_layers: {
    layer_id: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }[];
  total_cost: number;
  errors: string[];
}

/**
 * Main Costing Engine
 */
export class InventoryCostingEngine {
  private companyId: string;
  
  constructor(companyId: string) {
    this.companyId = companyId;
  }
  
  /**
   * Record inventory receipt (creates cost layers)
   */
  async recordReceipt(params: {
    product_id: string;
    warehouse_id: string;
    quantity: number;
    unit_cost: number;
    reference_type: string;
    reference_id: string;
    movement_date: string;
    batch_number?: string;
    expiry_date?: string;
  }): Promise<CostingResult> {
    try {
      const total_cost = params.quantity * params.unit_cost;
      
      // 1. Create cost layer (for FIFO)
      const { data: layer, error: layerError } = await supabase
        .from('cost_layers')
        .insert({
          product_id: params.product_id,
          warehouse_id: params.warehouse_id,
          layer_date: params.movement_date,
          reference_type: params.reference_type,
          reference_id: params.reference_id,
          quantity: params.quantity,
          unit_cost: params.unit_cost,
          total_cost: total_cost,
          remaining_quantity: params.quantity,
          consumed_quantity: 0,
          is_consumed: false
        })
        .select()
        .single();
      
      if (layerError) throw layerError;
      
      // 2. Create inventory movement
      await this.createMovement({
        ...params,
        movement_type: 'purchase',
        total_cost,
        cost_layer_ids: [layer.id]
      });
      
      // 3. Update inventory level
      await this.updateInventoryLevel(
        params.product_id,
        params.warehouse_id,
        params.quantity,
        total_cost,
        'add'
      );
      
      return {
        success: true,
        unit_cost: params.unit_cost,
        total_cost,
        cost_layers: [layer],
        errors: []
      };
      
    } catch (error: any) {
      return {
        success: false,
        unit_cost: 0,
        total_cost: 0,
        errors: [error.message]
      };
    }
  }
  
  /**
   * Record inventory issue (consumes cost layers)
   */
  async recordIssue(params: {
    product_id: string;
    warehouse_id: string;
    quantity: number;
    reference_type: string;
    reference_id: string;
    movement_date: string;
    costing_method: CostingMethod;
    current_average_cost?: number;
  }): Promise<CostingResult> {
    try {
      let total_cost = 0;
      let unit_cost = 0;
      let consumedLayers: any[] = [];
      
      // Get costing method from product if not specified
      const method = params.costing_method;
      
      switch (method) {
        case 'fifo':
          const fifoResult = await this.consumeFIFOLayers(
            params.product_id,
            params.warehouse_id,
            params.quantity
          );
          if (!fifoResult.success) {
            return {
              success: false,
              unit_cost: 0,
              total_cost: 0,
              errors: fifoResult.errors
            };
          }
          total_cost = fifoResult.total_cost;
          consumedLayers = fifoResult.consumed_layers;
          unit_cost = total_cost / params.quantity;
          break;
        
        case 'weighted_average':
          const avgResult = await this.consumeWeightedAverage(
            params.product_id,
            params.warehouse_id,
            params.quantity
          );
          if (!avgResult.success) {
            return {
              success: false,
              unit_cost: 0,
              total_cost: 0,
              errors: avgResult.errors
            };
          }
          total_cost = avgResult.total_cost;
          unit_cost = avgResult.unit_cost;
          break;
        
        case 'standard_cost':
          unit_cost = params.current_average_cost || 0;
          total_cost = unit_cost * params.quantity;
          break;
        
        default:
          return {
            success: false,
            unit_cost: 0,
            total_cost: 0,
            errors: ['Invalid costing method']
          };
      }
      
      // Create inventory movement
      await this.createMovement({
        ...params,
        movement_type: 'sale',
        unit_cost,
        total_cost,
        cost_layer_ids: consumedLayers.map(l => l.layer_id)
      });
      
      // Update inventory level
      await this.updateInventoryLevel(
        params.product_id,
        params.warehouse_id,
        -params.quantity,
        -total_cost,
        'subtract'
      );
      
      return {
        success: true,
        unit_cost,
        total_cost,
        errors: []
      };
      
    } catch (error: any) {
      return {
        success: false,
        unit_cost: 0,
        total_cost: 0,
        errors: [error.message]
      };
    }
  }
  
  /**
   * Consume FIFO layers
   */
  private async consumeFIFOLayers(
    product_id: string,
    warehouse_id: string,
    quantity_needed: number
  ): Promise<ConsumptionResult> {
    const consumed_layers: any[] = [];
    let remaining_needed = quantity_needed;
    let total_cost = 0;
    
    // Get available layers ordered by date (oldest first)
    const { data: layers, error } = await supabase
      .from('cost_layers')
      .select('*')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .gt('remaining_quantity', 0)
      .order('layer_date', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      return { success: false, consumed_layers: [], total_cost: 0, errors: [error.message] };
    }
    
    if (!layers || layers.length === 0) {
      return { 
        success: false, 
        consumed_layers: [], 
        total_cost: 0, 
        errors: ['No inventory available (no cost layers found)'] 
      };
    }
    
    // Consume from layers
    for (const layer of layers) {
      if (remaining_needed <= 0) break;
      
      const available = layer.remaining_quantity;
      const to_consume = Math.min(available, remaining_needed);
      
      const layer_cost = to_consume * layer.unit_cost;
      total_cost += layer_cost;
      
      consumed_layers.push({
        layer_id: layer.id,
        quantity: to_consume,
        unit_cost: layer.unit_cost,
        total_cost: layer_cost
      });
      
      remaining_needed -= to_consume;
      
      // Update layer
      await supabase
        .from('cost_layers')
        .update({
          remaining_quantity: available - to_consume,
          consumed_quantity: layer.consumed_quantity + to_consume,
          is_consumed: (available - to_consume) <= 0,
          consumed_at: (available - to_consume) <= 0 ? new Date().toISOString() : null
        })
        .eq('id', layer.id);
    }
    
    if (remaining_needed > 0) {
      return {
        success: false,
        consumed_layers,
        total_cost,
        errors: [`Insufficient inventory. Needed ${quantity_needed}, available ${quantity_needed - remaining_needed}`]
      };
    }
    
    return {
      success: true,
      consumed_layers,
      total_cost,
      errors: []
    };
  }
  
  /**
   * Consume using weighted average cost
   */
  private async consumeWeightedAverage(
    product_id: string,
    warehouse_id: string,
    quantity: number
  ): Promise<CostingResult> {
    // Get current inventory level
    const { data: level, error } = await supabase
      .from('inventory_levels')
      .select('quantity_on_hand, average_cost')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .single();
    
    if (error) {
      return { success: false, unit_cost: 0, total_cost: 0, errors: [error.message] };
    }
    
    if (!level || level.quantity_on_hand < quantity) {
      return {
        success: false,
        unit_cost: 0,
        total_cost: 0,
        errors: [`Insufficient inventory. Available: ${level?.quantity_on_hand || 0}`]
      };
    }
    
    const unit_cost = level.average_cost || 0;
    const total_cost = unit_cost * quantity;
    
    return {
      success: true,
      unit_cost,
      total_cost,
      errors: []
    };
  }
  
  /**
   * Update weighted average cost on receipt
   */
  async updateWeightedAverageCost(
    product_id: string,
    warehouse_id: string,
    new_quantity: number,
    new_unit_cost: number
  ): Promise<number> {
    const { data: level } = await supabase
      .from('inventory_levels')
      .select('quantity_on_hand, average_cost')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .single();
    
    const current_qty = level?.quantity_on_hand || 0;
    const current_avg = level?.average_cost || 0;
    
    // Weighted average formula
    const total_value = (current_qty * current_avg) + (new_quantity * new_unit_cost);
    const total_quantity = current_qty + new_quantity;
    const new_average = total_quantity > 0 ? total_value / total_quantity : 0;
    
    // Update product's average cost
    await supabase
      .from('inventory_products')
      .update({ average_cost: new_average })
      .eq('id', product_id);
    
    return new_average;
  }
  
  /**
   * Create inventory movement record
   */
  private async createMovement(params: {
    product_id: string;
    warehouse_id: string;
    movement_type: InventoryMovementType;
    movement_date: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    reference_type: string;
    reference_id: string;
    cost_layer_ids?: string[];
  }): Promise<void> {
    await supabase
      .from('inventory_movements')
      .insert({
        company_id: this.companyId,
        product_id: params.product_id,
        warehouse_id: params.warehouse_id,
        movement_type: params.movement_type,
        movement_date: params.movement_date,
        quantity: params.quantity,
        unit_cost: params.unit_cost,
        total_cost: params.total_cost,
        reference_type: params.reference_type,
        reference_id: params.reference_id,
        cost_layer_ids: params.cost_layer_ids
      });
  }
  
  /**
   * Update inventory level
   */
  private async updateInventoryLevel(
    product_id: string,
    warehouse_id: string,
    quantity_change: number,
    value_change: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    // Check if level exists
    const { data: existing } = await supabase
      .from('inventory_levels')
      .select('*')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .single();
    
    if (existing) {
      // Update existing
      const new_qty = existing.quantity_on_hand + quantity_change;
      const new_value = existing.total_value + value_change;
      const new_avg = new_qty > 0 ? new_value / new_qty : 0;
      
      await supabase
        .from('inventory_levels')
        .update({
          quantity_on_hand: new_qty,
          quantity_available: new_qty - existing.quantity_reserved,
          average_cost: new_avg,
          total_value: new_value,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new level
      await supabase
        .from('inventory_levels')
        .insert({
          product_id,
          warehouse_id,
          quantity_on_hand: quantity_change,
          quantity_reserved: 0,
          quantity_available: quantity_change,
          average_cost: quantity_change > 0 ? value_change / quantity_change : 0,
          total_value: value_change
        });
    }
  }
  
  /**
   * Get inventory valuation summary
   */
  async getInventoryValuation(warehouse_id?: string): Promise<{
    product_id: string;
    quantity: number;
    average_cost: number;
    total_value: number;
  }[]> {
    let query = supabase
      .from('inventory_levels')
      .select('product_id, quantity_on_hand, average_cost, total_value')
      .gt('quantity_on_hand', 0);
    
    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }
    
    const { data, error } = await query;
    
    if (error) return [];
    
    return data?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity_on_hand,
      average_cost: item.average_cost,
      total_value: item.total_value
    })) || [];
  }
  
  /**
   * Calculate COGS for a given period
   */
  async calculateCOGS(
    start_date: string,
    end_date: string,
    product_id?: string
  ): Promise<number> {
    let query = supabase
      .from('inventory_movements')
      .select('total_cost')
      .eq('company_id', this.companyId)
      .in('movement_type', ['sale', 'production_out'])
      .gte('movement_date', start_date)
      .lte('movement_date', end_date);
    
    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    
    const { data, error } = await query;
    
    if (error) return 0;
    
    return data?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
  }
}

// Factory function
export function createCostingEngine(companyId: string): InventoryCostingEngine {
  return new InventoryCostingEngine(companyId);
}
