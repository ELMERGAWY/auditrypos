/**
 * RESTAURANT OPERATIONS MODULE
 * Specialized workflows for restaurants with recipe costing
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  POSIntegrationService, 
  createPOSIntegration,
  POSOrderContext 
} from '../../pos_engine/services/posIntegration';

export interface RestaurantOrderInput {
  company_id: string;
  warehouse_id: string;
  customer_id?: string;
  table_number?: string;
  items: {
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }[];
  payment_method: 'cash' | 'card' | 'other';
  amount_paid: number;
  created_by: string;
}

export interface RecipeCostingResult {
  menu_item_id: string;
  menu_item_name: string;
  theoretical_cost: number;
  actual_cost: number;
  variance: number;
  variance_percent: number;
  components: {
    product_id: string;
    product_name: string;
    quantity_required: number;
    unit_cost: number;
    total_cost: number;
  }[];
}

/**
 * Restaurant Operations Service
 * Handles restaurant-specific workflows including recipe costing
 */
export class RestaurantOperationsService {
  private posIntegration: POSIntegrationService;
  private companyId: string;
  private userId: string;
  
  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
    this.posIntegration = createPOSIntegration(companyId, userId);
  }
  
  /**
   * Process restaurant order with recipe costing
   */
  async processRestaurantOrder(input: RestaurantOrderInput): Promise<{
    success: boolean;
    invoice_id?: string;
    journal_entry_id?: string;
    recipe_costs?: RecipeCostingResult[];
    errors: string[];
  }> {
    try {
      // 1. Get current fiscal period
      const { data: period } = await supabase
        .from('fiscal_periods')
        .select('id')
        .eq('company_id', input.company_id)
        .eq('status', 'open')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!period) {
        return { success: false, errors: ['No open fiscal period found'] };
      }
      
      // 2. Calculate recipe costs for all items
      const recipeCosts: RecipeCostingResult[] = [];
      const itemsWithProducts: {
        product_id: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        warehouse_id: string;
        unit_cost: number;
        total_cost: number;
      }[] = [];
      
      for (const item of input.items) {
        const costing = await this.calculateRecipeCost(item.menu_item_id, item.quantity);
        recipeCosts.push(costing);
        
        // Map menu item to product for inventory
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('id, name, price, product_id')
          .eq('id', item.menu_item_id)
          .single();
        
        if (menuItem?.product_id) {
          itemsWithProducts.push({
            product_id: menuItem.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.quantity * item.unit_price,
            warehouse_id: input.warehouse_id,
            unit_cost: costing.actual_cost / item.quantity,
            total_cost: costing.actual_cost
          });
        }
      }
      
      // 3. Get account mappings
      const accounts = await this.getRestaurantAccounts(input.company_id);
      if (!accounts) {
        return { success: false, errors: ['Chart of accounts not configured'] };
      }
      
      // 4. Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const total_cogs = recipeCosts.reduce((sum, rc) => sum + rc.actual_cost, 0);
      const tax_amount = 0; // Add tax calculation
      const total_amount = subtotal + tax_amount;
      
      // 5. Build POS context
      const posContext: POSOrderContext = {
        company_id: input.company_id,
        fiscal_period_id: period.id,
        warehouse_id: input.warehouse_id,
        customer_id: input.customer_id,
        order_date: new Date().toISOString().split('T')[0],
        payment_method: input.payment_method,
        items: itemsWithProducts,
        subtotal,
        discount_amount: 0,
        tax_amount,
        total_amount,
        amount_paid: input.amount_paid,
        cash_account_id: accounts.cash_account_id,
        receivable_account_id: accounts.receivable_account_id,
        revenue_account_id: accounts.revenue_account_id,
        cogs_account_id: accounts.cogs_account_id,
        inventory_account_id: accounts.inventory_account_id,
        created_by: input.created_by
      };
      
      // 6. Process through POS integration
      const result = await this.posIntegration.processOrder(posContext);
      
      return {
        success: result.success,
        invoice_id: result.invoice_id,
        journal_entry_id: result.journal_entry_id,
        recipe_costs: recipeCosts,
        errors: result.errors
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Restaurant order processing failed']
      };
    }
  }
  
  /**
   * Calculate recipe cost for a menu item
   */
  async calculateRecipeCost(menu_item_id: string, quantity: number = 1): Promise<RecipeCostingResult> {
    // 1. Get menu item details
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('id', menu_item_id)
      .single();
    
    if (!menuItem) {
      throw new Error('Menu item not found');
    }
    
    // 2. Get BOM for this menu item
    const { data: bom } = await supabase
      .from('bill_of_materials')
      .select('id, standard_total_cost, expected_yield_quantity')
      .eq('product_id', menu_item_id)
      .eq('is_active', true)
      .single();
    
    const theoretical_cost = (bom?.standard_total_cost || 0) * quantity;
    
    // 3. Get BOM components
    const { data: components } = await supabase
      .from('bom_components')
      .select(`
        quantity_required,
        product:product_id (id, name, average_cost)
      `)
      .eq('bom_id', bom?.id);
    
    let actual_cost = 0;
    const componentDetails: RecipeCostingResult['components'] = [];
    
    if (components) {
      for (const comp of components) {
        const unit_cost = comp.product?.average_cost || 0;
        const required_qty = comp.quantity_required * quantity;
        const total_cost = unit_cost * required_qty;
        actual_cost += total_cost;
        
        componentDetails.push({
          product_id: comp.product?.id,
          product_name: comp.product?.name,
          quantity_required: required_qty,
          unit_cost,
          total_cost
        });
      }
    }
    
    // 4. Calculate variance
    const variance = actual_cost - theoretical_cost;
    const variance_percent = theoretical_cost > 0 ? (variance / theoretical_cost) * 100 : 0;
    
    return {
      menu_item_id,
      menu_item_name: menuItem.name,
      theoretical_cost,
      actual_cost,
      variance,
      variance_percent,
      components: componentDetails
    };
  }
  
  /**
   * Get restaurant-specific account mappings
   */
  private async getRestaurantAccounts(company_id: string): Promise<{
    cash_account_id: string;
    receivable_account_id: string;
    revenue_account_id: string;
    cogs_account_id: string;
    inventory_account_id: string;
  } | null> {
    // Get accounts by code
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('company_id', company_id)
      .in('code', ['1.01.001', '1.01.003', '4.01', '5.01', '1.01.004']);
    
    if (!accounts || accounts.length === 0) return null;
    
    const map = Object.fromEntries(accounts.map(a => [a.code, a.id]));
    
    return {
      cash_account_id: map['1.01.001'],
      receivable_account_id: map['1.01.003'],
      revenue_account_id: map['4.01'],
      cogs_account_id: map['5.01'],
      inventory_account_id: map['1.01.004']
    };
  }
  
  /**
   * Update recipe standard costs based on actual costs
   */
  async updateRecipeStandardCosts(): Promise<{
    updated: number;
    details: { menu_item_id: string; old_cost: number; new_cost: number }[];
  }> {
    const details: { menu_item_id: string; old_cost: number; new_cost: number }[] = [];
    let updated = 0;
    
    // Get all active BOMs
    const { data: boms } = await supabase
      .from('bill_of_materials')
      .select('id, product_id, standard_total_cost')
      .eq('is_active', true);
    
    if (!boms) return { updated: 0, details: [] };
    
    for (const bom of boms) {
      // Calculate new standard cost
      const { data: components } = await supabase
        .from('bom_components')
        .select(`
          quantity_required,
          product:product_id (average_cost)
        `)
        .eq('bom_id', bom.id);
      
      let new_cost = 0;
      if (components) {
        new_cost = components.reduce((sum, comp) => {
          return sum + (comp.quantity_required * (comp.product?.average_cost || 0));
        }, 0);
      }
      
      if (Math.abs(new_cost - bom.standard_total_cost) > 0.01) {
        await supabase
          .from('bill_of_materials')
          .update({ standard_total_cost: new_cost })
          .eq('id', bom.id);
        
        details.push({
          menu_item_id: bom.product_id,
          old_cost: bom.standard_total_cost,
          new_cost
        });
        updated++;
      }
    }
    
    return { updated, details };
  }
}

// Export factory
export function createRestaurantOperations(companyId: string, userId: string): RestaurantOperationsService {
  return new RestaurantOperationsService(companyId, userId);
}
