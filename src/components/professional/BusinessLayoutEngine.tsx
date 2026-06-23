
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  getBusinessConfig, 
  hasFeature, 
  getQuickActions,
  type BusinessType,
  type PosLayout 
} from '@/lib/businessTypes';
import { 
  ScanLine, Weight, UtensilsCrossed, Split, 
  Merge, ArrowRightLeft, Percent, Ban, Pause,
  User, Receipt, Calendar, Clock, Package,
  CreditCard, FileText, QrCode, Printer,
  TrendingUp, Users, History, MapPin, Phone,
  StickyNote, Hash, CheckCircle, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BusinessLayoutEngineProps {
  businessType: BusinessType;
  children: React.ReactNode;
  className?: string;
}

export interface PosLayoutProps {
  businessType: BusinessType;
  orderType: string;
  showTableGrid: boolean;
  showCategoriesSidebar: boolean;
  itemGridCols: number;
  cartPosition: 'right' | 'left' | 'bottom';
  onQuickAction: (action: string) => void;
}

// Quick Action Button Component
interface QuickActionButtonProps {
  action: string;
  onClick: () => void;
  disabled?: boolean;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  split_bill: Split,
  merge_tables: Merge,
  transfer_table: ArrowRightLeft,
  discount: Percent,
  void: Ban,
  hold: Pause,
  barcode: ScanLine,
  scale: Weight,
  customer: User,
  layaway: Package,
  gift_card: CreditCard,
  quick_sale: TrendingUp,
  print: Printer,
  prescription: FileText,
  insurance: CreditCard,
  service_ticket: Receipt,
  pickup_time: Clock,
  delivery_time: Truck,
  status: CheckCircle,
  sms: Phone,
  credit_limit: CreditCard,
  installments: Calendar,
  invoice: FileText,
  statement: FileText,
  stock_in: Package,
  stock_out: Package,
  transfer: ArrowRightLeft,
  count: Hash,
  adjust: Percent,
  quick_return: Ban,
  tables: UtensilsCrossed,
  kitchen: UtensilsCrossed,
  qr_menu: QrCode,
  expiry_alert: Clock
};

const ACTION_LABELS: Record<string, string> = {
  split_bill: 'تقسيم الفاتورة',
  merge_tables: 'دمج الطاولات',
  transfer_table: 'نقل الطاولة',
  discount: 'خصم',
  void: 'إلغاء',
  hold: 'تعليق',
  barcode: 'باركود',
  scale: 'ميزان',
  customer: 'عميل',
  layaway: 'حجز',
  gift_card: 'بطاقة هدايا',
  quick_sale: 'بيع سريع',
  print: 'طباعة',
  prescription: 'روشتة',
  insurance: 'تأمين',
  service_ticket: 'تذكرة خدمة',
  pickup_time: 'وقت الاستلام',
  delivery_time: 'وقت التسليم',
  status: 'الحالة',
  sms: 'رسالة',
  credit_limit: 'حد الائتمان',
  installments: 'أقساط',
  invoice: 'فاتورة',
  statement: 'كشف حساب',
  stock_in: 'إضافة مخزون',
  stock_out: 'صرف مخزون',
  transfer: 'تحويل',
  count: 'جرد',
  adjust: 'تسوية',
  quick_return: 'إرجاع',
  tables: 'الطاولات',
  kitchen: 'المطبخ',
  qr_menu: 'قائمة QR',
  expiry_alert: 'تنبيه الصلاحية'
};

export function QuickActionButton({ action, onClick, disabled }: QuickActionButtonProps) {
  const Icon = ACTION_ICONS[action] || Package;
  const label = ACTION_LABELS[action] || action;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted",
        "transition-colors text-center min-w-[80px]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </motion.button>
  );
}

// Order Type Selector
interface OrderTypeSelectorProps {
  businessType: BusinessType;
  currentType: string;
  onChange: (type: string) => void;
}

export function OrderTypeSelector({ businessType, currentType, onChange }: OrderTypeSelectorProps) {
  const config = getBusinessConfig(businessType);
  
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
      {config.orderTypes.map((type) => (
        <motion.button
          key={type.id}
          onClick={() => onChange(type.id)}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            currentType === type.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{type.icon}</span>
          <span className="hidden sm:inline">{type.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

// Quick Actions Bar
interface QuickActionsBarProps {
  businessType: BusinessType;
  onAction: (action: string) => void;
  disabledActions?: string[];
}

export function QuickActionsBar({ businessType, onAction, disabledActions = [] }: QuickActionsBarProps) {
  const actions = useMemo(() => getQuickActions(businessType), [businessType]);
  
  if (actions.length === 0) return null;
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {actions.map((action) => (
        <QuickActionButton
          key={action}
          action={action}
          onClick={() => onAction(action)}
          disabled={disabledActions.includes(action)}
        />
      ))}
    </div>
  );
}

// Feature Gate Component
interface FeatureGateProps {
  businessType: BusinessType;
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ businessType, feature, children, fallback = null }: FeatureGateProps) {
  const hasAccess = hasFeature(businessType, feature as any);
  
  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

// Dynamic Layout Container
interface DynamicLayoutContainerProps {
  businessType: BusinessType;
  orderType: string;
  children: {
    sidebar?: React.ReactNode;
    main: React.ReactNode;
    cart: React.ReactNode;
    tableGrid?: React.ReactNode;
  };
}

export function DynamicLayoutContainer({ 
  businessType, 
  orderType, 
  children 
}: DynamicLayoutContainerProps) {
  const config = getBusinessConfig(businessType);
  const { posLayout } = config;
  const isFood = hasFeature(businessType, 'tables');
  const showTables = isFood && orderType === 'dine_in';
  
  return (
    <div className="flex flex-col lg:flex-row h-full gap-4">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Grid - Only for restaurants with dine-in */}
        {showTables && posLayout.showTableGrid && children.tableGrid && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            {children.tableGrid}
          </motion.div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 min-h-0">
          {children.main}
        </div>
      </div>
      
      {/* Cart Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "w-full lg:w-96 flex flex-col bg-card border rounded-xl overflow-hidden",
          posLayout.cartPosition === 'right' && "lg:order-last",
          posLayout.cartPosition === 'left' && "lg:order-first"
        )}
      >
        {children.cart}
      </motion.div>
    </div>
  );
}

// Business Header with Context
interface BusinessHeaderProps {
  businessType: BusinessType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function BusinessHeader({ businessType, title, subtitle, action }: BusinessHeaderProps) {
  const config = getBusinessConfig(businessType);
  
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: config.theme.sidebarBg, color: config.theme.sidebarText }}
        >
          {config.icon}
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Status Badge for Orders
interface OrderStatusBadgeProps {
  status: string;
  orderType?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: 'text-amber-600', bg: 'bg-amber-100' },
  preparing: { label: 'قيد التحضير', color: 'text-blue-600', bg: 'bg-blue-100' },
  ready: { label: 'جاهز', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  completed: { label: 'مكتمل', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'ملغي', color: 'text-red-600', bg: 'bg-red-100' },
  on_hold: { label: 'معلق', color: 'text-gray-600', bg: 'bg-gray-100' }
};

export function OrderStatusBadge({ status, orderType }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const typeIcon = orderType === 'delivery' ? '🛵' : orderType === 'takeaway' ? '🛍️' : '🍽️';
  
  return (
    <Badge className={cn("font-medium", config.bg, config.color)}>
      {typeIcon} {config.label}
    </Badge>
  );
}

// Specialized Input Placeholder
interface ContextualInputProps {
  businessType: BusinessType;
  type: 'search' | 'customer' | 'notes' | 'address';
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ContextualInput({ 
  businessType, 
  type, 
  value, 
  onChange, 
  className 
}: ContextualInputProps) {
  const config = getBusinessConfig(businessType);
  const placeholder = config.placeholders[type];
  
  const icons = {
    search: ScanLine,
    customer: User,
    notes: StickyNote,
    address: MapPin
  };
  
  const Icon = icons[type];
  
  return (
    <div className={cn("relative", className)}>
      <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pr-10 pl-4 py-2.5 rounded-lg bg-background border text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "transition-all"
        )}
      />
    </div>
  );
}

// Export all components
export default {
  QuickActionButton,
  OrderTypeSelector,
  QuickActionsBar,
  FeatureGate,
  DynamicLayoutContainer,
  BusinessHeader,
  OrderStatusBadge,
  ContextualInput
};
