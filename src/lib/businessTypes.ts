// @ts-nocheck
export type BusinessType = 'restaurant' | 'retail' | 'wholesale' | 'warehouse' | 'cafe' | 'grocery' | 'pharmacy' | 'services' | 'shipping' | 'distribution' | 'hospital' | 'factory' | 'real_estate' | 'contracting' | 'finishing' | 'rental' | 'education' | 'law_firm' | 'marketing_agency' | 'gym' | 'beauty_salon' | 'auto_repair' | 'other';
export type BusinessCategory = 'food' | 'retail' | 'health' | 'services' | 'logistics' | 'other';
export type PosLayout = 'classic' | 'grid' | 'list' | 'compact' | 'restaurant' | 'retail' | 'grocery' | 'services' | 'pharmacy';
export type FeatureFlag = 
  | 'tables' | 'kitchen_display' | 'waiter_calls' | 'qr_menu' | 'reservations' | 'delivery'
  | 'barcode' | 'scale' | 'inventory' | 'layaway' | 'gift_cards' | 'loyalty' | 'customers' | 'customer_history'
  | 'credit' | 'installments' | 'price_tiers' | 'invoicing' | 'statements'
  | 'prescriptions' | 'insurance' | 'expiry_tracking'
  | 'service_tracking' | 'pickup_delivery' | 'status_board'
  | 'multi_unit' | 'recipes' | 'modifiers' | 'variants' | 'quick_sale' | 'kitchen'
  | 'purchase_invoices' | 'sales_orders' | 'purchase_orders' | 'crm';

// Business icons for items
const BUSINESS_ITEM_ICONS: Record<BusinessType, string[]> = {
  restaurant: ['🍔', '🍕', '🥗', '🍗', '🍟', '🍝', '🧃', '🍰', '🥩', '🌯', '☕', '🍦'],
  cafe: ['☕', '🥐', '🍰', '🧁', '🥤', '🍵', '🍪', '🥛', '🍩', '🫖', '🍫', '🧋'],
  retail: ['🛍️', '👕', '👟', '⌚', '🎧', '🧴', '🎒', '🕶️', '💼', '🏷️', '📦', '🧢'],
  wholesale: ['📦', '🚚', '🏷️', '🧴', '🛒', '📋', '🧰', '📚', '🪑', '🛍️', '🧃', '🥫'],
  grocery: ['🛒', '🥛', '🍞', '🥚', '🧀', '🍎', '🥫', '🧴', '🍚', '🧂', '🍪', '🧃'],
  warehouse: ['📦', '🏭', '🧱', '🪵', '🧰', '🚚', '🏷️', '🗂️', '🪜', '📋', '🔩', '⚙️'],
  pharmacy: ['💊', '🩹', '🧴', '🩺', '🧪', '🌡️', '🧼', '🦷', '👓', '📦', '🩻', '💉'],
  services: ['🧺', '🧼', '🧽', '🪛', '🔧', '💇', '🚗', '🧹', '🧯', '🪙', '📋', '🛎️'],
  distribution: ['🚚', '📦', '🚐', '📋', '🛒', '🏭', '🏗️', '⛽', '🛣️', '🏢', '🏷️', '📦'],
  shipping: ['🚢', '✈️', '🚚', '📦', '🗺️', '⚓', '🏢', '🏗️', '📦', '🏷️', '📦', '📋'],
  hospital: ['🏥', '💊', '🩺', '🚑', '💉', '🩹', '🌡️', '🦷', '🧪', '🧬', '🩸', '🩻'],
  factory: ['🏭', '🏗️', '⚙️', '🔩', '🛠️', '👷', '📦', '🏷️', '🧱', '🪵', '🎨', '👔'],
  real_estate: ['🏠', '🏢', '🔑', '🏠', '🏨', '🏰', '🏘️', '🏙️', '🏡', '🗺️', '📋', '🏗️'],
  contracting: ['🏗️', '🚧', '🏢', '🏗️', '📐', '🛠️', '🧱', '🪵', '🎨', '🚜', '👷', '📋'],
  finishing: ['🎨', '🖌️', '🛋️', '🏡', '📐', '🧱', '🪵', '🛠️', '🏠', '✨', '📋', '👔'],
  rental: ['🚗', '🚙', '🚚', '🚜', '🔑', '📋', '🛡️', '⚙️', '🛠️', '⛽', '🛣️', '🏢'],
  education: ['📚', '🎓', '🏫', '📝', '✏️', '🖍️', '🎨', '💻', '🧪', '🧬', '📏', '📐'],
  law_firm: ['⚖️', '📋', '💼', '🏢', '🏛️', '🖋️', '📜', '🛡️', '🗝️', '📅', '👔', '🏛️'],
  marketing_agency: ['📢', '🎨', '💻', '📸', '🎥', '📊', '📈', '📱', '✨', '🎯', '🤝', '🚀'],
  gym: ['💪', '🏋️', '🚴', '🧘', '👟', '🥤', '⏱️', '🥇', '🥊', '🥗', '🚿', '📱'],
  beauty_salon: ['✂️', '💅', '💄', '🧴', '💆', '✨', '💇', '🎨', '🧼', '🌸', '🪞', '🎀'],
  auto_repair: ['🔧', '🪛', '⚙️', '🚗', '🚙', '🏎️', '⛽', '🔋', '🧼', '🛞', '🛠️', '📋'],
  other: ['🏢', '📦', '🛍️', '🧰', '📋', '🏷️', '🪑', '🧴', '📚', '🪙', '⚙️', '🧺'],
};

// Auditry ERP: Enhanced Business Type Configuration
export interface BusinessTypeConfig {
  // Basic Info
  id: BusinessType;
  label: string;
  icon: string;
  description: string;
  category: BusinessCategory;
  
  // Visual Theme
  color: string;
  theme: {
    primary: string;
    accent: string;
    gradient: string;
    sidebarBg: string;
    sidebarText: string;
  };
  
  // POS Layout Configuration
  posLayout: {
    type: PosLayout;
    showTableGrid: boolean;
    showCategoriesSidebar: boolean;
    itemGridCols: 3 | 4 | 5 | 6;
    showItemImages: boolean;
    showPrices: boolean;
    cartPosition: 'right' | 'left' | 'bottom';
    showBarcodeScanner: boolean;
    showScale: boolean;
    quickActions: string[];
  };
  
  // Order Types supported
  orderTypes: {
    id: string;
    label: string;
    icon: string;
    color: string;
    requiresTable: boolean;
    requiresAddress: boolean;
    requiresPhone: boolean;
  }[];
  
  // Feature Flags
  features: FeatureFlag[];
  
  // Labels (i18n ready)
  labels: {
    menu: string;
    item: string;
    items: string;
    order: string;
    orders: string;
    customer: string;
    customers: string;
    inventory: string;
    category: string;
    checkout: string;
    receipt: string;
    table: string;
    tables: string;
    section: string;
    branch: string;
  };
  
  // Search Placeholders
  placeholders: {
    search: string;
    customer: string;
    notes: string;
    address: string;
  };
  
  // Default Settings
  defaults: {
    taxRate: number;
    serviceCharge: number;
    enableTax: boolean;
    priceIncludesTax: boolean;
    currency: string;
    allowCredit: boolean;
    requireCustomer: boolean;
  };
  
  // Tabs to show in dashboard
  tabs: string[];
  
  // Special fields for this business type
  specialFields?: {
    name: string;
    type: 'text' | 'number' | 'date' | 'select';
    label: string;
    required: boolean;
  }[];
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  restaurant: {
    id: 'restaurant',
    label: 'مطعم',
    icon: '🍽️',
    description: 'مطاعم، كافيهات، مطابخ سحابية',
    category: 'food',
    
    color: 'hsl(222, 47%, 11%)',
    theme: { 
      primary: '222 47% 11%', 
      accent: '215 25% 27%', 
      gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      sidebarBg: 'hsl(25 95% 53% / 0.05)',
      sidebarText: 'hsl(25 95% 53%)'
    },
    
    posLayout: {
      type: 'restaurant',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['split_bill', 'merge_tables', 'transfer_table', 'discount', 'void', 'hold']
    },
    
    orderTypes: [
      { id: 'dine_in', label: 'داخلي', icon: '🍽️', color: '#f97316', requiresTable: true, requiresAddress: false, requiresPhone: false },
      { id: 'takeaway', label: 'تيك أواي', icon: '🛍️', color: '#3b82f6', requiresTable: false, requiresAddress: false, requiresPhone: true },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#22c55e', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['tables', 'kitchen_display', 'waiter_calls', 'qr_menu', 'reservations', 'delivery', 'inventory', 'multi_unit', 'recipes', 'modifiers'],
    
    labels: {
      menu: 'القائمة',
      item: 'صنف',
      items: 'أصناف',
      order: 'طلب',
      orders: 'طلبات',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام الطلب',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في القائمة...',
      customer: 'اسم العميل',
      notes: 'ملاحظات الطلب...',
      address: 'عنوان التوصيل'
    },
    
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: false
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'guest_count', type: 'number', label: 'عدد الضيوف', required: false },
      { name: 'cooking_notes', type: 'text', label: 'تعليمات الطهي', required: false }
    ]
  },
  
  cafe: {
    id: 'cafe',
    label: 'كافيه',
    icon: '☕',
    description: 'كافيهات، مشروبات، حلويات',
    category: 'food',
    
    color: 'hsl(30, 70%, 40%)',
    theme: { 
      primary: '30 70% 40%', 
      accent: '25 60% 50%', 
      gradient: 'linear-gradient(135deg, hsl(30, 70%, 40%), hsl(25, 60%, 50%))',
      sidebarBg: 'hsl(30 70% 40% / 0.05)',
      sidebarText: 'hsl(30 70% 40%)'
    },
    
    posLayout: {
      type: 'restaurant',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 5,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['quick_sale', 'discount', 'hold', 'print']
    },
    
    orderTypes: [
      { id: 'dine_in', label: 'داخلي', icon: '🍽️', color: '#d97706', requiresTable: true, requiresAddress: false, requiresPhone: false },
      { id: 'takeaway', label: 'تيك أواي', icon: '🛍️', color: '#3b82f6', requiresTable: false, requiresAddress: false, requiresPhone: false },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#22c55e', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['tables', 'kitchen_display', 'waiter_calls', 'qr_menu', 'delivery', 'inventory', 'modifiers'],
    
    labels: {
      menu: 'القائمة',
      item: 'صنف',
      items: 'أصناف',
      order: 'طلب',
      orders: 'طلبات',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام الطلب',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في القائمة...',
      customer: 'اسم العميل',
      notes: 'ملاحظات الطلب...',
      address: 'عنوان التوصيل'
    },
    
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: false
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
  },
  
  retail: {
    id: 'retail',
    label: 'تجزئة',
    icon: '🏪',
    description: 'محلات ملابس، إلكترونيات، أحذية',
    category: 'retail',
    
    color: 'hsl(210, 80%, 50%)',
    theme: { 
      primary: '210 80% 50%', 
      accent: '200 70% 55%', 
      gradient: 'linear-gradient(135deg, hsl(210, 80%, 50%), hsl(200, 70%, 55%))',
      sidebarBg: 'hsl(210 80% 50% / 0.05)',
      sidebarText: 'hsl(210 80% 50%)'
    },
    
    posLayout: {
      type: 'retail',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 5,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['barcode', 'customer', 'discount', 'hold', 'layaway', 'gift_card']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏬', color: '#3b82f6', requiresTable: false, requiresAddress: false, requiresPhone: false },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#22c55e', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['barcode', 'inventory', 'customers', 'layaway', 'gift_cards', 'loyalty', 'variants', 'multi_unit'],
    
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'فاتورة',
      orders: 'فواتير',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام البيع',
      receipt: 'فاتورة',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في المنتجات أو الباركود...',
      customer: 'اسم العميل أو المشتري',
      notes: 'ملاحظات الفاتورة...',
      address: 'عنوان التسليم'
    },
    
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: false
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'size', type: 'select', label: 'المقاس', required: false },
      { name: 'color', type: 'select', label: 'اللون', required: false }
    ]
  },
  
  grocery: {
    id: 'grocery',
    label: 'بقالة / سوبر ماركت',
    icon: '🛒',
    description: 'سوبر ماركت، ميني ماركت، بقالة',
    category: 'retail',
    
    color: 'hsl(280, 65%, 50%)',
    theme: { 
      primary: '280 65% 50%', 
      accent: '300 60% 55%', 
      gradient: 'linear-gradient(135deg, hsl(280, 65%, 50%), hsl(300, 60%, 55%))',
      sidebarBg: 'hsl(280 65% 50% / 0.05)',
      sidebarText: 'hsl(280 65% 50%)'
    },
    
    posLayout: {
      type: 'grocery',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 6,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: true,
      quickActions: ['barcode', 'scale', 'customer', 'discount', 'hold', 'quick_return']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏬', color: '#a855f7', requiresTable: false, requiresAddress: false, requiresPhone: false }
    ],
    
    features: ['barcode', 'scale', 'expiry_tracking', 'inventory', 'loyalty', 'multi_unit', 'variants'],
    
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'طلب',
      orders: 'طلبات',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام الشراء',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في المنتجات أو الباركود...',
      customer: 'اسم العميل',
      notes: 'ملاحظات الطلب...',
      address: 'عنوان التسليم'
    },
    
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: false
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'expiry_date', type: 'date', label: 'تاريخ الصلاحية', required: false },
      { name: 'weight', type: 'number', label: 'الوزن', required: false }
    ]
  },
  
  pharmacy: {
    id: 'pharmacy',
    label: 'صيدلية',
    icon: '💊',
    description: 'صيدليات، مستلزمات طبية',
    category: 'health',
    
    color: 'hsl(170, 70%, 40%)',
    theme: { 
      primary: '170 70% 40%', 
      accent: '180 65% 45%', 
      gradient: 'linear-gradient(135deg, hsl(170, 70%, 40%), hsl(180, 65%, 45%))',
      sidebarBg: 'hsl(170 70% 40% / 0.05)',
      sidebarText: 'hsl(170 70% 40%)'
    },
    
    posLayout: {
      type: 'pharmacy',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['barcode', 'prescription', 'insurance', 'customer', 'discount', 'expiry_alert']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏬', color: '#14b8a6', requiresTable: false, requiresAddress: false, requiresPhone: false },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#22c55e', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['barcode', 'prescriptions', 'insurance', 'expiry_tracking', 'inventory', 'multi_unit'],
    
    labels: {
      menu: 'الأدوية',
      item: 'دواء',
      items: 'أدوية',
      order: 'طلب',
      orders: 'طلبات',
      customer: 'مريض',
      customers: 'المرضى',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام البيع',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في الأدوية أو الباركود...',
      customer: 'اسم المريض',
      notes: 'تعليمات الاستخدام...',
      address: 'عنوان التوصيل'
    },
    
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: true
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'prescription_number', type: 'text', label: 'رقم الروشتة', required: false },
      { name: 'insurance_id', type: 'text', label: 'رقم التأمين', required: false },
      { name: 'dosage', type: 'text', label: 'الجرعة', required: false }
    ]
  },
  
  wholesale: {
    id: 'wholesale',
    label: 'جملة',
    icon: '📦',
    description: 'تجار جملة، موزعين، وكلاء',
    category: 'logistics',
    
    color: 'hsl(142, 71%, 40%)',
    theme: { 
      primary: '142 71% 40%', 
      accent: '160 60% 45%', 
      gradient: 'linear-gradient(135deg, hsl(142, 71%, 40%), hsl(160, 60%, 45%))',
      sidebarBg: 'hsl(142 71% 40% / 0.05)',
      sidebarText: 'hsl(142 71% 40%)'
    },
    
    posLayout: {
      type: 'retail',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['customer', 'credit_limit', 'installments', 'discount', 'invoice', 'statement']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏬', color: '#22c55e', requiresTable: false, requiresAddress: false, requiresPhone: true },
      { id: 'delivery', label: 'توصيل', icon: '🚚', color: '#16a34a', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['credit', 'installments', 'price_tiers', 'invoicing', 'statements', 'inventory', 'multi_unit'],
    
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'فاتورة',
      orders: 'فواتير',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إصدار الفاتورة',
      receipt: 'فاتورة',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في المنتجات أو الباركود...',
      customer: 'اسم العميل أو التاجر',
      notes: 'ملاحظات الفاتورة...',
      address: 'عنوان التسليم'
    },
    
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'credit_limit', type: 'number', label: 'حد الائتمان', required: false },
      { name: 'payment_terms', type: 'select', label: 'شروط الدفع', required: false }
    ]
  },
  
  warehouse: {
    id: 'warehouse',
    label: 'مخزن / مستودع',
    icon: '🏭',
    description: 'مخازن، مستودعات، إدارة تخزين',
    category: 'logistics',
    
    color: 'hsl(0, 70%, 50%)',
    theme: { 
      primary: '0 70% 50%', 
      accent: '15 80% 55%', 
      gradient: 'linear-gradient(135deg, hsl(0, 70%, 50%), hsl(15, 80%, 55%))',
      sidebarBg: 'hsl(0 70% 50% / 0.05)',
      sidebarText: 'hsl(0 70% 50%)'
    },
    
    posLayout: {
      type: 'compact',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: true,
      quickActions: ['stock_in', 'stock_out', 'transfer', 'count', 'adjust']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏭', color: '#ef4444', requiresTable: false, requiresAddress: false, requiresPhone: false },
      { id: 'delivery', label: 'شحن', icon: '🚚', color: '#dc2626', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['inventory', 'multi_unit', 'variants'],
    
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'أمر شحن',
      orders: 'أوامر الشحن',
      customer: 'جهة التسليم',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'تسجيل الشحنة',
      receipt: 'أمر شحن',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'منطقة',
      branch: 'مستودع'
    },
    
    placeholders: {
      search: '🔍 بحث في المنتجات أو الباركود...',
      customer: 'اسم العميل أو الجهة',
      notes: 'ملاحظات الشحنة...',
      address: 'عنوان التسليم'
    },
    
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: true
    },
    
    tabs: ['home', 'inventory', 'inventory_receipts', 'orders', 'menu', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
  },
  
  services: {
    id: 'services',
    label: 'خدمات',
    icon: '🧺',
    description: 'مغاسل ملابس، صيانة، خدمات متنوعة',
    category: 'services',
    
    color: 'hsl(45, 85%, 50%)',
    theme: { 
      primary: '45 85% 50%', 
      accent: '55 80% 55%', 
      gradient: 'linear-gradient(135deg, hsl(45, 85%, 50%), hsl(55, 80%, 55%))',
      sidebarBg: 'hsl(45 85% 50% / 0.05)',
      sidebarText: 'hsl(45 85% 50%)'
    },
    
    posLayout: {
      type: 'services',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: true,
      quickActions: ['service_ticket', 'customer', 'pickup_time', 'delivery_time', 'status', 'sms']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '📦', color: '#eab308', requiresTable: false, requiresAddress: false, requiresPhone: true },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#ca8a04', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['service_tracking', 'pickup_delivery', 'customer_history', 'status_board', 'inventory'],
    
    labels: {
      menu: 'الخدمات',
      item: 'خدمة',
      items: 'خدمات',
      order: 'طلب خدمة',
      orders: 'طلبات الخدمة',
      customer: 'العميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'النوع',
      checkout: 'تسجيل الخدمة',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في الخدمات...',
      customer: 'اسم العميل أو المستفيد',
      notes: 'ملاحظات الخدمة أو تفاصيل الاستلام...',
      address: 'عنوان الاستلام أو التسليم'
    },
    
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'customers', 'customer_accounts', 'sales_returns', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings'],
    
    specialFields: [
      { name: 'pickup_date', type: 'date', label: 'تاريخ الاستلام', required: true },
      { name: 'delivery_date', type: 'date', label: 'تاريخ التسليم المتوقع', required: false },
      { name: 'service_status', type: 'select', label: 'حالة الخدمة', required: true }
    ]
  },
  
  other: {
    id: 'other',
    label: 'نشاط آخر',
    icon: '🏢',
    description: 'أي نشاط تجاري آخر',
    category: 'other',
    
    color: 'hsl(220, 60%, 50%)',
    theme: { 
      primary: '220 60% 50%', 
      accent: '230 55% 55%', 
      gradient: 'linear-gradient(135deg, hsl(220, 60%, 50%), hsl(230, 55%, 55%))',
      sidebarBg: 'hsl(220 60% 50% / 0.05)',
      sidebarText: 'hsl(220 60% 50%)'
    },
    
    posLayout: {
      type: 'classic',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['barcode', 'customer', 'discount', 'hold', 'print']
    },
    
    orderTypes: [
      { id: 'pickup', label: 'استلام', icon: '🏬', color: '#3b82f6', requiresTable: false, requiresAddress: false, requiresPhone: false },
      { id: 'delivery', label: 'توصيل', icon: '🛵', color: '#22c55e', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    
    features: ['inventory', 'customers', 'barcode', 'loyalty'],
    
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'طلب',
      orders: 'طلبات',
      customer: 'عميل',
      customers: 'العملاء',
      inventory: 'المخزون',
      category: 'الفئة',
      checkout: 'إتمام الطلب',
      receipt: 'إيصال',
      table: 'طاولة',
      tables: 'الطاولات',
      section: 'قسم',
      branch: 'فرع'
    },
    
    placeholders: {
      search: '🔍 بحث في المنتجات...',
      customer: 'اسم العميل',
      notes: 'ملاحظات الطلب...',
      address: 'عنوان التسليم'
    },
    
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: false,
      requireCustomer: false
    },
    
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_invoices', 'sales_orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'sales_returns', 'suppliers', 'supplier_accounts', 'shifts', 'stats', 'ai_assistant', 'financials', 'treasury', 'fixed_assets', 'expenses', 'staff', 'users', 'notifications', 'settings']
  },
  shipping: {
    id: 'shipping',
    label: 'شحن ولوجستيات',
    icon: '🚢',
    description: 'شركات شحن، نقل طرود، خدمات لوجستية',
    category: 'logistics',
    color: 'hsl(200, 70%, 45%)',
    theme: { 
      primary: '200 70% 45%', 
      accent: '190 60% 50%', 
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
      sidebarBg: 'hsl(200 70% 45% / 0.05)',
      sidebarText: 'hsl(200 70% 45%)'
    },
    posLayout: {
      type: 'compact',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: true,
      quickActions: ['track', 'scan', 'manifest', 'customer']
    },
    orderTypes: [
      { id: 'pickup', label: 'استلام طرد', icon: '📦', color: '#0ea5e9', requiresTable: false, requiresAddress: true, requiresPhone: true },
      { id: 'delivery', label: 'تسليم طرد', icon: '🚚', color: '#0284c7', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['barcode', 'inventory', 'customers', 'service_tracking', 'status_board'],
    labels: {
      menu: 'الخدمات / الطرود',
      item: 'طرد',
      items: 'طرود',
      order: 'بوليصة',
      orders: 'بوالص الشحن',
      customer: 'المرسل / المرسل إليه',
      customers: 'العملاء',
      inventory: 'مخزون الطرود',
      category: 'نوع الشحن',
      checkout: 'إصدار البوليصة',
      receipt: 'بوليصة شحن',
      table: 'منطقة',
      tables: 'المناطق',
      section: 'مسار',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث برقم البوليصة أو العميل...',
      customer: 'اسم المرسل/المستقبل',
      notes: 'تفاصيل الشحنة...',
      address: 'عنوان التوصيل'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'crm', 'delivery', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'expenses', 'staff', 'settings']
  },
  distribution: {
    id: 'distribution',
    label: 'توزيع ومناديب',
    icon: '🚐',
    description: 'شركات توزيع، سيارات توزيع، وكلاء مصانع',
    category: 'logistics',
    color: 'hsl(35, 90%, 50%)',
    theme: { 
      primary: '35 90% 50%', 
      accent: '45 80% 55%', 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      sidebarBg: 'hsl(35 90% 50% / 0.05)',
      sidebarText: 'hsl(35 90% 50%)'
    },
    posLayout: {
      type: 'retail',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 5,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['van_stock', 'route', 'customer_visit', 'collection']
    },
    orderTypes: [
      { id: 'delivery', label: 'توزيع لعميل', icon: '🚚', color: '#f59e0b', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['inventory', 'customers', 'credit', 'invoicing', 'multi_unit'],
    labels: {
      menu: 'المنتجات',
      item: 'منتج',
      items: 'منتجات',
      order: 'أمر توزيع',
      orders: 'أوامر التوزيع',
      customer: 'التاجر / العميل',
      customers: 'قائمة التجار',
      inventory: 'مخزون السيارة',
      category: 'التصنيف',
      checkout: 'إتمام البيع',
      receipt: 'فاتورة توزيع',
      table: 'خط سير',
      tables: 'خطوط السير',
      section: 'منطقة',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث في المنتجات...',
      customer: 'اسم التاجر',
      notes: 'ملاحظات الزيارة...',
      address: 'موقع التاجر'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'crm', 'delivery', 'customers', 'customer_accounts', 'suppliers', 'supplier_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'settings']
  },
  hospital: {
    id: 'hospital',
    label: 'مستشفى / عيادة',
    icon: '🏥',
    description: 'مستشفيات، عيادات طبية، مراكز تخصصية',
    category: 'health',
    color: 'hsl(190, 80%, 45%)',
    theme: { 
      primary: '190 80% 45%', 
      accent: '200 70% 50%', 
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
      sidebarBg: 'hsl(190 80% 45% / 0.05)',
      sidebarText: 'hsl(190 80% 45%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['appointment', 'patient_file', 'prescription', 'billing']
    },
    orderTypes: [
      { id: 'pickup', label: 'كشف / استشارة', icon: '🩺', color: '#0ea5e9', requiresTable: false, requiresAddress: false, requiresPhone: true }
    ],
    features: ['prescriptions', 'customers', 'service_tracking', 'status_board', 'inventory'],
    labels: {
      menu: 'الخدمات الطبية',
      item: 'خدمة / كشف',
      items: 'خدمات',
      order: 'فاتورة مريض',
      orders: 'فواتير المرضى',
      customer: 'المريض',
      customers: 'المرضى',
      inventory: 'المستلزمات',
      category: 'التخصص',
      checkout: 'إصدار الفاتورة',
      receipt: 'فاتورة طبية',
      table: 'غرفة',
      tables: 'الغرف',
      section: 'عيادة',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث عن خدمة أو مريض...',
      customer: 'اسم المريض',
      notes: 'ملاحظات طبية...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'staff', 'settings']
  },
  factory: {
    id: 'factory',
    label: 'مصنع / إنتاج',
    icon: '🏭',
    description: 'مصانع، خطوط إنتاج، تصنيع غذائي',
    category: 'other',
    color: 'hsl(12, 70%, 50%)',
    theme: { 
      primary: '12 70% 50%', 
      accent: '20 60% 55%', 
      gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      sidebarBg: 'hsl(12 70% 50% / 0.05)',
      sidebarText: 'hsl(12 70% 50%)'
    },
    posLayout: {
      type: 'compact',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: true,
      quickActions: ['production_order', 'raw_materials', 'bom', 'quality_check']
    },
    orderTypes: [
      { id: 'pickup', label: 'أمر إنتاج', icon: '⚙️', color: '#ef4444', requiresTable: false, requiresAddress: false, requiresPhone: false }
    ],
    features: ['inventory', 'multi_unit', 'recipes', 'production_order', 'variants'],
    labels: {
      menu: 'المنتجات التامة',
      item: 'منتج',
      items: 'منتجات',
      order: 'أمر تشغيل',
      orders: 'أوامر التشغيل',
      customer: 'العميل المستلم',
      customers: 'العملاء',
      inventory: 'المواد الخام',
      category: 'خط الإنتاج',
      checkout: 'تسجيل الإنتاج',
      receipt: 'إذن إنتاج',
      table: 'خط',
      tables: 'الخطوط',
      section: 'عنبر',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث عن منتج تام...',
      customer: 'جهة الاستلام',
      notes: 'ملاحظات الإنتاج...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: false
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'sales_orders', 'crm', 'customers', 'customer_accounts', 'suppliers', 'supplier_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'settings']
  },
  real_estate: {
    id: 'real_estate',
    label: 'عقارات وتأجير',
    icon: '🏠',
    description: 'إدارة الشقق، العقارات، التأجير السكني والتجاري',
    category: 'services',
    color: 'hsl(250, 60%, 45%)',
    theme: { 
      primary: '250 60% 45%', 
      accent: '240 50% 50%', 
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      sidebarBg: 'hsl(250 60% 45% / 0.05)',
      sidebarText: 'hsl(250 60% 45%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['lease', 'maintenance', 'rent_collection', 'tenant_history']
    },
    orderTypes: [
      { id: 'pickup', label: 'عقد جديد', icon: '📝', color: '#6366f1', requiresTable: false, requiresAddress: true, requiresPhone: true },
      { id: 'delivery', label: 'صيانة', icon: '🛠️', color: '#4338ca', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board', 'inventory'],
    labels: {
      menu: 'الوحدات العقارية',
      item: 'وحدة',
      items: 'وحدات',
      order: 'عقد إيجار',
      orders: 'العقود',
      customer: 'المستأجر',
      customers: 'المستأجرين',
      inventory: 'المستلزمات',
      category: 'نوع العقار',
      checkout: 'إبرام العقد',
      receipt: 'فاتورة إيجار',
      table: 'عمارة',
      tables: 'العمارات',
      section: 'منطقة',
      branch: 'مكتب'
    },
    placeholders: {
      search: '🔍 بحث عن وحدة أو مستأجر...',
      customer: 'اسم المستأجر',
      notes: 'شروط العقد...',
      address: 'عنوان العقار'
    },
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'expenses', 'staff', 'settings']
  },
  contracting: {
    id: 'contracting',
    label: 'مقاولات وإنشاءات',
    icon: '🏗️',
    description: 'شركات المقاولات، الإنشاءات، الهندسة المدنية',
    category: 'other',
    color: 'hsl(20, 80%, 40%)',
    theme: { 
      primary: '20 80% 40%', 
      accent: '25 70% 45%', 
      gradient: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)',
      sidebarBg: 'hsl(20 80% 40% / 0.05)',
      sidebarText: 'hsl(20 80% 40%)'
    },
    posLayout: {
      type: 'compact',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: true,
      quickActions: ['project_cost', 'materials', 'labor', 'subcontractor']
    },
    orderTypes: [
      { id: 'pickup', label: 'مشروع جديد', icon: '🏗️', color: '#c2410c', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['inventory', 'multi_unit', 'recipes', 'customers'],
    labels: {
      menu: 'بنود الأعمال',
      item: 'بند',
      items: 'بنود',
      order: 'مستخلص',
      orders: 'المستخلصات',
      customer: 'العميل',
      customers: 'العملاء',
      inventory: 'خامات الإنشاء',
      category: 'نوع العمل',
      checkout: 'إصدار مستخلص',
      receipt: 'مستخلص أعمال',
      table: 'موقع',
      tables: 'المواقع',
      section: 'عنبر',
      branch: 'شركة'
    },
    placeholders: {
      search: '🔍 بحث عن مشروع أو بند...',
      customer: 'اسم صاحب المشروع',
      notes: 'ملاحظات التنفيذ...',
      address: 'موقع المشروع'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'projects', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'purchase_orders', 'crm', 'customers', 'customer_accounts', 'suppliers', 'supplier_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'manual_journal', 'fixed_assets', 'settings']
  },
  finishing: {
    id: 'finishing',
    label: 'تشطيبات وديكور',
    icon: '🎨',
    description: 'شركات التشطيب، الديكور، التصميم الداخلي',
    category: 'services',
    color: 'hsl(160, 60%, 40%)',
    theme: { 
      primary: '160 60% 40%', 
      accent: '150 50% 45%', 
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      sidebarBg: 'hsl(160 60% 40% / 0.05)',
      sidebarText: 'hsl(160 60% 40%)'
    },
    posLayout: {
      type: 'classic',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['design', 'quote', 'materials', 'progress']
    },
    orderTypes: [
      { id: 'pickup', label: 'طلب تشطيب', icon: '🎨', color: '#059669', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['inventory', 'customers', 'service_tracking'],
    labels: {
      menu: 'خدمات الديكور',
      item: 'خدمة',
      items: 'خدمات',
      order: 'مقايسة',
      orders: 'المقايسات',
      customer: 'العميل',
      customers: 'العملاء',
      inventory: 'خامات التشطيب',
      category: 'النمط',
      checkout: 'اعتماد المقايسة',
      receipt: 'مقايسة تشطيب',
      table: 'وحدة',
      tables: 'الوحدات',
      section: 'منطقة',
      branch: 'معرض'
    },
    placeholders: {
      search: '🔍 بحث عن عميل أو خدمة...',
      customer: 'اسم العميل',
      notes: 'تفاصيل الديكور...',
      address: 'محل التنفيذ'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  },
  rental: {
    id: 'rental',
    label: 'تأجير معدات/سيارات',
    icon: '🚗',
    description: 'تأجير السيارات، المعدات الثقيلة، الأدوات',
    category: 'services',
    color: 'hsl(215, 70%, 45%)',
    theme: { 
      primary: '215 70% 45%', 
      accent: '210 60% 50%', 
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
      sidebarBg: 'hsl(215 70% 45% / 0.05)',
      sidebarText: 'hsl(215 70% 45%)'
    },
    posLayout: {
      type: 'compact',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 5,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['check_out', 'check_in', 'damage_report', 'maintenance']
    },
    orderTypes: [
      { id: 'pickup', label: 'حجز تأجير', icon: '🔑', color: '#1d4ed8', requiresTable: false, requiresAddress: true, requiresPhone: true }
    ],
    features: ['inventory', 'customers', 'service_tracking', 'status_board'],
    labels: {
      menu: 'قائمة المعدات',
      item: 'معدة / سيارة',
      items: 'معدات',
      order: 'عقد تأجير',
      orders: 'عقود التأجير',
      customer: 'المستأجر',
      customers: 'المستأجرين',
      inventory: 'قطع الغيار',
      category: 'الفئة',
      checkout: 'تسليم المعدة',
      receipt: 'إيصال تأجير',
      table: 'جراج',
      tables: 'الجراجات',
      section: 'صف',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث عن معدة أو مستأجر...',
      customer: 'اسم المستأجر',
      notes: 'شروط التأجير...',
      address: 'موقع التسليم'
    },
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  },
  education: {
    id: 'education',
    label: 'مراكز تعليمية',
    icon: '📚',
    description: 'مدارس، مراكز تدريب، أكاديميات',
    category: 'services',
    color: 'hsl(330, 70%, 50%)',
    theme: { 
      primary: '330 70% 50%', 
      accent: '340 60% 55%', 
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      sidebarBg: 'hsl(330 70% 50% / 0.05)',
      sidebarText: 'hsl(330 70% 50%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['enroll', 'attendance', 'exams', 'results']
    },
    orderTypes: [
      { id: 'pickup', label: 'تسجيل طالب', icon: '📝', color: '#ec4899', requiresTable: false, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board', 'inventory'],
    labels: {
      menu: 'الدورات / الحصص',
      item: 'دورة / مادة',
      items: 'دورات',
      order: 'فاتورة طالب',
      orders: 'فواتير الطلاب',
      customer: 'الطالب',
      customers: 'الطلاب',
      inventory: 'الكتب / الأدوات',
      category: 'المستوى',
      checkout: 'تسجيل الحضور',
      receipt: 'إيصال سداد',
      table: 'قاعة',
      tables: 'القاعات',
      section: 'مجموعة',
      branch: 'مركز'
    },
    placeholders: {
      search: '🔍 بحث عن طالب أو مادة...',
      customer: 'اسم الطالب',
      notes: 'ملاحظات الأكاديمية...',
      address: 'عنوان الطالب'
    },
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'staff', 'settings']
  },
  law_firm: {
    id: 'law_firm',
    label: 'مكاتب المحاماة',
    icon: '⚖️',
    description: 'إدارة القضايا، الموكلين، الاستشارات القانونية',
    category: 'services',
    color: 'hsl(210, 30%, 30%)',
    theme: { 
      primary: '210 30% 30%', 
      accent: '200 20% 40%', 
      gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      sidebarBg: 'hsl(210 30% 30% / 0.05)',
      sidebarText: 'hsl(210 30% 30%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: false,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['case_file', 'consultation', 'legal_fee', 'contract']
    },
    orderTypes: [
      { id: 'pickup', label: 'قضية جديدة', icon: '📜', color: '#1e293b', requiresTable: false, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board'],
    labels: {
      menu: 'الخدمات القانونية',
      item: 'خدمة / استشارة',
      items: 'خدمات',
      order: 'أتعاب',
      orders: 'الفواتير',
      customer: 'الموكل',
      customers: 'الموكلين',
      inventory: 'الأوراق الرسمية',
      category: 'نوع القضايا',
      checkout: 'إصدار الفاتورة',
      receipt: 'إيصال أتعاب',
      table: 'محكمة',
      tables: 'المحاكم',
      section: 'مكتب',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث عن موكل أو قضية...',
      customer: 'اسم الموكل',
      notes: 'تفاصيل القضية...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 0,
      serviceCharge: 0,
      enableTax: false,
      priceIncludesTax: true,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'staff', 'settings']
  },
  marketing_agency: {
    id: 'marketing_agency',
    label: 'وكالات التسويق',
    icon: '📢',
    description: 'إدارة الحملات، التصميم، التسويق الرقمي',
    category: 'services',
    color: 'hsl(280, 70%, 50%)',
    theme: { 
      primary: '280 70% 50%', 
      accent: '290 60% 55%', 
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
      sidebarBg: 'hsl(280 70% 50% / 0.05)',
      sidebarText: 'hsl(280 70% 50%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: false,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['campaign', 'design_order', 'social_media', 'report']
    },
    orderTypes: [
      { id: 'pickup', label: 'حملة جديدة', icon: '🎯', color: '#a855f7', requiresTable: false, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board'],
    labels: {
      menu: 'خدمات التسويق',
      item: 'خدمة',
      items: 'خدمات',
      order: 'مشروع',
      orders: 'المشاريع',
      customer: 'العميل',
      customers: 'العملاء',
      inventory: 'الأصول الرقمية',
      category: 'نوع الخدمة',
      checkout: 'فوترة المشروع',
      receipt: 'فاتورة خدمات',
      table: 'حملة',
      tables: 'الحملات',
      section: 'فريق',
      branch: 'وكالة'
    },
    placeholders: {
      search: '🔍 بحث عن عميل أو حملة...',
      customer: 'اسم العميل',
      notes: 'تفاصيل المشروع...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  },
  gym: {
    id: 'gym',
    label: 'نوادي رياضية',
    icon: '💪',
    description: 'صالات الجيم، مراكز اللياقة، النوادي',
    category: 'services',
    color: 'hsl(10, 80%, 50%)',
    theme: { 
      primary: '10 80% 50%', 
      accent: '15 70% 55%', 
      gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      sidebarBg: 'hsl(10 80% 50% / 0.05)',
      sidebarText: 'hsl(10 80% 50%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['membership', 'check_in', 'trainer', 'supplements']
    },
    orderTypes: [
      { id: 'pickup', label: 'اشتراك جديد', icon: '🥇', color: '#ef4444', requiresTable: false, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board', 'inventory', 'barcode'],
    labels: {
      menu: 'العضويات والخدمات',
      item: 'باقة / صنف',
      items: 'أصناف',
      order: 'عملية سداد',
      orders: 'سداد الاشتراكات',
      customer: 'المشترك',
      customers: 'المشتركين',
      inventory: 'المكملات والأدوات',
      category: 'نوع الاشتراك',
      checkout: 'تفعيل الاشتراك',
      receipt: 'إيصال سداد',
      table: 'منطقة تدريب',
      tables: 'المناطق',
      section: 'كابتن',
      branch: 'جيم'
    },
    placeholders: {
      search: '🔍 بحث عن مشترك أو باقة...',
      customer: 'اسم المشترك',
      notes: 'ملاحظات صحية...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  },
  beauty_salon: {
    id: 'beauty_salon',
    label: 'صالونات تجميل',
    icon: '✂️',
    description: 'صالونات الحلاقة، مراكز التجميل، السبا',
    category: 'services',
    color: 'hsl(330, 80%, 60%)',
    theme: { 
      primary: '330 80% 60%', 
      accent: '320 70% 65%', 
      gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
      sidebarBg: 'hsl(330 80% 60% / 0.05)',
      sidebarText: 'hsl(330 80% 60%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: false,
      showScale: false,
      quickActions: ['booking', 'stylist', 'product_sale', 'loyalty']
    },
    orderTypes: [
      { id: 'pickup', label: 'حجز جديد', icon: '✨', color: '#f472b6', requiresTable: true, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board', 'inventory', 'loyalty'],
    labels: {
      menu: 'الخدمات والمنتجات',
      item: 'خدمة / منتج',
      items: 'خدمات',
      order: 'فاتورة صالون',
      orders: 'فواتير العملاء',
      customer: 'العميلة',
      customers: 'العميلات',
      inventory: 'مستحضرات التجميل',
      category: 'القسم',
      checkout: 'إتمام الخدمة',
      receipt: 'فاتورة تجميل',
      table: 'كرسي / غرفة',
      tables: 'الكراسي',
      section: 'أخصائية',
      branch: 'فرع'
    },
    placeholders: {
      search: '🔍 بحث عن خدمة أو عميلة...',
      customer: 'اسم العميلة',
      notes: 'تفاصيل الخدمة...',
      address: 'العنوان'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: false
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'crm', 'customers', 'customer_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  },
  auto_repair: {
    id: 'auto_repair',
    label: 'صيانة السيارات',
    icon: '🔧',
    description: 'مراكز الصيانة، ميكانيكا، كهرباء السيارات',
    category: 'services',
    color: 'hsl(200, 10%, 30%)',
    theme: { 
      primary: '200 10% 30%', 
      accent: '210 20% 40%', 
      gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
      sidebarBg: 'hsl(200 10% 30% / 0.05)',
      sidebarText: 'hsl(200 10% 30%)'
    },
    posLayout: {
      type: 'services',
      showTableGrid: true,
      showCategoriesSidebar: true,
      itemGridCols: 4,
      showItemImages: true,
      showPrices: true,
      cartPosition: 'right',
      showBarcodeScanner: true,
      showScale: false,
      quickActions: ['work_order', 'spare_parts', 'mechanic', 'status']
    },
    orderTypes: [
      { id: 'pickup', label: 'أمر إصلاح', icon: '🚗', color: '#475569', requiresTable: true, requiresAddress: false, requiresPhone: true }
    ],
    features: ['customers', 'service_tracking', 'status_board', 'inventory', 'barcode'],
    labels: {
      menu: 'قطع الغيار والخدمات',
      item: 'قطعة / خدمة',
      items: 'بنود',
      order: 'فاتورة إصلاح',
      orders: 'فواتير الصيانة',
      customer: 'صاحب السيارة',
      customers: 'العملاء',
      inventory: 'المخزن',
      category: 'النوع',
      checkout: 'تسليم السيارة',
      receipt: 'فاتورة صيانة',
      table: 'باكية / ورشة',
      tables: 'الباكيات',
      section: 'فني',
      branch: 'مركز صيانة'
    },
    placeholders: {
      search: '🔍 بحث عن سيارة أو قطعة...',
      customer: 'اسم صاحب السيارة',
      notes: 'تفاصيل العطل...',
      address: 'رقم اللوحة'
    },
    defaults: {
      taxRate: 14,
      serviceCharge: 0,
      enableTax: true,
      priceIncludesTax: false,
      currency: 'ج.م',
      allowCredit: true,
      requireCustomer: true
    },
    tabs: ['home', 'pos', 'orders', 'menu', 'inventory', 'inventory_receipts', 'purchase_invoices', 'crm', 'customers', 'customer_accounts', 'suppliers', 'supplier_accounts', 'stats', 'ai_assistant', 'financials', 'accounting', 'fixed_assets', 'expenses', 'staff', 'settings']
  }
};

// Legacy exports for backward compatibility
export const BUSINESS_TABS: Record<BusinessType, string[]> = {
  restaurant: BUSINESS_TYPES.restaurant.tabs,
  cafe: BUSINESS_TYPES.cafe.tabs,
  retail: BUSINESS_TYPES.retail.tabs,
  wholesale: BUSINESS_TYPES.wholesale.tabs,
  grocery: BUSINESS_TYPES.grocery.tabs,
  warehouse: BUSINESS_TYPES.warehouse.tabs,
  pharmacy: BUSINESS_TYPES.pharmacy.tabs,
  services: BUSINESS_TYPES.services.tabs,
  shipping: BUSINESS_TYPES.shipping.tabs,
  distribution: BUSINESS_TYPES.distribution.tabs,
  hospital: BUSINESS_TYPES.hospital.tabs,
  factory: BUSINESS_TYPES.factory.tabs,
  real_estate: BUSINESS_TYPES.real_estate.tabs,
  contracting: BUSINESS_TYPES.contracting.tabs,
  finishing: BUSINESS_TYPES.finishing.tabs,
  rental: BUSINESS_TYPES.rental.tabs,
  education: BUSINESS_TYPES.education.tabs,
  law_firm: BUSINESS_TYPES.law_firm.tabs,
  marketing_agency: BUSINESS_TYPES.marketing_agency.tabs,
  gym: BUSINESS_TYPES.gym.tabs,
  beauty_salon: BUSINESS_TYPES.beauty_salon.tabs,
  auto_repair: BUSINESS_TYPES.auto_repair.tabs,
  other: BUSINESS_TYPES.other.tabs
};

export const FOOD_SECTORS: BusinessType[] = ['restaurant', 'cafe'];

// Helper Functions
export function isFoodSector(type: BusinessType): boolean {
  return FOOD_SECTORS.includes(type);
}

export function getBusinessConfig(type: BusinessType): BusinessTypeConfig {
  return BUSINESS_TYPES[type] || BUSINESS_TYPES.other;
}

export function getBusinessLabel(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.label || 'نشاط';
}

export function getEntityLabel(type: BusinessType): string {
  if (type === 'restaurant' || type === 'cafe') return 'مطعمك';
  if (type === 'pharmacy') return 'صيدليتك';
  if (type === 'warehouse') return 'مخزنك';
  if (type === 'services') return 'نشاطك الخدمي';
  return 'نشاطك';
}

export function getDefaultOrderType(type: BusinessType): string {
  const config = BUSINESS_TYPES[type];
  return config?.orderTypes[0]?.id || 'pickup';
}

export function getOrderTypeLabel(type: string): { label: string; icon: string; color: string } {
  const map: Record<string, { label: string; icon: string; color: string }> = {
    dine_in: { label: 'داخلي', icon: '🍽️', color: '#f97316' },
    takeaway: { label: 'تيك أواي', icon: '🛍️', color: '#3b82f6' },
    delivery: { label: 'توصيل', icon: '🛵', color: '#22c55e' },
    pickup: { label: 'استلام', icon: '🏬', color: '#3b82f6' },
  };
  return map[type] || { label: type, icon: '📋', color: '#6b7280' };
}

export function isInventoryDrivenBusiness(type: BusinessType): boolean {
  return ['retail', 'wholesale', 'grocery', 'warehouse', 'pharmacy', 'other'].includes(type);
}

export function requiresBarcodeScanner(type: BusinessType): boolean {
  return BUSINESS_TYPES[type]?.posLayout.showBarcodeScanner || false;
}

export function requiresScale(type: BusinessType): boolean {
  return BUSINESS_TYPES[type]?.posLayout.showScale || false;
}

export function getDefaultItemIcon(type: BusinessType): string {
  return BUSINESS_ITEM_ICONS[type]?.[0] || '📦';
}

export function getItemIconOptions(type: BusinessType): string[] {
  return BUSINESS_ITEM_ICONS[type] || BUSINESS_ITEM_ICONS.other;
}

export function getPosSearchPlaceholder(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.placeholders.search || '🔍 بحث...';
}

export function getCustomerPlaceholder(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.placeholders.customer || 'اسم العميل';
}

export function getNotesPlaceholder(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.placeholders.notes || 'ملاحظات...';
}

export function getAddressPlaceholder(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.placeholders.address || 'العنوان';
}

export function getCheckoutButtonLabel(type: BusinessType, orderType: string): string {
  if (orderType === 'delivery') return type === 'services' ? '🛵 إرسال الخدمة للتوصيل' : '🛵 إرسال للتوصيل';
  if (orderType === 'takeaway') return '🛍️ تيك أواي';
  if (orderType === 'pickup') return type === 'services' ? '✅ تسجيل طلب الخدمة' : '✅ إتمام الفاتورة';
  return '✅ إتمام الطلب';
}

export function hasFeature(type: BusinessType, feature: FeatureFlag): boolean {
  return BUSINESS_TYPES[type]?.features.includes(feature) || false;
}

export function getQuickActions(type: BusinessType): string[] {
  return BUSINESS_TYPES[type]?.posLayout.quickActions || [];
}

export function getSpecialFields(type: BusinessType) {
  return BUSINESS_TYPES[type]?.specialFields || [];
}

// Ventro Pro: Layout presets
export interface LayoutPreset {
  id: string;
  name: string;
  layoutType: PosLayout;
  businessType: BusinessType;
  config: {
    itemGridCols: number;
    showTableGrid: boolean;
    showCategoriesSidebar: boolean;
    cartPosition: 'right' | 'left' | 'bottom';
    primaryActions: string[];
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'restaurant-classic',
    name: 'مطعم - الكلاسيكي',
    layoutType: 'restaurant',
    businessType: 'restaurant',
    config: {
      itemGridCols: 4,
      showTableGrid: true,
      showCategoriesSidebar: true,
      cartPosition: 'right',
      primaryActions: ['tables', 'orders', 'menu', 'kitchen']
    }
  },
  {
    id: 'restaurant-fast',
    name: 'مطعم - سريع',
    layoutType: 'compact',
    businessType: 'restaurant',
    config: {
      itemGridCols: 6,
      showTableGrid: false,
      showCategoriesSidebar: false,
      cartPosition: 'right',
      primaryActions: ['quick_sale', 'menu', 'orders']
    }
  },
  {
    id: 'retail-store',
    name: 'متجر تجزئة',
    layoutType: 'retail',
    businessType: 'retail',
    config: {
      itemGridCols: 5,
      showTableGrid: false,
      showCategoriesSidebar: true,
      cartPosition: 'right',
      primaryActions: ['barcode', 'products', 'customers', 'checkout']
    }
  },
  {
    id: 'grocery-market',
    name: 'سوبر ماركت',
    layoutType: 'grocery',
    businessType: 'grocery',
    config: {
      itemGridCols: 6,
      showTableGrid: false,
      showCategoriesSidebar: true,
      cartPosition: 'right',
      primaryActions: ['barcode', 'scale', 'products', 'checkout']
    }
  },
  {
    id: 'pharmacy-store',
    name: 'صيدلية',
    layoutType: 'pharmacy',
    businessType: 'pharmacy',
    config: {
      itemGridCols: 4,
      showTableGrid: false,
      showCategoriesSidebar: true,
      cartPosition: 'right',
      primaryActions: ['barcode', 'prescriptions', 'products', 'checkout']
    }
  },
  {
    id: 'services-center',
    name: 'مركز خدمات',
    layoutType: 'services',
    businessType: 'services',
    config: {
      itemGridCols: 4,
      showTableGrid: false,
      showCategoriesSidebar: true,
      cartPosition: 'right',
      primaryActions: ['services', 'tickets', 'customers', 'status']
    }
  }
];

export function getLayoutPreset(presetId: string): LayoutPreset | undefined {
  return LAYOUT_PRESETS.find(p => p.id === presetId);
}

export function getLayoutPresetsForBusiness(type: BusinessType): LayoutPreset[] {
  return LAYOUT_PRESETS.filter(p => p.businessType === type);
}
