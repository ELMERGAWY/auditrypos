// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Calendar, Download, RefreshCw, ShoppingCart,
  TrendingUp, TrendingDown, Users, Package, Wallet, CreditCard,
  FileText, UserCheck, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { CustomReportBuilder } from './CustomReportBuilder';

interface Props {
  restaurantId: string;
  currency: string;
  businessType?: string;
  onNavigate?: (tab: string) => void;
  /** 'stats' | 'analytics' — default landing section */
  mode?: 'stats' | 'analytics';
}

type Section = 'overview' | 'sales' | 'products' | 'customers' | 'staff' | 'custom' | 'financial';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'quarter', label: 'ربع سنة' },
  { id: 'year', label: 'سنة' },
] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function rangeForPreset(id: string): { start: string; end: string } {
  const now = new Date();
  const end = toInputDate(now);
  let start = new Date(now);
  if (id === 'today') start = startOfDay(now);
  else if (id === 'week') start.setDate(now.getDate() - 6);
  else if (id === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (id === 'quarter') start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  else if (id === 'year') start = new Date(now.getFullYear(), 0, 1);
  return { start: toInputDate(start), end };
}

function previousPeriod(start: string, end: string) {
  const s = startOfDay(new Date(start));
  const e = endOfDay(new Date(end));
  const ms = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms);
  return { start: toInputDate(prevStart), end: toInputDate(prevEnd) };
}

function pctChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function StatsReportsHub({ restaurantId, currency, onNavigate, mode = 'stats' }: Props) {
  const [section, setSection] = useState<Section>(mode === 'analytics' ? 'custom' : 'overview');
  const [preset, setPreset] = useState<string>('month');
  const [dateRange, setDateRange] = useState(() => rangeForPreset('month'));
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [prevOrders, setPrevOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const applyPreset = (id: string) => {
    setPreset(id);
    setDateRange(rangeForPreset(id));
  };

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const startIso = `${dateRange.start}T00:00:00`;
      const endIso = `${dateRange.end}T23:59:59`;
      const prev = previousPeriod(dateRange.start, dateRange.end);
      const prevStart = `${prev.start}T00:00:00`;
      const prevEnd = `${prev.end}T23:59:59`;

      const [ordRes, prevRes, custRes, expRes, prodRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, total, paid_amount, status, payment_method, customer_name, customer_id, created_at, created_by_name, updated_by_name, discount')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true })
          .limit(5000),
        supabase
          .from('orders')
          .select('id, total, paid_amount, status, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', prevStart)
          .lte('created_at', prevEnd)
          .neq('status', 'cancelled')
          .limit(5000),
        supabase
          .from('customers')
          .select('id, name, balance, total_spent, loyalty_tier, loyalty_points')
          .eq('restaurant_id', restaurantId)
          .order('total_spent', { ascending: false })
          .limit(200),
        supabase
          .from('expenses')
          .select('id, amount, category, date, description')
          .eq('restaurant_id', restaurantId)
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .limit(2000),
        supabase
          .from('products')
          .select('id, name, quantity, price, cost_price')
          .eq('restaurant_id', restaurantId)
          .limit(500),
      ]);

      const ords = ordRes.data || [];
      setOrders(ords);
      setPrevOrders(prevRes.data || []);
      setCustomers(custRes.data || []);
      setExpenses(expRes.data || []);
      setProducts(prodRes.data || []);

      const orderIds = ords.map((o) => o.id).filter(Boolean);
      if (orderIds.length > 0) {
        // chunk to avoid URL limits
        const chunks: string[][] = [];
        for (let i = 0; i < orderIds.length; i += 200) chunks.push(orderIds.slice(i, i + 200));
        const itemMaps: any[] = [];
        for (const chunk of chunks) {
          const { data } = await supabase
            .from('order_items')
            .select('menu_item_name, quantity, price, line_total, order_id')
            .in('order_id', chunk);
          if (data) itemMaps.push(...data);
        }
        setOrderItems(itemMaps);
      } else {
        setOrderItems([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('فشل تحميل الإحصائيات: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }, [restaurantId, dateRange]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    const sales = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const paid = orders.reduce((s, o) => s + (Number(o.paid_amount) || 0), 0);
    const prevSales = prevOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const count = orders.length;
    const prevCount = prevOrders.length;
    const aov = count ? sales / count : 0;
    const prevAov = prevCount ? prevSales / prevCount : 0;
    const unpaid = Math.max(0, sales - paid);
    const expTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const stockValue = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    const receivable = customers.reduce((s, c) => s + Math.max(0, Number(c.balance) || 0), 0);

    return {
      sales,
      paid,
      unpaid,
      count,
      aov,
      expTotal,
      stockValue,
      receivable,
      salesChange: pctChange(sales, prevSales),
      countChange: pctChange(count, prevCount),
      aovChange: pctChange(aov, prevAov),
      netApprox: sales - expTotal,
    };
  }, [orders, prevOrders, expenses, products, customers]);

  const salesByDay = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; orders: number; paid: number }>();
    for (const o of orders) {
      const key = new Date(o.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      const prev = map.get(key) || { date: key, sales: 0, orders: 0, paid: 0 };
      prev.sales += Number(o.total) || 0;
      prev.paid += Number(o.paid_amount) || 0;
      prev.orders += 1;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [orders]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const m = o.payment_method || 'غير محدد';
      const label =
        m === 'cash' ? 'نقدي' :
        m === 'card' ? 'بطاقة' :
        m === 'credit' || m === 'debt' ? 'آجل' :
        m === 'transfer' || m === 'bank' ? 'تحويل' : m;
      map.set(label, (map.get(label) || 0) + (Number(o.total) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const st = o.status || 'other';
      map.set(st, (map.get(st) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of orderItems) {
      const name = it.menu_item_name || 'صنف';
      const prev = map.get(name) || { name, qty: 0, revenue: 0 };
      const qty = Number(it.quantity) || 0;
      const rev = Number(it.line_total) || qty * (Number(it.price) || 0);
      prev.qty += qty;
      prev.revenue += rev;
      map.set(name, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [orderItems]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const c = e.category || 'أخرى';
      map.set(c, (map.get(c) || 0) + (Number(e.amount) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const staffPerformance = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; sales: number }>();
    for (const o of orders) {
      const name = o.created_by_name || o.updated_by_name || 'غير منسوب';
      const prev = map.get(name) || { name, orders: 0, sales: 0 };
      prev.orders += 1;
      prev.sales += Number(o.total) || 0;
      map.set(name, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales).slice(0, 15);
  }, [orders]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders.map(o => ({
      رقم: o.order_number,
      التاريخ: o.created_at,
      العميل: o.customer_name,
      الإجمالي: o.total,
      المدفوع: o.paid_amount,
      الحالة: o.status,
      الدفع: o.payment_method,
      بواسطة: o.created_by_name || '',
    }))), 'طلبات');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topProducts), 'أصناف');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffPerformance), 'موظفين');
    XLSX.writeFile(wb, `auditry-stats-${dateRange.start}_${dateRange.end}.xlsx`);
    toast.success('تم تصدير Excel');
  };

  const Trend = ({ value }: { value: number }) => (
    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: Activity },
    { id: 'sales', label: 'المبيعات', icon: ShoppingCart },
    { id: 'products', label: 'الأصناف', icon: Package },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'staff', label: 'الموظفين', icon: UserCheck },
    { id: 'custom', label: 'تقارير مخصصة', icon: FileText },
    { id: 'financial', label: 'قوائم مالية', icon: Wallet },
  ];

  return (
    <div className="p-4 space-y-5 fade-in pb-16" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            مركز الإحصائيات والتقارير
          </h2>
          <p className="text-sm text-muted-foreground">مؤشرات حقيقية من الطلبات والمبيعات — مقارنة بالفترة السابقة وتصدير Excel</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={dateRange.start}
              onChange={(e) => { setPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={dateRange.end}
              onChange={(e) => { setPreset('custom'); setDateRange({ ...dateRange, end: e.target.value }); }}
            />
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={exportExcel} disabled={!orders.length}>
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={section === s.id ? 'default' : 'outline'}
            className={`h-9 gap-1 shrink-0 ${section === s.id ? 'gradient-bg text-primary-foreground border-0' : ''}`}
            onClick={() => setSection(s.id)}
          >
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">جاري تحليل البيانات...</div>
      ) : (
        <>
          {(section === 'overview' || section === 'sales') && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'المبيعات', value: kpis.sales, change: kpis.salesChange, icon: ShoppingCart },
                { label: 'عدد الطلبات', value: kpis.count, change: kpis.countChange, icon: Filter, raw: true },
                { label: 'متوسط الفاتورة', value: kpis.aov, change: kpis.aovChange, icon: CreditCard },
                { label: 'المحصّل', value: kpis.paid, icon: Wallet },
                { label: 'المتبقي', value: kpis.unpaid, icon: TrendingDown },
                { label: 'صافي تقريبي', value: kpis.netApprox, icon: TrendingUp },
              ].map((k) => (
                <Card key={k.label} className="p-4 border-primary/10">
                  <div className="flex justify-between items-start mb-1">
                    <k.icon className="w-4 h-4 text-primary" />
                    {k.change !== undefined && <Trend value={k.change} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold">{k.label}</p>
                  <p className="text-lg font-black mt-1">
                    {(k.raw ? k.value : Number(k.value).toLocaleString(undefined, { maximumFractionDigits: 0 }))}
                    {!k.raw && <span className="text-[10px] font-normal text-muted-foreground mr-1"> {currency}</span>}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {section === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-5 lg:col-span-2">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> المبيعات عبر الفترة</h3>
                <div className="h-72">
                  {salesByDay.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-16">لا توجد مبيعات في هذه الفترة</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesByDay}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="paid" name="المحصّل" stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold mb-4">طرق الدفع</h3>
                <div className="h-48">
                  {paymentBreakdown.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-10">—</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                          {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-1 mt-2">
                  {paymentBreakdown.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex justify-between text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</span>
                      <span className="font-bold">{p.value.toLocaleString()} {currency}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">قيمة المخزون (بسعر البيع)</p>
                <p className="text-2xl font-black text-blue-600">{kpis.stockValue.toLocaleString()} {currency}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">مديونيات العملاء</p>
                <p className="text-2xl font-black text-red-600">{kpis.receivable.toLocaleString()} {currency}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">مصروفات الفترة</p>
                <p className="text-2xl font-black text-amber-600">{kpis.expTotal.toLocaleString()} {currency}</p>
              </Card>
            </div>
          )}

          {section === 'sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-bold mb-4">الطلبات / اليوم</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="orders" name="طلبات" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold mb-4">حالات الطلبات</h3>
                <div className="space-y-2">
                  {statusBreakdown.map((s) => (
                    <div key={s.name} className="flex justify-between items-center p-3 rounded-xl bg-secondary/40">
                      <Badge variant="outline">{s.name}</Badge>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                  {statusBreakdown.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">لا بيانات</p>}
                </div>
              </Card>
              <Card className="p-5 lg:col-span-2 overflow-auto">
                <h3 className="font-bold mb-3">آخر الطلبات في الفترة</h3>
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/40 text-xs">
                    <tr>
                      <th className="p-2">الرقم</th>
                      <th className="p-2">العميل</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">المدفوع</th>
                      <th className="p-2">بواسطة</th>
                      <th className="p-2">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...orders].reverse().slice(0, 25).map((o) => (
                      <tr key={o.id} className="hover:bg-muted/20">
                        <td className="p-2 font-mono text-xs">#{String(o.order_number || '').slice(-6)}</td>
                        <td className="p-2">{o.customer_name || '—'}</td>
                        <td className="p-2 font-bold">{Number(o.total || 0).toLocaleString()}</td>
                        <td className="p-2 text-emerald-600">{Number(o.paid_amount || 0).toLocaleString()}</td>
                        <td className="p-2 text-xs text-primary">{o.created_by_name || '—'}</td>
                        <td className="p-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {section === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-bold mb-4">أعلى 10 أصناف بالإيراد</h3>
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex justify-between items-center p-3 rounded-xl bg-secondary/40">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.qty} وحدة</p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-600">{p.revenue.toLocaleString()} {currency}</p>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">لا مبيعات أصناف في الفترة</p>}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold mb-4">توزيع إيراد الأصناف</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="revenue" name="الإيراد" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {section === 'customers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="font-bold mb-4">أعلى العملاء إنفاقاً</h3>
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {customers.slice(0, 20).map((c, i) => (
                    <div key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-secondary/40">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          <Badge variant="outline" className="text-[9px]">{c.loyalty_tier || 'bronze'}</Badge>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-emerald-600">{Number(c.total_spent || 0).toLocaleString()} {currency}</p>
                        <p className={`text-[10px] ${Number(c.balance) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          رصيد: {Number(c.balance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold mb-4">مصروفات حسب التصنيف</h3>
                <div className="space-y-2">
                  {expenseByCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">لا مصروفات مسجّلة في الفترة</p>}
                  {expenseByCategory.map((e, i) => (
                    <div key={e.name} className="flex justify-between text-sm p-2 rounded-lg bg-secondary/30">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{e.name}</span>
                      <span className="font-bold">{e.value.toLocaleString()} {currency}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'staff' && (
            <Card className="p-5">
              <h3 className="font-bold mb-4">أداء الموظفين (حسب من أنشأ الطلب)</h3>
              <div className="h-72 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="sales" name="مبيعات" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/40 text-xs">
                  <tr><th className="p-2">الموظف</th><th className="p-2">الطلبات</th><th className="p-2">المبيعات</th><th className="p-2">متوسط الفاتورة</th></tr>
                </thead>
                <tbody className="divide-y">
                  {staffPerformance.map((s) => (
                    <tr key={s.name}>
                      <td className="p-2 font-bold">{s.name}</td>
                      <td className="p-2">{s.orders}</td>
                      <td className="p-2 text-emerald-600 font-bold">{s.sales.toLocaleString()} {currency}</td>
                      <td className="p-2">{(s.orders ? s.sales / s.orders : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</td>
                    </tr>
                  ))}
                  {staffPerformance.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا بيانات — ستظهر بعد تسجيل الطلبات بأسماء الموظفين</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'custom' && (
            <CustomReportBuilder restaurantId={restaurantId} currency={currency} />
          )}

          {section === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'قائمة الدخل / المتاجرة', tab: 'financials', hint: 'الأرباح والخسائر' },
                { title: 'الخزينة والبنوك', tab: 'treasury', hint: 'أرصدة نقدية' },
                { title: 'المحاسبة اليومية', tab: 'manual_journal', hint: 'قيود اليومية' },
                { title: 'دليل الحسابات', tab: 'chart_of_accounts', hint: 'هيكل الحسابات' },
                { title: 'عملاء ومديونيات', tab: 'customers', hint: 'أرصدة العملاء' },
                { title: 'موردين ومستحقات', tab: 'suppliers', hint: 'أرصدة الموردين' },
              ].map((r) => (
                <Card
                  key={r.title}
                  className="p-5 cursor-pointer hover:border-primary/40 transition-all"
                  onClick={() => {
                    if (onNavigate) {
                      toast.success(`الانتقال إلى ${r.title}`);
                      onNavigate(r.tab);
                    } else {
                      toast.info('افتح من القائمة الجانبية: ' + r.title);
                    }
                  }}
                >
                  <FileText className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-bold">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.hint}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
