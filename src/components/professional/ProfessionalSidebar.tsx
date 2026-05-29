import { useMemo, useState, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, BarChart3, Bell, Building2, CalendarClock, ChefHat,
  ChevronDown, CreditCard, DollarSign, FileText, Gift, Heart, Landmark,
  LayoutGrid, LogOut, Moon, Network, Package, QrCode, Receipt, RefreshCw,
  RotateCcw, Settings, Settings2, Shield, ShoppingCart, Sparkles, Sun,
  Truck, Users, UsersRound, Volume2, VolumeX, Wallet, Wifi, WifiOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getBusinessConfig, type BusinessType } from '@/lib/businessTypes';

export type SidebarTab =
  | 'home' | 'pos' | 'orders' | 'menu' | 'delivery' | 'shifts' | 'stats' | 'kds'
  | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'qr'
  | 'waiter' | 'staff' | 'financials' | 'notifications' | 'settings' | 'overheads'
  | 'customer_accounts' | 'sales_returns' | 'supplier_accounts' | 'inventory_receipts'
  | 'ai_assistant' | 'treasury' | 'users' | 'sales_invoices' | 'purchase_invoices'
  | 'sales_orders' | 'purchase_orders' | 'projects' | 'manual_journal'
  | 'chart_of_accounts' | 'accounting_mapping' | 'fixed_assets'
  | 'loyalty' | 'gift_cards' | 'branches';

interface NavItem {
  id: SidebarTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  locked?: boolean;
  section: string;
}

interface ProfessionalSidebarProps {
  businessType: BusinessType;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  restaurant: {
    id: string;
    name: string;
    logo_url?: string | null;
    status: string;
    subscription_end?: string | null;
  };
  user: {
    email?: string;
    full_name?: string;
  };
  stats: {
    pendingOrders: number;
    deliveryOrders: number;
    unackCalls: number;
    todayRevenue: number;
    isOnline: boolean;
    salesInvoicesCount?: number;
    purchaseInvoicesCount?: number;
    expensesCount?: number;
    returnsCount?: number;
    customersCount?: number;
    suppliersCount?: number;
    inventoryReceiptsCount?: number;
    totalSales?: number;
    totalProfit?: number;
    currency?: string;
  };
  isTrial?: boolean;
  trialDaysLeft?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onUpgrade?: () => void;
  tabs?: SidebarTab[];
  pendingCount?: number;
  isSyncing?: boolean;
  syncStatus?: { synced: number; errors: number; lastSync: Date | null };
  onForceSync?: () => void;
}

const SECTIONS: Record<string, { label: string; icon: React.ElementType }> = {
  main: { label: 'مركز التشغيل', icon: LayoutGrid },
  sales: { label: 'المبيعات والعملاء', icon: Receipt },
  purchases: { label: 'المشتريات', icon: ShoppingCart },
  inventory: { label: 'المخزون والمنتجات', icon: Package },
  accounting: { label: 'الخزينة والمحاسبة', icon: Landmark },
  analytics: { label: 'التقارير والذكاء', icon: BarChart3 },
  system: { label: 'إدارة النظام', icon: Settings },
};

export const ProfessionalSidebar = memo(function ProfessionalSidebar({
  businessType,
  activeTab,
  onTabChange,
  restaurant,
  user,
  stats,
  isTrial = false,
  trialDaysLeft = 0,
  soundEnabled,
  onToggleSound,
  isDark,
  onToggleDark,
  onLogout,
  onUpgrade,
  tabs,
  pendingCount = 0,
  isSyncing = false,
  syncStatus,
  onForceSync
}: ProfessionalSidebarProps) {
  const config = getBusinessConfig(businessType);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const isSuspended = restaurant.status === 'suspended' ||
    (restaurant.subscription_end && new Date(restaurant.subscription_end) < new Date());
  const lockedTabs: SidebarTab[] = isTrial ? ['orders', 'delivery', 'shifts', 'stats'] : [];

  const allNavItems: Record<string, Partial<NavItem>> = {
    home: { label: 'لوحة التحكم', icon: BarChart3, section: 'main' },
    pos: { label: 'نقطة البيع', icon: LayoutGrid, section: 'main' },
    orders: { label: config.labels.orders, icon: Receipt, badge: stats.pendingOrders, section: 'main' },
    menu: { label: config.labels.menu, icon: config.category === 'food' ? ChefHat : Package, section: 'main' },
    inventory: { label: 'المخزون', icon: Package, section: 'main' },
    treasury: { label: 'الخزينة', icon: Wallet, section: 'main' },
    shifts: { label: 'الشيفتات', icon: CalendarClock, section: 'main' },
    kds: { label: 'عرض المطبخ', icon: ChefHat, section: 'main' },
    delivery: { label: 'التوصيل', icon: Truck, badge: stats.deliveryOrders, section: 'main' },
    qr: { label: 'QR Menu', icon: QrCode, section: 'main' },
    waiter: { label: 'طلبات الجرسون', icon: Bell, badge: stats.unackCalls, section: 'main' },

    customers: { label: config.labels.customers, icon: Users, badge: stats.customersCount, section: 'sales' },
    sales_orders: { label: 'أوامر البيع', icon: FileText, section: 'sales' },
    sales_invoices: { label: 'فواتير البيع', icon: Receipt, badge: stats.salesInvoicesCount, section: 'sales' },
    sales_returns: { label: 'مرتجع المبيعات', icon: RotateCcw, badge: stats.returnsCount, section: 'sales' },
    loyalty: { label: 'نقاط الولاء', icon: Heart, section: 'sales' },
    gift_cards: { label: 'بطاقات الهدايا', icon: Gift, section: 'sales' },
    branches: { label: 'الفروع', icon: Building2, section: 'sales' },
    projects: { label: 'المشاريع', icon: FileText, section: 'sales' },

    purchase_orders: { label: 'أوامر الشراء', icon: ShoppingCart, section: 'purchases' },
    purchase_invoices: { label: 'فواتير المشتريات', icon: DollarSign, badge: stats.purchaseInvoicesCount, section: 'purchases' },
    suppliers: { label: 'الموردين', icon: UsersRound, badge: stats.suppliersCount, section: 'purchases' },
    inventory_receipts: { label: 'استلام المخزون', icon: FileText, badge: stats.inventoryReceiptsCount, section: 'inventory' },
    overheads: { label: 'التكاليف الثابتة', icon: BarChart3, section: 'inventory' },

    chart_of_accounts: { label: 'شجرة الحسابات', icon: Network, section: 'accounting' },
    accounting_mapping: { label: 'التوجيه المحاسبي', icon: Settings2, section: 'accounting' },
    financials: { label: 'التقارير المالية', icon: Wallet, section: 'accounting' },
    expenses: { label: 'المصروفات', icon: DollarSign, badge: stats.expensesCount, section: 'accounting' },
    manual_journal: { label: 'قيود اليومية', icon: FileText, section: 'accounting' },
    customer_accounts: { label: 'حسابات العملاء', icon: CreditCard, section: 'accounting' },
    supplier_accounts: { label: 'حسابات الموردين', icon: Wallet, section: 'accounting' },
    fixed_assets: { label: 'الأصول الثابتة', icon: Building2, section: 'accounting' },

    stats: { label: 'الإحصائيات', icon: BarChart3, section: 'analytics' },
    ai_assistant: { label: 'مساعد المحاسب', icon: Sparkles, section: 'analytics' },
    staff: { label: 'الموظفين', icon: Users, section: 'system' },
    users: { label: 'الصلاحيات', icon: Shield, section: 'system' },
    notifications: { label: 'التنبيهات', icon: Bell, section: 'system' },
    settings: { label: 'الإعدادات', icon: Settings, section: 'system' },
  };

  const navItems = useMemo(() => {
    const displayTabs = tabs || config.tabs;
    return displayTabs
      .map(tabId => {
        const item = allNavItems[tabId];
        if (!item) return null;
        return {
          id: tabId,
          label: item.label!,
          icon: item.icon!,
          badge: item.badge,
          section: item.section || 'main',
          locked: lockedTabs.includes(tabId as SidebarTab),
        } as NavItem;
      })
      .filter(Boolean) as NavItem[];
  }, [tabs, config.tabs, stats.pendingOrders, stats.deliveryOrders, stats.unackCalls, stats.customersCount, stats.suppliersCount, stats.inventoryReceiptsCount]);

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const activeItem = navItems.find(item => item.id === activeTab);
  const mainQuickItems = (groupedItems.main || []).slice(0, 6);

  const handleTabClick = (item: NavItem) => {
    if (item.locked) {
      onUpgrade?.();
      return;
    }
    onTabChange(item.id);
    setOpenSection(null);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <header className="fixed top-3 left-3 right-3 z-50" dir="rtl">
        <div className="glass-card !rounded-2xl !border-white/20 px-3 py-2 shadow-2xl">
          <div className="flex items-center justify-between gap-2 lg:gap-4">
            {/* Logo & Restaurant Name */}
            <button
              onClick={() => onTabChange('home')}
              className="flex items-center gap-2 sm:gap-3 shrink-0 rounded-xl px-2 py-1.5 hover:bg-muted/40 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-lg"
                style={{ background: config.theme.gradient }}
              >
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt="" className="w-7 h-7 object-contain" />
                ) : (
                  <span>{config.icon}</span>
                )}
              </div>
              <div className="hidden md:block text-right min-w-0">
                <p className="font-bold text-sm truncate max-w-[120px] lg:max-w-[200px]">{restaurant.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeItem?.label || config.label}
                  {isSuspended && <Badge variant="destructive" className="mr-2 text-[9px]">موقوف</Badge>}
                </p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 justify-center px-2">
              {mainQuickItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item)}
                    className={cn(
                      'relative flex items-center gap-2 h-10 px-3 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap',
                      isActive ? 'gradient-bg text-white shadow-lg shadow-primary/20' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[9px]">{item.badge}</Badge>
                    )}
                  </button>
                );
              })}

              {Object.entries(groupedItems)
                .filter(([section]) => section !== 'main')
                .map(([section, items]) => {
                  const SectionIcon = SECTIONS[section]?.icon || Settings;
                  const hasActive = items.some(item => item.id === activeTab);
                  return (
                    <div
                      key={section}
                      className="relative"
                      onMouseEnter={() => setOpenSection(section)}
                      onMouseLeave={() => setOpenSection(null)}
                    >
                      <button
                        onClick={() => setOpenSection(openSection === section ? null : section)}
                        className={cn(
                          'flex items-center gap-2 h-10 px-3 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap',
                          hasActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <SectionIcon className="w-4 h-4" />
                        <span className="hidden lg:inline">{SECTIONS[section]?.label || section}</span>
                        <ChevronDown className={cn('w-3 h-3 transition-transform', openSection === section && 'rotate-180')} />
                      </button>

                      {openSection === section && (
                        <div className="absolute right-0 top-full pt-2 w-72">
                          <div className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-2">
                            {items.map(item => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleTabClick(item)}
                                  className={cn(
                                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all text-right',
                                    isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/70'
                                  )}
                                >
                                  <span className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4" />
                                  </span>
                                  <span className="flex-1">{item.label}</span>
                                  {!!item.badge && item.badge > 0 && (
                                    <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">{item.badge}</Badge>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </nav>

            {/* Tablet/Small Desktop Dropdown */}
            <div className="hidden lg:flex xl:hidden flex-1 justify-center px-4">
               <button
                onClick={() => setOpenSection(openSection === 'tablet' ? null : 'tablet')}
                className="flex items-center justify-between gap-4 h-10 px-6 rounded-xl bg-muted/50 text-sm font-bold min-w-[200px]"
              >
                <span>{activeItem?.label || 'القائمة'}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', openSection === 'tablet' && 'rotate-180')} />
              </button>
              {openSection === 'tablet' && (
                <div className="absolute right-1/2 translate-x-1/2 top-full pt-2 w-[500px] max-w-[90vw]">
                  <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-4 grid grid-cols-2 gap-4">
                    {Object.entries(groupedItems).map(([section, items]) => (
                      <div key={section} className="space-y-1">
                        <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{SECTIONS[section]?.label || section}</p>
                        {items.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button key={item.id} onClick={() => handleTabClick(item)} className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all", isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/70")}>
                              <Icon className="w-4 h-4" />
                              <span className="flex-1 text-right">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Dropdown */}
            <div className="lg:hidden relative flex-1">
              <button
                onClick={() => setOpenSection(openSection === 'mobile' ? null : 'mobile')}
                className="w-full flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-muted/50 text-sm font-bold"
              >
                <span className="truncate">{activeItem?.label || 'القائمة'}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', openSection === 'mobile' && 'rotate-180')} />
              </button>
              {openSection === 'mobile' && (
                <div className="absolute right-0 left-0 top-full pt-2">
                  <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-2">
                    {Object.entries(groupedItems).map(([section, items]) => (
                      <div key={section} className="mb-2">
                        <p className="px-3 py-1 text-[11px] font-bold text-muted-foreground">{SECTIONS[section]?.label || section}</p>
                        {items.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button key={item.id} onClick={() => handleTabClick(item)} className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-right", isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/70")}>
                              <Icon className="w-4 h-4" />
                              <span className="flex-1 text-right">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1 shrink-0">
              <div className={cn('hidden sm:flex items-center gap-2 rounded-xl px-2 lg:px-3 h-10 text-[10px] lg:text-xs font-bold', stats.isOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive')}>
                {stats.isOnline ? <Wifi className="w-3 h-3 lg:w-4 lg:h-4" /> : <WifiOff className="w-3 h-3 lg:w-4 lg:h-4" />}
                <span className="hidden md:inline">{stats.isOnline ? 'متصل' : 'غير متصل'}</span>
                {pendingCount > 0 && <span className="text-amber-600">({pendingCount})</span>}
              </div>

              {onForceSync && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={onForceSync} disabled={isSyncing} className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl hover:bg-muted/60 flex items-center justify-center transition-colors">
                      <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>مزامنة</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onToggleSound} className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl hover:bg-muted/60 flex items-center justify-center transition-colors">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>الصوت</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onToggleDark} className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl hover:bg-muted/60 flex items-center justify-center transition-colors">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>المظهر</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onLogout} className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl hover:bg-destructive/10 text-destructive flex items-center justify-center transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>تسجيل الخروج</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {isTrial && (
            <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>فترة تجريبية، متبقي {trialDaysLeft} يوم</span>
              <button onClick={onUpgrade} className="font-bold hover:underline">ترقية الآن</button>
            </div>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
});
