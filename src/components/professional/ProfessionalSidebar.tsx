
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, ShoppingCart, QrCode, Bell, Settings, LogOut,
  Receipt, Wifi, WifiOff, X, Check, BarChart3, ChefHat,
  CalendarClock, Package, Users, Truck, Wallet, Store,
  UsersRound, DollarSign, Lock, ChevronLeft, ChevronRight,
  Sparkles, Crown, Zap, Moon, Sun, Volume2, VolumeX,
  CreditCard, TrendingUp, Shield, HelpCircle, RotateCcw, FileText, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getBusinessConfig, type BusinessType } from '@/lib/businessTypes';

export type SidebarTab = 
  | 'pos' | 'orders' | 'menu' | 'delivery' | 'shifts' | 'stats' 
  | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'qr' 
  | 'waiter' | 'staff' | 'financials' | 'notifications' | 'settings' | 'overheads'
  | 'customer_accounts' | 'sales_returns' | 'supplier_accounts' | 'inventory_receipts';

interface NavItem {
  id: SidebarTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  locked?: boolean;
  section?: string;
  shortcut?: string;
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
  };
  isTrial?: boolean;
  trialDaysLeft?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  onUpgrade?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SECTIONS = {
  main: 'الرئيسية',
  sales: 'إدارة المبيعات',
  inventory: 'المخزون والتكاليف',
  accounting: 'المحاسبة والمالية',
  analytics: 'التقارير والذكاء الاصطناعي',
  system: 'إدارة النظام'
};

export function ProfessionalSidebar({
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
  isCollapsed = false,
  onToggleCollapse
}: ProfessionalSidebarProps) {
  const config = getBusinessConfig(businessType);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const isSuspended = restaurant.status === 'suspended' || 
    (restaurant.subscription_end && new Date(restaurant.subscription_end) < new Date());

  const lockedTabs: SidebarTab[] = isTrial ? ['orders', 'delivery', 'shifts', 'stats'] : [];

  const navItems: NavItem[] = [
    // 1. الرئيسية
    { id: 'pos', label: 'نقطة البيع', icon: LayoutGrid, section: 'main', shortcut: 'F1' },
    
    // 2. المبيعات
    { id: 'orders', label: config.labels.orders, icon: Receipt, badge: stats.pendingOrders, section: 'sales', locked: lockedTabs.includes('orders') },
    { id: 'menu', label: config.labels.menu, icon: ShoppingCart, section: 'sales' },
    { id: 'sales_returns', label: 'مردودات المبيعات', icon: RotateCcw, section: 'sales' },
    { id: 'delivery', label: 'المناديب', icon: Truck, badge: stats.deliveryOrders, section: 'sales', locked: lockedTabs.includes('delivery') },
    
    // 3. المخزون والتكاليف
    ...(config.features.includes('inventory') ? [
      { id: 'inventory', label: config.labels.inventory, icon: Package, section: 'inventory' },
      { id: 'inventory_receipts', label: 'إيصالات المخزون', icon: Receipt, section: 'inventory' }
    ] : []),
    
    // 4. المحاسبة والمالية (التابة المدمجة الكبرى)
    { id: 'customers', label: 'العملاء وحساباتهم', icon: Users, section: 'accounting' },
    { id: 'suppliers', label: 'الموردين وحساباتهم', icon: Store, section: 'accounting' },
    { id: 'expenses', label: 'المصروفات والمرافق', icon: Wallet, section: 'accounting' },
    { id: 'financials', label: 'القوائم المالية', icon: DollarSign, section: 'accounting' },
    { id: 'overheads', label: 'النفقات العامة', icon: TrendingUp, section: 'accounting' },
    
    // 5. التقارير والذكاء الاصطناعي
    { id: 'analytics', label: 'مركز التقارير والتحليلات', icon: BarChart3, section: 'analytics' },
    { id: 'stats', label: 'إحصائيات الأداء', icon: Activity, section: 'analytics', locked: lockedTabs.includes('stats') },
    { id: 'shifts', label: 'إدارة الشفتات', icon: CalendarClock, section: 'analytics', locked: lockedTabs.includes('shifts') },
    
    // 6. النظام
    { id: 'qr', label: 'قائمة QR', icon: QrCode, section: 'system' },
    { id: 'staff', label: 'الموظفين', icon: UsersRound, section: 'system' },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, section: 'system' },
    { id: 'settings', label: 'الإعدادات', icon: Settings, section: 'system' }
  ].filter(Boolean) as NavItem[];

  const groupedItems = navItems.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const handleTabClick = (tabId: SidebarTab) => {
    const item = navItems.find(i => i.id === tabId);
    if (item?.locked) {
      onUpgrade?.();
      return;
    }
    onTabChange(tabId);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "h-screen flex flex-col shrink-0 border-l border-border bg-card/95 backdrop-blur-xl",
          "relative z-50"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="absolute -left-3 top-20 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                "bg-gradient-to-br shadow-lg"
              )}
              style={{ 
                background: config.theme.gradient,
                boxShadow: `0 4px 20px -4px hsl(${config.theme.primary})`
              }}
            >
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <span>{config.icon}</span>
              )}
            </motion.div>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="min-w-0 flex-1"
                >
                  <h2 className="font-display font-bold text-sm truncate text-foreground">
                    {restaurant.name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <span>{config.label}</span>
                    {isSuspended && (
                      <Badge variant="destructive" className="text-[8px] px-1 py-0">موقوف</Badge>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trial Banner */}
          <AnimatePresence>
            {!isCollapsed && isTrial && !isSuspended && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">فترة تجريبية</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  متبقي {trialDaysLeft} يوم
                </p>
                <button 
                  onClick={onUpgrade}
                  className="text-[10px] text-primary font-medium mt-1 hover:underline flex items-center gap-1"
                >
                  <Crown className="w-3 h-3" />
                  ترقية الآن
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="mb-4">
              {!isCollapsed && (
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  {SECTIONS[section as keyof typeof SECTIONS]}
                </p>
              )}
              
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = activeTab === item.id;
                  const isLocked = item.locked;
                  const Icon = item.icon;
                  
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => handleTabClick(item.id)}
                          onHoverStart={() => setHoveredItem(item.id)}
                          onHoverEnd={() => setHoveredItem(null)}
                          whileHover={{ x: isCollapsed ? 0 : 2 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                            "relative overflow-hidden group",
                            isActive 
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            isLocked && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {/* Active Indicator */}
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full"
                              style={{ background: `hsl(${config.theme.primary})` }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          
                          {/* Icon */}
                          <div className={cn(
                            "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0",
                            isActive 
                              ? "bg-primary/10"
                              : "bg-muted/50 group-hover:bg-muted"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4 transition-colors",
                              isActive && "text-primary"
                            )} />
                            
                            {/* Badge on Icon */}
                            {item.badge && item.badge > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            )}
                          </div>
                          
                          {/* Label */}
                          <AnimatePresence mode="wait">
                            {!isCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex-1 text-right"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          
                          {/* Locked Icon */}
                          {!isCollapsed && isLocked && (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}
                          
                          {/* Shortcut */}
                          {!isCollapsed && item.shortcut && !isActive && (
                            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      
                      {isCollapsed && (
                        <TooltipContent side="left" className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="h-4 text-[9px]">
                              {item.badge}
                            </Badge>
                          )}
                          {isLocked && <Lock className="w-3 h-3" />}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border/50 space-y-2">
          {/* Online Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
            stats.isOnline ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          )}>
            {stats.isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                {!isCollapsed && <span>متصل</span>}
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                {!isCollapsed && <span>غير متصل</span>}
              </>
            )}
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleSound}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors",
                    "hover:bg-muted"
                  )}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                  {!isCollapsed && (
                    <span className={soundEnabled ? "text-emerald-600" : "text-muted-foreground"}>
                      {soundEnabled ? 'الصوت مفعل' : 'صامت'}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>تبديل الصوت</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleDark}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors",
                    "hover:bg-muted"
                  )}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  )}
                  {!isCollapsed && (
                    <span>{isDark ? 'وضع فاتح' : 'وضع داكن'}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>تبديل المظهر</TooltipContent>
            </Tooltip>
          </div>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {!isCollapsed && <span>تسجيل الخروج</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent>تسجيل الخروج</TooltipContent>
          </Tooltip>

          {/* User Info */}
          {!isCollapsed && (
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 px-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {user.full_name?.[0] || user.email?.[0] || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

export default ProfessionalSidebar;
