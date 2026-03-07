import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, FileText, Download, Trash2, Check, X,
  Play, Pause, ChefHat, Clock, BarChart3, TrendingUp,
  Truck, Ban, AlertTriangle, UserX, Search,
  DollarSign, ShoppingCart, MapPin, Phone, Eye, EyeOff,
  Calendar, ArrowUpRight, ArrowDownRight, Activity,
  Store, Database, CalendarPlus
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
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

type Tab = 'overview' | 'restaurants' | 'agents' | 'bans' | 'receipts' | 'backup';

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
  const [receipts, setReceipts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [extendDays, setExtendDays] = useState<Record<string, number>>({});

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
    const [restsRes, rcptsRes, ordersRes, agentsRes, bansRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('payment_receipts').select('*, restaurants(name)').order('uploaded_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('delivery_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('bans').select('*, restaurants(name)').order('created_at', { ascending: false }),
    ]);
    setRestaurants(restsRes.data || []);
    setReceipts(rcptsRes.data || []);
    setOrders(ordersRes.data || []);
    setAgents(agentsRes.data || []);
    setBans(bansRes.data || []);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const stats = useMemo(() => {
    const activeRests = restaurants.filter(r => r.status === 'active').length;
    const suspendedRests = restaurants.filter(r => r.status === 'suspended').length;
    const pendingRests = restaurants.filter(r => r.status === 'pending').length;
    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
    const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const activeAgents = agents.filter(a => a.status === 'available' || a.status === 'busy').length;
    const busyAgents = agents.filter(a => a.status === 'busy').length;
    const activeBans = bans.filter(b => b.is_active).length;

    const byBusinessType = Object.entries(BUSINESS_TYPES).map(([key, bt]) => ({
      name: bt.label, icon: bt.icon,
      value: restaurants.filter(r => (r.business_type || 'restaurant') === key).length,
    })).filter(d => d.value > 0);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - i));
      const dayOrders = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === date.toDateString());
      return { day: date.toLocaleDateString('ar-EG', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
    });

    const revenueByRestaurant = restaurants.map(r => {
      const rOrders = orders.filter(o => o.restaurant_id === r.id && o.status !== 'cancelled');
      return { name: r.name, revenue: rOrders.reduce((s, o) => s + Number(o.total), 0), orders: rOrders.length };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayRevenue = orders.filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === yesterday.toDateString()).reduce((s, o) => s + Number(o.total), 0);
    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0;

    return {
      activeRests, suspendedRests, pendingRests, totalRevenue, todayRevenue,
      todayOrders: todayOrders.length, activeAgents, busyAgents, activeBans,
      last7Days, revenueByRestaurant, revenueChange, byBusinessType,
      totalOrders: orders.length,
      pendingReceipts: receipts.filter(r => r.status === 'pending').length,
    };
  }, [restaurants, orders, agents, bans, receipts]);

  // ===== ACTIONS =====
  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('restaurants').update({ status }).eq('id', id);
    load(); toast.success('تم تحديث الحالة');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النشاط وجميع بياناته؟')) return;
    await supabase.from('restaurants').delete().eq('id', id);
    load(); toast.success('تم الحذف');
  };

  const handleExtendSubscription = async (restaurantId: string) => {
    const days = extendDays[restaurantId] || 30;
    const rest = restaurants.find(r => r.id === restaurantId);
    const baseDate = rest?.subscription_end && new Date(rest.subscription_end) > new Date()
      ? new Date(rest.subscription_end)
      : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    await supabase.from('restaurants').update({
      status: 'active',
      subscription_end: baseDate.toISOString()
    }).eq('id', restaurantId);
    load();
    toast.success(`تم تمديد الاشتراك ${days} يوم`);
  };

  const handleApproveReceipt = async (receiptId: string, restaurantId: string) => {
    await supabase.from('payment_receipts').update({ status: 'approved' }).eq('id', receiptId);
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    await supabase.from('restaurants').update({ status: 'active', subscription_end: endDate.toISOString() }).eq('id', restaurantId);
    load(); toast.success('تم الموافقة وتفعيل النشاط');
  };

  const handleRejectReceipt = async (receiptId: string) => {
    await supabase.from('payment_receipts').update({ status: 'rejected' }).eq('id', receiptId);
    load(); toast.success('تم رفض الإيصال');
  };

  const handleExport = async () => {
    const [rests, ords, items, agts, prods, custs] = await Promise.all([
      supabase.from('restaurants').select('*'),
      supabase.from('orders').select('*, order_items(*)'),
      supabase.from('menu_items').select('*'),
      supabase.from('delivery_agents').select('*'),
      supabase.from('products').select('*'),
      supabase.from('customers').select('*'),
    ]);
    const data = JSON.stringify({
      restaurants: rests.data, orders: ords.data, menu_items: items.data,
      delivery_agents: agts.data, products: prods.data, customers: custs.data,
      exportedAt: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `smartpos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('تم تحميل النسخة الاحتياطية');
  };

  const handleCreateBan = async () => {
    if (!banForm.target_identifier || !banForm.reason) { toast.error('أكمل البيانات المطلوبة'); return; }
    const expiresAt = banForm.ban_level === 'temporary'
      ? new Date(Date.now() + banForm.expires_days * 86400000).toISOString()
      : banForm.ban_level === 'permanent' ? null : new Date(Date.now() + 86400000).toISOString();
    await supabase.from('bans').insert({
      restaurant_id: banForm.restaurant_id || restaurants[0]?.id,
      target_type: banForm.target_type, target_identifier: banForm.target_identifier,
      target_name: banForm.target_name, ban_level: banForm.ban_level,
      reason: banForm.reason, banned_by: user!.id, expires_at: expiresAt, notes: banForm.notes,
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
    { id: 'restaurants', label: 'إدارة الأنشطة', icon: Store, badge: restaurants.length },
    { id: 'agents', label: 'المناديب', icon: Truck, badge: stats.activeAgents },
    { id: 'bans', label: 'الحظر', icon: Ban, badge: stats.activeBans },
    { id: 'receipts', label: 'الإيصالات', icon: FileText, badge: stats.pendingReceipts },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Download },
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
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">لوحة المدير العام</h1>
              <p className="text-xs text-muted-foreground">SmartPOS Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3 text-green-400" />
              <span>{stats.activeRests} نشاط فعّال</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>الرئيسية</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                tab === t.id ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card text-muted-foreground hover:bg-secondary border border-border'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-primary/20 text-primary'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== OVERVIEW ===== */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={Store} label="الأنشطة النشطة" value={stats.activeRests} sub={`${stats.pendingRests} معلّق`} />
              <StatCard icon={DollarSign} label="إيرادات اليوم" value={`${stats.todayRevenue.toLocaleString()} ج.م`} trend={stats.revenueChange} />
              <StatCard icon={ShoppingCart} label="طلبات اليوم" value={stats.todayOrders} />
              <StatCard icon={TrendingUp} label="إجمالي الإيرادات" value={`${stats.totalRevenue.toLocaleString()} ج.م`} />
              <StatCard icon={Truck} label="المناديب النشطين" value={stats.activeAgents} sub={`${stats.busyAgents} مشغول`} />
              <StatCard icon={Ban} label="حالات حظر نشطة" value={stats.activeBans} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Business Type Distribution */}
              <div className="glass-card p-5">
                <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> توزيع القطاعات
                </h3>
                {stats.byBusinessType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.byBusinessType} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                        paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {stats.byBusinessType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">لا توجد بيانات</div>}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-primary" /> أعلى الأنشطة إيراداً
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
              ) : <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>}
            </div>
          </>
        )}

        {/* ===== RESTAURANTS TAB (with Subscription Management) ===== */}
        {tab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-display text-xl font-bold">إدارة الأنشطة والاشتراكات ({restaurants.length})</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالاسم..." className="pr-10" />
              </div>
            </div>

            {filteredRestaurants.map(r => {
              const bizType = (r.business_type || 'restaurant') as BusinessType;
              const bizConfig = BUSINESS_TYPES[bizType];
              const isExpired = r.subscription_end && new Date(r.subscription_end) < new Date();
              const rOrders = orders.filter(o => o.restaurant_id === r.id && o.status !== 'cancelled');
              const rRevenue = rOrders.reduce((s: number, o: any) => s + Number(o.total), 0);

              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${bizConfig?.color || 'hsl(25,95%,53%)'}20` }}>
                        {bizConfig?.icon || '🏢'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-lg">{r.name}</p>
                          <Badge className={`text-[10px] border`} style={{ backgroundColor: `${bizConfig?.color}20`, color: bizConfig?.color, borderColor: `${bizConfig?.color}40` }}>
                            {bizConfig?.label || 'أخرى'}
                          </Badge>
                          <Badge className={r.status === 'active' && !isExpired ? 'status-active' : r.status === 'suspended' || isExpired ? 'status-suspended' : 'status-pending'}>
                            {r.status === 'active' && !isExpired ? 'نشط' : isExpired ? 'منتهي' : r.status === 'suspended' ? 'موقوف' : 'معلق'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{rOrders.length} طلب</span>
                          <span>{rRevenue.toLocaleString()} ج.م</span>
                          {r.subscription_end && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(r.subscription_end).toLocaleDateString('ar-EG')}
                              {isExpired && <span className="text-destructive">(منتهي)</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subscription Management */}
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <span className="text-xs text-muted-foreground">تمديد الاشتراك:</span>
                      {[30, 90, 180, 365].map(d => (
                        <button key={d} onClick={() => setExtendDays(prev => ({ ...prev, [r.id]: d }))}
                          className={`px-2 py-1 rounded text-xs transition-colors ${(extendDays[r.id] || 30) === d ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                          {d === 30 ? 'شهر' : d === 90 ? '3 شهور' : d === 180 ? '6 شهور' : 'سنة'}
                        </button>
                      ))}
                      <Button size="sm" onClick={() => handleExtendSubscription(r.id)} className="gradient-bg text-primary-foreground border-0">
                        <CalendarPlus className="w-3 h-3 ml-1" /> تمديد
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'active')}>
                        <Play className="w-3 h-3 ml-1" /> تفعيل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'suspended')}>
                        <Pause className="w-3 h-3 ml-1" /> إيقاف
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3 h-3 ml-1" /> حذف
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
                const completedOrders = orders.filter(o => o.delivery_agent_id === a.id && (o.status === 'delivered' || o.status === 'completed'));
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          a.status === 'available' ? 'bg-green-500/20 text-green-400' :
                          a.status === 'busy' ? 'bg-orange-500/20 text-orange-400' : 'bg-muted text-muted-foreground'
                        }`}><Truck className="w-5 h-5" /></div>
                        <div>
                          <p className="font-bold text-sm">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{agentRest?.name || '—'}</p>
                        </div>
                      </div>
                      <Badge className={a.status === 'available' ? 'status-active' : a.status === 'busy' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'status-suspended'}>
                        {a.status === 'available' ? 'متاح' : a.status === 'busy' ? 'مشغول' : 'غير متصل'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {a.phone || '—'}</div>
                      <div className="flex items-center gap-2"><ShoppingCart className="w-3 h-3" /> {completedOrders.length} طلب مُسلّم</div>
                      {a.current_lat && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" /> آخر تحديث: {a.last_location_update ? new Date(a.last_location_update).toLocaleTimeString('ar-EG') : '—'}
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

            <AnimatePresence>
              {showBanForm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setShowBanForm(false)}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
                    <h3 className="font-display font-bold text-lg flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" /> حظر جديد</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
                        <select value={banForm.target_type} onChange={e => setBanForm(p => ({ ...p, target_type: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                          <option value="customer">عميل</option><option value="agent">مندوب</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">الدرجة</label>
                        <select value={banForm.ban_level} onChange={e => setBanForm(p => ({ ...p, ban_level: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                          <option value="warning">تحذير</option><option value="temporary">مؤقت</option><option value="permanent">دائم</option>
                        </select>
                      </div>
                    </div>
                    <select value={banForm.restaurant_id} onChange={e => setBanForm(p => ({ ...p, restaurant_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                      <option value="">كل الأنشطة</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <Input placeholder="المعرف (رقم/بريد)" value={banForm.target_identifier} onChange={e => setBanForm(p => ({ ...p, target_identifier: e.target.value }))} />
                    <Input placeholder="الاسم" value={banForm.target_name} onChange={e => setBanForm(p => ({ ...p, target_name: e.target.value }))} />
                    <Input placeholder="السبب *" value={banForm.reason} onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))} />
                    {banForm.ban_level === 'temporary' && (
                      <Input type="number" min={1} max={365} placeholder="المدة (أيام)" value={banForm.expires_days} onChange={e => setBanForm(p => ({ ...p, expires_days: Number(e.target.value) }))} />
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleCreateBan} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"><Ban className="w-4 h-4 ml-2" /> تأكيد</Button>
                      <Button variant="outline" onClick={() => setShowBanForm(false)} className="flex-1">إلغاء</Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {bans.map(b => (
              <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`glass-card p-4 border-r-4 ${!b.is_active ? 'opacity-50' : ''} ${
                  b.ban_level === 'permanent' ? 'border-r-red-500' : b.ban_level === 'temporary' ? 'border-r-orange-500' : 'border-r-yellow-500'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${b.target_type === 'customer' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                      {b.target_type === 'customer' ? <UserX className="w-5 h-5 text-blue-400" /> : <Truck className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{b.target_name || b.target_identifier}</p>
                        <Badge className={BAN_LEVELS[b.ban_level as keyof typeof BAN_LEVELS]?.color}>
                          {BAN_LEVELS[b.ban_level as keyof typeof BAN_LEVELS]?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span>{b.restaurants?.name || 'الكل'}</span>
                        <span>{new Date(b.banned_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleToggleBan(b.id, b.is_active)}>
                      {b.is_active ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
                      {b.is_active ? 'تعطيل' : 'تفعيل'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteBan(b.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {bans.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد حالات حظر</p>}
          </div>
        )}

        {/* ===== RECEIPTS TAB ===== */}
        {tab === 'receipts' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">إيصالات الدفع ({receipts.length})</h2>
            {receipts.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{r.restaurants?.name || 'غير محدد'}</p>
                      <Badge className={r.status === 'approved' ? 'status-active' : r.status === 'rejected' ? 'status-suspended' : 'status-pending'}>
                        {r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{r.method}</span>
                      {r.amount && <span className="font-bold">{r.amount} ج.م</span>}
                      <span>{new Date(r.uploaded_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveReceipt(r.id, r.restaurant_id)} className="gradient-bg text-primary-foreground border-0">
                        <Check className="w-3 h-3 ml-1" /> موافقة
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectReceipt(r.id)}>
                        <X className="w-3 h-3 ml-1" /> رفض
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {receipts.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد إيصالات</p>}
          </div>
        )}

        {/* ===== BACKUP TAB ===== */}
        {tab === 'backup' && (
          <div className="space-y-6">
            <div className="glass-card p-6 text-center">
              <Database className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">النسخ الاحتياطي</h2>
              <p className="text-muted-foreground mb-4">تحميل نسخة كاملة من جميع بيانات النظام بصيغة JSON</p>
              <Button onClick={handleExport} className="gradient-bg text-primary-foreground border-0">
                <Download className="w-4 h-4 ml-2" /> تحميل النسخة الاحتياطية
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdmin;
