export type BusinessType = 'restaurant' | 'retail' | 'wholesale' | 'warehouse' | 'cafe' | 'grocery' | 'pharmacy' | 'other';

export interface BusinessTypeConfig {
  label: string;
  icon: string;
  description: string;
  features: string[];
  color: string;
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  restaurant: {
    label: 'مطعم',
    icon: '🍽️',
    description: 'مطاعم، كافيهات، مطابخ سحابية',
    features: ['قائمة QR', 'إدارة طاولات', 'نظام توصيل', 'استدعاء ويتر'],
    color: 'hsl(25, 95%, 53%)',
  },
  cafe: {
    label: 'كافيه',
    icon: '☕',
    description: 'كافيهات، مشروبات، حلويات',
    features: ['قائمة QR', 'إدارة طاولات', 'طلبات تيك أواي'],
    color: 'hsl(38, 92%, 50%)',
  },
  retail: {
    label: 'تجزئة',
    icon: '🏪',
    description: 'محلات ملابس، إلكترونيات، أحذية',
    features: ['باركود', 'إدارة مخزون', 'حسابات عملاء', 'فواتير ضريبية'],
    color: 'hsl(200, 80%, 50%)',
  },
  wholesale: {
    label: 'جملة',
    icon: '📦',
    description: 'تجار جملة، موزعين، وكلاء',
    features: ['فواتير آجلة', 'حسابات عملاء', 'كشف حساب', 'أقساط'],
    color: 'hsl(142, 71%, 45%)',
  },
  grocery: {
    label: 'بقالة / سوبر ماركت',
    icon: '🛒',
    description: 'سوبر ماركت، ميني ماركت، بقالة',
    features: ['ماسح باركود', 'إدارة مخزون', 'تنبيه نفاد', 'صلاحية المنتجات'],
    color: 'hsl(280, 70%, 55%)',
  },
  warehouse: {
    label: 'مخزن / مستودع',
    icon: '🏭',
    description: 'مخازن، مستودعات، إدارة تخزين',
    features: ['تتبع مخزون', 'حركات المخزون', 'جرد', 'تقارير مخزون'],
    color: 'hsl(0, 84%, 60%)',
  },
  pharmacy: {
    label: 'صيدلية',
    icon: '💊',
    description: 'صيدليات، مستلزمات طبية',
    features: ['تتبع صلاحية', 'باركود', 'وصفات طبية', 'تنبيه نفاد'],
    color: 'hsl(160, 70%, 45%)',
  },
  other: {
    label: 'نشاط آخر',
    icon: '🏢',
    description: 'أي نشاط تجاري آخر',
    features: ['نقطة بيع', 'إدارة مخزون', 'تقارير', 'حسابات عملاء'],
    color: 'hsl(220, 60%, 50%)',
  },
};

// Which tabs are relevant for each business type
export const BUSINESS_TABS: Record<BusinessType, string[]> = {
  restaurant: ['pos', 'orders', 'menu', 'delivery', 'shifts', 'stats', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'settings'],
  cafe: ['pos', 'orders', 'menu', 'shifts', 'stats', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'settings'],
  retail: ['pos', 'orders', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
  wholesale: ['pos', 'orders', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
  grocery: ['pos', 'orders', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
  warehouse: ['inventory', 'orders', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
  pharmacy: ['pos', 'orders', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
  other: ['pos', 'orders', 'inventory', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'settings'],
};

export function getBusinessLabel(type: BusinessType): string {
  return BUSINESS_TYPES[type]?.label || 'نشاط';
}

export function getEntityLabel(type: BusinessType): string {
  if (type === 'restaurant' || type === 'cafe') return 'مطعمك';
  if (type === 'pharmacy') return 'صيدليتك';
  if (type === 'warehouse') return 'مخزنك';
  return 'نشاطك';
}
