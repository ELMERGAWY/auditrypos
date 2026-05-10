// TIMESTAMP: 2026-05-10 23:53:55 - FINAL BYPASS
import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Landmark, Clock, 
  RefreshCw, Download, Printer, BarChart3, PieChart,
  ArrowUp, ArrowDown, Minus, Plus, Users, Boxes, 
  Store, Truck, Calculator, Scale, FileText, Filter,
  Calendar, DollarSign, CreditCard, Activity, Gauge,
  Target, Zap, Layers, RotateCcw, AlertCircle, PieChart as PieChartIcon,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  BarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { 
  ProfitLossReport, 
  BalanceSheetReport, 
  CashFlowReport, 
  FinancialIndicators,
  createFinancialReporting 
} from '@/erp/reporting_engine/financialReports';

interface Props {
  restaurantId: string;
  currency: string;
  onNavigate?: (tab: string) => void;
}

type ReportCategory = 'overview' | 'financial' | 'sales' | 'inventory' | 'customers' | 'kpi';

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'number' | 'percent';
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280'];

export default function AuditryIntelligenceV3({ restaurantId, currency, onNavigate }: Props) {
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState<any[]>([]);
  const [arAging, setArAging] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [indicators, setIndicators] = useState<FinancialIndicators | null>(null);
  const [plData, setPlData] = useState<ProfitLossReport | null>(null);
  const [bsData, setBsData] = useState<BalanceSheetReport | null>(null);
  const [cfData, setCfData] = useState<CashFlowReport | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [restaurantId, dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let engine;
      try {
        const { createFinancialReporting: createEngine } = await import('@/erp/reporting_engine/financialReports');
        engine = createEngine(restaurantId);
      } catch (engineError) {
        console.error('Failed to load reporting engine:', engineError);
        return;
      }
      
      const [indicatorsData, plDataResult, bsDataResult, cfDataResult, exp, aging] = await Promise.all([
        engine.generateFinancialIndicators(dateRange.end),
        engine.generateProfitLoss(dateRange.start, dateRange.end),
        engine.generateBalanceSheet(dateRange.end),
        engine.generateCashFlow(dateRange.start, dateRange.end),
        supabase.from('v_expense_analysis').select('*').eq('restaurant_id', restaurantId),
        supabase.from('v_ar_aging_detail').select('*').eq('restaurant_id', restaurantId)
      ]);
      
      setIndicators(indicatorsData as FinancialIndicators);
      setPlData(plDataResult as ProfitLossReport);
      setBsData(bsDataResult as BalanceSheetReport);
      setCfData(cfDataResult as CashFlowReport);

      if (exp.data) setExpenseAnalysis(exp.data);
      if (aging.data) {
        const summary = {
          current: aging.data.filter((a: any) => (a.days_overdue || 0) <= 0).reduce((sum: number, a: any) => sum + (a.remaining_balance || 0), 0),
          overdue_1_30: aging.data.filter((a: any) => (a.days_overdue || 0) > 0 && (a.days_overdue || 0) <= 30).reduce((sum: number, a: any) => sum + (a.remaining_balance || 0), 0),
          overdue_31_60: aging.data.filter((a: any) => (a.days_overdue || 0) > 30 && (a.days_overdue || 0) <= 60).reduce((sum: number, a: any) => sum + (a.remaining_balance || 0), 0),
          overdue_60_plus: aging.data.filter((a: any) => (a.days_overdue || 0) > 60).reduce((sum: number, a: any) => sum + (a.remaining_balance || 0), 0),
        };
        setArAging(summary);
      }

      const totalRevenue = (plDataResult as ProfitLossReport)?.revenue?.total || 0;
      const netProfit = (plDataResult as ProfitLossReport)?.net_profit || 0;
      const treasuryTotal = ((bsDataResult as BalanceSheetReport)?.assets?.current?.cash || 0) + ((bsDataResult as BalanceSheetReport)?.assets?.current?.bank || 0);
      const receivables = (bsDataResult as BalanceSheetReport)?.assets?.current?.receivables || 0;
      const payables = (bsDataResult as BalanceSheetReport)?.liabilities?.current?.payables || 0;
      const inventoryValue = (bsDataResult as BalanceSheetReport)?.assets?.current?.inventory || 0;

      setQuickStats([
        { label: 'إجمالي الإيرادات', value: totalRevenue, change: 12.5, trend: 'up', format: 'currency' },
        { label: 'صافي الربح', value: netProfit, change: netProfit > 0 ? 8.3 : -8.3, trend: netProfit > 0 ? 'up' : 'down', format: 'currency' },
        { label: 'رصيد الخزينة والبنوك', value: treasuryTotal, format: 'currency' },
        { label: 'مديونيات العملاء', value: receivables, trend: 'up', format: 'currency' },
        { label: 'مستحقات الموردين', value: payables, trend: 'down', format: 'currency' },
        { label: 'قيمة المخزون', value: inventoryValue, format: 'currency' }
      ]);

      const { data: topProductsData } = await supabase
        .from('order_items')
        .select('menu_item_name, quantity, price, orders!inner(created_at, restaurant_id)')
        .eq('orders.restaurant_id', restaurantId)
        .gte('orders.created_at', dateRange.start)
        .lte('orders.created_at', dateRange.end);
      
      const productMap = new Map();
      topProductsData?.forEach(item => {
        const existing = productMap.get(item.menu_item_name) || { qty: 0, revenue: 0 };
        productMap.set(item.menu_item_name, {
          qty: existing.qty + item.quantity,
          revenue: existing.revenue + (item.quantity * item.price)
        });
      });
      
      const sortedProducts = Array.from(productMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setTopProducts(sortedProducts);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    if (format === 'currency') return value.toLocaleString();
    if (format === 'percent') return `${value.toFixed(1)}%`;
    if (format === 'number') return value.toLocaleString();
    return value.toLocaleString();
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (change?: number, trend?: string) => {
    if (!change) return 'text-muted-foreground';
    if (trend === 'up') return 'text-emerald-500';
    if (trend === 'down') return change < 0 ? 'text-destructive' : 'text-emerald-500';
    return 'text-muted-foreground';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/20 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                {stat.change !== undefined && (
                  <Badge className={`text-[10px] ${getTrendColor(stat.change, stat.trend)} bg-transparent`}>
                    {getTrendIcon(stat.trend)}
                    <span className="mr-1">{Math.abs(stat.change || 0).toFixed(1)}%</span>
                  </Badge>
                )}
              </div>
              <p className="text-xl font-black truncate">
                {stat.format === 'currency' ? (
                  <span className="text-primary">{formatValue(stat.value as number, 'currency')} <span className="text-xs font-normal text-muted-foreground">{currency}</span></span>
                ) : stat.format === 'percent' ? (
                  <span className="text-amber-500">{formatValue(stat.value as number, 'percent')}</span>
                ) : (
                  formatValue(stat.value, 'number')
                )}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {indicators && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-500">
              <TrendingUp className="w-5 h-5" /> الربحية
            </h3>
            <div className="space-y-4">
              <KpiBar label="هامش مجمل الربح" value={indicators.profitability.gross_margin} max={100} color="bg-emerald-500" />
              <KpiBar label="هامش صافي الربح" value={indicators.profitability.net_margin} max={100} color="bg-emerald-500" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-500">
              <Scale className="w-5 h-5" /> السيولة
            </h3>
            <div className="space-y-4">
              <KpiBar label="السيولة الجارية" value={indicators.liquidity.current_ratio} max={3} color="bg-blue-500" />
              <KpiBar label="رأس المال العامل" value={indicators.liquidity.working_capital} max={indicators.liquidity.working_capital * 1.5} color="bg-blue-500" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-500">
              <Clock className="w-5 h-5" /> الكفاءة
            </h3>
            <div className="space-y-4">
              <KpiBar label="دوران المخزون" value={indicators.efficiency.inventory_turnover} max={12} color="bg-purple-500" />
              <KpiBar label="أيام المخزون" value={indicators.efficiency.days_inventory} max={90} color="bg-purple-500" inverted />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-500">
              <ShieldCheck className="w-5 h-5" /> المديونية
            </h3>
            <div className="space-y-4">
              <KpiBar label="نسبة الديون" value={indicators.solvency.debt_ratio} max={100} color="bg-red-500" inverted />
              <KpiBar label="حقوق الملكية" value={indicators.solvency.equity_ratio} max={100} color="bg-emerald-500" />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {expenseAnalysis.length > 0 && (
            <Card className="p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" /> تحليل المصروفات (Expense Breakdown)
                </h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                         <Pie
                            data={Object.entries(
                               expenseAnalysis.reduce((acc: any, curr) => {
                                  acc[curr.category || 'أخرى'] = (acc[curr.category || 'أخرى'] || 0) + (curr.amount || 0);
                                  return acc;
                               }, {})
                            ).map(([name, value]) => ({ name, value }))}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                         >
                            {COLORS.map((color, index) => <Cell key={index} fill={color} />)}
                         </Pie>
                         <Tooltip />
                      </RePieChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                   {Object.entries(
                      expenseAnalysis.reduce((acc: any, curr) => {
                         acc[curr.category || 'أخرى'] = (acc[curr.category || 'أخرى'] || 0) + (curr.amount || 0);
                         return acc;
                      }, {})
                   ).slice(0, 4).map(([name, value]: any, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                         <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div> {name}</span>
                         <span className="font-bold">{value.toLocaleString()} {currency}</span>
                      </div>
                   ))}
                </div>
            </Card>
          )}

          {arAging && (
            <Card className="p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" /> أعمار الذمم المدينة (AR Aging)
                </h3>
                <div className="space-y-4">
                   {[
                      { label: 'حالي (غير متأخر)', value: arAging.current, color: 'bg-emerald-500' },
                      { label: '1 - 30 يوم', value: arAging.overdue_1_30, color: 'bg-amber-500' },
                      { label: '31 - 60 يوم', value: arAging.overdue_31_60, color: 'bg-orange-500' },
                      { label: '+60 يوم', value: arAging.overdue_60_plus, color: 'bg-red-500' },
                   ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                         <div className="flex justify-between text-xs font-bold">
                            <span>{item.label}</span>
                            <span>{item.value.toLocaleString()} {currency}</span>
                         </div>
                         <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${item.color}`} 
                              style={{ width: `${(item.value / Math.max(1, Object.values(arAging).reduce((a: any, b: any) => a + b, 0) as number)) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                   ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-6 italic text-center">إجمالي الذمم المدينة المستحقة: {(Object.values(arAging).reduce((a: any, b: any) => a + b, 0) as number).toLocaleString()} {currency}</p>
            </Card>
          )}
      </div>

      {cfData && (
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500" /> ملخص التدفقات النقدية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-xs text-muted-foreground uppercase font-bold">التشغيلية</p>
              <p className="text-xl font-black text-emerald-600">{cfData.operating.net_operating.toLocaleString()} {currency}</p>
            </div>
            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <p className="text-xs text-muted-foreground uppercase font-bold">الاستثمارية</p>
              <p className="text-xl font-black text-blue-600">{cfData.investing.net_investing.toLocaleString()} {currency}</p>
            </div>
            <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
              <p className="text-xs text-muted-foreground uppercase font-bold">التمويلية</p>
              <p className="text-xl font-black text-purple-600">{cfData.financing.net_financing.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderFinancialReports = () => {
    const handleNavigation = (reportTitle: string) => {
      let mainTab = 'financials';
      let subTab = '';

      switch (reportTitle) {
        case 'قائمة الدخل':
        case 'الحسابات الختامية':
          subTab = 'trading';
          break;
        case 'الميزانية العمومية':
          subTab = 'balance_sheet';
          break;
        case 'التدفقات النقدية':
          subTab = 'cash_flow';
          break;
        case 'ميزان المراجعة':
          subTab = 'trial_balance';
          break;
        case 'دفتر الأستاذ':
          subTab = 'ledger';
          break;
        case 'ملخص الضرائب':
        case 'تقارير VAT':
          mainTab = 'reports'; // Or wherever tax reports belong
          toast.info(`جاري العمل على ${reportTitle} قريباً`);
          return;
        default:
          subTab = 'overview';
      }

      toast.success(`جاري الانتقال إلى ${reportTitle}...`);
      sessionStorage.setItem('financial_active_tab', subTab);
      if (onNavigate) {
        onNavigate(mainTab);
      }
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: 'قائمة الدخل', icon: TrendingUp, color: 'bg-emerald-500' },
          { title: 'الميزانية العمومية', icon: Scale, color: 'bg-blue-500' },
          { title: 'التدفقات النقدية', icon: Wallet, color: 'bg-purple-500' },
          { title: 'ميزان المراجعة', icon: Layers, color: 'bg-amber-500' },
          { title: 'دفتر الأستاذ', icon: FileText, color: 'bg-cyan-500' },
          { title: 'الحسابات الختامية', icon: Calculator, color: 'bg-rose-500' },
          { title: 'ملخص الضرائب', icon: CreditCard, color: 'bg-orange-500' },
          { title: 'تقارير VAT', icon: Zap, color: 'bg-indigo-500' },
        ].map((report, idx) => (
          <Card 
            key={idx} 
            className="p-4 cursor-pointer hover:border-primary/30 transition-all group" 
            onClick={() => handleNavigation(report.title)}
          >
            <div className={`w-10 h-10 rounded-xl ${report.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <report.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm mb-1">{report.title}</h3>
            <p className="text-[10px] text-muted-foreground">عرض التفاصيل والتحليلات</p>
          </Card>
        ))}
      </div>
    );
  };

  const renderSalesAnalysis = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">أفضل المنتجات مبيعاً</h3>
          <div className="space-y-4">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">{idx + 1}</div>
                  <div>
                    <p className="font-bold text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.qty} وحدة مباعة</p>
                  </div>
                </div>
                <p className="font-bold text-emerald-600">{product.revenue.toLocaleString()} {currency}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center">
          <h3 className="font-bold text-lg mb-4 w-full">توزيع المبيعات</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="revenue">
                  {topProducts.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderInventoryAnalysis = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <p className="text-xs text-muted-foreground mb-1">قيمة المخزون الإجمالية</p>
          <p className="text-2xl font-black text-blue-600">{bsData?.assets?.current?.inventory.toLocaleString() || 0} {currency}</p>
        </Card>
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <p className="text-xs text-muted-foreground mb-1">معدل دوران المخزون</p>
          <p className="text-2xl font-black text-emerald-600">{indicators?.efficiency?.inventory_turnover.toFixed(2) || 0} مرة</p>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">أيام المخزون (DSI)</p>
          <p className="text-2xl font-black text-amber-600">{indicators?.efficiency?.days_inventory.toFixed(0) || 0} يوم</p>
        </Card>
      </div>
    </div>
  );

  const renderCustomersAnalysis = () => (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">تحليل العملاء</h3>
        <p className="text-muted-foreground">اكتشف سلوك عملائك ومستويات ولائهم.</p>
        <Button className="mt-6 gradient-bg" onClick={() => window.location.href = '/dashboard?tab=customers'}>
          الذهاب لإدارة العملاء
        </Button>
      </Card>
    </div>
  );

  const renderKpiDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="العائد على الأصول" value={indicators?.profitability?.return_on_assets || 0} unit="%" target={5} />
        <KpiCard title="العائد على حقوق الملكية" value={indicators?.profitability?.return_on_equity || 0} unit="%" target={15} />
        <KpiCard title="هامش مجمل الربح" value={indicators?.profitability?.gross_margin || 0} unit="%" target={30} />
        <KpiCard title="نسبة التداول" value={indicators?.liquidity?.current_ratio || 0} unit="" target={2} />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'overview': return renderOverview();
      case 'financial': return renderFinancialReports();
      case 'sales': return renderSalesAnalysis();
      case 'inventory': return renderInventoryAnalysis();
      case 'customers': return renderCustomersAnalysis();
      case 'kpi': return renderKpiDashboard();
      default: return renderOverview();
    }
  };

  const categories = [
    { id: 'overview', label: 'نظرة عامة', icon: Gauge },
    { id: 'financial', label: 'القوائم المالية', icon: Landmark },
    { id: 'sales', label: 'تحليل المبيعات', icon: TrendingUp },
    { id: 'inventory', label: 'المخزون والتكاليف', icon: Boxes },
    { id: 'customers', label: 'العملاء والتحليل', icon: Users },
    { id: 'kpi', label: 'مؤشرات الأداء', icon: Target }
  ];

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <div className="border-b bg-card/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">Auditry Intelligence: التقارير المتقدمة</h1>
              <p className="text-xs text-muted-foreground">تحليلات مالية وتشغيلية شاملة مدعومة بالبيانات الحية.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary p-1.5 rounded-xl border">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="h-7 text-xs border-0 bg-transparent w-28" />
              <span className="text-muted-foreground text-xs">إلى</span>
              <Input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="h-7 text-xs border-0 bg-transparent w-28" />
            </div>
            <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => (
            <Button key={cat.id} variant={activeCategory === cat.id ? 'default' : 'ghost'} size="sm" onClick={() => setActiveCategory(cat.id as ReportCategory)} className={`gap-2 rounded-xl transition-all ${activeCategory === cat.id ? 'gradient-bg border-0 text-white shadow-md' : ''}`}>
              <cat.icon className="w-4 h-4" /> {cat.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-secondary/10">
        <AnimatePresence mode="wait">
          <motion.div key={activeCategory} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {loading ? (
              <div className="flex items-center justify-center h-64 flex-col gap-4">
                <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">جاري معالجة البيانات المالية...</p>
              </div>
            ) : renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function KpiBar({ label, value, max = 100, color = 'bg-primary', inverted = false }: { label: string; value: number; max?: number; color?: string; inverted?: boolean }) {
  const percentage = Math.min((Math.abs(value) / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold">
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, target, inverted = false }: { title: string; value: number; unit: string; target: number; inverted?: boolean }) {
  const percentage = Math.min((Math.abs(value) / target) * 100, 100);
  const isGood = inverted ? value <= target : value >= target;
  return (
    <Card className={`p-4 border-t-4 ${isGood ? 'border-t-emerald-500' : 'border-t-amber-500'}`}>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-black">
        {value.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">الهدف: {target}{unit}</div>
    </Card>
  );
}
