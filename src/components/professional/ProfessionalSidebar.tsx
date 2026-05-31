import { useMemo, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, BarChart3, Bell, Building2, CalendarClock, ChefHat,
  ChevronDown, CreditCard, DollarSign, FileText, Gift, Heart, Landmark,
  LayoutGrid, LogOut, Moon, Network, Package, QrCode, Receipt, RefreshCw,
  RotateCcw, Settings, Settings2, Shield, ShoppingCart, Sparkles, Sun,
  Truck, Users, UsersRound, Volume2, VolumeX, Wallet, Wifi, WifiOff,
  Menu, Search, X, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getBusinessConfig, type BusinessType } from '@/lib/businessTypes';

export type SidebarTab =
  | 'home' | 'pos' | 'orders' | 'menu' | 'delivery' | 'shifts' | 'stats' | 'kds'
  | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'qr' | 'crm' | 'analytics'
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
  const [isOpen, setIsOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

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
    crm: { label: 'إدارة العلاقات CRM', icon: Heart, section: 'sales' },
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
    analytics: { label: 'التقارير المتقدمة', icon: BarChart3, section: 'analytics' },
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

  const filteredItems = useMemo(() => {
    if (!navSearch.trim()) return navItems;
    return navItems.filter(item => 
      item.label.toLowerCase().includes(navSearch.toLowerCase())
    );
  }, [navItems, navSearch]);

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const handleTabClick = (item: NavItem) => {
    if (item.locked) {
      onUpgrade?.();
      return;
    }
    onTabChange(item.id);
    setIsOpen(false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <header className="fixed top-0 left-0 right-0 z-50 p-3" dir="rtl">
        <div className="glass-card !rounded-2xl !border-white/20 px-4 py-3 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-80 border-l border-white/20 glass-card !rounded-none">
                <div className="h-full flex flex-col">
                  <SheetHeader className="p-6 border-b border-border/50">
                    <SheetTitle className="text-right flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg">
                        {restaurant.logo_url ? (
                          <img src={restaurant.logo_url} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <span>{config.icon}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm truncate">{restaurant.name}</p>
                        <p className="text-[10px] text-muted-foreground">نظام auditry المحاسبي</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="p-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="ابحث عن صفحة..." 
                        className="pr-10 h-10 bg-muted/40 border-none rounded-xl text-sm"
                        value={navSearch}
                        onChange={e => setNavSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <ScrollArea className="flex-1 px-2">
                    <div className="space-y-6 pb-10">
                      {Object.entries(SECTIONS).map(([key, section]) => {
                        const items = groupedItems[key];
                        if (!items || items.length === 0) return null;
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="px-4 flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              <section.icon className="w-3 h-3" />
                              {section.label}
                            </div>
                            <div className="space-y-1">
                              {items.map(item => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => handleTabClick(item)}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all group relative",
                                      isActive 
                                        ? "bg-primary/10 text-primary font-bold" 
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                    )}
                                  >
                                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                                    <span className="flex-1 text-right">{item.label}</span>
                                    {!!item.badge && item.badge > 0 && (
                                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] shadow-sm">
                                        {item.badge}
                                      </Badge>
                                    )}
                                    {isActive && (
                                      <motion.div 
                                        layoutId="active-pill"
                                        className="absolute right-0 w-1 h-6 bg-primary rounded-l-full"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/50 border border-border/50">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl gradient-bg items-center justify-center text-white shadow-lg">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <span>{config.icon}</span>
                )}
              </div>
              <div>
                <h2 className="font-black text-sm lg:text-base leading-none mb-1">{restaurant.name}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-primary/30 text-primary">
                    {allNavItems[activeTab]?.label || 'النظام'}
                  </Badge>
                  {stats.isOnline ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                      <Wifi className="w-2.5 h-2.5" /> متصل
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-destructive">
                      <WifiOff className="w-2.5 h-2.5" /> غير متصل
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            <div className="hidden md:flex items-center gap-1 mr-2 px-3 py-1.5 bg-muted/40 rounded-xl border border-border/50">
               {onForceSync && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={onForceSync} disabled={isSyncing} className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center transition-all">
                      <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isSyncing && 'animate-spin')} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>مزامنة البيانات</TooltipContent>
                </Tooltip>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onToggleSound} className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center transition-all">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>الصوت</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onToggleDark} className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center transition-all">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>المظهر</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={onLogout} 
                  className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>تسجيل الخروج</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {isTrial && (
          <div className="mt-2 mx-auto max-w-lg rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>فترة تجريبية، متبقي <strong>{trialDaysLeft}</strong> يوم</span>
            </div>
            <button onClick={onUpgrade} className="font-black hover:underline bg-amber-500 text-white px-2 py-1 rounded-lg">ترقية الآن</button>
          </div>
        )}
      </header>
    </TooltipProvider>
  );
});
