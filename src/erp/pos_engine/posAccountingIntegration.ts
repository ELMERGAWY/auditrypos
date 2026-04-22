/**
 * POS ACCOUNTING INTEGRATION
 * Connects POS checkout to Professional Posting Engine
 * 
 * Features:
 * - Auto-create journal entries on sale
 * - Handle inventory COGS posting
 * - Support different business types
 * - Real-time financial impact
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  ProfessionalPostingEngine, 
  BusinessType,
  PostingResult 
} from '../posting_engine/professionalPostingEngine';

// ============================================================
// TYPES
// ============================================================

export interface POSCartItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  unit_type: 'kg' | 'g' | 'pcs' | 'box' | 'liter';
  unit_cost: number; // For inventory valuation
  total_price: number;
  total_cost: number;
  warehouse_id?: string;
}

export interface POSCheckoutData {
  restaurant_id: string;
  user_id: string;
  business_type: BusinessType;
  customer_name?: string;
  payment_method: 'cash' | 'card' | 'mobile_wallet';
  items: POSCartItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  warehouse_id: string;
}

export interface POSCheckoutResult {
  success: boolean;
  sale_id?: string;
  invoice_number?: string;
  journal_entry_id?: string;
  cogs_entry_id?: string;
  errors: string[];
}

// ============================================================
// POS ACCOUNTING SERVICE
// ============================================================

export class POSAccountingService {
  private restaurantId: string;
  private userId: string;
  private businessType: BusinessType;
  private postingEngine: ProfessionalPostingEngine;

  constructor(restaurantId: string, userId: string, businessType: BusinessType) {
    this.restaurantId = restaurantId;
    this.userId = userId;
    this.businessType = businessType;
    this.postingEngine = new ProfessionalPostingEngine(restaurantId, userId, businessType);
  }

  /**
   * Process POS Checkout
   * Main entry point - creates sale record + accounting entries
   */
  async processCheckout(data: POSCheckoutData): Promise<POSCheckoutResult> {
    const errors: string[] = [];

    try {
      // 1. Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // 2. Create sale record (business type specific)
      let saleId: string;
      
      if (this.businessType === 'services') {
        // Services: No inventory, just service invoice
        const { data: invoice, error } = await supabase
          .from('service_invoices')
          .insert({
            restaurant_id: this.restaurantId,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().split('T')[0],
            customer_name: data.customer_name || 'عميل نقدي',
            service_description: `فاتورة POS #${invoiceNumber}`,
            amount: data.subtotal,
            tax_amount: data.tax_amount,
            total_amount: data.total_amount,
            amount_paid: data.total_amount,
            payment_method: data.payment_method,
            status: 'paid'
          })
          .select('id')
          .single();

        if (error) throw error;
        saleId = invoice.id;

        // 3. Post accounting entry (Services - NO COGS!)
        const postingResult = await this.postingEngine.postServiceInvoice({
          invoice_id: saleId,
          invoice_number: invoiceNumber,
          customer_name: data.customer_name || 'عميل نقدي',
          amount: data.subtotal,
          tax_amount: data.tax_amount,
          total_amount: data.total_amount,
          payment_method: data.payment_method,
          date: new Date().toISOString().split('T')[0]
        });

        if (!postingResult.success) {
          errors.push(...postingResult.errors);
        }

        return {
          success: errors.length === 0,
          sale_id: saleId,
          invoice_number: invoiceNumber,
          journal_entry_id: postingResult.entry_id,
          errors
        };

      } else {
        // Retail/Restaurant/Pharmacy: With inventory and COGS
        const { data: sale, error } = await supabase
          .from('retail_sales')
          .insert({
            restaurant_id: this.restaurantId,
            invoice_number: invoiceNumber,
            sale_date: new Date().toISOString().split('T')[0],
            customer_name: data.customer_name || 'عميل نقدي',
            subtotal: data.subtotal,
            discount_amount: data.discount_amount,
            tax_amount: data.tax_amount,
            total_amount: data.total_amount,
            payment_method: data.payment_method,
            warehouse_id: data.warehouse_id
          })
          .select('id')
          .single();

        if (error) throw error;
        saleId = sale.id;

        // 3. Create sale lines
        const saleLines = data.items.map(item => ({
          sale_id: saleId,
          item_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          total_price: item.total_price,
          total_cost: item.total_cost
        }));

        const { error: linesError } = await supabase
          .from('retail_sale_lines')
          .insert(saleLines);

        if (linesError) throw linesError;

        // 4. Update inventory stock
        await this.updateInventoryStock(data.items, data.warehouse_id);

        // 5. Post accounting entries
        const postingResult = await this.postingEngine.postRetailSale({
          sale_id: saleId,
          invoice_number: invoiceNumber,
          total_amount: data.total_amount,
          subtotal: data.subtotal,
          tax_amount: data.tax_amount,
          payment_method: data.payment_method,
          items: data.items.map(item => ({
            item_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost
          })),
          date: new Date().toISOString().split('T')[0]
        });

        if (!postingResult.success) {
          errors.push(...postingResult.errors);
        }

        // 6. Record cost layers consumption (FIFO tracking)
        await this.recordCostLayersConsumption(saleId, data.items);

        return {
          success: errors.length === 0,
          sale_id: saleId,
          invoice_number: invoiceNumber,
          journal_entry_id: postingResult.entry_id,
          errors
        };
      }

    } catch (error: any) {
      errors.push(error.message);
      return { success: false, errors };
    }
  }

  /**
   * Process Restaurant Order
   * Special handling for BOM/Recipe costing
   */
  async processRestaurantOrder(params: {
    order_number: string;
    table_number: string;
    items: {
      menu_item_id: string;
      menu_item_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      recipe_components: {
        inventory_item_id: string;
        component_name: string;
        required_qty: number;
        unit_cost: number;
      }[];
    }[];
    payment_method: 'cash' | 'card';
  }): Promise<POSCheckoutResult> {
    const errors: string[] = [];

    try {
      // Calculate theoretical and actual COGS
      const totalRevenue = params.items.reduce((sum, item) => sum + item.total_price, 0);
      
      // Calculate theoretical COGS from recipe
      const theoreticalCOGS = params.items.reduce((sum, item) => {
        const itemCost = item.recipe_components.reduce((c, comp) => 
          c + (comp.required_qty * comp.unit_cost * item.quantity), 0
        );
        return sum + itemCost;
      }, 0);

      // Create order
      const { data: order, error } = await supabase
        .from('restaurant_orders')
        .insert({
          restaurant_id: this.restaurantId,
          order_number: params.order_number,
          table_number: params.table_number,
          subtotal: totalRevenue,
          total_amount: totalRevenue,
          payment_method: params.payment_method
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create order lines
      const orderLines = params.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        theoretical_cogs: item.recipe_components.reduce((sum, comp) => 
          sum + (comp.required_qty * comp.unit_cost * item.quantity), 0
        ),
        actual_cogs: 0 // Will be calculated from inventory consumption
      }));

      await supabase.from('restaurant_order_lines').insert(orderLines);

      // Record inventory consumption for each component
      const actualCOGSItems: { menu_item_name: string; quantity: number; theoretical_cogs: number; actual_cogs: number; components: any[] }[] = [];
      
      for (const item of params.items) {
        const componentsConsumed = [];
        
        for (const component of item.recipe_components) {
          const consumedQty = component.required_qty * item.quantity;
          
          // Record consumption
          await supabase.from('inventory_consumption').insert({
            restaurant_id: this.restaurantId,
            order_id: order.id,
            item_id: component.inventory_item_id,
            consumed_qty: consumedQty,
            unit_cost: component.unit_cost,
            total_cost: consumedQty * component.unit_cost
          });

          // Update stock
          await supabase.rpc('decrease_stock', {
            p_item_id: component.inventory_item_id,
            p_warehouse_id: params.table_number, // Default warehouse
            p_quantity: consumedQty
          });

          componentsConsumed.push({
            inventory_item_id: component.inventory_item_id,
            item_name: component.component_name,
            consumed_qty: consumedQty,
            unit_cost: component.unit_cost
          });
        }

        actualCOGSItems.push({
          menu_item_name: item.menu_item_name,
          quantity: item.quantity,
          theoretical_cogs: item.recipe_components.reduce((sum, comp) => 
            sum + (comp.required_qty * comp.unit_cost * item.quantity), 0
          ),
          actual_cogs: item.recipe_components.reduce((sum, comp) => 
            sum + (comp.required_qty * comp.unit_cost * item.quantity), 0
          ),
          components: componentsConsumed
        });
      }

      // Post accounting entries
      const postingResult = await this.postingEngine.postRestaurantOrder({
        order_id: order.id,
        order_number: params.order_number,
        table_number: params.table_number,
        total_amount: totalRevenue,
        items: actualCOGSItems,
        payment_method: params.payment_method,
        date: new Date().toISOString().split('T')[0]
      });

      if (!postingResult.success) {
        errors.push(...postingResult.errors);
      }

      return {
        success: errors.length === 0,
        sale_id: order.id,
        invoice_number: params.order_number,
        journal_entry_id: postingResult.entry_id,
        errors
      };

    } catch (error: any) {
      errors.push(error.message);
      return { success: false, errors };
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = this.businessType === 'services' ? 'SVC' :
                   this.businessType === 'restaurant' ? 'RES' :
                   this.businessType === 'pharmacy' ? 'PHM' : 'POS';
    
    const { count } = await supabase
      .from('retail_sales')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', this.restaurantId)
      .gte('sale_date', `${year}-01-01`);

    const sequence = (count || 0) + 1;
    return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
  }

  private async updateInventoryStock(
    items: POSCartItem[],
    warehouseId: string
  ): Promise<void> {
    for (const item of items) {
      // Get current stock
      const { data: stock } = await supabase
        .from('inventory_stock')
        .select('id, quantity_on_hand')
        .eq('item_id', item.product_id)
        .eq('warehouse_id', warehouseId)
        .single();

      if (stock) {
        // Update existing stock
        await supabase
          .from('inventory_stock')
          .update({
            quantity_on_hand: stock.quantity_on_hand - item.quantity,
            last_movement_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', stock.id);
      }
    }
  }

  private async recordCostLayersConsumption(
    saleId: string,
    items: POSCartItem[]
  ): Promise<void> {
    // FIFO cost layer consumption tracking
    for (const item of items) {
      // Get cost layers for this item
      const { data: layers } = await supabase
        .from('cost_layers')
        .select('*')
        .eq('item_id', item.product_id)
        .gt('remaining_qty', 0)
        .order('layer_date', { ascending: true });

      let remainingToConsume = item.quantity;
      const consumedLayers: string[] = [];

      for (const layer of layers || []) {
        if (remainingToConsume <= 0) break;

        const consumeFromLayer = Math.min(remainingToConsume, layer.remaining_qty);
        
        // Update layer
        await supabase
          .from('cost_layers')
          .update({
            remaining_qty: layer.remaining_qty - consumeFromLayer,
            is_consumed: layer.remaining_qty - consumeFromLayer <= 0
          })
          .eq('id', layer.id);

        consumedLayers.push(layer.id);
        remainingToConsume -= consumeFromLayer;
      }

      // Update sale line with cost layers used
      await supabase
        .from('retail_sale_lines')
        .update({ cost_layers_used: consumedLayers })
        .eq('sale_id', saleId)
        .eq('item_id', item.product_id);
    }
  }

  /**
   * Get real-time financial impact of cart
   */
  async calculateCartImpact(items: POSCartItem[]): Promise<{
    revenue: number;
    cogs: number;
    gross_profit: number;
    margin: number;
  }> {
    const revenue = items.reduce((sum, item) => sum + item.total_price, 0);
    const cogs = items.reduce((sum, item) => sum + item.total_cost, 0);
    const gross_profit = revenue - cogs;
    const margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;

    return { revenue, cogs, gross_profit, margin };
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createPOSAccounting(
  restaurantId: string,
  userId: string,
  businessType: BusinessType
): POSAccountingService {
  return new POSAccountingService(restaurantId, userId, businessType);
}

// ============================================================
// REACT HOOK FOR POS
// ============================================================

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function usePOSAccounting() {
  const { restaurant, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<POSCheckoutResult | null>(null);

  const processCheckout = useCallback(async (data: Omit<POSCheckoutData, 'restaurant_id' | 'user_id'>) => {
    if (!restaurant?.id || !user?.id) {
      return { success: false, errors: ['Not authenticated'] };
    }

    setIsProcessing(true);
    
    const service = createPOSAccounting(
      restaurant.id,
      user.id,
      restaurant.accounting_config?.business_type || 'retail'
    );

    const result = await service.processCheckout({
      ...data,
      restaurant_id: restaurant.id,
      user_id: user.id
    });

    setLastResult(result);
    setIsProcessing(false);

    return result;
  }, [restaurant, user]);

  const calculateImpact = useCallback(async (items: POSCartItem[]) => {
    if (!restaurant?.id) return null;

    const service = createPOSAccounting(
      restaurant.id,
      'temp',
      restaurant.accounting_config?.business_type || 'retail'
    );

    return service.calculateCartImpact(items);
  }, [restaurant]);

  return {
    processCheckout,
    calculateImpact,
    isProcessing,
    lastResult
  };
}
