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
      toast.error('غير مصرح لك بالوصول - يجب أن تكون سوبر أدمن');
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

    const revenueByRestaurant = restaurants.map(r => {
      const rOrders = orders.filter(o => o.restaurant_id === r.id && o.status !== 'cancelled');
      return { name: r.name, revenue: rOrders.reduce((s, o) => s + Number(o.total), 0) };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return {
      activeRests, suspendedRests, pendingRests, totalRevenue, todayRevenue,
      todayOrders: todayOrders.length, activeAgents, activeBans,
      last7Days, revenueByRestaurant, byBusinessType,
      pendingReceipts: receipts.filter(r => r.status === 'pending').length,
    };
  }, [restaurants, orders, agents, bans, receipts]);

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
              <h1 className="text-xl font-bold font-display tracking-tight">النظام المركزي للتحكم</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-500" /> لوحة السوبر أدمن الخارقة
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
            { id: 'overview', label: 'الإحصائيات العامة', icon: BarChart3 },
            { id: 'restaurants', label: 'إدارة الأنشطة', icon: Store, badge: restaurants.length },
            { id: 'receipts', label: 'طلبات التفعيل', icon: FileText, badge: stats.pendingReceipts },
            { id: 'bans', label: 'الرقابة والحظر', icon: Ban },
            { id: 'backup', label: 'تصدير البيانات', icon: Database },
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
                <Store className="w-8 h-8 text-primary mb-2" />
                <p className="text-3xl font-bold">{stats.activeRests}</p>
                <p className="text-sm text-muted-foreground">نشاط فعّال حالياً</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-success">
                <DollarSign className="w-8 h-8 text-success mb-2" />
                <p className="text-3xl font-bold">{stats.todayRevenue.toLocaleString()} ج.م</p>
                <p className="text-sm text-muted-foreground">إيرادات اليوم للنظام</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-warning">
                <FileText className="w-8 h-8 text-warning mb-2" />
                <p className="text-3xl font-bold">{stats.pendingReceipts}</p>
                <p className="text-sm text-muted-foreground">إيصالات تنتظر الموافقة</p>
              </div>
              <div className="glass-card p-6 border-b-4 border-b-destructive">
                <Ban className="w-8 h-8 text-destructive mb-2" />
                <p className="text-3xl font-bold">{stats.activeBans}</p>
                <p className="text-sm text-muted-foreground">حظر نشط</p>
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
                <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> أقوى 10 أنشطة مبيعاً</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.revenueByRestaurant} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-primary" /> الأنشطة التجارية المسجلة</h2>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="بحث باسم النشاط أو الإيميل..." className="pr-10 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                <div key={r.id} className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-inner">
                      {BUSINESS_TYPES[r.business_type as BusinessType]?.icon || '🏢'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold">{r.name}</h4>
                        <Badge className={r.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                          {r.status === 'active' ? 'نشط' : 'موقوف'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{r.id}</p>
                      
                      {/* Modules Display */}
                      <div className="flex flex-wrap gap-1 mb-3">
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

                      <div className="flex items-center gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> انتهاء الاشتراك: {r.subscription_end ? new Date(r.subscription_end).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> الحالة: {r.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-secondary/50 p-1 rounded-xl w-full sm:w-auto">
                      {[30, 90, 365].map(d => (
                        <button key={d} onClick={() => setExtendDays(prev => ({ ...prev, [r.id]: d }))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${(extendDays[r.id] || 30) === d ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}>
                          {d === 30 ? 'شهر' : d === 90 ? '3 شهور' : 'سنة'}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => handleExtendSubscription(r.id)} className="w-full sm:w-auto gradient-bg text-white">تفعيل/تمديد</Button>
                    <div className="h-8 w-[1px] bg-border hidden sm:block mx-2" />
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, r.status === 'active' ? 'suspended' : 'active')} className="w-full sm:w-auto">
                      {r.status === 'active' ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
                      {r.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)} className="w-full sm:w-auto">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... other tabs like receipts, bans, backup ... */}
      </div>
    </div>
  );
};

export default SuperAdmin;
