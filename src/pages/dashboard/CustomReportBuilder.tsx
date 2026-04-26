import { useState } from 'react';
import { 
  Calendar, FileText, Download, Printer, Filter, 
  Search, RefreshCw, ChevronDown, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    let query = supabase.from(reportType === 'sales' ? 'orders' : reportType === 'expenses' ? 'expenses' : 'products')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (reportType === 'sales' || reportType === 'expenses') {
      query = query.gte(reportType === 'sales' ? 'created_at' : 'date', dateFrom)
                   .lte(reportType === 'sales' ? 'created_at' : 'date', dateTo);
    }

    const { data, error } = await query;
    if (error) toast.error('حدث خطأ أثناء جلب البيانات');
    else setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary" /> مولد التقارير المخصص
        </h2>
      </div>

      {/* Configuration Header */}
      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs">نوع التقرير</Label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
            <option value="sales">تقرير المبيعات التفصيلي</option>
            <option value="expenses">تقرير المصروفات والتكاليف</option>
            <option value="products">تقرير حركة المخزون</option>
            <option value="customers">تقرير مديونيات العملاء</option>
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

      {/* Results Table */}
      {results.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-secondary/20">
            <p className="text-sm font-bold">نتائج التقرير ({results.length} حركة)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2"><Printer className="w-3 h-3" /> طباعة</Button>
              <Button variant="outline" size="sm" className="gap-2"><Download className="w-3 h-3" /> تصدير Excel</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-secondary/10 border-b">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">البيان / المرجع</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-primary/5 transition-colors">
                    <td className="p-3 text-xs">{new Date(r.created_at || r.date).toLocaleDateString('ar-EG')}</td>
                    <td className="p-3 font-medium">{r.order_number || r.category || r.name}</td>
                    <td className="p-3 font-bold text-primary">{(r.total || r.amount || 0).toLocaleString()} {currency}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold">مكتمل</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-20 text-center border-2 border-dashed rounded-3xl text-muted-foreground flex flex-col items-center justify-center">
          <Calendar className="w-16 h-16 mb-4 opacity-10" />
          <p>حدد الفترة الزمنية ونوع التقرير ثم اضغط على "توليد التقرير" لاستعراض البيانات</p>
        </div>
      )}
    </div>
  );
}
