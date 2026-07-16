// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, FileText, Download, Trash2, Check, X,
  Play, Pause, ChefHat, Clock, BarChart3, TrendingUp,
  Truck, Ban, AlertTriangle, UserX, Search,
  DollarSign, ShoppingCart, MapPin, Phone, Eye, EyeOff,
  Calendar, ArrowUpRight, ArrowDownRight, Activity,
  Store, Database, CalendarPlus, LayoutGrid, Building2, Package,
  UserPlus, ChevronRight, Sparkles, Edit, Globe, Facebook, Music
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CompanyDrillIn } from '@/components/CompanyDrillIn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useDarkMode } from '@/lib/useDarkMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';
import { StaffAccessApprovals } from './dashboard/StaffAccessApprovals';
import { GlobalDashboard } from '@/components/superadmin/GlobalDashboard';
import { AdminNotificationsPanel } from '@/components/superadmin/AdminNotificationsPanel';
import { LanguageSwitcher } from '@/components/global/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getLanguageDir } from '@/lib/i18n';
import { Bell, Gift } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

type Tab = 'overview' | 'restaurants' | 'users' | 'agents' | 'bans' | 'receipts' | 'backup' | 'tabs_management' | 'tracking_pixels' | 'notifications' | 'free_plan';

const CHART_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'
];

const BAN_LEVELS = {
  warning: { label: 'تحذير', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  temporary: { label: 'حظر مؤقت', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  permanent: { label: 'حظر دائم', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const ALL_TABS_CONFIG = {
  pos: { label: 'نقطة البيع', icon: '🛒' },
  orders: { label: 'الطلبات', icon: '📄' },
  menu: { label: 'المنيو/الأصناف', icon: '📦' },
  employees: { label: 'الموظفين والرواتب', icon: '👥' },
  customers: { label: 'العملاء والحسابات', icon: '👥' },
  crm: { label: 'إدارة علاقات العملاء CRM', icon: '❤️' },
  sales_orders: { label: 'أوامر البيع', icon: '📄' },
  sales_invoices: { label: 'فواتير البيع', icon: '📄' },
  sales_returns: { label: 'مرتجعات المبيعات', icon: '🔄' },
  suppliers: { label: 'الموردين والحسابات', icon: '👥' },
  purchase_orders: { label: 'أوامر الشراء', icon: '🛒' },
  purchase_invoices: { label: 'فواتير الشراء', icon: '💵' },
  supplier_contracts: { label: 'عقود الموردين والعمولات', icon: '📄' },
  inventory: { label: 'المخزون', icon: '📦' },
  bom: { label: 'تكاليف الإنتاج (BOM)', icon: '🥞' },
  service_packages: { label: 'حزم الخدمات', icon: '📦' },
  financials: { label: 'القوائم المالية', icon: '💼' },
  treasury: { label: 'الخزينة والبنك', icon: '💼' },
  expenses: { label: 'المصروفات', icon: '💵' },
  chart_of_accounts: { label: 'دليل الحسابات', icon: '🕸️' },
  manual_journal: { label: 'قيود اليومية', icon: '📄' },
  fixed_assets: { label: 'الأصول الثابتة', icon: '🏢' },
  accounting_mapping: { label: 'توجيه المحاسبة', icon: '⚙️' },
  contracting: { label: 'المقاولات', icon: '🏗️' },
  contractors: { label: 'الصنايعية والخدمات', icon: '👷' },
  projects: { label: 'المشاريع', icon: '🏗️' },
  analytics: { label: 'التقارير والإحصائيات', icon: '📊' },
  ai_assistant: { label: 'المساعد الذكي (AI)', icon: '✨' },
  staff: { label: 'فريق العمل', icon: '👥' },
  payroll: { label: 'مسيرات الرواتب', icon: '💵' },
  chat: { label: 'دردشة التيم', icon: '💬' },
  users: { label: 'الصلاحيات والمستخدمين', icon: '🛡️' },
  settings: { label: 'إعدادات النظام', icon: '⚙️' },
  notifications: { label: 'التنبيهات', icon: '🔔' },
  delivery: { label: 'التوصيل والمناديب', icon: '🛵' },
  shifts: { label: 'الشيفتات اليومية', icon: '📅' },
  kds: { label: 'شاشة المطبخ (KDS)', icon: '👨‍🍳' },
  qr: { label: 'منيو QR الذكي', icon: '📱' },
  waiter: { label: 'استدعاء الجرسون', icon: '🔔' },
  loyalty: { label: 'نقاط الولاء', icon: '❤️' },
  gift_cards: { label: 'كروت الهدايا', icon: '🎁' },
  branches: { label: 'الفروع والمنافذ', icon: '🏢' },
  marketing_services: { label: 'خدمات التسويق', icon: '✨' },
  marketing_quotes: { label: 'عروض الأسعار', icon: '📄' },
  marketing_contracts: { label: 'عقود التسويق', icon: '📄' },
  marketing_workflow: { label: 'سير العمل التسويقي', icon: '🔄' },
  marketing_accounting: { label: 'المحاسبة التسويقية', icon: '💰' },
  service_deliverables: { label: 'متابعة التسليمات', icon: '📦' },
  garment_production: { label: 'إنتاج الملابس', icon: '✂️' },
  marketing_hub: { label: 'مركز التسويق', icon: '📢' },
};

const SuperAdmin = () => {
  useDarkMode();
  const { t, i18n } = useTranslation();
  const dir = getLanguageDir(i18n.language);
  const navigate = useNavigate();
  const { user, isSuperAdmin, adminChecked, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [extendDays, setExtendDays] = useState<Record<string, number>>({});
  const [drillIn, setDrillIn] = useState<{ id: string; name: string } | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [newRestaurantForm, setNewRestaurantForm] = useState({ name: '', business_type: 'restaurant', owner_id: '' });
  const [newUserForm, setNewUserForm] = useState({ email: '', fullName: '', restaurantId: '', role: 'cashier' });
  const [selectedRestForTabs, setSelectedRestForTabs] = useState<any | null>(null);
  const [customTabsForm, setCustomTabsForm] = useState<string[]>([]);
  const [showChangeBusinessType, setShowChangeBusinessType] = useState(false);
  const [selectedRestForBusinessType, setSelectedRestForBusinessType] = useState<any | null>(null);
  const [newBusinessType, setNewBusinessType] = useState<BusinessType>('restaurant');
  const [customBusinessTypes, setCustomBusinessTypes] = useState<any[]>([]);
  const [showCreateCustomType, setShowCreateCustomType] = useState(false);
  const [newCustomTypeForm, setNewCustomTypeForm] = useState({ name: '', icon: '🏢', tabs: [] as string[] });
  const [landingPagePixels, setLandingPagePixels] = useState<any>({ facebook: '', google_analytics: '', tiktok: '' });
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const unreadNotifCount = adminNotifications.filter(n => !n.is_read).length;
  const freePlanCount = restaurants.filter(r => r.plan_id === 'free').length;

  useEffect(() => {
    // Only redirect if auth is fully loaded and admin check is complete
    // Wait for isSuperAdmin to be explicitly set (not undefined)
    if (!authLoading && adminChecked && isSuperAdmin !== undefined) {
      if (!user || !isSuperAdmin) {
        toast.error('غير مصرح لك بالوصول - يجب أن تكون سوبر أدمن');
        navigate('/');
      }
    }
  }, [user, isSuperAdmin, adminChecked, authLoading, navigate]);

  // Debug logging to help diagnose the issue
  useEffect(() => {
    console.log('SuperAdmin Debug:', { authLoading, adminChecked, isSuperAdmin, user });
  }, [authLoading, adminChecked, isSuperAdmin, user]);

  const load = async () => {
    const [restsRes, rcptsRes, ordersRes, agentsRes, bansRes, issuesRes, usersRes, customTypesRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_receipts').select('*, restaurants(name)').order('uploaded_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500),
      supabase.from('delivery_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('bans').select('*, restaurants(name)').order('created_at', { ascending: false }),
      // Try to fetch failures if the table exists
      supabase.from('accounting_post_failures' as any).select('*, restaurants(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*, user_roles(role), company_users(company_id, role)').limit(1000),
      supabase.from('custom_business_types').select('*').order('created_at', { ascending: false })
    ]);
    setRestaurants(restsRes.data || []);
    setReceipts(rcptsRes.data || []);
    setOrders(ordersRes.data || []);
    setAgents(agentsRes.data || []);
    setBans(bansRes.data || []);
    setIssues(issuesRes.data || []);
    setGlobalUsers(usersRes.data || []);
    setCustomBusinessTypes(customTypesRes.data || []);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase.from('admin_notifications' as any).select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setAdminNotifications(data || []));
    const channel = supabase
      .channel('super-admin-notif-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        setAdminNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin]);

  const stats = useMemo(() => {
    const activeRests = restaurants.filter(r => r.status === 'active').length;
    const suspendedRests = restaurants.filter(r => r.status === 'suspended').length;
    const pendingRests = restaurants.filter(r => r.status === 'pending' || r.status === 'trial').length;
    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
    const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const activeAgents = agents.filter(a => a.status === 'available' || a.status === 'busy').length;
    const activeBans = bans.filter(b => b.is_active).length;

    const byBusinessType = Object.entries(BUSINESS_TYPES).map(([key, bt]) => ({
      name: bt.label,
      value: restaurants.filter(r => (r.business_type || 'restaurant') === key).length,
    })).filter(d => d.value > 0);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - i));
      const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
      return { day: date.toLocaleDateString('ar-EG', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
    });

    return {
      activeRests, suspendedRests, pendingRests, totalRevenue, todayRevenue,
      todayOrders: todayOrders.length, activeAgents, activeBans,
      last7Days, byBusinessType,
      pendingReceipts: receipts.filter(r => r.status === 'pending').length,
      unresolvedIssues: issues.length
    };
  }, [restaurants, orders, agents, bans, receipts, issues]);

  // Actions
  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('restaurants').update({ status }).eq('id', id);
    if (error) toast.error('فشل تحديث الحالة');
    else { load(); toast.success('تم تحديث حالة النشاط'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('سيتم حذف النشاط وجميع بياناته نهائياً. هل أنت متأكد؟')) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', id);
    if (error) toast.error('فشل الحذف');
    else { load(); toast.success('تم حذف النشاط بنجاح'); }
  };

  const handleExtendSubscription = async (restaurantId: string) => {
    const days = extendDays[restaurantId] || 30;
    const rest = restaurants.find(r => r.id === restaurantId);
    const baseDate = rest?.subscription_end && new Date(rest.subscription_end) > new Date()
      ? new Date(rest.subscription_end)
      : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    await supabase.from('restaurants').update({ status: 'active', subscription_end: baseDate.toISOString() }).eq('id', restaurantId);
    load(); toast.success(`تم تمديد الاشتراك لـ ${days} يوم`);
  };

  const handleToggleModule = async (restaurantId: string, moduleKey: string) => {
    const rest = restaurants.find(r => r.id === restaurantId);
    if (!rest) return;
    const modules = Array.isArray(rest.enabled_modules) ? [...rest.enabled_modules] : [];
    const index = modules.indexOf(moduleKey);
    if (index > -1) modules.splice(index, 1);
    else modules.push(moduleKey);
    
    const { error } = await supabase.from('restaurants').update({ enabled_modules: modules }).eq('id', restaurantId);
    if (error) toast.error('فشل تحديث الموديولات');
    else { load(); toast.success('تم تحديث موديولات النشاط'); }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* Mega Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-destructive animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">{t('superAdmin.title')}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-500" /> {t('superAdmin.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="outline" />
            {unreadNotifCount > 0 && (
              <Button variant="outline" size="sm" className="relative gap-1" onClick={() => setTab('notifications')}>
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center">{unreadNotifCount}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="rounded-xl">{t('superAdmin.exitHome')}</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'overview', label: t('superAdmin.tabs.overview'), icon: BarChart3 },
            { id: 'notifications', label: t('superAdmin.tabs.notifications'), icon: Bell, badge: unreadNotifCount || undefined },
            { id: 'free_plan', label: t('superAdmin.tabs.freePlan'), icon: Gift, badge: freePlanCount || undefined },
            { id: 'restaurants', label: t('superAdmin.tabs.restaurants'), icon: Store, badge: restaurants.length },
            { id: 'users', label: t('superAdmin.tabs.users'), icon: Users, badge: globalUsers.length },
            { id: 'receipts', label: t('superAdmin.tabs.receipts'), icon: FileText, badge: stats.pendingReceipts },
            { id: 'issues', label: t('superAdmin.tabs.issues'), icon: AlertTriangle, badge: stats.unresolvedIssues },
            { id: 'bans', label: t('superAdmin.tabs.bans'), icon: Ban },
            { id: 'tabs_management', label: t('superAdmin.tabs.tabsManagement'), icon: LayoutGrid },
            { id: 'tracking_pixels', label: t('superAdmin.tabs.tracking'), icon: Globe },
            { id: 'backup', label: t('superAdmin.tabs.backup'), icon: Database },
          ].map(t_item => (
            <button key={t_item.id} onClick={() => setTab(t_item.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
                tab === t_item.id ? 'gradient-bg text-white shadow-lg shadow-primary/20' : 'bg-card hover:bg-secondary border border-border'
              }`}>
              <t_item.icon className="w-4 h-4" />
              {t_item.label}
              {t_item.badge ? <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{t_item.badge}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <GlobalDashboard
            restaurants={restaurants}
            orders={orders}
            globalUsers={globalUsers}
            adminNotifications={adminNotifications}
          />
        )}

        {tab === 'notifications' && (
          <AdminNotificationsPanel
            onViewCompany={(id, name) => setDrillIn({ id, name })}
            onNotificationsChange={setAdminNotifications}
          />
        )}

        {tab === 'free_plan' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-destructive" />
              {t('superAdmin.tabs.freePlan')} ({freePlanCount})
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {restaurants.filter(r => r.plan_id === 'free').map(r => (
                <div key={r.id} className="glass-card p-5 flex items-center justify-between rounded-2xl hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-2xl">🏢</div>
                    <div>
                      <h4 className="font-bold">{r.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {r.business_type} · {new Date(r.created_at).toLocaleDateString()}
                        {r.subscription_end && ` · Trial ends: ${new Date(r.subscription_end).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-destructive border-destructive/30">Free</Badge>
                    <Button size="sm" variant="outline" onClick={() => setDrillIn({ id: r.id, name: r.name })}>
                      {t('superAdmin.viewCompany')}
                    </Button>
                  </div>
                </div>
              ))}
              {freePlanCount === 0 && (
                <div className="glass-card p-12 text-center text-muted-foreground rounded-2xl">
                  {t('superAdmin.noNotifications')}
                </div>
              )}
            </div>
          </div>
        )}


        {tab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-primary" /> إدارة الشركات والموديولات</h2>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="بحث باسم الشركة أو المعرف..." className="pr-10 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button onClick={() => setShowAddRestaurant(true)} className="gradient-bg text-white rounded-xl"><Store className="w-4 h-4 ml-1" /> شركة جديدة</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                <div key={r.id} className="glass-card p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-inner">
                      {BUSINESS_TYPES[r.business_type as BusinessType]?.icon || '🏢'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold">{r.name}</h4>
                        <Badge className={r.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                          {r.status === 'active' ? 'نشط' : 'موقوف'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-widest">{r.id}</p>
                      
                      {/* Primary Module Selection */}
                      <div className="flex items-center gap-2 mb-3 bg-primary/5 p-2 rounded-lg border border-primary/10">
                        <span className="text-xs font-bold text-primary">الموديول الرئيسي للعميل:</span>
                        <select
                          value={r.business_type || 'restaurant'}
                          onChange={async (e) => {
                            const newType = e.target.value;
                            const { error } = await supabase.from('restaurants').update({ business_type: newType }).eq('id', r.id);
                            if (error) toast.error('فشل تحديث الموديول');
                            else { load(); toast.success('تم تحديث الموديول الرئيسي للشركة'); }
                          }}
                          className="bg-card text-xs font-bold rounded px-2 py-1 border border-border focus:outline-none"
                        >
                          {Object.entries(BUSINESS_TYPES).map(([key, bt]) => (
                            <option key={key} value={key}>{bt.icon} {bt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Modules Display */}
                      <div className="space-y-1 mb-3">
                        <span className="text-[10px] font-bold text-muted-foreground block">الموديولات المفعلة الإضافية:</span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(BUSINESS_TYPES).map(([key, bt]) => {
                            const isEnabled = Array.isArray(r.enabled_modules) && r.enabled_modules.includes(key);
                            return (
                              <button key={key} onClick={() => handleToggleModule(r.id, key)}
                                className={`px-2 py-0.5 rounded text-[10px] border transition-all ${isEnabled ? 'bg-primary/20 border-primary text-primary font-bold' : 'bg-secondary/30 border-transparent text-muted-foreground opacity-50 hover:opacity-100'}`}>
                                {bt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1"><CalendarPlus className="w-3 h-3 text-primary" /> انتهاء الاشتراك: {r.subscription_end ? new Date(r.subscription_end).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> تاريخ التسجيل: {new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-secondary/50 p-1 rounded-xl w-full sm:w-auto">
                      {[30, 90, 365].map(d => (
                        <button key={d} onClick={() => setExtendDays(prev => ({ ...prev, [r.id]: d }))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${(extendDays[r.id] || 30) === d ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}>
                          {d === 30 ? 'شهر' : d === 90 ? '3 شهور' : 'سنة'}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => handleExtendSubscription(r.id)} className="w-full sm:w-auto gradient-bg text-white shadow-lg shadow-primary/20">تجديد</Button>
                    <div className="h-8 w-[1px] bg-border hidden sm:block mx-2" />
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, r.status === 'active' ? 'suspended' : 'active')} className="w-full sm:w-auto">
                      {r.status === 'active' ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
                      {r.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedRestForTabs(r);
                      // Pre-populate with effective current tabs:
                      // if custom_tabs are already set → use them
                      // otherwise → start with the module's default tabs so super admin sees current state
                      const effectiveTabs = Array.isArray(r.custom_tabs) && r.custom_tabs.length > 0
                        ? r.custom_tabs
                        : (BUSINESS_TYPES[r.business_type as BusinessType]?.tabs || []);
                      setCustomTabsForm([...effectiveTabs]);
                    }} className="w-full sm:w-auto gap-1 border-primary/30 text-primary">
                      <Sparkles className="w-4 h-4" /> تخصيص التبويبات
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedRestForBusinessType(r);
                      setNewBusinessType(r.business_type || 'restaurant');
                      setShowChangeBusinessType(true);
                    }} className="w-full sm:w-auto gap-1 border-warning/30 text-warning">
                      <Building2 className="w-4 h-4" /> تغيير الموديول
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDrillIn({ id: r.id, name: r.name })} className="w-full sm:w-auto gap-1 border-primary/30 text-primary">
                      <ChevronRight className="w-4 h-4" /> إدارة شاملة
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} className="w-full sm:w-auto text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-6">
            <StaffAccessApprovals superAdmin />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> إدارة مستخدمي النظام</h2>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="بحث بالاسم أو البريد..." className="pr-10 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button onClick={() => setShowAddUser(true)} className="gradient-bg text-white rounded-xl"><UserPlus className="w-4 h-4 ml-1" /> مستخدم جديد</Button>
              </div>
            </div>

            <div className="grid gap-4">
              {globalUsers.filter(u => (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                <div key={u.user_id} className="glass-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {u.full_name?.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{u.full_name || 'بدون اسم'}</h4>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {u.user_roles?.map((r: any) => (
                      <Badge key={r.role} className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px]">{r.role}</Badge>
                    ))}
                    {u.company_users?.map((cu: any) => {
                      const rest = restaurants.find(r => r.company_id === cu.company_id || r.id === cu.company_id);
                      return (
                        <Badge key={cu.company_id} variant="outline" className="text-[10px] bg-secondary/50">
                          {rest?.name || 'شركة'} ({cu.role})
                        </Badge>
                      );
                    })}
                  </div>

                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={async () => {
                    if (confirm('حذف المستخدم نهائياً؟')) {
                      await supabase.from('profiles').delete().eq('user_id', u.user_id);
                      load();
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'issues' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-warning"><AlertTriangle className="w-6 h-6" /> تتبع مشاكل وأعطال العملاء</h2>
            <div className="grid gap-4">
              {issues.length === 0 ? (
                <div className="glass-card p-12 text-center text-muted-foreground">لا توجد بلاغات أعطال حالياً. نظامك مستقر ✅</div>
              ) : (
                issues.map(issue => (
                  <div key={issue.id} className="glass-card p-6 border-r-4 border-r-destructive">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg mb-1">{issue.restaurants?.name || 'غير معروف'}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleString('ar-EG')}</p>
                      </div>
                      <Badge variant="destructive">فشل محاسبي</Badge>
                    </div>
                    <div className="bg-destructive/5 p-4 rounded-xl font-mono text-sm text-destructive border border-destructive/10 overflow-x-auto">
                      {issue.error_message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ... other tabs like receipts, bans, backup ... */}
      </div>

      <CompanyDrillIn
        restaurantId={drillIn?.id || null}
        restaurantName={drillIn?.name}
        open={!!drillIn}
        onClose={() => setDrillIn(null)}
      />

      {/* Custom Tabs Customization Dialog - Full Control */}
      <Dialog open={!!selectedRestForTabs} onOpenChange={(open) => !open && setSelectedRestForTabs(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <Sparkles className="w-5 h-5 text-primary" />
              تحكم كامل في تبويبات: {selectedRestForTabs?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-primary mb-1">⚡ تحكم شامل في التبويبات</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              ما تحدده هنا هو <strong>القائمة الكاملة والنهائية</strong> للتبويبات التي سيراها المشترك — بما فيها الافتراضية لموديوله. يمكنك إضافة أو حذف أي تبويب بحرية كاملة.
              الموديول الحالي: <strong className="text-primary">{BUSINESS_TYPES[selectedRestForTabs?.business_type as BusinessType]?.label || '—'}</strong>
              &nbsp;({(BUSINESS_TYPES[selectedRestForTabs?.business_type as BusinessType]?.tabs || []).length} تبويب افتراضي).
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => {
                const defaultTabs = BUSINESS_TYPES[selectedRestForTabs?.business_type as BusinessType]?.tabs || [];
                setCustomTabsForm([...defaultTabs]);
              }}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors font-bold"
            >
              ↩ استعادة افتراضيات الموديول
            </button>
            <button
              onClick={() => setCustomTabsForm(Object.keys(ALL_TABS_CONFIG))}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors font-bold"
            >
              ✓ تحديد الكل
            </button>
            <button
              onClick={() => setCustomTabsForm([])}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-colors font-bold"
            >
              ✕ مسح الكل
            </button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-auto">
              المحددة: <strong className="text-primary">{customTabsForm.length}</strong> تبويب
            </span>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-1">
            {Object.entries(ALL_TABS_CONFIG).map(([key, tabConf]) => {
              const isModuleDefault = selectedRestForTabs &&
                (BUSINESS_TYPES[selectedRestForTabs.business_type as BusinessType]?.tabs || []).includes(key);
              const isChecked = customTabsForm.includes(key);

              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCustomTabsForm([...customTabsForm, key]);
                      } else {
                        setCustomTabsForm(customTabsForm.filter(t => t !== key));
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1">
                      <span>{tabConf.icon}</span>
                      <span>{tabConf.label}</span>
                    </p>
                    {isModuleDefault && (
                      <span className="text-[9px] text-emerald-500 font-bold">✓ افتراضي للموديول</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={() => setSelectedRestForTabs(null)}>إلغاء</Button>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!selectedRestForTabs) return;
                if (!confirm('سيتم حذف التخصيص وإعادة التابات لافتراضيات الموديول. هل أنت متأكد؟')) return;
                const { error } = await supabase
                  .from('restaurants')
                  .update({ custom_tabs: [] })
                  .eq('id', selectedRestForTabs.id);
                if (!error) {
                  toast.success('تم إعادة التبويبات لافتراضيات الموديول');
                  setSelectedRestForTabs(null);
                  load();
                }
              }}
            >
              إعادة تعيين للافتراضي
            </Button>
            <Button
              className="gradient-bg text-white shadow-lg shadow-primary/20 border-0"
              onClick={async () => {
                if (!selectedRestForTabs) return;
                if (customTabsForm.length === 0) {
                  toast.error('يجب تحديد تبويب واحد على الأقل');
                  return;
                }
                const { error } = await supabase
                  .from('restaurants')
                  .update({ custom_tabs: customTabsForm })
                  .eq('id', selectedRestForTabs.id);

                if (error) {
                  console.error('Custom tabs save error:', error);
                  toast.error('حدث خطأ أثناء حفظ التبويبات المخصصة: ' + error.message);
                } else {
                  toast.success(`تم تطبيق ${customTabsForm.length} تبويب على ${selectedRestForTabs.name}`);
                  setSelectedRestForTabs(null);
                  load();
                }
              }}
            >
              حفظ وتطبيق التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Business Type Dialog */}
      <Dialog open={showChangeBusinessType} onOpenChange={setShowChangeBusinessType}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>تغيير موديول النشاط (فقط للسوبر أدمن)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="text-sm font-bold mb-2">النشاط الحالي:</p>
              <p className="text-lg font-black text-primary">{selectedRestForBusinessType?.name}</p>
              <p className="text-xs text-muted-foreground">الموديول الحالي: {selectedRestForBusinessType?.business_type}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold mr-1">الموديول الجديد:</label>
              <select 
                value={newBusinessType} 
                onChange={e => setNewBusinessType(e.target.value as BusinessType)} 
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {Object.entries(BUSINESS_TYPES).map(([key, bt]) => (
                  <option key={key} value={key}>{bt.icon} {bt.label}</option>
                ))}
              </select>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive font-bold">⚠️ تحذير هام:</p>
              <p className="text-xs text-destructive mt-1">
                تغيير الموديول سيؤثر على جميع التابات والوظائف المتاحة للنشاط. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <Button
              className="w-full gradient-bg text-white font-bold h-11 rounded-xl"
              onClick={async () => {
                if (!selectedRestForBusinessType) return;
                if (!confirm(`هل أنت متأكد من تغيير موديول "${selectedRestForBusinessType.name}" إلى "${BUSINESS_TYPES[newBusinessType].label}"؟`)) return;

                console.log('Changing business type:', {
                  restaurantId: selectedRestForBusinessType.id,
                  newType: newBusinessType
                });

                const { error } = await supabase
                  .from('restaurants')
                  .update({
                    business_type: newBusinessType,
                    business_type_locked: true // Keep it locked after change
                  })
                  .eq('id', selectedRestForBusinessType.id);

                if (error) {
                  console.error('Error changing business type:', error);
                  toast.error('فشل تغيير الموديول: ' + error.message);
                } else {
                  toast.success(`تم تغيير موديول "${selectedRestForBusinessType.name}" بنجاح`);
                  setShowChangeBusinessType(false);
                  setSelectedRestForBusinessType(null);
                  load();
                }
              }}
            >
              تأكيد تغيير الموديول
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Restaurant Dialog */}
      <Dialog open={showAddRestaurant} onOpenChange={setShowAddRestaurant}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة شركة جديدة (فقط للسوبر أدمن)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">اسم الشركة</label>
              <Input value={newRestaurantForm.name} onChange={e => setNewRestaurantForm({ ...newRestaurantForm, name: e.target.value })} placeholder="اسم النشاط التجاري" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">الموديول</label>
              <select
                value={newRestaurantForm.business_type}
                onChange={e => setNewRestaurantForm({ ...newRestaurantForm, business_type: e.target.value as BusinessType })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <optgroup label="الأنواع الافتراضية">
                  {Object.entries(BUSINESS_TYPES).map(([key, bt]) => (
                    <option key={key} value={key}>{bt.icon} {bt.label}</option>
                  ))}
                </optgroup>
                {customBusinessTypes.length > 0 && (
                  <optgroup label="الأنواع المخصصة">
                    {customBusinessTypes.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.icon} {ct.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">المالك (اختياري)</label>
              <select 
                value={newRestaurantForm.owner_id} 
                onChange={e => setNewRestaurantForm({ ...newRestaurantForm, owner_id: e.target.value })} 
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">— اختر مستخدم —</option>
                {globalUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <Button
              className="w-full gradient-bg text-white font-bold h-11 rounded-xl"
              onClick={async () => {
                if (!newRestaurantForm.name.trim()) return toast.error('يرجى إدخال اسم الشركة');

                const trialEnd = new Date();
                trialEnd.setDate(trialEnd.getDate() + 14);

                // Check if it's a custom business type
                const customType = customBusinessTypes.find(ct => ct.id === newRestaurantForm.business_type);
                const businessType = customType ? 'custom' : newRestaurantForm.business_type;
                const customTabs = customType ? customType.tabs : undefined;

                const { error } = await supabase.from('restaurants').insert({
                  name: newRestaurantForm.name,
                  business_type: businessType,
                  custom_business_type_id: customType ? customType.id : null,
                  custom_tabs: customTabs,
                  owner_id: newRestaurantForm.owner_id || user?.id, // Default to current user if none selected
                  status: 'active',
                  subscription_end: trialEnd.toISOString(),
                  business_type_locked: true,
                });

                if (error) {
                  toast.error('فشل إضافة الشركة: ' + error.message);
                } else {
                  toast.success('تم إضافة الشركة بنجاح');
                  setShowAddRestaurant(false);
                  setNewRestaurantForm({ name: '', business_type: 'restaurant', owner_id: '' });
                  load();
                }
              }}
            >
              إضافة الشركة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Custom Business Type Dialog */}
      <Dialog open={showCreateCustomType} onOpenChange={setShowCreateCustomType}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء نوع بيزنس مخصص</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">اسم النوع المخصص</label>
              <Input 
                value={newCustomTypeForm.name} 
                onChange={e => setNewCustomTypeForm({ ...newCustomTypeForm, name: e.target.value })} 
                placeholder="مثال: صالون تجميل، ورشة سيارات..." 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">الأيقونة</label>
              <div className="flex gap-2 flex-wrap">
                {['🏢', '🏪', '🏭', '🏨', '🏥', '🏫', '🎨', '💇', '🚗', '🔧', '👗', '🍽️', '☕', '🎮', '💻'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCustomTypeForm({ ...newCustomTypeForm, icon })}
                    className={`w-12 h-12 rounded-xl border-2 text-2xl transition-all ${
                      newCustomTypeForm.icon === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold mr-1">التابات المتاحة</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewCustomTypeForm({ ...newCustomTypeForm, tabs: Object.keys(ALL_TABS_CONFIG) })}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors font-bold"
                  >
                    ✓ تحديد الكل
                  </button>
                  <button
                    onClick={() => setNewCustomTypeForm({ ...newCustomTypeForm, tabs: [] })}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-colors font-bold"
                  >
                    ✕ مسح الكل
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border border-border rounded-xl">
                {Object.entries(ALL_TABS_CONFIG).map(([key, tabConf]) => {
                  const isChecked = newCustomTypeForm.tabs.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCustomTypeForm({ ...newCustomTypeForm, tabs: [...newCustomTypeForm.tabs, key] });
                          } else {
                            setNewCustomTypeForm({ ...newCustomTypeForm, tabs: newCustomTypeForm.tabs.filter(t => t !== key) });
                          }
                        }}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate flex items-center gap-1">
                          <span>{tabConf.icon}</span>
                          <span>{tabConf.label}</span>
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">المحددة: <strong className="text-primary">{newCustomTypeForm.tabs.length}</strong> تبويب</p>
            </div>
            <Button 
              className="w-full gradient-bg text-white font-bold h-11 rounded-xl" 
              onClick={async () => {
                if (!newCustomTypeForm.name.trim()) return toast.error('يرجى إدخال اسم النوع المخصص');
                if (newCustomTypeForm.tabs.length === 0) return toast.error('يرجى اختيار تبويب واحد على الأقل');
                
                const { error } = await supabase.from('custom_business_types').insert({
                  name: newCustomTypeForm.name,
                  icon: newCustomTypeForm.icon,
                  tabs: newCustomTypeForm.tabs,
                  created_by: user?.id,
                });

                if (error) {
                  toast.error('فشل إنشاء النوع المخصص: ' + error.message);
                } else {
                  toast.success('تم إنشاء النوع المخصص بنجاح');
                  setShowCreateCustomType(false);
                  setNewCustomTypeForm({ name: '', icon: '🏢', tabs: [] });
                  load();
                }
              }}
            >
              إنشاء النوع المخصص
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد للنظام</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">البريد الإلكتروني</label>
              <Input value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">الاسم الكامل</label>
              <Input value={newUserForm.fullName} onChange={e => setNewUserForm({ ...newUserForm, fullName: e.target.value })} placeholder="الاسم" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">الشركة / النشاط</label>
              <select value={newUserForm.restaurantId} onChange={e => setNewUserForm({ ...newUserForm, restaurantId: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">— اختر شركة —</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold mr-1">الدور الوظيفي</label>
              <select value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="owner">مالك نشاط</option>
                <option value="admin">مدير نظام</option>
                <option value="manager">مدير فرع</option>
                <option value="cashier">كاشير</option>
                <option value="accountant">محاسب</option>
              </select>
            </div>
            <Button className="w-full gradient-bg text-white font-bold h-11 rounded-xl" onClick={async () => {
              if (!newUserForm.email || !newUserForm.restaurantId) return toast.error('يرجى إكمال البيانات');
              // Note: Direct auth creation requires edge function or admin client
              // For now, we link profiles and roles assuming user exists or will register
              toast.info('سيتم إرسال دعوة للمستخدم قريباً (قيد التنفيذ)');
              setShowAddUser(false);
            }}>
              إنشاء حساب وصلاحيات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracking Pixels Tab */}
      {tab === 'tracking_pixels' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                إعدادات التتبع لصفحة الهبوط
              </h2>
            </div>
            <p className="text-muted-foreground mb-6">
              أضف أكواد التتبع لصفحة الهبوط الرئيسية لمراقبة أداء الموقع
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Facebook Pixel</label>
                <Input
                  placeholder="أدخل معرف Facebook Pixel"
                  value={landingPagePixels?.facebook || ''}
                  onChange={(e) => setLandingPagePixels({ ...landingPagePixels, facebook: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Google Analytics ID</label>
                <Input
                  placeholder="أدخل معرف Google Analytics (G-XXXXXXXXXX)"
                  value={landingPagePixels?.google_analytics || ''}
                  onChange={(e) => setLandingPagePixels({ ...landingPagePixels, google_analytics: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">TikTok Pixel</label>
                <Input
                  placeholder="أدخل معرف TikTok Pixel"
                  value={landingPagePixels?.tiktok || ''}
                  onChange={(e) => setLandingPagePixels({ ...landingPagePixels, tiktok: e.target.value })}
                />
              </div>

              <Button onClick={async () => {
                const { error } = await supabase
                  .from('restaurants')
                  .update({ landing_page_pixels: landingPagePixels })
                  .eq('id', '00000000-0000-0000-0000-000000000000'); // Use system restaurant ID
                if (error) toast.error('فشل حفظ الإعدادات');
                else toast.success('تم حفظ الإعدادات بنجاح');
              }} className="gradient-bg text-white">
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Management Tab */}
      {tab === 'tabs_management' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-primary" />
                إدارة التابات لكل موديول
              </h2>
              <Button onClick={() => setShowCreateCustomType(true)} className="gradient-bg text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                إنشاء نوع بيزنس مخصص
              </Button>
            </div>
            <p className="text-muted-foreground mb-6">
              يمكنك إضافة أو حذف التابات المتاحة لكل موديول. هذا التحكم متاح فقط للسوبر أدمن.
            </p>

            {/* Custom Business Types Section */}
            {customBusinessTypes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-primary">الأنواع المخصصة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customBusinessTypes.map(customType => (
                    <div key={customType.id} className="border border-primary/30 bg-primary/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{customType.icon}</span>
                          <h4 className="font-bold">{customType.name}</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm(`هل أنت متأكد من حذف "${customType.name}"؟`)) return;
                            const { error } = await supabase.from('custom_business_types').delete().eq('id', customType.id);
                            if (error) toast.error('فشل الحذف');
                            else { toast.success('تم الحذف بنجاح'); load(); }
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(customType.tabs || []).map(tab => (
                          <Badge key={tab} variant="secondary" className="text-[10px]">
                            {ALL_TABS_CONFIG[tab as keyof typeof ALL_TABS_CONFIG]?.label || tab}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Business Types Section */}
            <div>
              <h3 className="text-lg font-bold mb-4">الأنواع الافتراضية</h3>
              <div className="space-y-4">
                {Object.entries(BUSINESS_TYPES).map(([key, businessType]) => (
                  <div key={key} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{businessType.label}</h3>
                        <p className="text-sm text-muted-foreground">التابات الافتراضية: {businessType.tabs?.length || 0}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRestForTabs({ id: key, name: businessType.label, business_type: key, custom_tabs: businessType.tabs || [] });
                          setCustomTabsForm(businessType.tabs || []);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        تعديل التابات
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(businessType.tabs || []).map(tab => (
                        <Badge key={tab} variant="secondary" className="text-xs">
                          {ALL_TABS_CONFIG[tab as keyof typeof ALL_TABS_CONFIG]?.label || tab}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default SuperAdmin;
