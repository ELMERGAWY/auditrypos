/**
 * FINANCIAL REPORTS UI - Lovable Style
 * Tabs: Trial Balance, P&L, Balance Sheet, Cash Flow, Indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, 
  Calculator, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { 
  FinancialReportingEngine, 
  TrialBalanceReport, 
  ProfitLossReport, 
  BalanceSheetReport,
  CashFlowReport,
  FinancialIndicators 
} from '@/erp/reporting_engine/financialReports';
import { useAuth } from '@/hooks/useAuth';

export function FinancialReportsDashboard() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState('pnl');
  const [periodStart, setPeriodStart] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Reports data
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [indicators, setIndicators] = useState<FinancialIndicators | null>(null);

  const reportingEngine = restaurant?.id 
    ? new FinancialReportingEngine(restaurant.id)
    : null;

  const generateReports = async () => {
    if (!reportingEngine) return;
    
    setIsLoading(true);
    try {
      const startStr = periodStart.toISOString().split('T')[0];
      const endStr = periodEnd.toISOString().split('T')[0];

      const [tb, pl, bs, cf, ind] = await Promise.all([
        reportingEngine.generateTrialBalance(endStr),
        reportingEngine.generateProfitLoss(startStr, endStr),
        reportingEngine.generateBalanceSheet(endStr),
        reportingEngine.generateCashFlow(startStr, endStr),
        reportingEngine.generateFinancialIndicators(endStr)
      ]);

      setTrialBalance(tb);
      setProfitLoss(pl);
      setBalanceSheet(bs);
      setCashFlow(cf);
      setIndicators(ind);
    } catch (error) {
      console.error('Error generating reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      generateReports();
    }
  }, [restaurant?.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // ============================================================
  // PROFIT & LOSS VIEW
  // ============================================================
  const ProfitLossView = () => {
    if (!profitLoss) return null;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(profitLoss.revenue.total)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">تكلفة البضاعة</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(profitLoss.cogs.total)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">صافي الربح</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(profitLoss.net_profit)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">هامش الربح</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatPercent(profitLoss.net_margin)}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed P&L Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              تفصيل قائمة الدخل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {/* Revenue Section */}
                <TableRow className="bg-green-50 font-semibold">
                  <TableCell colSpan={2}>الإيرادات</TableCell>
                </TableRow>
                {profitLoss.revenue.service_revenue > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">إيرادات الخدمات</TableCell>
                    <TableCell className="text-left">{formatCurrency(profitLoss.revenue.service_revenue)}</TableCell>
                  </TableRow>
                )}
                {profitLoss.revenue.sales_revenue > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">مبيعات البضاعة</TableCell>
                    <TableCell className="text-left">{formatCurrency(profitLoss.revenue.sales_revenue)}</TableCell>
                  </TableRow>
                )}
                {profitLoss.revenue.food_revenue > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">مبيعات الطعام</TableCell>
                    <TableCell className="text-left">{formatCurrency(profitLoss.revenue.food_revenue)}</TableCell>
                  </TableRow>
                )}
                <TableRow className="font-semibold">
                  <TableCell>إجمالي الإيرادات</TableCell>
                  <TableCell className="text-left text-green-700">{formatCurrency(profitLoss.revenue.total)}</TableCell>
                </TableRow>

                {/* COGS Section */}
                <TableRow className="bg-red-50 font-semibold">
                  <TableCell colSpan={2}>تكلفة البضاعة المباعة</TableCell>
                </TableRow>
                {profitLoss.cogs.materials > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">تكلفة المواد</TableCell>
                    <TableCell className="text-left">{formatCurrency(profitLoss.cogs.materials)}</TableCell>
                  </TableRow>
                )}
                {profitLoss.cogs.food_cost > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">تكلفة الطعام</TableCell>
                    <TableCell className="text-left">{formatCurrency(profitLoss.cogs.food_cost)}</TableCell>
                  </TableRow>
                )}
                <TableRow className="font-semibold">
                  <TableCell>إجمالي COGS</TableCell>
                  <TableCell className="text-left text-red-700">{formatCurrency(profitLoss.cogs.total)}</TableCell>
                </TableRow>

                {/* Gross Profit */}
                <TableRow className="bg-blue-50 font-bold">
                  <TableCell>الربح الإجمالي (Gross Profit)</TableCell>
                  <TableCell className="text-left text-blue-700">{formatCurrency(profitLoss.gross_profit)} ({formatPercent(profitLoss.gross_margin)})</TableCell>
                </TableRow>

                {/* Operating Expenses */}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={2}>المصاريف التشغيلية</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">المرتبات والأجور</TableCell>
                  <TableCell className="text-left">{formatCurrency(profitLoss.operating_expenses.salaries)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">الإيجار</TableCell>
                  <TableCell className="text-left">{formatCurrency(profitLoss.operating_expenses.rent)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">المرافق (كهرباء، مياه)</TableCell>
                  <TableCell className="text-left">{formatCurrency(profitLoss.operating_expenses.utilities)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">التسويق والإعلان</TableCell>
                  <TableCell className="text-left">{formatCurrency(profitLoss.operating_expenses.marketing)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">الإهلاك</TableCell>
                  <TableCell className="text-left">{formatCurrency(profitLoss.operating_expenses.depreciation)}</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>إجمالي المصاريف</TableCell>
                  <TableCell className="text-left text-red-700">{formatCurrency(profitLoss.operating_expenses.total)}</TableCell>
                </TableRow>

                {/* Operating Profit */}
                <TableRow className="bg-purple-50 font-bold">
                  <TableCell>ربح التشغيل (Operating Profit)</TableCell>
                  <TableCell className="text-left text-purple-700">{formatCurrency(profitLoss.operating_profit)} ({formatPercent(profitLoss.operating_margin)})</TableCell>
                </TableRow>

                {/* Net Profit */}
                <TableRow className="bg-green-100 font-bold text-lg">
                  <TableCell>صافي الربح (Net Profit)</TableCell>
                  <TableCell className="text-left text-green-800">{formatCurrency(profitLoss.net_profit)} ({formatPercent(profitLoss.net_margin)})</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================
  // FINANCIAL INDICATORS VIEW
  // ============================================================
  const IndicatorsView = () => {
    if (!indicators) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profitability Ratios */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                مؤشرات الربحية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <IndicatorRow 
                label="هامش الربح الإجمالي" 
                value={indicators.profitability.gross_margin} 
                suffix="%"
                good={indicators.profitability.gross_margin > 30}
              />
              <IndicatorRow 
                label="هامش ربح التشغيل" 
                value={indicators.profitability.operating_margin} 
                suffix="%"
                good={indicators.profitability.operating_margin > 15}
              />
              <IndicatorRow 
                label="صافي الهامش" 
                value={indicators.profitability.net_margin} 
                suffix="%"
                good={indicators.profitability.net_margin > 10}
              />
              <IndicatorRow 
                label="العائد على الأصول (ROA)" 
                value={indicators.profitability.return_on_assets} 
                suffix="%"
                good={indicators.profitability.return_on_assets > 8}
              />
              <IndicatorRow 
                label="العائد على حقوق الملكية (ROE)" 
                value={indicators.profitability.return_on_equity} 
                suffix="%"
                good={indicators.profitability.return_on_equity > 15}
              />
            </CardContent>
          </Card>

          {/* Liquidity Ratios */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                مؤشرات السيولة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <IndicatorRow 
                label="نسبة السيولة الحالية" 
                value={indicators.liquidity.current_ratio} 
                suffix="x"
                good={indicators.liquidity.current_ratio > 1.5}
              />
              <IndicatorRow 
                label="نسبة السيولة السريعة" 
                value={indicators.liquidity.quick_ratio} 
                suffix="x"
                good={indicators.liquidity.quick_ratio > 1}
              />
              <IndicatorRow 
                label="نسبة النقدية" 
                value={indicators.liquidity.cash_ratio} 
                suffix="x"
                good={indicators.liquidity.cash_ratio > 0.5}
              />
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">رأس المال العامل</span>
                  <span className="font-semibold text-blue-700">
                    {formatCurrency(indicators.liquidity.working_capital)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency & Solvency */}
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                الكفاءة والملاءة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <IndicatorRow 
                label="دورة المخزون" 
                value={indicators.efficiency.inventory_turnover} 
                suffix="مرة/سنة"
                good={indicators.efficiency.inventory_turnover > 6}
              />
              <IndicatorRow 
                label="أيام المخزون" 
                value={indicators.efficiency.days_inventory} 
                suffix="يوم"
                good={indicators.efficiency.days_inventory < 60}
                inverse={true}
              />
              <IndicatorRow 
                label="نسبة الديون للأصول" 
                value={indicators.solvency.debt_ratio} 
                suffix="%"
                good={indicators.solvency.debt_ratio < 50}
                inverse={true}
              />
              <IndicatorRow 
                label="نسبة الديون لحقوق الملكية" 
                value={indicators.solvency.debt_to_equity} 
                suffix="x"
                good={indicators.solvency.debt_to_equity < 1}
                inverse={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const IndicatorRow = ({ 
    label, value, suffix, good, inverse = false 
  }: { 
    label: string; 
    value: number; 
    suffix: string; 
    good: boolean;
    inverse?: boolean;
  }) => {
    const isGood = inverse ? !good : good;
    return (
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${isGood ? 'text-green-600' : 'text-yellow-600'}`}>
            {value.toFixed(2)}{suffix}
          </span>
          {isGood ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // TRIAL BALANCE VIEW
  // ============================================================
  const TrialBalanceView = () => {
    if (!trialBalance) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ميزان المراجعة</span>
            <span className={`text-sm px-3 py-1 rounded ${trialBalance.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {trialBalance.is_balanced ? 'متوازن ✓' : 'غير متوازن ✗'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود الحساب</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead className="text-left">الرصيد الافتتاحي</TableHead>
                <TableHead className="text-left">مدين</TableHead>
                <TableHead className="text-left">دائن</TableHead>
                <TableHead className="text-left">الرصيد الختامي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.accounts.map((account) => (
                <TableRow key={account.account_id}>
                  <TableCell className="font-mono">{account.code}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      account.account_type === 'asset' ? 'bg-green-100 text-green-800' :
                      account.account_type === 'liability' ? 'bg-red-100 text-red-800' :
                      account.account_type === 'equity' ? 'bg-blue-100 text-blue-800' :
                      account.account_type === 'revenue' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.account_type === 'asset' ? 'أصل' :
                       account.account_type === 'liability' ? 'التزام' :
                       account.account_type === 'equity' ? 'حقوق ملكية' :
                       account.account_type === 'revenue' ? 'إيراد' : 'مصروف'}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">{formatCurrency(account.opening_balance)}</TableCell>
                  <TableCell className="text-left text-green-700">{formatCurrency(account.debit_movement)}</TableCell>
                  <TableCell className="text-left text-red-700">{formatCurrency(account.credit_movement)}</TableCell>
                  <TableCell className="text-left font-semibold">{formatCurrency(account.closing_balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100 font-bold">
                <TableCell colSpan={3}>المجاميع</TableCell>
                <TableCell className="text-left">{formatCurrency(trialBalance.totals.opening_debits)}</TableCell>
                <TableCell className="text-left text-green-700">{formatCurrency(trialBalance.totals.movement_debits)}</TableCell>
                <TableCell className="text-left text-red-700">{formatCurrency(trialBalance.totals.movement_credits)}</TableCell>
                <TableCell className="text-left">{formatCurrency(trialBalance.totals.closing_debits)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">التقارير المالية</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">من:</label>
            <DatePicker date={periodStart} setDate={setPeriodStart} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">إلى:</label>
            <DatePicker date={periodEnd} setDate={setPeriodEnd} />
          </div>
          <Button onClick={generateReports} disabled={isLoading}>
            {isLoading ? 'جاري التحميل...' : 'تحديث التقارير'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pnl">قائمة الدخل (P&L)</TabsTrigger>
          <TabsTrigger value="indicators">المؤشرات المالية</TabsTrigger>
          <TabsTrigger value="balance">الميزانية العمومية</TabsTrigger>
          <TabsTrigger value="cashflow">التدفقات النقدية</TabsTrigger>
          <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-6">
          <ProfitLossView />
        </TabsContent>

        <TabsContent value="indicators" className="mt-6">
          <IndicatorsView />
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          <BalanceSheetView balanceSheet={balanceSheet} formatCurrency={formatCurrency} />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <CashFlowView cashFlow={cashFlow} formatCurrency={formatCurrency} />
        </TabsContent>

        <TabsContent value="trial" className="mt-6">
          <TrialBalanceView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components
function BalanceSheetView({ balanceSheet, formatCurrency }: { balanceSheet: BalanceSheetReport | null, formatCurrency: (n: number) => string }) {
  if (!balanceSheet) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>الميزانية العمومية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <div>
            <h3 className="font-semibold text-green-700 mb-4">الأصول</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>الصندوق:</span> <span>{formatCurrency(balanceSheet.assets.current.cash)}</span></div>
              <div className="flex justify-between"><span>البنك:</span> <span>{formatCurrency(balanceSheet.assets.current.bank)}</span></div>
              <div className="flex justify-between"><span>العملاء:</span> <span>{formatCurrency(balanceSheet.assets.current.receivables)}</span></div>
              <div className="flex justify-between"><span>المخزون:</span> <span>{formatCurrency(balanceSheet.assets.current.inventory)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>إجمالي الأصول المتداولة:</span> 
                <span className="text-green-700">{formatCurrency(balanceSheet.assets.current.total_current)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-lg">
                <span>إجمالي الأصول:</span> 
                <span className="text-green-800">{formatCurrency(balanceSheet.assets.total_assets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div>
            <h3 className="font-semibold text-red-700 mb-4">الالتزامات وحقوق الملكية</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>الموردين:</span> <span>{formatCurrency(balanceSheet.liabilities.current.payables)}</span></div>
              <div className="flex justify-between"><span>القروض:</span> <span>{formatCurrency(balanceSheet.liabilities.current.short_term_loans)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>إجمالي الالتزامات:</span> 
                <span className="text-red-700">{formatCurrency(balanceSheet.liabilities.total_liabilities)}</span>
              </div>
              <div className="flex justify-between"><span>رأس المال:</span> <span>{formatCurrency(balanceSheet.equity.capital)}</span></div>
              <div className="flex justify-between"><span>الأرباح المحتجزة:</span> <span>{formatCurrency(balanceSheet.equity.retained_earnings)}</span></div>
              <div className="flex justify-between"><span>أرباح السنة:</span> <span>{formatCurrency(balanceSheet.equity.current_profit)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>إجمالي حقوق الملكية:</span> 
                <span className="text-blue-700">{formatCurrency(balanceSheet.equity.total_equity)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-lg">
                <span>إجمالي الالتزامات + حقوق الملكية:</span> 
                <span className="text-gray-800">{formatCurrency(balanceSheet.total_liabilities_equity)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashFlowView({ cashFlow, formatCurrency }: { cashFlow: CashFlowReport | null, formatCurrency: (n: number) => string }) {
  if (!cashFlow) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>قائمة التدفقات النقدية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">الأنشطة التشغيلية</h4>
            <p>صافي التشغيل: {formatCurrency(cashFlow.operating.net_operating)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">الأنشطة الاستثمارية</h4>
            <p>صافي الاستثمار: {formatCurrency(cashFlow.investing.net_investing)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">الأنشطة التمويلية</h4>
            <p>صافي التمويل: {formatCurrency(cashFlow.financing.net_financing)}</p>
          </div>
        </div>
        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">الرصيد الافتتاحي</p>
            <p className="font-semibold">{formatCurrency(cashFlow.opening_cash)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">صافي التغير</p>
            <p className={`font-bold ${cashFlow.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow.net_change)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">الرصيد الختامي</p>
            <p className="font-semibold">{formatCurrency(cashFlow.closing_cash)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FinancialReportsDashboard;
