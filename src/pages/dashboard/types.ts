export type DashboardTab = 'pos' | 'orders' | 'menu' | 'delivery' | 'shifts' | 'qr' | 'waiter' | 'stats' | 'settings' | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'staff' | 'notifications' | 'financials' | 'overheads' | 'customer_accounts' | 'sales_returns' | 'supplier_accounts' | 'inventory_receipts' | 'manual_journal' | 'projects' | 'chart_of_accounts' | 'treasury' | 'accounting_mapping';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
export type AgentStatus = 'available' | 'busy' | 'offline';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  restaurant_id: string;
  sort_order: number;
  product_id?: string | null;
  inventory_mode?: 'none' | 'direct' | 'recipe';
  product_type?: 'inventory' | 'manufactured';
  pricing_method?: 'fixed' | 'cost_plus';
  profit_margin_percent?: number;
  calculated_cost_price?: number;
  stock_quantity?: number;
}

export interface OrderItem {
  menu_item_id?: string | null;
  product_id?: string | null;
  menu_item_name: string;
  menu_item_image: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  order_number: string;
  total: number;
  total_cost?: number;
  status: string;
  created_at: string;
  synced: boolean;
  items: OrderItem[];
  table_number: number | null;
  discount: number;
  notes: string;
  customer_name: string;
  order_type: OrderType;
  delivery_agent_id: string | null;
  delivery_address: string;
  customer_phone: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  tracking_token: string | null;
}

export interface WaiterCall {
  id: string;
  table_info: string;
  acknowledged: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  status: string;
  subscription_end: string | null;
  logo_url: string | null;
  currency: string;
  license_key: string | null;
  business_type: string;
  accounting_standard?: string;
  inventory_method?: string;
  inventory_system?: string;
}

export interface HeldInvoice {
  id: string;
  label: string;
  cart: { item: MenuItem; qty: number; qtyText?: string; unitMode?: string }[];
  tableNumber: string;
  customerName: string;
  notes: string;
  discount: string;
  discountType: 'percent' | 'fixed';
  orderType: OrderType;
  deliveryAddress: string;
  customerPhone: string;
  deliveryAgentId: string;
  timestamp: number;
}

export interface DeliveryAgent {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  status: AgentStatus;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  total_sales: number;
  total_orders: number;
  notes: string;
  status: 'open' | 'closed';
}

export const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; next?: OrderStatus }> = {
  pending: { label: 'قيد الانتظار', className: 'status-pending', next: 'preparing' },
  preparing: { label: 'قيد التحضير', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', next: 'ready' },
  ready: { label: 'جاهز للتسليم', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', next: 'completed' },
  completed: { label: 'مكتمل', className: 'status-active' },
  cancelled: { label: 'ملغي', className: 'status-suspended' },
};

export const AGENT_STATUS_CONFIG: Record<AgentStatus, { label: string; color: string }> = {
  available: { label: 'متاح', color: 'text-success' },
  busy: { label: 'مشغول', color: 'text-warning' },
  offline: { label: 'غير متصل', color: 'text-muted-foreground' },
};

export const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: string }> = {
  dine_in: { label: 'داخل المحل', icon: '🪑' },
  takeaway: { label: 'تيك أواي', icon: '🛍️' },
  delivery: { label: 'ديليفري', icon: '🛵' },
  pickup: { label: 'استلام', icon: '🏬' },
};

export const EMOJI_OPTIONS = ['🍔', '🍕', '🥗', '🍗', '🍟', '🍝', '🧃', '🍰', '🥩', '🌯', '☕', '🍦', '🥤', '🌮', '🍣', '🥘', '🧁', '🍩', '🫕', '🥙', '🍱', '🧆', '🍛', '🫔', '🥐', '🍞'];

export interface Project {
  id: string;
  restaurant_id: string;
  name: string;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status: 'active' | 'completed' | 'suspended';
  created_at: string;
}

export interface ProjectBlock {
  id: string;
  project_id: string;
  name: string;
  estimated_cost?: number;
  created_at: string;
}
