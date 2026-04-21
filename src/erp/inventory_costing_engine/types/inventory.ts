/**
 * INVENTORY COSTING ENGINE - TYPES
 * Multi-warehouse inventory with costing methods
 */

export type CostingMethod = 'fifo' | 'weighted_average' | 'standard_cost';
export type InventoryMovementType = 
  | 'purchase'           // Receipt from supplier
  | 'purchase_return'    // Return to supplier
  | 'sale'               // Issue to customer
  | 'sale_return'        // Return from customer
  | 'adjustment'         // Inventory adjustment
  | 'transfer_in'        // Transfer from warehouse
  | 'transfer_out'       // Transfer to warehouse
  | 'production_in'      // Manufactured item receipt
  | 'production_out'     // Raw material consumption
  | 'opening_balance';   // Initial inventory

// Warehouse/Warehouse
export interface Warehouse {
  id: string;
  company_id: string;
  code: string;
  name: string;
  location?: string;
  manager_id?: string;
  is_active: boolean;
  is_default: boolean;
  allow_negative_stock: boolean;
  cost_center_id?: string; // For cost allocation
  created_at: string;
  updated_at: string;
}

// Product with inventory tracking
export interface InventoryProduct {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  category_id?: string;
  
  // Costing
  costing_method: CostingMethod;
  standard_cost?: number; // For standard costing
  
  // Current valuation
  average_cost: number; // Weighted average
  last_purchase_price: number;
  
  // Tracking
  track_expiry: boolean;
  track_batches: boolean;
  
  // Units
  unit_of_measure: string;
  weight?: number;
  
  // Status
  is_active: boolean;
  is_inventory_item: boolean; // Some products may be non-stock
  
  created_at: string;
  updated_at: string;
}

// Inventory levels per warehouse
export interface InventoryLevel {
  id: string;
  product_id: string;
  warehouse_id: string;
  
  // Quantities
  quantity_on_hand: number;
  quantity_reserved: number; // Reserved for orders
  quantity_available: number; // On hand - reserved
  
  // Valuation
  average_cost: number;
  total_value: number;
  
  updated_at: string;
}

// Cost Layer for FIFO
export interface CostLayer {
  id: string;
  product_id: string;
  warehouse_id: string;
  
  // Layer info
  layer_date: string;
  reference_type: string;
  reference_id: string;
  
  // Costs
  quantity: number;
  unit_cost: number;
  total_cost: number;
  
  // Consumption tracking
  remaining_quantity: number;
  consumed_quantity: number;
  
  // Status
  is_consumed: boolean;
  consumed_at?: string;
  
  created_at: string;
}

// Inventory Movement (every transaction creates one)
export interface InventoryMovement {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  
  // Movement details
  movement_type: InventoryMovementType;
  movement_date: string;
  
  // Quantities
  quantity: number;
  unit_cost: number;
  total_cost: number;
  
  // References
  reference_type: string;
  reference_id: string;
  reference_line_id?: string;
  
  // For transfers
  source_warehouse_id?: string;
  destination_warehouse_id?: string;
  
  // For costing
  cost_layer_ids?: string[]; // Which layers were consumed
  
  // Batch/Expiry info
  batch_number?: string;
  expiry_date?: string;
  
  // Audit
  created_by: string;
  created_at: string;
  
  // Accounting link
  journal_entry_id?: string;
}

// Batch tracking for pharmacies
export interface InventoryBatch {
  id: string;
  product_id: string;
  warehouse_id: string;
  
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  
  // Quantities
  initial_quantity: number;
  remaining_quantity: number;
  
  // Costs
  unit_cost: number;
  
  // Status
  status: 'active' | 'expired' | 'consumed';
  
  created_at: string;
}

// Bill of Materials for manufacturing/restaurants
export interface BillOfMaterial {
  id: string;
  company_id: string;
  product_id: string; // Finished product
  version: string;
  is_active: boolean;
  
  // Components
  components: BOMComponent[];
  
  // Standard costs
  standard_labor_cost: number;
  standard_overhead_cost: number;
  standard_total_cost: number;
  
  // Yield
  expected_yield_quantity: number;
  expected_yield_percentage: number;
  
  created_at: string;
  updated_at: string;
}

export interface BOMComponent {
  id: string;
  bom_id: string;
  product_id: string; // Component product
  
  // Quantities
  quantity_required: number;
  unit_of_measure: string;
  wastage_percentage: number;
  
  // Costing
  standard_cost: number;
  
  // For restaurants: can substitute
  is_optional: boolean;
  substitution_allowed: boolean;
  
  line_order: number;
}

// Production Order (for restaurants/manufacturing)
export interface ProductionOrder {
  id: string;
  company_id: string;
  bom_id: string;
  
  // Production details
  order_number: string;
  order_date: string;
  planned_quantity: number;
  actual_quantity?: number;
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  
  // Costs
  actual_material_cost: number;
  actual_labor_cost: number;
  actual_overhead_cost: number;
  actual_total_cost: number;
  
  // Variances
  material_variance: number;
  labor_variance: number;
  overhead_variance: number;
  
  // Warehouse
  source_warehouse_id: string;
  destination_warehouse_id: string;
  
  // Links
  journal_entry_id?: string;
  
  created_at: string;
  completed_at?: string;
}

// Inventory adjustment
export interface InventoryAdjustment {
  id: string;
  company_id: string;
  warehouse_id: string;
  product_id: string;
  
  // Adjustment details
  adjustment_date: string;
  adjustment_type: 'count' | 'damage' | 'expiry' | 'system';
  
  // Quantities
  quantity_before: number;
  quantity_after: number;
  quantity_difference: number;
  
  // Value impact
  unit_cost: number;
  value_impact: number;
  
  // Reason
  reason: string;
  reference_number?: string;
  
  // Approval
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  
  // Accounting
  expense_account_id?: string; // For loss adjustments
  journal_entry_id?: string;
  
  created_at: string;
}

// Inventory valuation summary
export interface InventoryValuation {
  product_id: string;
  warehouse_id: string;
  
  // Quantities
  quantity: number;
  
  // Valuation by method
  fifo_value: number;
  average_value: number;
  standard_value: number;
  
  // Layers summary
  layer_count: number;
  oldest_layer_date?: string;
}

// Stock transfer between warehouses
export interface StockTransfer {
  id: string;
  company_id: string;
  
  transfer_number: string;
  transfer_date: string;
  
  source_warehouse_id: string;
  destination_warehouse_id: string;
  
  status: 'draft' | 'shipped' | 'received' | 'cancelled';
  
  // Lines
  items: StockTransferItem[];
  
  // Tracking
  shipping_reference?: string;
  received_by?: string;
  received_at?: string;
  
  created_at: string;
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  
  quantity_shipped: number;
  quantity_received?: number;
  
  unit_cost: number;
  batch_number?: string;
}

// Reorder point configuration
export interface ReorderPoint {
  id: string;
  product_id: string;
  warehouse_id: string;
  
  minimum_quantity: number;
  maximum_quantity: number;
  reorder_quantity: number;
  
  preferred_supplier_id?: string;
  
  is_active: boolean;
  updated_at: string;
}
