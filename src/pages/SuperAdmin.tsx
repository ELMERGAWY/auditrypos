import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Key, Users, FileText, Download, Trash2, Check, X,
  Play, Pause, Copy, ChefHat, Clock, BarChart3, TrendingUp,
  Truck, Ban, AlertTriangle, UserX, Search, Filter,
  DollarSign, ShoppingCart, MapPin, Phone, Eye, EyeOff,
  Calendar, ArrowUpRight, ArrowDownRight, Activity,
  Package, Store, Wallet, Settings, Bell, Globe, Database
} from 'lucide-react';
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
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

type Tab = 'overview' | 'restaurants' | 'agents' | 'bans' | 'licenses' | 'receipts' | 'backup' | 'system';

const CHART_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)', 'hsl(0, 84%, 60%)'
];

const BAN_LEVELS = {
  warning: { label: 'تحذير', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  temporary: { label: 'حظر مؤقت', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  permanent: { label: 'حظر دائم', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const SuperAdmin = () => {
  useDarkMode();
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [duration, setDuration] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');

  // Ban form
  const [showBanForm, setShowBanForm] = useState(false);
  const [banForm, setBanForm] = useState({
    restaurant_id: '', target_type: 'customer' as 'customer' | 'agent',
    target_identifier: '', target_name: '', ban_level: 'warning' as 'warning' | 'temporary' | 'permanent',
    reason: '', expires_days: 7, notes: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      toast.error('غير مصرح لك بالوصول');
      navigate('/');
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  const load = async () => {
    const [restsRes, licsRes, rcptsRes, ordersRes, agentsRes, bansRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('license_keys').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_receipts').select('*, restaurants(name)').order('uploaded_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('bans').select('*, restaurants(name)').order('created_at', { ascending: false }),
    ]);
    setRestaurants(restsRes.data || []);
    setLicenses(licsRes.data || []);
    setReceipts(rcptsRes.data || []);
    setOrders(ordersRes.data || []);
    setAgents(agentsRes.data || []);
    setBans(bansRes.data || []);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  // ===== COMPUTED STATS =====
  const stats = useMemo(() => {
    const activeRests = restaurants.filter(r => r.status === 'active').length;
    const suspendedRests = restaurants.filter(r => r.status === 'suspended').length;
    const trialRests = restaurants.filter(r => !r.license_key && r.status === 'active').length;

    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
    const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);

    const activeAgents = agents.filter(a => a.status === 'available' || a.status === 'busy').length;
    const busyAgents = agents.filter(a => a.status === 'busy').length;
    const activeBans = bans.filter(b => b.is_active).length;

    // Last 7 days revenue
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - i));
      const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
      return {
        day: date.toLocaleDateString('ar-EG', { weekday: 'short' }),
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        orders: dayOrders.length
      };
    });

    // Revenue per restaurant
    const revenueByRestaurant = restaurants.map(r => {
      const rOrders = orders.filter(o => o.restaurant_id === r.id && o.status !== 'cancelled');
      return { name: r.name, revenue: rOrders.reduce((s, o) => s + Number(o.total), 0), orders: rOrders.length };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Orders by type
    const ordersByType = [
      { name: 'داين إن', value: orders.filter(o => o.order_type === 'dine_in').length },
      { name: 'تيك أواي', value: orders.filter(o => o.order_type === 'takeaway').length },
      { name: 'دليفري', value: orders.filter(o => o.order_type === 'delivery').length },
    ].filter(d => d.value > 0);

    // Yesterday comparison
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayRevenue = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === yesterday.toDateString()).reduce((s, o) => s + Number(o.total), 0);
    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0;

    return {
      activeRests, suspendedRests, trialRests, totalRevenue, todayRevenue, todayOrders: todayOrders.length,
      activeAgents, busyAgents, activeBans, last7Days, revenueByRestaurant, ordersByType, revenueChange
    };
  }, [restaurants, orders, agents, bans]);

  // ===== ACTIONS =====
  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('restaurants').update({ status }).eq('id', id);
    load(); toast.success('تم تحديث الحالة');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المطعم؟')) return;
    await supabase.from('restaurants').delete().eq('id', id);
    load(); toast.success('تم حذف المطعم');
  };

  const handleGenerate = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const key = `SR-${seg()}-${seg()}`;
    const { error } = await supabase.from('license_keys').insert({ key, duration_days: duration });
    if (error) { toast.error('خطأ في إنشاء المفتاح'); return; }
    navigator.clipboard.writeText(key);
    toast.success(`تم إنشاء المفتاح: ${key} (تم النسخ)`);
    load();
  };

  const handleExport = async () => {
    const [rests, lics, ords, items, agts] = await Promise.all([
      supabase.from('restaurants').select('*'),
      supabase.from('license_keys').select('*'),
      supabase.from('orders').select('*, order_items(*)'),
      supabase.from('menu_items').select('*'),
      supabase.from('delivery_agents').select('*'),
    ]);
    const data = JSON.stringify({
      restaurants: rests.data, license_keys: lics.data, orders: ords.data,
      menu_items: items.data, delivery_agents: agts.data, exportedAt: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `smartresto-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('تم تحميل النسخة الاحتياطية');
  };

  const handleApproveReceipt = async (receiptId: string, restaurantId: string) => {
    await supabase.from('payment_receipts').update({ status: 'approved' }).eq('id', receiptId);
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    await supabase.from('restaurants').update({ status: 'active', subscription_end: endDate.toISOString() }).eq('id', restaurantId);
    load(); toast.success('تم الموافقة وتفعيل المطعم');
  };

  const handleRejectReceipt = async (receiptId: string) => {
    await supabase.from('payment_receipts').update({ status: 'rejected' }).eq('id', receiptId);
    load(); toast.success('تم رفض الإيصال');
  };

  const handleCreateBan = async () => {
    if (!banForm.target_identifier || !banForm.reason) { toast.error('أكمل البيانات المطلوبة'); return; }
    const expiresAt = banForm.ban_level === 'temporary'
      ? new Date(Date.now() + banForm.expires_days * 86400000).toISOString()
      : banForm.ban_level === 'permanent' ? null : new Date(Date.now() + 86400000).toISOString(); // warning = 1 day

    await supabase.from('bans').insert({
      restaurant_id: banForm.restaurant_id || restaurants[0]?.id,
      target_type: banForm.target_type,
      target_identifier: banForm.target_identifier,
      target_name: banForm.target_name,
      ban_level: banForm.ban_level,
      reason: banForm.reason,
      banned_by: user!.id,
      expires_at: expiresAt,
      notes: banForm.notes,
    });
    setShowBanForm(false);
    setBanForm({ restaurant_id: '', target_type: 'customer', target_identifier: '', target_name: '', ban_level: 'warning', reason: '', expires_days: 7, notes: '' });
    load(); toast.success('تم إضافة الحظر');
  };

  const handleToggleBan = async (banId: string, isActive: boolean) => {
    await supabase.from('bans').update({ is_active: !isActive }).eq('id', banId);
    load(); toast.success(isActive ? 'تم رفع الحظر' : 'تم تفعيل الحظر');
  };

  const handleDeleteBan = async (banId: string) => {
    await supabase.from('bans').delete().eq('id', banId);
    load(); toast.success('تم حذف سجل الحظر');
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">جاري التحميل...</p>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'restaurants', label: 'المطاعم', icon: ChefHat, badge: restaurants.length },
    { id: 'agents', label: 'المناديب', icon: Truck, badge: stats.activeAgents },
    { id: 'bans', label: 'الحظر', icon: Ban, badge: stats.activeBans },
    { id: 'licenses', label: 'التراخيص', icon: Key },
    { id: 'receipts', label: 'الإيصالات', icon: FileText, badge: receipts.filter(r => r.status === 'pending').length },
    { id: 'backup', label: 'النسخ', icon: Download },
  ];

  const filteredRestaurants = restaurants.filter(r =>
    !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ icon: Icon, label, value, sub, trend }: { icon: typeof Users; label: string; value: string | number; sub?: string; trend?: number }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">لوحة المدير العام</h1>
              <p className="text-xs text-muted-foreground">SmartResto Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 text-green-400" />
              <span>{stats.activeRests} مطعم نشط</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>الرئيسية</Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-card text-muted-foreground hover:bg-secondary border border-border'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20' : 'bg-primary/20 text-primary'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== OVERVIEW TAB ===== */}
        {tab === 'overview' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={ChefHat} label="المطاعم النشطة" value={stats.activeRests} sub={`${stats.trialRests} تجريبي`} />
              <StatCard icon={DollarSign} label="إيرادات اليوم" value={`${stats.todayRevenue.toLocaleString()} ج.م`} trend={stats.revenueChange} />
              <StatCard icon={ShoppingCart} label="طلبات اليوم" value={stats.todayOrders} />
              <StatCard icon={TrendingUp} label="إجمالي الإيرادات" value={`${stats.totalRevenue.toLocaleString()} ج.م`} />
              <StatCard icon={Truck} label="المناديب النشطين" value={stats.activeAgents} sub={`${stats.busyAgents} مشغول`} />
              <StatCard icon={Ban} label="حالات حظر نشطة" value={stats.activeBans} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="glass-card p-5">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> إيرادات آخر 7 أيام
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.last7Days}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(25, 95%, 53%)" fill="url(#revenueGrad)" strokeWidth={2} name="الإيرادات" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Orders by Type */}
              <div className="glass-card p-5">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" /> توزيع الطلبات
                </h3>
                {stats.ordersByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.ordersByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                        paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {stats.ordersByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">لا توجد بيانات</div>
                )}
              </div>
            </div>

            {/* Top Restaurants */}
            <div className="glass-card p-5">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-primary" /> أعلى المطاعم إيراداً
              </h3>
              {stats.revenueByRestaurant.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.revenueByRestaurant} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[0, 6, 6, 0]} name="الإيرادات" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
              )}
            </div>
          </>
        )}

        {/* ===== RESTAURANTS TAB ===== */}
        {tab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">المطاعم المسجلة ({restaurants.length})</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم..." className="pr-10" />
              </div>
            </div>
            {filteredRestaurants.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                      <ChefHat className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={r.status === 'active' ? 'status-active' : r.status === 'suspended' ? 'status-suspended' : 'status-pending'}>
                          {r.status === 'active' ? 'نشط' : r.status === 'suspended' ? 'موقوف' : 'معلق'}
                        </Badge>
                        {!r.license_key && r.status === 'active' && <Badge variant="outline" className="text-[10px]">تجريبي</Badge>}
                        {r.subscription_end && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(r.subscription_end).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{orders.filter(o => o.restaurant_id === r.id).length} طلب</span>
                        <span>{orders.filter(o => o.restaurant_id === r.id && o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'active')}><Play className="w-3 h-3 ml-1" /> تفعيل</Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'suspended')}><Pause className="w-3 h-3 ml-1" /> إيقاف</Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3 ml-1" /> حذف</Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredRestaurants.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد نتائج</p>}
          </div>
        )}

        {/* ===== AGENTS TAB ===== */}
        {tab === 'agents' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">المناديب ({agents.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(a => {
                const agentRest = restaurants.find(r => r.id === a.restaurant_id);
                const agentOrders = orders.filter(o => o.delivery_agent_id === a.id);
                const completedOrders = agentOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          a.status === 'available' ? 'bg-green-500/20 text-green-400' :
                          a.status === 'busy' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{agentRest?.name || '—'}</p>
                        </div>
                      </div>
                      <Badge className={
                        a.status === 'available' ? 'status-active' :
                        a.status === 'busy' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        'status-suspended'
                      }>
                        {a.status === 'available' ? 'متاح' : a.status === 'busy' ? 'مشغول' : 'غير متصل'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {a.phone || '—'}</div>
                      <div className="flex items-center gap-2"><ShoppingCart className="w-3 h-3" /> {completedOrders.length} طلب مُسلّم</div>
                      {a.current_lat && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          آخر تحديث: {a.last_location_update ? new Date(a.last_location_update).toLocaleTimeString('ar-EG') : '—'}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {agents.length === 0 && <p className="text-muted-foreground text-center py-12">لا يوجد مناديب</p>}
          </div>
        )}

        {/* ===== BANS TAB ===== */}
        {tab === 'bans' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">إدارة الحظر ({bans.length})</h2>
              <Button onClick={() => setShowBanForm(true)} className="gradient-bg text-primary-foreground border-0">
                <Ban className="w-4 h-4 ml-2" /> حظر جديد
              </Button>
            </div>

            {/* Ban Form Modal */}
            <AnimatePresence>
              {showBanForm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setShowBanForm(false)}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
                    <h3 className="font-display font-bold text-lg flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" /> إنشاء حظر جديد</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
                        <select value={banForm.target_type} onChange={e => setBanForm(p => ({ ...p, target_type: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                          <option value="customer">عميل</option>
                          <option value="agent">مندوب</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">درجة الحظر</label>
                        <select value={banForm.ban_level} onChange={e => setBanForm(p => ({ ...p, ban_level: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                          <option value="warning">تحذير</option>
                          <option value="temporary">مؤقت</option>
                          <option value="permanent">دائم</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">المطعم</label>
                      <select value={banForm.restaurant_id} onChange={e => setBanForm(p => ({ ...p, restaurant_id: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                        <option value="">كل المطاعم</option>
                        {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>

                    <Input placeholder={banForm.target_type === 'customer' ? 'رقم موبايل العميل' : 'اسم أو رقم المندوب'}
                      value={banForm.target_identifier} onChange={e => setBanForm(p => ({ ...p, target_identifier: e.target.value }))} />

                    <Input placeholder="الاسم (اختياري)" value={banForm.target_name}
                      onChange={e => setBanForm(p => ({ ...p, target_name: e.target.value }))} />

                    <Input placeholder="سبب الحظر *" value={banForm.reason}
                      onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))} />

                    {banForm.ban_level === 'temporary' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">مدة الحظر (أيام)</label>
                        <Input type="number" min={1} max={365} value={banForm.expires_days}
                          onChange={e => setBanForm(p => ({ ...p, expires_days: Number(e.target.value) }))} />
                      </div>
                    )}

                    <Input placeholder="ملاحظات إضافية" value={banForm.notes}
                      onChange={e => setBanForm(p => ({ ...p, notes: e.target.value }))} />

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleCreateBan} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        <Ban className="w-4 h-4 ml-2" /> تأكيد الحظر
                      </Button>
                      <Button variant="outline" onClick={() => setShowBanForm(false)} className="flex-1">إلغاء</Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bans List */}
            {bans.map(b => (
              <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`glass-card p-4 border-r-4 ${!b.is_active ? 'opacity-50' : ''} ${
                  b.ban_level === 'permanent' ? 'border-r-red-500' : b.ban_level === 'temporary' ? 'border-r-orange-500' : 'border-r-yellow-500'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      b.target_type === 'customer' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {b.target_type === 'customer' ? <UserX className="w-5 h-5 text-blue-400" /> : <Truck className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{b.target_name || b.target_identifier}</p>
                        <Badge className={BAN_LEVELS[b.ban_level as keyof typeof BAN_LEVELS]?.color}>
                          {BAN_LEVELS[b.ban_level as keyof typeof BAN_LEVELS]?.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {b.target_type === 'customer' ? 'عميل' : 'مندوب'}
                        </Badge>
                        {!b.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span>{b.restaurants?.name || 'كل المطاعم'}</span>
                        <span>{new Date(b.banned_at).toLocaleDateString('ar-EG')}</span>
                        {b.expires_at && <span>ينتهي: {new Date(b.expires_at).toLocaleDateString('ar-EG')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleToggleBan(b.id, b.is_active)}>
                      {b.is_active ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
                      {b.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleDeleteBan(b.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {bans.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد حالات حظر</p>}
          </div>
        )}

        {/* ===== LICENSES TAB ===== */}
        {tab === 'licenses' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="font-display text-xl font-bold mb-4">إنشاء مفتاح ترخيص جديد</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border">
                  <option value={30}>30 يوم</option>
                  <option value={180}>180 يوم</option>
                  <option value={365}>365 يوم</option>
                </select>
                <Button onClick={handleGenerate} className="gradient-bg text-primary-foreground border-0">
                  <Key className="w-4 h-4 ml-2" /> إنشاء مفتاح
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-display font-bold">المفاتيح ({licenses.length})</h3>
              {licenses.map(lic => (
                <div key={lic.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <code className="font-mono text-sm text-primary flex-1">{lic.key}</code>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{lic.duration_days} يوم</span>
                    <Badge className={lic.used ? 'status-suspended' : 'status-active'}>{lic.used ? 'مُستخدم' : 'متاح'}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(lic.key); toast.success('تم النسخ'); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد مفاتيح</p>}
            </div>
          </div>
        )}

        {/* ===== RECEIPTS TAB ===== */}
        {tab === 'receipts' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">إيصالات الدفع ({receipts.length})</h2>
            {receipts.map(rc => (
              <div key={rc.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{rc.restaurants?.name || 'مطعم'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(rc.uploaded_at).toLocaleString('ar-EG')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{rc.method}</span>
                    {rc.amount && <span className="text-xs font-bold">{rc.amount} ج.م</span>}
                  </div>
                </div>
                <Badge className={rc.status === 'approved' ? 'status-active' : rc.status === 'rejected' ? 'status-suspended' : 'status-pending'}>
                  {rc.status === 'approved' ? 'معتمد' : rc.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                </Badge>
                {rc.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => handleApproveReceipt(rc.id, rc.restaurant_id)}>
                      <Check className="w-3 h-3 ml-1" /> موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectReceipt(rc.id)}>
                      <X className="w-3 h-3 ml-1" /> رفض
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {receipts.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد إيصالات</p>}
          </div>
        )}

        {/* ===== BACKUP TAB ===== */}
        {tab === 'backup' && (
          <div className="glass-card p-8 text-center max-w-md mx-auto">
            <Download className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">نسخة احتياطية</h2>
            <p className="text-muted-foreground mb-6">تحميل نسخة كاملة من قاعدة البيانات بصيغة JSON</p>
            <Button onClick={handleExport} className="gradient-bg text-primary-foreground border-0" size="lg">
              <Download className="w-5 h-5 ml-2" /> تحميل النسخة الاحتياطية
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdmin;
