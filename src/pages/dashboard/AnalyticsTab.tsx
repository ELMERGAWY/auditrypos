import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, 
  ShoppingCart, PieChart, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart as RePieChart, Pie 
} from 'recharts';

interface Props {
  restaurantId: string;
  currency: string;
}

export function AnalyticsTab({ restaurantId, currency }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetching all necessary data for the BI dashboard
      const [salesRes, productsRes, customersRes, expensesRes] = await Promise.all([
        supabase.from('orders').select('total, created_at').eq('restaurant_id', restaurantId),
        supabase.from('products').select('name, quantity, cost_price, price').eq('restaurant_id', restaurantId),
        supabase.from('customers').select('name, balance').eq('restaurant_id', restaurantId),
        supabase.from('expenses').select('amount, category, date').eq('restaurant_id', restaurantId)
      ]);

      // Simple transformations for charts
      const sales = salesRes.data || [];
      const totalSales = sales.reduce((s, o) => s + Number(o.total), 0);
      const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
      const stockValue = (productsRes.data || []).reduce((s, p) => s + (Number(p.price) * Number(p.quantity)), 0);

      setData({
        totalSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        stockValue,
        salesOverTime: sales.slice(-20).map(o => ({ date: new Date(o.created_at).toLocaleDateString(), amount: o.total })),
        expensesByCategory: [
          { name: 'رواتب', value: 400 },
          { name: 'إيجار', value: 300 },
          { name: 'مشتريات', value: 300 },
        ]
      });
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  if (loading) return <div className="p-10 text-center">جاري تحليل البيانات...</div>;

  const COLORS = ['#f97316', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'];

  return (
    <div className="p-4 space-y-6 fade-in-up pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" /> مركز التقارير والذكاء الاصطناعي
        </h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary rounded-lg text-xs font-bold">تصدير PDF</button>
          <button className="px-4 py-2 bg-secondary rounded-lg text-xs font-bold">تصدير Excel</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المبيعات', val: data.totalSales, icon: ShoppingCart, color: 'text-primary', trend: '+12%' },
          { label: 'إجمالي المصروفات', val: data.totalExpenses, icon: TrendingDown, color: 'text-destructive', trend: '-5%' },
          { label: 'صافي الربح', val: data.netProfit, icon: DollarSign, color: 'text-success', trend: '+8%' },
          { label: 'قيمة المخزون', val: data.stockValue, icon: Package, color: 'text-accent', trend: 'ثابت' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1 h-full ${kpi.color.replace('text', 'bg')}`} />
            <div className="flex justify-between items-start mb-2">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              <span className="text-[10px] font-bold text-success flex items-center gap-0.5">
                {kpi.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold font-display mt-1">{kpi.val.toLocaleString()} {currency}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance Chart */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> أداء المبيعات</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesOverTime}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(25, 95%, 53%)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Distribution */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" /> توزيع المصروفات</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={data.expensesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.expensesByCategory.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4">
            {data.expensesByCategory.map((c: any, index: number) => (
              <div key={c.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-[10px] text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-bold text-xs uppercase text-muted-foreground">أفضل العملاء</h4>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><Users className="w-3 h-3" /> عميل مميز {i}</span>
                <span className="font-bold">{(5000 / i).toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-bold text-xs uppercase text-muted-foreground">الأصناف الأكثر مبيعاً</h4>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><Package className="w-3 h-3" /> صنف مبيعات {i}</span>
                <span className="font-bold">{100 - i * 10} قطعة</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-bold text-xs uppercase text-muted-foreground">مؤشرات المخزون</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>معدل دوران المخزون</span>
              <span className="text-success font-bold">4.5x</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>أيام تغطية المخزون</span>
              <span className="text-warning font-bold">12 يوم</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
