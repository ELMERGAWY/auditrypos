export type BusinessType = 'restaurant' | 'retail' | 'wholesale' | 'warehouse' | 'cafe' | 'grocery' | 'pharmacy' | 'services' | 'other';

export interface BusinessTypeConfig {
  label: string;
  icon: string;
  description: string;
  features: string[];
  color: string;
  theme: { primary: string; accent: string; gradient: string };
  orderTypes: string[]; // which order types this sector supports
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  restaurant: {
    label: 'مطعم',
    icon: '🍽️',
    description: 'مطاعم، كافيهات، مطابخ سحابية',
    features: ['قائمة QR', 'إدارة طاولات', 'نظام توصيل', 'استدعاء ويتر'],
    color: 'hsl(25, 95%, 53%)',
    theme: { primary: '25 95% 53%', accent: '38 92% 50%', gradient: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(38, 92%, 50%))' },
    orderTypes: ['dine_in', 'takeaway', 'delivery'],
  },
  cafe: {
    label: 'كافيه',
    icon: '☕',
    description: 'كافيهات، مشروبات، حلويات',
    features: ['قائمة QR', 'إدارة طاولات', 'طلبات تيك أواي'],
    color: 'hsl(30, 70%, 40%)',
    theme: { primary: '30 70% 40%', accent: '25 60% 50%', gradient: 'linear-gradient(135deg, hsl(30, 70%, 40%), hsl(25, 60%, 50%))' },
    orderTypes: ['dine_in', 'takeaway', 'delivery'],
  },
  retail: {
    label: 'تجزئة',
    icon: '🏪',
    description: 'محلات ملابس، إلكترونيات، أحذية',
    features: ['باركود', 'إدارة مخزون', 'حسابات عملاء', 'فواتير ضريبية'],
    color: 'hsl(210, 80%, 50%)',
    theme: { primary: '210 80% 50%', accent: '200 70% 55%', gradient: 'linear-gradient(135deg, hsl(210, 80%, 50%), hsl(200, 70%, 55%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  wholesale: {
    label: 'جملة',
    icon: '📦',
    description: 'تجار جملة، موزعين، وكلاء',
    features: ['فواتير آجلة', 'حسابات عملاء', 'كشف حساب', 'أقساط'],
    color: 'hsl(142, 71%, 40%)',
    theme: { primary: '142 71% 40%', accent: '160 60% 45%', gradient: 'linear-gradient(135deg, hsl(142, 71%, 40%), hsl(160, 60%, 45%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  grocery: {
    label: 'بقالة / سوبر ماركت',
    icon: '🛒',
    description: 'سوبر ماركت، ميني ماركت، بقالة',
    features: ['ماسح باركود', 'إدارة مخزون', 'تنبيه نفاد', 'صلاحية المنتجات'],
    color: 'hsl(280, 65%, 50%)',
    theme: { primary: '280 65% 50%', accent: '300 60% 55%', gradient: 'linear-gradient(135deg, hsl(280, 65%, 50%), hsl(300, 60%, 55%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  warehouse: {
    label: 'مخزن / مستودع',
    icon: '🏭',
    description: 'مخازن، مستودعات، إدارة تخزين',
    features: ['تتبع مخزون', 'حركات المخزون', 'جرد', 'تقارير مخزون'],
    color: 'hsl(0, 70%, 50%)',
    theme: { primary: '0 70% 50%', accent: '15 80% 55%', gradient: 'linear-gradient(135deg, hsl(0, 70%, 50%), hsl(15, 80%, 55%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  pharmacy: {
    label: 'صيدلية',
    icon: '💊',
    description: 'صيدليات، مستلزمات طبية',
    features: ['تتبع صلاحية', 'باركود', 'وصفات طبية', 'تنبيه نفاد'],
    color: 'hsl(170, 70%, 40%)',
    theme: { primary: '170 70% 40%', accent: '180 65% 45%', gradient: 'linear-gradient(135deg, hsl(170, 70%, 40%), hsl(180, 65%, 45%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  services: {
    label: 'خدمات',
    icon: '🧺',
    description: 'مغاسل ملابس، صيانة، خدمات متنوعة',
    features: ['إدارة طلبات', 'حسابات عملاء', 'توصيل', 'تتبع حالة الخدمة'],
    color: 'hsl(45, 85%, 50%)',
    theme: { primary: '45 85% 50%', accent: '55 80% 55%', gradient: 'linear-gradient(135deg, hsl(45, 85%, 50%), hsl(55, 80%, 55%))' },
    orderTypes: ['pickup', 'delivery'],
  },
  other: {
    label: 'نشاط آخر',
    icon: '🏢',
    description: 'أي نشاط تجاري آخر',
    features: ['نقطة بيع', 'إدارة مخزون', 'تقارير', 'حسابات عملاء'],
    color: 'hsl(220, 60%, 50%)',
    theme: { primary: '220 60% 50%', accent: '230 55% 55%', gradient: 'linear-gradient(135deg, hsl(220, 60%, 50%), hsl(230, 55%, 55%))' },
    orderTypes: ['pickup', 'delivery'],
  },
};

// Food sectors get menu/waiter/qr, all sectors get delivery
export const BUSINESS_TABS: Record<BusinessType, string[]> = {
  restaurant: ['pos', 'orders', 'menu', 'delivery', 'shifts', 'stats', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'staff', 'settings'],
  cafe: ['pos', 'orders', 'menu', 'delivery', 'shifts', 'stats', 'qr', 'waiter', 'inventory', 'customers', 'expenses', 'staff', 'settings'],
  retail: ['pos', 'orders', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  wholesale: ['pos', 'orders', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  grocery: ['pos', 'orders', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  warehouse: ['inventory', 'orders', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  pharmacy: ['pos', 'orders', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  services: ['pos', 'orders', 'delivery', 'customers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
  other: ['pos', 'orders', 'inventory', 'delivery', 'customers', 'suppliers', 'shifts', 'stats', 'expenses', 'staff', 'settings'],
};

// Which sectors are "food" (show menu, waiter, tables, QR menu)
export const FOOD_SECTORS: BusinessType[] = ['restaurant', 'cafe'];

export function isFoodSector(type: BusinessType): boolean {
  return FOOD_SECTORS.includes(type);
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

export function getOrderTypeLabel(type: string): { label: string; icon: string } {
  const map: Record<string, { label: string; icon: string }> = {
    dine_in: { label: 'داخلي', icon: '🍽️' },
    takeaway: { label: 'تيك أواي', icon: '🛍️' },
    delivery: { label: 'توصيل', icon: '🛵' },
    pickup: { label: 'استلام', icon: '🏬' },
  };
  return map[type] || { label: type, icon: '📋' };
}
