// @ts-nocheck
import { useState } from 'react';
import {
  FileText, Download, Filter, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Props {
  restaurantId: string;
  currency: string;
}

export function CustomReportBuilder({ restaurantId, currency }: Props) {
  const [reportType, setReportType] = useState('sales');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      if (reportType === 'sales') {
        const { data: rows, error } = await supabase
          .from('orders')
          .select('order_number, customer_name, total, paid_amount, status, payment_method, created_by_name, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`)
          .order('created_at', { ascending: false })
          .limit(3000);
        if (error) throw error;
        data = rows || [];
      } else if (reportType === 'expenses') {
        const { data: rows, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .order('date', { ascending: false })
          .limit(2000);
        if (error) throw error;
        data = rows || [];
      } else if (reportType === 'products') {
        const { data: rows, error } = await supabase
          .from('products')
          .select('name, quantity, price, cost_price, category')
          .eq('restaurant_id', restaurantId)
          .limit(1000);
        if (error) throw error;
        data = rows || [];
      } else if (reportType === 'customers') {
        const { data: rows, error } = await supabase
          .from('customers')
          .select('name, phone, balance, total_spent, loyalty_tier, loyalty_points')
          .eq('restaurant_id', restaurantId)
          .order('total_spent', { ascending: false })
          .limit(1000);
        if (error) throw error;
        data = rows || [];
      }
      setResults(data);
      if (!data.length) toast.info('لا توجد نتائج لهذه الفترة');
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء جلب البيانات');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!results.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(results), 'report');
    XLSX.writeFile(wb, `auditry-custom-${reportType}-${dateFrom}.xlsx`);
    toast.success('تم التصدير');
  };

  const columns = results[0] ? Object.keys(results[0]).filter(k => !['id', 'restaurant_id'].includes(k)).slice(0, 8) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> مولد التقارير المخصص
        </h2>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs">نوع التقرير</Label>
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm"
          >
            <option value="sales">تقرير المبيعات التفصيلي</option>
            <option value="expenses">تقرير المصروفات</option>
            <option value="products">تقرير المخزون</option>
            <option value="customers">تقرير العملاء والمديونيات</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">من تاريخ</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">إلى تاريخ</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <Button onClick={generateReport} disabled={loading} className="gradient-bg text-primary-foreground border-0 gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
          توليد التقرير
        </Button>
      </div>

      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-secondary/20">
            <p className="text-sm font-bold">نتائج التقرير ({results.length})</p>
            <Button size="sm" variant="outline" className="gap-1" onClick={exportExcel}>
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {columns.map(c => <th key={c} className="p-3 font-bold">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.slice(0, 200).map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    {columns.map(c => (
                      <td key={c} className="p-3">
                        {typeof row[c] === 'number'
                          ? Number(row[c]).toLocaleString()
                          : String(row[c] ?? '—').slice(0, 80)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 200 && (
            <p className="p-2 text-[10px] text-muted-foreground text-center">عرض أول 200 صف — صدّر Excel للكامل</p>
          )}
          <p className="p-2 text-[10px] text-muted-foreground text-center">العملة: {currency}</p>
        </div>
      )}
    </div>
  );
}
