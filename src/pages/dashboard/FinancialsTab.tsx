// @ts-nocheck

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  FileText, Wallet, BookOpen, Scale, PieChart, 
  ShoppingBag, Calendar, ArrowRightLeft, ShieldCheck, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GeneralLedger } from './GeneralLedger';
import { TrialBalance } from './TrialBalance';
import { CashFlowStatement } from './CashFlowStatement';
import { EquityStatement } from './EquityStatement';
import { BalanceSheet } from './BalanceSheet';
import { TradingAccount } from './TradingAccount';
import { cn } from '@/lib/utils';

import { hasFeature, type BusinessType } from '@/lib/businessTypes';

type FinancialTab = 'overview' | 'ledger' | 'trial_balance' | 'cash_flow' | 'equity' | 'balance_sheet' | 'trading' | 'projects';
type AccountingStandard = 'EAS' | 'IFRS' | 'US_GAAP';

const STANDARD_LABELS: Record<AccountingStandard, string> = {
  EAS: 'المعايير المصرية EAS',
  IFRS: 'المعايير الدولية IFRS',
  US_GAAP: 'المعايير الأمريكية US GAAP',
};

interface Props {
  restaurantId: string;
  workspaceId?: string;
  currency: string;
  businessType: BusinessType;
}

export function FinancialsTab({ restaurantId, workspaceId, currency, businessType }: Props) {
  const [activeTab, setActiveTab] = useState<FinancialTab>(() => {
    const saved = sessionStorage.getItem('financial_active_tab');
    if (saved) {
      sessionStorage.removeItem('financial_active_tab');
      return saved as FinancialTab;
    }
    return 'overview';
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [serviceInvoices, setServiceInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState<any[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [accountingStandard, setAccountingStandard] = useState<AccountingStandard>('IFRS');
  const [standardReport, setStandardReport] = useState<any>(null);
  const [standardSaving, setStandardSaving] = useState(false);
  const [standardReportLoading, setStandardReportLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const [{ data: restaurant }, ordersRes, orderItemsRes, serviceInvoicesRes, expensesRes, productsRes, customersRes, projectsRes] = await Promise.all([
      supabase.from('restaurants').select('company_id').eq('id', restaurantId).maybeSingle(),
      supabase.from('orders').select('id, total, total_cost, status, created_at, paid_amount, discount, payment_method, workspace_id').eq('restaurant_id', restaurantId).limit(5000),
      supabase.from('order_items').select('order_id, quantity, price, cost_price_snapshot, unit_factor').order('order_id').limit(10000),
      supabase.from('service_invoices').select('*').eq('restaurant_id', restaurantId).limit(5000),
      supabase.from('expenses').select('amount, category, date, project_id').eq('restaurant_id', restaurantId).limit(5000),
      supabase.from('products').select('price, cost_price, quantity').eq('restaurant_id', restaurantId).limit(5000),
      supabase.from('customers').select('balance').eq('restaurant_id', restaurantId).limit(5000),
      hasFeature(businessType, 'projects') ? supabase.from('projects').select('id, name, total_budget').eq('restaurant_id', restaurantId).limit(500) : Promise.resolve({ data: [] }),
    ]);
    const resolvedCompanyId = restaurant?.company_id || null;
    setCompanyId(resolvedCompanyId);
    const scopedOrders = workspaceId
      ? (ordersRes.data || []).filter((row: any) => !('workspace_id' in row) || row.workspace_id === workspaceId)
      : (ordersRes.data || []);
    const scopedServices = workspaceId
      ? ((serviceInvoicesRes.data || []).filter((row: any) => !('workspace_id' in row) || row.workspace_id === workspaceId))
      : (serviceInvoicesRes.data || []);
    setOrders(scopedOrders);
    setOrderItems(orderItemsRes.data || []);
    setServiceInvoices(scopedServices);
    setExpenses(expensesRes.data || []);
    setProducts(productsRes.data || []);
    setCustomers(customersRes.data || []);

    if (resolvedCompanyId) {
      const [{ data: settings }, { data: report }] = await Promise.all([
        (supabase as any).rpc('get_accounting_standard_settings', { p_company_id: resolvedCompanyId }),
        (supabase as any).rpc('get_financial_report_by_standard', {
          p_company_id: resolvedCompanyId,
          p_standard: null,
          p_period: { start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) },
        }),
      ]);
      const selected = (settings?.[0]?.reporting_standard || 'IFRS').toUpperCase().replace('-', '_') as AccountingStandard;
      if (['EAS', 'IFRS', 'US_GAAP'].includes(selected)) setAccountingStandard(selected);
      if (report) setStandardReport(report);
    }

    if (projectsRes.data) {
      const stats = projectsRes.data.map(p => {
        const pExpenses = (expensesRes.data || []).filter(e => e.project_id === p.id);
        const actualCost = pExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        return { ...p, actualCost };
      });
      setProjectStats(stats);
    }
    setLoaded(true);
  };

  useEffect(() => { void load(); }, [restaurantId, workspaceId]);

  const periodLabels: Record<string, string> = { today: 'اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر', all: 'الكل' };

  if (!loaded) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      <p className="text-muted-foreground font-bold">جاري تحليل البيانات المالية...</p>
    </div>
  );

  const tabs = [
    { id: 'overview' as FinancialTab, label: 'نظرة عامة', icon: PieChart },
    ...(hasFeature(businessType, 'projects') ? [{ id: 'projects' as FinancialTab, label: 'تحليل المشاريع', icon: Building2 }] : []),
    { id: 'trading' as FinancialTab, label: 'المتاجرة والتكلفة', icon: ShoppingBag },
    { id: 'balance_sheet' as FinancialTab, label: 'المركز المالي', icon: Scale },
    { id: 'ledger' as FinancialTab, label: 'حساب الاستاذ', icon: BookOpen },
    { id: 'trial_balance' as FinancialTab, label: 'ميزان المراجعة', icon: Scale },
    { id: 'cash_flow' as FinancialTab, label: 'التدفقات النقدية', icon: Wallet },
    { id: 'equity' as FinancialTab, label: 'حقوق الملكية', icon: DollarSign },
  ];

  const now = new Date();
  const filterDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') return (now.getTime() - d.getTime()) < 7 * 86400000;
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredOrders = orders.filter(o => o.status !== 'cancelled' && filterDate(o.created_at));
  const filteredServices = serviceInvoices.filter(s => s.status !== 'cancelled' && filterDate(s.invoice_date || s.created_at));
  const filteredExpenses = expenses.filter(e => filterDate(e.date));

  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    + filteredServices.reduce((s, inv) => s + Number(inv.total_amount ?? inv.amount ?? 0), 0);
  const totalCOGS = filteredOrders.reduce((s, o) => s + Math.max(0, Number(o.total_cost || 0)), 0)
    + filteredServices.reduce((s, inv) => s + Math.max(0, Number(inv.cost_amount || 0)), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const collectedAmount = filteredOrders.reduce((s, o) => s + Math.min(Number(o.total || 0), Math.max(0, Number(o.paid_amount ?? o.total ?? 0))), 0);
  // KPI uses the selected UI period and operational sources. The standard report is annual/YTD and remains for formal statements only.
  const netIncome = totalRevenue - totalCOGS - totalExpenses;
  const collectionRate = totalRevenue > 0 ? Math.min(100, Math.max(0, (collectedAmount / totalRevenue) * 100)) : 0;

  const paymentTotals = filteredOrders.reduce<Record<string, number>>((acc, order) => {
    const method = order.payment_method || 'غير محدد';
    acc[method] = (acc[method] || 0) + Number(order.total || 0);
    return acc;
  }, {});
  const paymentTotal = Object.values(paymentTotals).reduce((sum, value) => sum + value, 0);
  const paymentBreakdown = Object.entries(paymentTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([label, value]) => ({ label, value: paymentTotal > 0 ? (value / paymentTotal) * 100 : 0 }));

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const inMonth = (value: string) => {
      const date = new Date(value);
      return date.getMonth() === month && date.getFullYear() === year;
    };
    return {
      name: monthDate.toLocaleDateString('ar-EG', { month: 'short' }),
      revenue: orders.filter(order => order.status !== 'cancelled' && inMonth(order.created_at)).reduce((sum, order) => sum + Number(order.total || 0), 0)
        + serviceInvoices.filter(inv => inv.status !== 'cancelled' && inMonth(inv.invoice_date || inv.created_at)).reduce((sum, inv) => sum + Number(inv.total_amount ?? inv.amount ?? 0), 0),
      expense: expenses.filter(expense => inMonth(expense.date)).reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
        + serviceInvoices.filter(inv => inv.status !== 'cancelled' && inMonth(inv.invoice_date || inv.created_at)).reduce((sum, inv) => sum + Math.max(0, Number(inv.cost_amount || 0)), 0),
    };
  });

  const loadStandardReport = async (nextStandard: AccountingStandard) => {
    if (!companyId) return;
    setStandardSaving(true);
    setStandardReportLoading(true);
    try {
      const { error: saveError } = await (supabase as any).rpc('update_accounting_standard_settings', {
        p_company_id: companyId,
        p_reporting_standard: nextStandard,
        p_inventory_cost_method: nextStandard === 'US_GAAP' ? 'AVERAGE' : 'AVERAGE',
        p_inventory_write_down_policy: 'LOWER_OF_COST_AND_NRV',
        p_fiscal_year_start_month: 1,
        p_effective_from: new Date().toISOString().slice(0, 10),
      });
      if (saveError) throw saveError;
      const { data: report, error: reportError } = await (supabase as any).rpc('get_financial_report_by_standard', {
        p_company_id: companyId,
        p_standard: nextStandard,
        p_period: { start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) },
      });
      if (reportError) throw reportError;
      setAccountingStandard(nextStandard);
      setStandardReport(report);
    } catch (error: any) {
      toast.error('تعذر حفظ المعيار المحاسبي: ' + (error?.message || 'تحقق من migration المعايير'));
    } finally {
      setStandardSaving(false);
      setStandardReportLoading(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black gradient-text">التقارير والقوائم المالية</h1>
          <p className="text-muted-foreground font-medium">الشفافية الكاملة والذكاء المالي لعملك</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 p-1.5 glass-card !rounded-2xl bg-white/5">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold transition-all",
                  period === p ? "gradient-bg text-white shadow-lg" : "text-muted-foreground hover:bg-white/10"
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
            <label htmlFor="accounting-standard" className="text-xs font-bold text-muted-foreground">المعيار</label>
            <select
              id="accounting-standard"
              value={accountingStandard}
              onChange={(event) => void loadStandardReport(event.target.value as AccountingStandard)}
              disabled={!companyId || standardSaving}
              className="bg-transparent text-xs font-bold outline-none"
            >
              {(Object.keys(STANDARD_LABELS) as AccountingStandard[]).map((standard) => (
                <option key={standard} value={standard}>{STANDARD_LABELS[standard]}</option>
              ))}
            </select>
            {standardReportLoading && <span className="text-[10px] text-muted-foreground">جاري التحديث...</span>}
          </div>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border",
              activeTab === tab.id 
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 glow-soft" 
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-muted-foreground")} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'إجمالي الإيرادات', value: totalRevenue, icon: TrendingUp, color: 'emerald' },
                { label: 'إجمالي المصروفات', value: totalExpenses, icon: TrendingDown, color: 'rose' },
                { label: 'صافي الربح', value: netIncome, icon: DollarSign, color: 'indigo' },
                { label: 'نسبة التحصيل', value: collectionRate, icon: ShieldCheck, color: 'amber', isPercent: true },
              ].map(kpi => (
                <div key={kpi.label} className="glass-card p-6 flex flex-col gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center glow-soft", `bg-${kpi.color}-500/10 text-${kpi.color}-500`)}>
                    <kpi.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-black mt-1">
                      {kpi.isPercent ? `${kpi.value}%` : `${kpi.value.toLocaleString()} ${currency}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-500" /> تحليل الإيرادات والمصروفات</h3>
                  <Badge variant="outline" className="rounded-full">آخر 6 أشهر</Badge>
                </div>
                <div className="h-[350px]">
                  {/* Chart component logic here... simplified for now */}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'gray' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'gray' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', background: 'rgba(0,0,0,0.8)', color: 'white' }} 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="revenue" fill="url(#indigoGradient)" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="expense" fill="rgba(255,255,255,0.1)" radius={[10, 10, 0, 0]} />
                      <defs>
                        <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-8 flex flex-col gap-6">
                <h3 className="text-xl font-black flex items-center gap-2"><ArrowRightLeft className="w-6 h-6 text-indigo-500" /> ميزان المدفوعات</h3>
                <div className="space-y-6">
                  {(paymentBreakdown.length > 0 ? paymentBreakdown : [{ label: 'لا توجد بيانات', value: 0 }]).map((payment, index) => (
                    <div key={payment.label} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{payment.label}</span>
                        <span>{payment.value.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${payment.value}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e'][index] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-auto p-4 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 text-center">
                  <p className="text-xs text-muted-foreground">التحصيل المسجل خلال الفترة</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{collectedAmount.toLocaleString()} {currency}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ledger' && <GeneralLedger restaurantId={restaurantId} currency={currency} />}
        {activeTab === 'balance_sheet' && <BalanceSheet restaurantId={restaurantId} currency={currency} />}
        {activeTab === 'trial_balance' && <TrialBalance restaurantId={restaurantId} currency={currency} />}
        {activeTab === 'cash_flow' && <CashFlowStatement restaurantId={restaurantId} currency={currency} />}
        {activeTab === 'equity' && <EquityStatement restaurantId={restaurantId} currency={currency} />}
        {activeTab === 'trading' && <TradingAccount restaurantId={restaurantId} currency={currency} />}
        
        {activeTab === 'projects' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectStats.map(p => (
                <div key={p.id} className="glass-card p-6 border-t-4 border-t-indigo-500">
                  <h3 className="font-bold text-lg mb-2">{p.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">استهلاك الموازنة</span>
                        <span className="font-bold">{(p.actualCost / (p.total_budget || 1) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full gradient-bg" style={{ width: `${Math.min(100, (p.actualCost / (p.total_budget || 1) * 100))}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/30 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">المصروف الفعلي</p>
                        <p className="text-sm font-black text-rose-500">{p.actualCost.toLocaleString()} {currency}</p>
                      </div>
                      <div className="bg-secondary/30 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">الموازنة</p>
                        <p className="text-sm font-black">{Number(p.total_budget || 0).toLocaleString()} {currency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {projectStats.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>لا توجد بيانات مشاريع للتحليل حالياً</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
