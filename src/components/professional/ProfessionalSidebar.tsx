import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BarChart3, Bell, Building2, CalendarClock, ChefHat, Construction,
  CreditCard, DollarSign, FileText, FileCheck, Gift, Heart, Landmark, Layers,
  LayoutGrid, LogOut, MessageSquare, Moon, Network, Package, QrCode, Receipt, RefreshCw,
  RotateCcw, Settings, Settings2, Shield, ShoppingCart, Sparkles, Sun,
  Truck, Users, UsersRound, Volume2, VolumeX, Wallet, Wifi, WifiOff,
  Search, User, ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBusinessConfig, type BusinessType } from '@/lib/businessTypes';

export type SidebarTab =
  | 'home' | 'pos' | 'orders' | 'menu' | 'delivery' | 'shifts' | 'stats' | 'kds'
  | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'qr' | 'crm' | 'analytics'
  | 'waiter' | 'staff' | 'financials' | 'notifications' | 'settings' | 'overheads'
  | 'customer_accounts' | 'sales_returns' | 'supplier_accounts' | 'inventory_receipts'
  | 'ai_assistant' | 'treasury' | 'users' | 'sales_invoices' | 'purchase_invoices'
  | 'sales_orders' | 'purchase_orders' | 'projects' | 'manual_journal'
  | 'chart_of_accounts' | 'accounting_mapping' | 'fixed_assets'
  | 'loyalty' | 'gift_cards' | 'branches' | 'contracting' | 'bom' | 'service_packages' | 'payroll' | 'chat'
  | 'employees' | 'supplier_contracts' | 'marketing_services' | 'marketing_quotes' | 'marketing_contracts' | 'contractors';

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
    unackCalls?: number;
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
  isSuperAdmin?: boolean;
}

const SECTIONS: Record<string, { label: string; icon: React.ElementType }> = {
  main: { label: 'الرئيسية', icon: LayoutGrid },
  parties: { label: 'العملاء والموردين والمخازن', icon: Users },
  finance: { label: 'المحاسبة والتقارير والذكاء', icon: Landmark },
  system: { label: 'النظام والإعدادات', icon: Settings },
};

// Map legacy section IDs to the new consolidated sections
const SECTION_MAP: Record<string, string> = {
  main: 'main',
  sales: 'parties',
  purchases: 'parties',
  inventory: 'parties',
  accounting: 'finance',
  analytics: 'finance',
  system: 'system',
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
  onForceSync,
  isSuperAdmin
}: ProfessionalSidebarProps) {
  const config = getBusinessConfig(businessType);

  const allNavItems: Record<string, Partial<NavItem>> = {
    home: { label: 'الرئيسية', icon: LayoutGrid, section: 'main' },
    pos: { label: 'نقطة البيع', icon: ShoppingCart, section: 'main' },
    orders: { label: config.labels.orders, icon: Receipt, badge: stats.pendingOrders, section: 'main' },
    menu: { label: config.labels.menu, icon: config.category === 'food' ? ChefHat : Package, section: 'main' },
    employees: { label: 'الموظفين والرواتب', icon: Users, badge: stats.customersCount, section: 'main' },
    
    customers: { label: 'العملاء والحسابات', icon: Users, badge: stats.customersCount, section: 'sales' },
    customer_accounts: { label: '', icon: CreditCard, section: 'sales' }, // merged into 'customers'
    crm: { label: 'CRM', icon: Heart, section: 'sales' },
    sales_orders: { label: 'أوامر البيع', icon: FileText, section: 'sales' },
    sales_invoices: { label: 'فواتير البيع', icon: Receipt, badge: stats.salesInvoicesCount, section: 'sales' },
    sales_returns: { label: 'مرتجعات مبيعات', icon: RotateCcw, badge: stats.returnsCount, section: 'sales' },
    
    suppliers: { label: 'الموردين والحسابات', icon: UsersRound, badge: stats.suppliersCount, section: 'purchases' },
    supplier_accounts: { label: '', icon: Wallet, section: 'purchases' }, // merged into 'suppliers'
    purchase_orders: { label: 'أوامر شراء', icon: ShoppingCart, section: 'purchases' },
    purchase_invoices: { label: 'فواتير شراء', icon: DollarSign, badge: stats.purchaseInvoicesCount, section: 'purchases' },
    supplier_contracts: { label: 'عقود الموردين والعمولات', icon: FileText, section: 'purchases' },
    
    inventory: { label: 'المخزون', icon: Package, section: 'inventory' },
    // inventory_receipts: { label: 'استلام بضاعة', icon: FileText, badge: stats.inventoryReceiptsCount, section: 'inventory' },
    
    bom: { label: 'تكاليف الإنتاج', icon: Layers, section: 'inventory' },
    service_packages: { label: 'حزم الخدمات', icon: Package, section: 'main' },
    
    financials: { label: 'القوائم المالية', icon: Wallet, section: 'accounting' },
    treasury: { label: 'الخزينة والبنك', icon: Wallet, section: 'accounting' },
    expenses: { label: 'المصروفات', icon: DollarSign, badge: stats.expensesCount, section: 'accounting' },
    chart_of_accounts: { label: 'دليل الحسابات', icon: Network, section: 'accounting' },
    manual_journal: { label: 'قيود اليومية', icon: FileText, section: 'accounting' },
    fixed_assets: { label: 'الأصول الثابتة', icon: Building2, section: 'accounting' },
    accounting_mapping: { label: 'توجيه المحاسبة', icon: Settings2, section: 'accounting' },
    contracting: { label: 'المقاولات', icon: Construction, section: 'main' },
    projects: { label: 'المشاريع', icon: Construction, section: 'main' },

    analytics: { label: 'التقارير', icon: BarChart3, section: 'analytics' },
    stats: { label: 'إحصائيات', icon: BarChart3, section: 'analytics' },
    ai_assistant: { label: 'الذكاء الاصطناعي', icon: Sparkles, section: 'analytics' },
    
    staff: { label: 'الموظفين', icon: Users, section: 'system' },
    payroll: { label: 'الرواتب الشهرية', icon: DollarSign, section: 'system' },
    chat: { label: 'دردشة التيم', icon: MessageSquare, section: 'system' },
    users: { label: 'الصلاحيات', icon: Shield, section: 'system' },
    super_admin: { label: 'لوحة التحكم الشاملة', icon: Shield, section: 'system' },
    settings: { label: 'إعدادات النظام', icon: Settings, section: 'system' },
    notifications: { label: 'التنبيهات', icon: Bell, section: 'system' },
    
    delivery: { label: 'التوصيل', icon: Truck, badge: stats.deliveryOrders, section: 'main' },
    shifts: { label: 'الشيفتات', icon: CalendarClock, section: 'main' },
    kds: { label: 'المطبخ', icon: ChefHat, section: 'main' },
    qr: { label: 'QR Menu', icon: QrCode, section: 'main' },
    waiter: { label: 'الجرسون', icon: Bell, badge: stats.unackCalls, section: 'main' },
    loyalty: { label: 'الولاء', icon: Heart, section: 'sales' },
    gift_cards: { label: 'الهدايا', icon: Gift, section: 'sales' },
    branches: { label: 'الفروع', icon: Building2, section: 'sales' },
    
    marketing_services: { label: 'خدمات التسويق', icon: Sparkles, section: 'main' },
    marketing_quotes: { label: 'عروض الأسعار', icon: FileText, section: 'main' },
    marketing_contracts: { label: 'عقود التسويق', icon: FileCheck, section: 'main' },
    contractors: { label: 'الصنايعية', icon: UsersRound, section: 'main' },
  };

  const navItems = useMemo(() => {
    const displayTabs = tabs || config.tabs;
    return displayTabs
      .map(tabId => {
        const item = allNavItems[tabId];
        if (!item) return null;
        if (!item.label) return null; // hide merged duplicates (customer_accounts, supplier_accounts)
        
        // Super Admin protection
        if (tabId === 'super_admin' && !isSuperAdmin) return null;

        return {
          id: tabId,
          label: item.label!,
          icon: item.icon!,
          badge: item.badge,
          section: SECTION_MAP[item.section || 'main'] || 'main',
        } as NavItem;
      })
      .filter(Boolean) as NavItem[];
  }, [tabs, config.tabs, stats, isSuperAdmin]);

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <TooltipProvider delayDuration={0}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm h-16" dir="rtl">
        <div className="container mx-auto h-full flex items-center justify-between px-4 gap-4">
          {/* Logo & Restaurant Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <span>{config.icon}</span>
              )}
            </div>
            <div className="hidden sm:block">
              <h2 className="font-black text-sm leading-none mb-1 truncate max-w-[120px]">{restaurant.name}</h2>
              <div className="flex items-center gap-2">
                {stats.isOnline ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                    <Wifi className="w-2.5 h-2.5" /> متصل
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-destructive">
                    <WifiOff className="w-2.5 h-2.5" /> أوفلاين
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Navigation - Horizontal Scroll on Mobile */}
          <nav className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-2">
            {Object.entries(SECTIONS).map(([key, section]) => {
              const items = groupedItems[key];
              if (!items || items.length === 0) return null;
              
              const isSectionActive = items.some(i => i.id === activeTab);

              return (
                <DropdownMenu key={key}>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] lg:text-xs font-bold transition-all whitespace-nowrap",
                      isSectionActive 
                        ? "bg-primary text-primary-foreground shadow-md scale-105" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                      <section.icon className="w-3.5 h-3.5 lg:w-4 h-4" />
                      <span className="inline-block">{section.label}</span>
                      <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform", isSectionActive && "rotate-180")} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-72 max-h-[70vh] overflow-y-auto glass-card !rounded-2xl border-white/20 p-2 shadow-2xl z-[60]">
                    {items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={() => onTabChange(item.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                            isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="flex-1 text-right">{item.label}</span>
                          {!!item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] flex items-center justify-center">
                              {item.badge}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Action Buttons & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1 bg-muted/40 rounded-xl border border-border/50 p-1">
              <button onClick={onToggleSound} className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center transition-all">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={onToggleDark} className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center transition-all">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shadow-inner">
                    {user?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass-card !rounded-2xl border-white/20 p-2">
                <DropdownMenuLabel className="p-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-black">{user?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => onTabChange('settings')} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                  <Settings className="w-4 h-4" />
                  <span>الإعدادات الشخصية</span>
                </DropdownMenuItem>
                {onForceSync && (
                  <DropdownMenuItem onClick={onForceSync} disabled={isSyncing} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                    <span>مزامنة البيانات</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={onLogout} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
});
