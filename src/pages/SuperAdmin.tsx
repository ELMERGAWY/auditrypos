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
  UserPlus, ChevronRight, Sparkles
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

type Tab = 'overview' | 'restaurants' | 'users' | 'agents' | 'bans' | 'receipts' | 'backup';

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
  marketing_contracts: { label: 'عقود التسويق', icon: '📄' }
};

const SuperAdmin = () => {
  useDarkMode();
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
  const [newUserForm, setNewUserForm] = useState({ email: '', fullName: '', restaurantId: '', role: 'cashier' });
  const [selectedRestForTabs, setSelectedRestForTabs] = useState<any | null>(null);
  const [customTabsForm, setCustomTabsForm] = useState<string[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Wait for both authLoading AND adminChecked before redirecting (prevents race condition kicking super admins out)
    if (!authLoading && adminChecked) {
      setInitialLoadComplete(true);
      if (!user || !isSuperAdmin) {
        toast.error('غير مصرح لك بالوصول - يجب أن تكون سوبر أدمن');
        navigate('/');
      }
    }
  }, [user, isSuperAdmin, adminChecked, authLoading, navigate]);

  const load = async () => {
    const [restsRes, rcptsRes, ordersRes, agentsRes, bansRes, issuesRes, usersRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_receipts').select('*, restaurants(name)').order('uploaded_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(500),
      supabase.from('delivery_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('bans').select('*, restaurants(name)').order('created_at', { ascending: false }),
      // Try to fetch failures if the table exists
      supabase.from('accounting_post_failures' as any).select('*, restaurants(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*, user_roles(role), company_users(company_id, role)').limit(1000)
    ]);
    setRestaurants(restsRes.data || []);
    setReceipts(rcptsRes.data || []);
    setOrders(ordersRes.data || []);
    setAgents(agentsRes.data || []);
    setBans(bansRes.data || []);
    setIssues(issuesRes.data || []);
    setGlobalUsers(usersRes.data || []);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

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
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Mega Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-destructive animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">Auditry ERP Portal</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-500" /> لوحة السوبر أدمن المركزية
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="rounded-xl">الخروج للرئيسية</Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
            { id: 'restaurants', label: 'إدارة الشركات', icon: Store, badge: restaurants.length },
            { id: 'users', label: 'المستخدمين', icon: Users, badge: globalUsers.length },
            { id: 'receipts', label: 'الاشتراكات', icon: FileText, badge: stats.pendingReceipts },
            { id: 'issues', label: 'مشاكل العملاء', icon: AlertTriangle, badge: stats.unresolvedIssues },
            { id: 'bans', label: 'الرقابة', icon: Ban },
            { id: 'backup', label: 'النظام', icon: Database },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
                tab === t.id ? 'gradient-bg text-white shadow-lg shadow-primary/20' : 'bg-card hover:bg-secondary border border-border'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge ? <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-6 border-b-4 border-b-primary">
                <Users className="w-8 h-8 text-primary mb-2" />
                <p className="text-3xl font-bold">{stats.activeRests}</p>
                <p className="text-sm text-muted-foreground">شركة نشطة</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-success">
                <DollarSign className="w-8 h-8 text-success mb-2" />
                <p className="text-3xl font-bold">{stats.todayRevenue.toLocaleString()} ج.م</p>
                <p className="text-sm text-muted-foreground">إيرادات اليوم</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-warning">
                <AlertTriangle className="w-8 h-8 text-warning mb-2" />
                <p className="text-3xl font-bold">{stats.unresolvedIssues}</p>
                <p className="text-sm text-muted-foreground">مشاكل تقنية مكتشفة</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-destructive">
                <Clock className="w-8 h-8 text-destructive mb-2" />
                <p className="text-3xl font-bold">{stats.pendingRests}</p>
                <p className="text-sm text-muted-foreground">في فترة التجربة/انتظار</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> نمو الإيرادات (7 أيام)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.last7Days}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary" /> توزيع القطاعات</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={stats.byBusinessType} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {stats.byBusinessType.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-primary" /> إدارة الشركات والموديولات</h2>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="بحث باسم الشركة أو المعرف..." className="pr-10 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
                  toast.error('حدث خطأ أثناء حفظ التبويبات المخصصة');
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
    </div>
  );
};


export default SuperAdmin;
