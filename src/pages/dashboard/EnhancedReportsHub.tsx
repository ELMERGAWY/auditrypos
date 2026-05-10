import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, Landmark, Clock, 
  RefreshCw, Download, Printer, BarChart3, PieChart,
  ArrowUp, ArrowDown, Minus, Plus, Users, Boxes, 
  Store, Truck, Calculator, Scale, FileText, Filter,
  Calendar, DollarSign, CreditCard, Activity, Gauge,
  Target, Zap, Layers, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { createFinancialReporting, type FinancialIndicators, type ProfitLossReport, type BalanceSheetReport, type CashFlowReport, type TrialBalanceReport } from '@/erp/reporting_engine/financialReports';
import { toast } from 'sonner';

interface Props {
  restaurantId: string;
  currency: string;
}

type ReportCategory = 'overview' | 'financial' | 'sales' | 'inventory' | 'customers' | 'kpi';

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'number' | 'percent';
}

export default function EnhancedReportsHub({ restaurantId, currency }: Props) {
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

  useEffect(() => {
    loadDashboardData();
  }, [restaurantId, dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const engine = createFinancialReporting(restaurantId);
      
      const [indicatorsData, plDataResult] = await Promise.all([
        engine.generateFinancialIndicators(dateRange.end),
        engine.generateProfitLoss(dateRange.start, dateRange.end)
      ]);
      
      setIndicators(indicatorsData);
      setPlData(plDataResult);

      const totalRevenue = plDataResult?.revenue.total || 0;
      const totalExpenses = plDataResult?.operating_expenses.total || 0;
      const netProfit = plDataResult?.net_profit || 0;
      const grossProfit = plDataResult?.gross_profit || 0;
      const grossMargin = plDataResult?.gross_margin || 0;
      const netMargin = plDataResult?.net_margin || 0;

      setQuickStats([
        { label: 'إجمالي الإيرادات', value: totalRevenue, change: 12.5, trend: 'up', format: 'currency' },
        { label: 'إجمالي المصروفات', value: totalExpenses, change: -5.2, trend: 'down', format: 'currency' },
        { label: 'صافي الربح', value: netProfit, change: netProfit > 0 ? 8.3 : -8.3, trend: netProfit > 0 ? 'up' : 'down', format: 'currency' },
        { label: 'هامش مجمل الربح', value: grossMargin, change: 2.1, trend: 'up', format: 'percent' },
        { label: 'هامش صافي الربح', value: netMargin, change: 1.5, trend: 'up', format: 'percent' },
        { label: 'أرباح مستبقاة', value: plDataResult?.operating_profit || 0, format: 'currency' }
      ]);
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

  const categories = [
    { id: 'overview', label: 'نظرة عامة', icon: Gauge, color: 'from-blue-500 to-indigo-600' },
    { id: 'financial', label: 'القوائم المالية', icon: Landmark, color: 'from-emerald-500 to-teal-600' },
    { id: 'sales', label: 'تحليل المبيعات', icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
    { id: 'inventory', label: 'المخزون والتكاليف', icon: Boxes, color: 'from-purple-500 to-pink-600' },
    { id: 'customers', label: 'العملاء والتحليل', icon: Users, color: 'from-cyan-500 to-blue-600' },
    { id: 'kpi', label: 'مؤشرات الأداء', icon: Target, color: 'from-rose-500 to-red-600' }
  ];

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
                    <span className="mr-1">{Math.abs(stat.change).toFixed(1)}%</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              مؤشرات الربحية (Profitability)
            </h3>
            <div className="space-y-4">
              <KpiBar label="هامش مجمل الربح" value={indicators.profitability.gross_margin} max={100} color="bg-emerald-500" />
              <KpiBar label="هامش التشغيل" value={indicators.profitability.operating_margin} max={100} color="bg-emerald-500" />
              <KpiBar label="هامش صافي الربح" value={indicators.profitability.net_margin} max={100} color="bg-emerald-500" />
              <KpiBar label="العائد على الأصول ROA" value={indicators.profitability.return_on_assets} max={50} color="bg-blue-500" />
              <KpiBar label="العائد على حقوق الملكية ROE" value={indicators.profitability.return_on_equity} max={50} color="bg-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              مؤشرات السيولة (Liquidity)
            </h3>
            <div className="space-y-4">
              <KpiBar label="نسبة التداول (Current Ratio)" value={indicators.liquidity.current_ratio} max={3} color="bg-amber-500" />
              <KpiBar label="نسبة السيولة السريعة (Quick)" value={indicators.liquidity.quick_ratio} max={2} color="bg-amber-500" />
              <KpiBar label="نسبة السيولة النقدية" value={indicators.liquidity.cash_ratio} max={1.5} color="bg-amber-500" />
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">صافي رأس المال العامل</span>
                  <span className="text-lg font-black text-primary">{indicators.liquidity.working_capital.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              مؤشرات الكفاءة (Efficiency)
            </h3>
            <div className="space-y-4">
              <KpiBar label="معدل دوران المخزون" value={indicators.efficiency.inventory_turnover} max={12} color="bg-blue-500" />
              <KpiBar label="أيام المخزون" value={indicators.efficiency.days_inventory} max={90} color="bg-purple-500" />
              <KpiBar label="معدل دوران العملاء" value={indicators.efficiency.receivables_turnover} max={12} color="bg-blue-500" />
              <KpiBar label="أيام التحصيل" value={indicators.efficiency.days_receivables} max={90} color="bg-purple-500" />
              <KpiBar label="معدل دوران الأصول" value={indicators.efficiency.asset_turnover} max={3} color="bg-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-red-500" />
              مؤشرات المديونية (Solvency)
            </h3>
            <div className="space-y-4">
              <KpiBar label="نسبة الديون إلى الأصول" value={indicators.solvency.debt_ratio} max={100} color="bg-red-500" inverted />
              <KpiBar label="نسبة حقوق الملكية" value={indicators.solvency.equity_ratio} max={100} color="bg-emerald-500" />
              <KpiBar label="نسبة الديون لحقوق الملكية" value={indicators.solvency.debt_to_equity * 100} max={200} color="bg-red-500" inverted />
            </div>
          </Card>
        </div>
      )}

      {plData && (
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">ملخص قائمة الدخل</h3>
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-around gap-4">
              <Bar label="الإيرادات" value={plData.revenue.total} color="bg-emerald-500" max={plData.revenue.total * 1.5} />
              <Bar label="تكلفة المبيعات" value={plData.cogs.total} color="bg-red-500" max={plData.revenue.total * 1.5} />
              <Bar label="المصروفات" value={plData.operating_expenses.total} color="bg-amber-500" max={plData.revenue.total * 1.5} />
              <Bar label="صافي الربح" value={Math.max(0, plData.net_profit)} color={plData.net_profit >= 0 ? 'bg-emerald-600' : 'bg-red-600'} max={plData.revenue.total * 1.5} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderFinancialReports = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <ReportCard
        title="قائمة الدخل"
        description="البيانات المالية الرئيسية"
        icon={TrendingUp}
        color="bg-emerald-500"
        onClick={() => toast.info('جاري الانتقال لقائمة الدخل...')}
      />
      <ReportCard
        title="الميزانية العمومية"
        description="المركز المالي للشركة"
        icon={Scale}
        color="bg-blue-500"
        onClick={() => toast.info('جاري الانتقال للميزانية...')}
      />
      <ReportCard
        title="التدفقات النقدية"
        description="التدفقات النقدية"
        icon={Wallet}
        color="bg-purple-500"
        onClick={() => toast.info('جاري الانتقال للتدفقات...')}
      />
      <ReportCard
        title="ميزان المراجعة"
        description="أرصدة الحسابات"
        icon={Layers}
        color="bg-amber-500"
        onClick={() => toast.info('جاري الانتقال لميزان المراجعة...')}
      />
      <ReportCard
        title="دفتر الأستاذ"
        description="حركات اليومية"
        icon={FileText}
        color="bg-cyan-500"
        onClick={() => toast.info('جاري الانتقال لدفتر الأستاذ...')}
      />
      <ReportCard
        title="الحسابات الختامية"
        description="الأرباح والخسائر"
        icon={Calculator}
        color="bg-rose-500"
        onClick={() => toast.info('جاري الانتقال للحسابات الختامية...')}
      />
      <ReportCard
        title="ملخص الضرائب"
        description="الضريبة والمستحقات"
        icon={CreditCard}
        color="bg-orange-500"
        onClick={() => toast.info('جاري الانتقال للضرائب...')}
      />
      <ReportCard
        title="التقارير الضريبية"
        description=" VAT, ضريبة القيمة المضافة"
        icon={Zap}
        color="bg-indigo-500"
        onClick={() => toast.info('جاري الانتقال للتقارير الضريبية...')}
      />
    </div>
  );

  const renderSalesAnalysis = () => (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <TrendingUp className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">تحليل المبيعات</h3>
        <p className="text-muted-foreground">يعرض هذا القسم تحليلاً تفصيلياً للمبيعات حسب:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">الوقت (يوم/أسبوع/شهر)</div>
          <div className="p-3 bg-muted/30 rounded-lg">المنتجات والأصناف</div>
          <div className="p-3 bg-muted/30 rounded-lg">العملاء</div>
          <div className="p-3 bg-muted/30 rounded-lg">فئات الأسعار</div>
        </div>
        <Button className="mt-6 gradient-bg" onClick={() => window.location.href = '/dashboard?tab=analytics'}>
          الذهاب لتحليل المبيعات
        </Button>
      </Card>
    </div>
  );

  const renderInventoryAnalysis = () => (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <Boxes className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">تحليل المخزون والتكاليف</h3>
        <p className="text-muted-foreground">يعرض هذا القسم:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">قيمة المخزون</div>
          <div className="p-3 bg-muted/30 rounded-lg">معدل الدوران</div>
          <div className="p-3 bg-muted/30 rounded-lg">تكلفة البضاعة المباعة</div>
          <div className="p-3 bg-muted/30 rounded-lg">الأصناف الراكدة</div>
          <div className="p-3 bg-muted/30 rounded-lg">نقطة إعادة الطلب</div>
          <div className="p-3 bg-muted/30 rounded-lg">هامش الربح</div>
        </div>
        <Button className="mt-6 gradient-bg" onClick={() => window.location.href = '/dashboard?tab=inventory'}>
          الذهاب لإدارة المخزون
        </Button>
      </Card>
    </div>
  );

  const renderCustomersAnalysis = () => (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">تحليل العملاء</h3>
        <p className="text-muted-foreground">يعرض هذا القسم:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">أفضل العملاء</div>
          <div className="p-3 bg-muted/30 rounded-lg">أعمار الذمم</div>
          <div className="p-3 bg-muted/30 rounded-lg">تقييم العملاء</div>
          <div className="p-3 bg-muted/30 rounded-lg">نسب الاحتفاظ</div>
          <div className="p-3 bg-muted/30 rounded-lg">تكلفة اجتذاب العميل</div>
          <div className="p-3 bg-muted/30 rounded-lg">قيمة العميلLifetime</div>
        </div>
        <Button className="mt-6 gradient-bg" onClick={() => window.location.href = '/dashboard?tab=customers'}>
          الذهاب لإدارة العملاء
        </Button>
      </Card>
    </div>
  );

  const renderKpiDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="العائد على الأصول" value={indicators?.profitability.return_on_assets || 0} unit="%" target={5} />
        <KpiCard title="العائد علىحقوق الملكية" value={indicators?.profitability.return_on_equity || 0} unit="%" target={15} />
        <KpiCard title="هامش مجمل الربح" value={indicators?.profitability.gross_margin || 0} unit="%" target={30} />
        <KpiCard title="نسبة التداول" value={indicators?.liquidity.current_ratio || 0} unit="" target={2} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="معدل دوران المخزون" value={indicators?.efficiency.inventory_turnover || 0} unit="مره" target={8} />
        <KpiCard title="نسبة الديون للأصول" value={indicators?.solvency.debt_ratio || 0} unit="%" target={50} inverted />
        <KpiCard title="أيام المخزون" value={indicators?.efficiency.days_inventory || 0} unit="يوم" target={30} />
        <KpiCard title="أيام التحصيل" value={indicators?.efficiency.days_receivables || 0} unit="يوم" target={30} />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'overview':
        return renderOverview();
      case 'financial':
        return renderFinancialReports();
      case 'sales':
        return renderSalesAnalysis();
      case 'inventory':
        return renderInventoryAnalysis();
      case 'customers':
        return renderCustomersAnalysis();
      case 'kpi':
        return renderKpiDashboard();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <div className="border-b bg-card/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black">التقارير المالية المتقدمة</h1>
                <p className="text-xs text-muted-foreground">Advanced Financial Reports</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary p-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-7 text-xs border-0 bg-transparent w-28"
              />
              <span className="text-muted-foreground text-xs">إلى</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-7 text-xs border-0 bg-transparent w-28"
              />
            </div>
            <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(cat.id as ReportCategory)}
              className={`gap-2 ${activeCategory === cat.id ? 'gradient-bg border-0' : ''}`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-secondary/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
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
  const isGood = inverted ? percentage < 50 : percentage >= 50;
  const isWarning = inverted ? percentage >= 50 && percentage < 75 : percentage >= 25 && percentage < 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={`font-bold ${isGood ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-red-500'}`}>
          {value.toFixed(1)}{label.includes('%') || label.includes('الربح') || label.includes('الديون') ? '' : '%'}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} ${isGood ? '' : isWarning ? 'opacity-60' : 'opacity-40'} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon, color, onClick }: { title: string; description: string; icon: any; color: string; onClick: () => void }) {
  return (
    <Card className="p-4 cursor-pointer hover:border-primary/30 transition-all group" onClick={onClick}>
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

function Bar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const height = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className="w-full flex items-end justify-center h-48">
        <div
          className={`w-12 ${color} rounded-t-lg transition-all`}
          style={{ height: `${Math.max(height, 2)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-center">{label}</span>
      <span className="text-xs font-bold">{value.toLocaleString()}</span>
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