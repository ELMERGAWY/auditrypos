export type BusinessType = 'restaurant' | 'retail' | 'wholesale' | 'warehouse' | 'cafe' | 'grocery' | 'pharmacy' | 'services' | 'other';
export type BusinessCategory = 'food' | 'retail' | 'health' | 'services' | 'logistics' | 'other';
export type PosLayout = 'classic' | 'grid' | 'list' | 'compact' | 'restaurant' | 'retail' | 'grocery' | 'services' | 'pharmacy';
export type FeatureFlag = 
  | 'tables' | 'kitchen_display' | 'waiter_calls' | 'qr_menu' | 'reservations' | 'delivery'
  | 'barcode' | 'scale' | 'inventory' | 'layaway' | 'gift_cards' | 'loyalty' | 'customers' | 'customer_history'
  | 'credit' | 'installments' | 'price_tiers' | 'invoicing' | 'statements'
  | 'prescriptions' | 'insurance' | 'expiry_tracking'
  | 'service_tracking' | 'pickup_delivery' | 'status_board'
  | 'multi_unit' | 'recipes' | 'modifiers' | 'variants' | 'quick_sale' | 'kitchen';

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
  other: ['🏢', '📦', '🛍️', '🧰', '📋', '🏷️', '🪑', '🧴', '📚', '🪙', '⚙️', '🧺'],
};

// Ventro Pro: Enhanced Business Type Configuration
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
    
    color: 'hsl(25, 95%, 53%)',
    theme: { 
      primary: '25 95% 53%', 
      accent: '38 92% 50%', 
      gradient: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(38, 92%, 50%))',
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
    
    features: ['tables', 'kitchen_display', 'waiter_calls', 'qr_menu', 'reservations', 'delivery', 'multi_unit', 'recipes', 'modifiers'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'delivery', 'shifts', 'stats', 'financials', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    features: ['tables', 'kitchen_display', 'waiter_calls', 'qr_menu', 'delivery', 'modifiers'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'delivery', 'shifts', 'stats', 'financials', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'staff', 'notifications', 'settings']
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
    
    tabs: ['pos', 'orders', 'menu', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    tabs: ['inventory', 'orders', 'menu', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings']
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
    
    tabs: ['pos', 'orders', 'menu', 'delivery', 'customers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings'],
    
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
    
    tabs: ['pos', 'orders', 'menu', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'financials', 'expenses', 'staff', 'notifications', 'settings']
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
