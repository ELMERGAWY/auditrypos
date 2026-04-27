import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Store, Boxes, 
  Wallet, Landmark, Clock, RefreshCcw, ArrowRight, Download, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { createFinancialReporting, ProfitLossReport, BalanceSheetReport, CashFlowReport, FinancialIndicators } from '@/erp/reporting_engine/financialReports';
import { toast } from 'sonner';

interface Props {
  restaurantId: string;
  currency: string;
}

export function AdvancedReportsHub({ restaurantId, currency }: Props) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Report States
  const [plReport, setPlReport] = useState<ProfitLossReport | null>(null);
  const [bsReport, setBsReport] = useState<BalanceSheetReport | null>(null);
  const [cfReport, setCfReport] = useState<CashFlowReport | null>(null);
  const [indicators, setIndicators] = useState<FinancialIndicators | null>(null);
  
  // Basic List Reports
  const [listData, setListData] = useState<any[]>([]);

  const reportGroups = [
    {
      title: 'القوائم المالية الأساسية',
      icon: Landmark,
      reports: [
        { id: 'pnl', label: 'قائمة الدخل (الأرباح والخسائر)', trend: 'استراتيجي' },
        { id: 'balance_sheet', label: 'قائمة المركز المالي (الميزانية)', trend: 'أساسي' },
        { id: 'cash_flow', label: 'قائمة التدفقات النقدية', trend: 'نقدي' },
        { id: 'indicators', label: 'مؤشرات الأداء المالي (KPIs)', trend: 'تحليلي' },
      ]
    },
    {
      title: 'العملاء والذمم المدينة',
      icon: Users,
      reports: [
        { id: 'ar_aging', label: 'جدول الذمم المدينة (العملاء)', trend: 'حرج' },
      ]
    },
    {
      title: 'الموردون والذمم الدائنة',
      icon: Store,
      reports: [
        { id: 'ap_aging', label: 'جدول الذمم الدائنة (الموردين)', trend: 'هام' },
      ]
    },
    {
      title: 'المخزون والتكاليف',
      icon: Boxes,
      reports: [
        { id: 'inventory_value', label: 'تقييم المخزون الحالي', trend: 'أصول' },
      ]
    }
  ];

  useEffect(() => {
    if (activeReport) {
      loadReportData();
    }
  }, [activeReport, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const engine = createFinancialReporting(restaurantId);
      
      if (activeReport === 'pnl') {
        const data = await engine.generateProfitLoss(startDate, endDate);
        setPlReport(data);
      } else if (activeReport === 'balance_sheet') {
        const data = await engine.generateBalanceSheet(endDate);
        setBsReport(data);
      } else if (activeReport === 'cash_flow') {
        const data = await engine.generateCashFlow(startDate, endDate);
        setCfReport(data);
      } else if (activeReport === 'indicators') {
        const data = await engine.generateFinancialIndicators(endDate);
        setIndicators(data);
      } else if (activeReport === 'ar_aging') {
        const { data } = await supabase.from('customers').select('*').eq('restaurant_id', restaurantId).gt('balance', 0).order('balance', { ascending: false });
        setListData(data || []);
      } else if (activeReport === 'ap_aging') {
        const { data, error } = await supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).gt('balance', 0).order('balance', { ascending: false });
        if (error) {
           setListData([]);
        } else {
           setListData(data || []);
        }
      } else if (activeReport === 'inventory_value') {
        const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).gt('quantity', 0).order('category');
        setListData(data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentReportDef = reportGroups.flatMap(g => g.reports).find(r => r.id === activeReport);

  const renderPLReport = () => {
    if (!plReport) return null;
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
           <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-700">
              <p className="text-[10px] font-bold uppercase mb-1">إجمالي الإيرادات</p>
              <p className="text-xl font-black">{plReport.revenue.total.toLocaleString()} {currency}</p>
           </div>
           <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-center text-destructive">
              <p className="text-[10px] font-bold uppercase mb-1">إجمالي المصروفات التشغيلية</p>
              <p className="text-xl font-black">{plReport.operating_expenses.total.toLocaleString()} {currency}</p>
           </div>
           <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center text-primary">
              <p className="text-[10px] font-bold uppercase mb-1">صافي الربح (الخسارة)</p>
              <p className="text-xl font-black">{plReport.net_profit.toLocaleString()} {currency}</p>
           </div>
        </div>

        <table className="w-full text-right text-sm border-collapse">
          <thead>
            <tr className="bg-muted text-muted-foreground font-black uppercase">
              <th className="p-3 border">البند (Account)</th>
              <th className="p-3 border text-left">القيمة ({currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-muted/50 font-bold"><td colSpan={2} className="p-3 border text-primary">الإيرادات (Revenues)</td></tr>
            <tr><td className="p-3 border pr-8">إيرادات المبيعات</td><td className="p-3 border text-left text-emerald-600">{plReport.revenue.sales_revenue.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">إيرادات الخدمات</td><td className="p-3 border text-left text-emerald-600">{plReport.revenue.service_revenue.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">إيرادات أخرى</td><td className="p-3 border text-left text-emerald-600">{plReport.revenue.other_revenue.toLocaleString()}</td></tr>
            <tr className="font-bold bg-emerald-500/5"><td className="p-3 border text-emerald-700">إجمالي الإيرادات</td><td className="p-3 border text-left text-emerald-700">{plReport.revenue.total.toLocaleString()}</td></tr>

            <tr className="bg-muted/50 font-bold"><td colSpan={2} className="p-3 border text-primary mt-4">تكلفة المبيعات (COGS)</td></tr>
            <tr><td className="p-3 border pr-8">تكلفة المواد/الخامات</td><td className="p-3 border text-left text-destructive">{plReport.cogs.materials.toLocaleString()}</td></tr>
            <tr className="font-bold"><td className="p-3 border">إجمالي تكلفة المبيعات</td><td className="p-3 border text-left text-destructive">{plReport.cogs.total.toLocaleString()}</td></tr>

            <tr className="font-black bg-primary/10"><td className="p-4 border">إجمالي مجمل الربح (Gross Profit)</td><td className="p-4 border text-left">{plReport.gross_profit.toLocaleString()}</td></tr>

            <tr className="bg-muted/50 font-bold"><td colSpan={2} className="p-3 border text-primary mt-4">المصروفات التشغيلية (OPEX)</td></tr>
            <tr><td className="p-3 border pr-8">الرواتب والأجور</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.salaries.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">الإيجارات</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.rent.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">المرافق (Utilities)</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.utilities.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">الإهلاكات (Depreciation)</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.depreciation.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8">أخرى</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.other.toLocaleString()}</td></tr>
            <tr className="font-bold"><td className="p-3 border">إجمالي المصروفات</td><td className="p-3 border text-left text-destructive">{plReport.operating_expenses.total.toLocaleString()}</td></tr>

            <tr className="font-black bg-primary/20"><td className="p-4 border text-lg">صافي الربح النهائي (Net Profit)</td><td className="p-4 border text-left text-lg">{plReport.net_profit.toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!bsReport) return null;
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          {/* الأصول */}
          <div>
            <h3 className="font-black text-xl mb-4 text-emerald-600 border-b pb-2">الأصول (Assets)</h3>
            <table className="w-full text-right text-sm">
              <tbody>
                <tr className="font-bold bg-muted/50"><td colSpan={2} className="p-2">الأصول المتداولة (Current Assets)</td></tr>
                <tr><td className="p-2 pr-6">النقدية</td><td className="p-2 text-left">{bsReport.assets.current.cash.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">البنك</td><td className="p-2 text-left">{bsReport.assets.current.bank.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">العملاء والذمم</td><td className="p-2 text-left">{bsReport.assets.current.receivables.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">المخزون</td><td className="p-2 text-left">{bsReport.assets.current.inventory.toLocaleString()}</td></tr>
                <tr className="font-bold border-t"><td className="p-2">إجمالي المتداولة</td><td className="p-2 text-left">{bsReport.assets.current.total_current.toLocaleString()}</td></tr>
                
                <tr className="font-bold bg-muted/50 mt-4"><td colSpan={2} className="p-2">الأصول غير المتداولة (Non-Current Assets)</td></tr>
                <tr><td className="p-2 pr-6">الأصول الثابتة</td><td className="p-2 text-left">{bsReport.assets.non_current.fixed_assets.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6 text-destructive">مجمع الإهلاك (-)</td><td className="p-2 text-left text-destructive">({bsReport.assets.non_current.accumulated_depreciation.toLocaleString()})</td></tr>
                <tr className="font-bold border-t"><td className="p-2">صافي الأصول الثابتة</td><td className="p-2 text-left">{bsReport.assets.non_current.net_fixed.toLocaleString()}</td></tr>

                <tr className="font-black bg-emerald-500/20 text-lg"><td className="p-4 border-t-2 border-emerald-500">إجمالي الأصول</td><td className="p-4 border-t-2 border-emerald-500 text-left">{bsReport.assets.total_assets.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>

          {/* الخصوم وحقوق الملكية */}
          <div>
            <h3 className="font-black text-xl mb-4 text-destructive border-b pb-2">الخصوم وحقوق الملكية (Liabilities & Equity)</h3>
            <table className="w-full text-right text-sm">
              <tbody>
                <tr className="font-bold bg-muted/50"><td colSpan={2} className="p-2">الخصوم المتداولة (Current Liabilities)</td></tr>
                <tr><td className="p-2 pr-6">الموردين والدائنون</td><td className="p-2 text-left">{bsReport.liabilities.current.payables.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">قروض قصيرة الأجل</td><td className="p-2 text-left">{bsReport.liabilities.current.short_term_loans.toLocaleString()}</td></tr>
                <tr className="font-bold border-t"><td className="p-2">إجمالي الخصوم المتداولة</td><td className="p-2 text-left">{bsReport.liabilities.current.total_current.toLocaleString()}</td></tr>
                
                <tr className="font-bold bg-muted/50 mt-4"><td colSpan={2} className="p-2">الخصوم غير المتداولة</td></tr>
                <tr><td className="p-2 pr-6">قروض طويلة الأجل</td><td className="p-2 text-left">{bsReport.liabilities.non_current.long_term_loans.toLocaleString()}</td></tr>
                <tr className="font-bold border-t"><td className="p-2">إجمالي الخصوم</td><td className="p-2 text-left text-destructive">{bsReport.liabilities.total_liabilities.toLocaleString()}</td></tr>

                <tr className="font-bold bg-muted/50 mt-6"><td colSpan={2} className="p-2 text-primary">حقوق الملكية (Equity)</td></tr>
                <tr><td className="p-2 pr-6">رأس المال</td><td className="p-2 text-left">{bsReport.equity.capital.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">الأرباح المبقاة</td><td className="p-2 text-left">{bsReport.equity.retained_earnings.toLocaleString()}</td></tr>
                <tr><td className="p-2 pr-6">أرباح (خسائر) العام الحالي</td><td className="p-2 text-left text-primary">{bsReport.equity.current_profit.toLocaleString()}</td></tr>
                <tr className="font-bold border-t"><td className="p-2">إجمالي حقوق الملكية</td><td className="p-2 text-left text-primary">{bsReport.equity.total_equity.toLocaleString()}</td></tr>

                <tr className="font-black bg-destructive/20 text-lg"><td className="p-4 border-t-2 border-destructive">إجمالي الخصوم وحقوق الملكية</td><td className="p-4 border-t-2 border-destructive text-left">{bsReport.total_liabilities_equity.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {bsReport.difference !== 0 && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex justify-between items-center font-bold border border-destructive mt-6">
             <span>يوجد عدم توازن (فرق) في الميزانية:</span>
             <span dir="ltr">{bsReport.difference.toLocaleString()} {currency}</span>
          </div>
        )}
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!cfReport) return null;
    return (
      <div className="max-w-4xl mx-auto">
        <table className="w-full text-right text-sm border-collapse">
          <thead>
            <tr className="bg-muted font-black uppercase text-muted-foreground"><th className="p-4 border">التدفقات النقدية (Cash Flows)</th><th className="p-4 border text-left">القيمة ({currency})</th></tr>
          </thead>
          <tbody>
            <tr className="font-bold bg-primary/5"><td colSpan={2} className="p-3 border">التدفقات النقدية من الأنشطة التشغيلية</td></tr>
            <tr><td className="p-3 border pr-8">صافي الربح</td><td className="p-3 border text-left">{cfReport.operating.net_profit.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-8 text-muted-foreground text-xs" colSpan={2}>التسويات:</td></tr>
            <tr><td className="p-3 border pr-12">الإهلاك</td><td className="p-3 border text-left">{cfReport.operating.adjustments.depreciation.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-12">التغير في المخزون</td><td className="p-3 border text-left">{cfReport.operating.adjustments.inventory_change.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-12">التغير في العملاء</td><td className="p-3 border text-left">{cfReport.operating.adjustments.receivables_change.toLocaleString()}</td></tr>
            <tr><td className="p-3 border pr-12">التغير في الموردين</td><td className="p-3 border text-left">{cfReport.operating.adjustments.payables_change.toLocaleString()}</td></tr>
            <tr className="font-bold bg-muted/30"><td className="p-3 border">صافي التدفقات التشغيلية</td><td className="p-3 border text-left text-emerald-600">{cfReport.operating.net_operating.toLocaleString()}</td></tr>

            <tr className="font-bold bg-primary/5"><td colSpan={2} className="p-3 border mt-4">التدفقات النقدية من الأنشطة الاستثمارية</td></tr>
            <tr><td className="p-3 border pr-8">مشتريات الأصول</td><td className="p-3 border text-left text-destructive">({cfReport.investing.asset_purchases.toLocaleString()})</td></tr>
            <tr className="font-bold bg-muted/30"><td className="p-3 border">صافي التدفقات الاستثمارية</td><td className="p-3 border text-left">{cfReport.investing.net_investing.toLocaleString()}</td></tr>

            <tr className="font-bold bg-primary/5"><td colSpan={2} className="p-3 border mt-4">التدفقات النقدية من الأنشطة التمويلية</td></tr>
            <tr><td className="p-3 border pr-8">تمويل رأس المال / قروض</td><td className="p-3 border text-left">{cfReport.financing.capital_injected.toLocaleString()}</td></tr>
            <tr className="font-bold bg-muted/30"><td className="p-3 border">صافي التدفقات التمويلية</td><td className="p-3 border text-left">{cfReport.financing.net_financing.toLocaleString()}</td></tr>

            <tr className="font-black bg-primary/20 text-lg"><td className="p-4 border mt-4">التغير الصافي في النقدية</td><td className="p-4 border text-left">{cfReport.net_change.toLocaleString()}</td></tr>
            <tr><td className="p-3 border font-bold">رصيد النقدية أول المدة</td><td className="p-3 border text-left">{cfReport.opening_cash.toLocaleString()}</td></tr>
            <tr className="font-black bg-emerald-500/20 text-lg"><td className="p-4 border border-emerald-500 text-emerald-800">رصيد النقدية آخر المدة</td><td className="p-4 border border-emerald-500 text-left text-emerald-800">{cfReport.closing_cash.toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderIndicators = () => {
    if (!indicators) return null;
    const formatPct = (val: number) => `${val.toFixed(2)}%`;
    const formatNum = (val: number) => val.toFixed(2);
    
    return (
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6 border-t-4 border-t-primary">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> مؤشرات الربحية (Profitability)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">هامش مجمل الربح</span><span className="font-bold text-emerald-600">{formatPct(indicators.profitability.gross_margin)}</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">هامش التشغيل</span><span className="font-bold text-emerald-600">{formatPct(indicators.profitability.operating_margin)}</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">هامش صافي الربح</span><span className="font-bold text-emerald-600">{formatPct(indicators.profitability.net_margin)}</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">العائد على الأصول (ROA)</span><span className="font-bold">{formatPct(indicators.profitability.return_on_assets)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm">العائد على حقوق الملكية (ROE)</span><span className="font-bold">{formatPct(indicators.profitability.return_on_equity)}</span></div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-amber-500">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-500" /> مؤشرات السيولة (Liquidity)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">نسبة التداول (Current Ratio)</span><span className="font-bold">{formatNum(indicators.liquidity.current_ratio)}</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">نسبة السيولة السريعة (Quick Ratio)</span><span className="font-bold">{formatNum(indicators.liquidity.quick_ratio)}</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">صافي رأس المال العامل</span><span className="font-bold text-primary">{indicators.liquidity.working_capital.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-blue-500">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> مؤشرات الكفاءة (Efficiency)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">معدل دوران المخزون</span><span className="font-bold">{formatNum(indicators.efficiency.inventory_turnover)} مرات</span></div>
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">معدل دوران الأصول</span><span className="font-bold">{formatNum(indicators.efficiency.asset_turnover)} مرات</span></div>
          </div>
        </div>

        <div className="glass-card p-6 border-t-4 border-t-destructive">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Landmark className="w-5 h-5 text-destructive" /> مؤشرات المديونية (Solvency)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2"><span className="text-sm">نسبة الديون إلى الأصول</span><span className="font-bold text-destructive">{formatPct(indicators.solvency.debt_ratio)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm">نسبة الديون لحقوق الملكية</span><span className="font-bold text-destructive">{formatNum(indicators.solvency.debt_to_equity)}</span></div>
          </div>
        </div>
      </div>
    );
  };

  const renderListReport = () => {
    let total = 0;
    
    if (activeReport === 'ar_aging' || activeReport === 'ap_aging') {
      total = listData.reduce((s, r) => s + (r.balance || 0), 0);
      return (
        <div>
          <table className="w-full text-right text-sm border-collapse">
             <thead><tr className="bg-muted font-black uppercase text-muted-foreground"><th className="p-4 border">الاسم</th><th className="p-4 border">الهاتف</th><th className="p-4 border text-left">الرصيد المستحق ({currency})</th></tr></thead>
             <tbody>
               {listData.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">لا توجد أرصدة مستحقة.</td></tr> : listData.map((row, i) => (
                 <tr key={i} className="hover:bg-primary/5 transition-colors border-b">
                   <td className="p-4 border font-bold">{row.name}</td>
                   <td className="p-4 border">{row.phone || '-'}</td>
                   <td className="p-4 border text-left font-black text-destructive">{(row.balance || 0).toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
             <tfoot>
               <tr className="bg-destructive/10 font-black text-lg text-destructive"><td colSpan={2} className="p-4 border text-left">الإجمالي</td><td className="p-4 border text-left">{total.toLocaleString()}</td></tr>
             </tfoot>
          </table>
        </div>
      );
    }

    if (activeReport === 'inventory_value') {
      total = listData.reduce((s, r) => s + ((r.quantity || 0) * (r.cost_price || 0)), 0);
      return (
        <div>
          <table className="w-full text-right text-sm border-collapse">
             <thead><tr className="bg-muted font-black uppercase text-muted-foreground"><th className="p-4 border">الصنف</th><th className="p-4 border">التصنيف</th><th className="p-4 border text-center">الكمية</th><th className="p-4 border text-center">التكلفة</th><th className="p-4 border text-left">إجمالي القيمة ({currency})</th></tr></thead>
             <tbody>
               {listData.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا يوجد مخزون.</td></tr> : listData.map((row, i) => (
                 <tr key={i} className="hover:bg-primary/5 transition-colors border-b">
                   <td className="p-3 border font-bold">{row.name}</td>
                   <td className="p-3 border">{row.category}</td>
                   <td className="p-3 border text-center">{row.quantity}</td>
                   <td className="p-3 border text-center">{row.cost_price?.toLocaleString()}</td>
                   <td className="p-3 border text-left font-black text-primary">{((row.quantity || 0) * (row.cost_price || 0)).toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
             <tfoot>
               <tr className="bg-primary/10 font-black text-lg text-primary"><td colSpan={4} className="p-4 border text-left">إجمالي قيمة المخزون الحالية</td><td className="p-4 border text-left">{total.toLocaleString()}</td></tr>
             </tfoot>
          </table>
        </div>
      );
    }

    return null;
  };

  if (activeReport) {
    return (
      <div className="flex flex-col h-full bg-background fade-in" dir="rtl">
        <header className="border-b bg-card/50 backdrop-blur-md p-4 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)} className="gap-2">
                <ArrowRight className="w-4 h-4" /> العودة للقائمة
              </Button>
              <div className="h-4 w-px bg-border" />
              <h3 className="font-bold text-lg">{currentReportDef?.label}</h3>
           </div>
           
           <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-secondary p-1 rounded-xl">
                 <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs border-0 bg-transparent w-36" />
                 <span className="text-muted-foreground text-xs font-bold">إلى</span>
                 <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs border-0 bg-transparent w-36" />
              </div>
              <div className="h-4 w-px bg-border mx-2" />
              <Button variant="outline" size="sm" className="gap-2 h-9 px-4 rounded-xl border-primary/20 hover:bg-primary/5 transition-all">
                <Download className="w-4 h-4" /> Excel
              </Button>
              <Button variant="primary" size="sm" className="gap-2 h-9 px-4 rounded-xl gradient-bg text-white border-0 shadow-lg shadow-primary/20" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> طباعة
              </Button>
           </div>
        </header>

        <div className="flex-1 p-8 overflow-auto custom-scrollbar bg-secondary/20 print:p-0 print:bg-white relative">
           <div className="max-w-5xl mx-auto bg-white dark:bg-card p-10 min-h-[1100px] shadow-2xl relative border-t-[6px] border-t-primary rounded-t-sm print:shadow-none print:border-t-0">
              {/* Report Header */}
              <div className="flex justify-between items-start mb-12 border-b pb-8">
                 <div className="space-y-2">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                          <Landmark className="w-4 h-4 text-white" />
                       </div>
                       <h1 className="text-2xl font-black tracking-tight">{currentReportDef?.label}</h1>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-10">Auditry ERP Financial Reports</p>
                 </div>
                 <div className="text-left text-[11px] font-bold space-y-1.5 leading-relaxed">
                    <div className="flex justify-end gap-2"><span className="text-muted-foreground">تاريخ الإصدار:</span> <span>{new Date().toLocaleDateString('ar-EG')}</span></div>
                    <div className="flex justify-end gap-2"><span className="text-muted-foreground">الفترة المحددة:</span> <span dir="ltr">{new Date(startDate).toLocaleDateString('ar-EG')} - {new Date(endDate).toLocaleDateString('ar-EG')}</span></div>
                    <div className="flex justify-end gap-2"><span className="text-muted-foreground">العملة الأساسية:</span> <Badge className="bg-primary/10 text-primary border-0 text-[9px] h-4">{currency}</Badge></div>
                 </div>
              </div>

              {/* Dynamic Report Content */}
              <div className="min-h-[500px]">
                {activeReport === 'pnl' && renderPLReport()}
                {activeReport === 'balance_sheet' && renderBalanceSheet()}
                {activeReport === 'cash_flow' && renderCashFlow()}
                {activeReport === 'indicators' && renderIndicators()}
                {['ar_aging', 'ap_aging', 'inventory_value'].includes(activeReport) && renderListReport()}
              </div>

              {/* Report Footer */}
              <div className="mt-16 pt-8 border-t flex justify-between items-end italic text-[10px] text-muted-foreground">
                 <div className="space-y-1">
                    <p>هذا التقرير تم استخراجه آلياً من النظام المحاسبي المتكامل.</p>
                    <p className="mt-4">المدير المالي / المحاسب: ________________________</p>
                 </div>
                 <div className="text-left">
                    <p>Auditry ERP - Advanced Financial Reports</p>
                 </div>
              </div>

              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-sm z-10">
                   <div className="bg-card p-6 rounded-2xl shadow-2xl border flex items-center gap-3">
                      <RefreshCcw className="w-6 h-6 animate-spin text-primary" />
                      <span className="font-bold text-lg">جاري حساب البيانات المحاسبية...</span>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-8 fade-in bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" dir="rtl">
      <header className="space-y-2 text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl font-black font-display tracking-tight text-primary">التقارير المالية والمحاسبية</h2>
        <p className="text-muted-foreground text-lg">قوائم وتقارير مالية احترافية مبنية على العمليات والقيود الفعلية لضمان الدقة والرقابة.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {reportGroups.map((group) => (
          <div key={group.title} className="space-y-4 group">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform shadow-sm">
                <group.icon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg tracking-tight">{group.title}</h3>
            </div>
            
            <div className="glass-card overflow-hidden shadow-xl shadow-black/5 hover:border-primary/30 transition-all">
              <div className="divide-y divide-border/30">
                {group.reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id)}
                    className="w-full p-4 text-right flex items-center justify-between hover:bg-primary/5 transition-colors group/item"
                  >
                    <span className="text-sm font-bold text-foreground/80 group-hover/item:text-primary transition-colors">{report.label}</span>
                    <Badge className="bg-primary/5 text-primary border-0 text-[10px] px-2 font-bold">{report.trend}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
