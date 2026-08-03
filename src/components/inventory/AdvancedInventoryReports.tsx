// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, FileText, Download, Filter, Calendar, 
  Package, TrendingUp, TrendingDown, AlertTriangle, 
  ArrowRightLeft, MapPin, RefreshCw, Search, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Props {
  restaurantId: string;
  currency: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function AdvancedInventoryReports({ restaurantId, currency }: Props) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('stock_value');
  const [dateRange, setDateRange] = useState('30');
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  const loadReport = async () => {
    setLoading(true);
    try {
      let query;
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      switch (reportType) {
        case 'stock_value':
          query = supabase
            .from('stock_quants')
            .select(`
              *,
              products(name, category, price, cost_price),
              stock_locations(name, location_type)
            `)
            .eq('restaurant_id', restaurantId)
            .gt('in_date', startDate.toISOString());
          break;

        case 'stock_moves':
          query = supabase
            .from('stock_moves')
            .select(`
              *,
              products(name, category),
              stock_locations!stock_moves_location_id_fkey(name),
              stock_locations_dest:stock_locations!stock_moves_location_dest_id_fkey(name)
            `)
            .eq('restaurant_id', restaurantId)
            .gt('date', startDate.toISOString());
          break;

        case 'low_stock':
          query = supabase.rpc('check_reordering_rules', {
            p_restaurant_id: restaurantId
          });
          break;

        case 'location_analysis':
          query = supabase
            .from('stock_quants')
            .select(`
              *,
              stock_locations(name, location_type)
            `)
            .eq('restaurant_id', restaurantId);
          break;

        default:
          query = supabase.from('products').select('*').eq('restaurant_id', restaurantId);
      }

      const { data: reportData, error } = await query;
      if (error) throw error;

      setData(reportData || []);
      
      // Calculate summary
      const summaryData = calculateSummary(reportType, reportData || []);
      setSummary(summaryData);

    } catch (error: any) {
      toast.error('فشل تحميل التقرير: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (type: string, data: any[]) => {
    switch (type) {
      case 'stock_value':
        const totalValue = data.reduce((sum, item) => {
          const price = item.products?.price || 0;
          return sum + (item.quantity_on_hand * price);
        }, 0);
        const totalCost = data.reduce((sum, item) => {
          const cost = item.products?.cost_price || 0;
          return sum + (item.quantity_on_hand * cost);
        }, 0);
        return { totalValue, totalCost, profit: totalValue - totalCost };

      case 'stock_moves':
        const totalMoves = data.length;
        const completedMoves = data.filter((m: any) => m.state === 'done').length;
        return { totalMoves, completedMoves, completionRate: totalMoves > 0 ? (completedMoves / totalMoves * 100).toFixed(1) : 0 };

      case 'low_stock':
        return { lowStockCount: data.length, suggestedOrderValue: data.reduce((sum, item) => sum + item.suggested_qty, 0) };

      case 'location_analysis':
        const locationGroups = data.reduce((acc, item) => {
          const loc = item.stock_locations?.name || 'غير معروف';
          acc[loc] = (acc[loc] || 0) + Math.abs(item.quantity_on_hand);
          return acc;
        }, {});
        return { locationCount: Object.keys(locationGroups).length, locationGroups };

      default:
        return {};
    }
  };

  useEffect(() => { loadReport(); }, [reportType, dateRange, restaurantId]);

  const exportReport = () => {
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير التقرير');
  };

  const getChartData = () => {
    switch (reportType) {
      case 'stock_value':
        const categoryData = data.reduce((acc, item) => {
          const category = item.products?.category || 'غير مصنف';
          const value = (item.products?.price || 0) * item.quantity_on_hand;
          acc[category] = (acc[category] || 0) + value;
          return acc;
        }, {});
        return Object.entries(categoryData).map(([name, value]) => ({ name, value }));

      case 'stock_moves':
        const movesByState = data.reduce((acc, item) => {
          acc[item.state] = (acc[item.state] || 0) + 1;
          return acc;
        }, {});
        return Object.entries(movesByState).map(([name, value]) => ({ name, value }));

      case 'location_analysis':
        return Object.entries(summary.locationGroups || {}).map(([name, value]) => ({ name, value }));

      default:
        return [];
    }
  };

  const chartData = getChartData();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تقارير المخزون المتقدمة</h1>
            <p className="text-muted-foreground">تحليلات شاملة للمخزون والحركات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReport} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={exportReport} disabled={!data.length}>
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>نوع التقرير</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock_value">قيمة المخزون</SelectItem>
                <SelectItem value="stock_moves">حركات المخزون</SelectItem>
                <SelectItem value="low_stock">المخزون المنخفض</SelectItem>
                <SelectItem value="location_analysis">تحليل المواقع</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>الفترة الزمنية</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportType === 'stock_value' && (
          <>
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">قيمة المخزون</p>
                  <p className="text-xl font-bold">{summary.totalValue?.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">تكلفة المخزون</p>
                  <p className="text-xl font-bold">{summary.totalCost?.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">الربح المحتمل</p>
                  <p className="text-xl font-bold">{summary.profit?.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-muted-foreground">عدد الأصناف</p>
                  <p className="text-xl font-bold">{data.length}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {reportType === 'stock_moves' && (
          <>
            <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الحركات</p>
                  <p className="text-xl font-bold">{summary.totalMoves}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">مكتملة</p>
                  <p className="text-xl font-bold">{summary.completedMoves}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
                  <p className="text-xl font-bold">{summary.completionRate}%</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {reportType === 'low_stock' && (
          <>
            <Card className="p-4 bg-rose-500/10 border-rose-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <div>
                  <p className="text-xs text-muted-foreground">منتجات منخفضة</p>
                  <p className="text-xl font-bold">{summary.lowStockCount}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">كمية مقترحة للطلب</p>
                  <p className="text-xl font-bold">{summary.suggestedOrderValue?.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {reportType === 'location_analysis' && (
          <>
            <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-muted-foreground">عدد المواقع</p>
                  <p className="text-xl font-bold">{summary.locationCount}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold mb-4">الرسم البياني</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">التفاصيل</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {data.length > 0 && Object.keys(data[0]).slice(0, 6).map(key => (
                  <th key={key} className="text-right p-3 text-sm font-medium">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((row, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                    <td key={cellIndex} className="p-3 text-sm">
                      {typeof value === 'number' ? value.toLocaleString() : String(value || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 20 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            عرض أول 20 سجل من {data.length}
          </p>
        )}
      </Card>
    </div>
  );
}
