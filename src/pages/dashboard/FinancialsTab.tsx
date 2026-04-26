import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileText, Wallet, BookOpen, Scale, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GeneralLedger } from './GeneralLedger';
import { TrialBalance } from './TrialBalance';
import { CashFlowStatement } from './CashFlowStatement';
import { EquityStatement } from './EquityStatement';

type FinancialTab = 'overview' | 'ledger' | 'trial_balance' | 'cash_flow' | 'equity';

interface Props {
  restaurantId: string;
  currency: string;
}

export function FinancialsTab({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const [ordersRes, orderItemsRes, expensesRes, productsRes, customersRes] = await Promise.all([
      supabase.from('orders').select('id, total, status, created_at, paid_amount, discount, payment_method').eq('restaurant_id', restaurantId),
      supabase.from('order_items').select('order_id, quantity, price, cost_price_snapshot, unit_factor').order('order_id'),
      supabase.from('expenses').select('amount, category, date').eq('restaurant_id', restaurantId),
      supabase.from('products').select('price, cost_price, quantity').eq('restaurant_id', restaurantId),
      supabase.from('customers').select('balance').eq('restaurant_id', restaurantId),
    ]);
    setOrders(ordersRes.data || []);
    setOrderItems(orderItemsRes.data || []);
    setExpenses(expensesRes.data || []);
    setProducts(productsRes.data || []);
    setCustomers(customersRes.data || []);
    setLoaded(true);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const now = new Date();
  const filterDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') return (now.getTime() - d.getTime()) < 7 * 86400000;
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredOrders = orders.filter(o => o.status !== 'cancelled' && filterDate(o.created_at));
  const filteredExpenses = expenses.filter(e => filterDate(e.date));

  // Revenue
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalDiscounts = filteredOrders.reduce((s, o) => s + Number(o.discount || 0), 0);

  // COGS - calculated from actual cost_price_snapshot in order_items
  const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
  const filteredItems = orderItems.filter(i => filteredOrderIds.has(i.order_id));
  const totalCOGS = filteredItems.reduce((s, i) => {
    const costSnapshot = Number(i.cost_price_snapshot) || 0;
    const qty = Number(i.quantity) || 0;
    const factor = Number(i.unit_factor) || 1;
    return s + (costSnapshot * qty * factor);
  }, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netIncome = grossProfit - totalExpenses;

  // Stock
  const stockCost = products.reduce((s, p) => s + Number(p.cost_price) * Number(p.quantity), 0);
  const stockValue = products.reduce((s, p) => s + Number(p.price) * Number(p.quantity), 0);

  // Receivables
  const totalReceivables = customers.reduce((s, c) => s + Math.max(0, Number(c.balance)), 0);
  const totalPaid = filteredOrders.reduce((s, o) => s + Number(o.paid_amount || 0), 0);
  const totalUnpaid = totalRevenue - totalPaid;

  // Payment method breakdown
  const paymentMethods = ['cash', 'instapay', 'vodafone_cash', 'bank'];
  const paymentLabels: Record<string, string> = { cash: 'نقدي', instapay: 'إنستاباي', vodafone_cash: 'فودافون كاش', bank: 'تحويل بنكي' };
  const paymentBreakdown = paymentMethods.map(m => ({
    name: paymentLabels[m] || m,
    value: filteredOrders.filter(o => (o.payment_method || 'cash') === m).reduce((s, o) => s + Number(o.paid_amount || 0), 0),
  })).filter(d => d.value > 0);

  // Expense breakdown
  const expenseCategories = [...new Set(filteredExpenses.map(e => e.category))];
  const expenseByCategory = expenseCategories.map(cat => ({
    name: cat,
    value: filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
  })).sort((a, b) => b.value - a.value);

  // Monthly revenue chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthOrders = orders.filter(o =>
      o.status !== 'cancelled' &&
      new Date(o.created_at).getMonth() === d.getMonth() &&
      new Date(o.created_at).getFullYear() === d.getFullYear()
    );
    const monthExpenses = expenses.filter(e =>
      new Date(e.date).getMonth() === d.getMonth() &&
      new Date(e.date).getFullYear() === d.getFullYear()
    );
    return {
      month: d.toLocaleDateString('ar-EG', { month: 'short' }),
      revenue: monthOrders.reduce((s, o) => s + Number(o.total), 0),
      expenses: monthExpenses.reduce((s, e) => s + Number(e.amount), 0),
    };
  });

  const periodLabels: Record<string, string> = { today: 'اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر', all: 'الكل' };

  if (!loaded) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Sub-tabs for financial reports
  const tabs = [
    { id: 'overview' as FinancialTab, label: 'نظرة عامة', icon: PieChart },
    { id: 'ledger' as FinancialTab, label: 'حساب الاستاذ', icon: BookOpen },
    { id: 'trial_balance' as FinancialTab, label: 'ميزان المراجعة', icon: Scale },
    { id: 'cash_flow' as FinancialTab, label: 'التدفقات النقدية', icon: Wallet },
    { id: 'equity' as FinancialTab, label: 'حقوق الملكية', icon: DollarSign },
  ];

  if (activeTab === 'ledger') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        <GeneralLedger restaurantId={restaurantId} currency={currency} />
      </div>
    );
  }

  if (activeTab === 'trial_balance') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        <TrialBalance restaurantId={restaurantId} currency={currency} />
      </div>
    );
  }

  if (activeTab === 'cash_flow') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        <CashFlowStatement restaurantId={restaurantId} currency={currency} />
      </div>
    );
  }

  if (activeTab === 'equity') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        <EquityStatement restaurantId={restaurantId} currency={currency} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>
      <motion.div className="p-4 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> القوائم المالية
          </h2>
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${period === p ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ${currency}`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
            { label: 'تكلفة البضاعة المباعة', value: `${totalCOGS.toLocaleString()} ${currency}`, icon: TrendingDown, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'صافي الدخل', value: `${netIncome.toLocaleString()} ${currency}`, icon: DollarSign, color: netIncome >= 0 ? 'text-success' : 'text-destructive', bg: netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
            { label: 'الذمم المدينة', value: `${totalReceivables.toLocaleString()} ${currency}`, icon: Wallet, color: 'text-warning', bg: 'bg-warning/10' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className={`font-display font-bold text-sm ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Income Statement */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> قائمة الدخل — {periodLabels[period]}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg border border-success/20">
              <span className="font-medium">إجمالي الإيرادات (المبيعات)</span>
              <span className="font-bold text-success">{totalRevenue.toLocaleString()} {currency}</span>
            </div>
            {totalDiscounts > 0 && (
              <div className="flex justify-between items-center p-2 pr-8 text-sm">
                <span className="text-muted-foreground">(-) الخصومات</span>
                <span className="text-muted-foreground">{totalDiscounts.toLocaleString()} {currency}</span>
              </div>
            )}

            <div className="flex justify-between items-center p-2 pr-8 text-sm">
              <span className="text-muted-foreground">(-) تكلفة البضاعة المباعة (COGS)</span>
              <span className="text-destructive">{totalCOGS.toLocaleString()} {currency}</span>
            </div>

            <div className={`flex justify-between items-center p-3 rounded-lg border ${grossProfit >= 0 ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <span className="font-medium">مجمل الربح</span>
              <span className={`font-bold ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{grossProfit.toLocaleString()} {currency}</span>
            </div>

            {grossProfit > 0 && totalRevenue > 0 && (
              <div className="flex justify-between items-center p-2 pr-8 text-sm">
                <span className="text-muted-foreground">هامش الربح الإجمالي</span>
                <span className="text-primary font-bold">{((grossProfit / totalRevenue) * 100).toFixed(1)}%</span>
              </div>
            )}

            <hr className="border-border my-2" />

            {/* Collection info */}
            <div className="flex justify-between items-center p-2 pr-8 text-sm">
              <span className="text-muted-foreground">المبلغ المحصّل</span>
              <span className="text-success">{totalPaid.toLocaleString()} {currency}</span>
            </div>
            {totalUnpaid > 0 && (
              <div className="flex justify-between items-center p-2 pr-8 text-sm">
                <span className="text-muted-foreground">مبالغ غير محصّلة (آجل)</span>
                <span className="text-warning">{totalUnpaid.toLocaleString()} {currency}</span>
              </div>
            )}

            <hr className="border-border my-2" />

            <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <span className="font-medium">إجمالي المصروفات التشغيلية</span>
              <span className="font-bold text-destructive">{totalExpenses.toLocaleString()} {currency}</span>
            </div>

            {expenseByCategory.slice(0, 5).map(ec => (
              <div key={ec.name} className="flex justify-between items-center p-2 pr-8 text-sm">
                <span className="text-muted-foreground">{ec.name}</span>
                <span>{ec.value.toLocaleString()} {currency}</span>
              </div>
            ))}

            <hr className="border-border my-2" />

            <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${netIncome >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <span className="font-display font-bold text-lg">صافي الدخل</span>
              <span className={`font-display font-bold text-xl ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netIncome.toLocaleString()} {currency}
              </span>
            </div>

            {netIncome > 0 && totalRevenue > 0 && (
              <div className="flex justify-between items-center p-2 text-sm">
                <span className="text-muted-foreground">هامش صافي الربح</span>
                <span className="text-primary font-bold">{((netIncome / totalRevenue) * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card p-6">
            <h3 className="font-display font-bold mb-4">قيمة المخزون</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>قيمة البيع</span>
                <span className="font-bold text-primary">{stockValue.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>التكلفة</span>
                <span className="font-bold">{stockCost.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="font-medium">الربح المتوقع</span>
                <span className={`font-bold ${stockValue - stockCost >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(stockValue - stockCost).toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-bold mb-4">الذمم المدينة (العملاء)</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>إجمالي المديونيات</span>
                <span className="font-bold text-destructive">{totalReceivables.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>عدد العملاء المدينين</span>
                <span className="font-bold">{customers.filter(c => Number(c.balance) > 0).length}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold mb-4">توزيع التحصيل</h3>
            <div className="space-y-3">
              {paymentBreakdown.map(p => (
                <div key={p.name} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-bold text-primary">{p.value.toLocaleString()} {currency}</span>
                </div>
              ))}
              {paymentBreakdown.length === 0 && <p className="text-xs text-muted-foreground text-center">لا توجد بيانات</p>}
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold mb-4">الإيرادات مقابل المصروفات — آخر 6 أشهر</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(v: number) => [`${v.toLocaleString()} ${currency}`]}
                />
                <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="الإيرادات" />
                <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="المصروفات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
