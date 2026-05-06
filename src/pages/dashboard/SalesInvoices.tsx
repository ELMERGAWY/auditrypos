
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Search, Calendar, Printer, Download, 
  RotateCcw, Eye, RefreshCcw, DollarSign, Users
} from 'lucide-react';

interface Invoice {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string | null;
  total: number;
  status: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function SalesInvoices({ restaurantId, currency }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [restaurantId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الفواتير: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-primary">فواتير البيع (Sales Invoices)</h2>
          <p className="text-muted-foreground text-sm">إدارة الفواتير النهائية والمؤكدة الناتجة عن المبيعات.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> تصدير الكل
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="p-4 glass-card border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الفواتير</p>
            <h4 className="text-xl font-bold">{invoices.length}</h4>
         </Card>
         <Card className="p-4 glass-card border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات المفوترة</p>
            <h4 className="text-xl font-bold">{invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()} {currency}</h4>
         </Card>
         <Card className="p-4 glass-card border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-muted-foreground mb-1">فواتير اليوم</p>
            <h4 className="text-xl font-bold">
               {invoices.filter(inv => new Date(inv.created_at).toDateString() === new Date().toDateString()).length}
            </h4>
         </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="البحث برقم الفاتورة أو العميل..." 
          className="pr-10 h-11 bg-card/50" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-primary/5 border-b border-border">
                <th className="px-6 py-4 font-bold">رقم الفاتورة</th>
                <th className="px-6 py-4 font-bold">التاريخ</th>
                <th className="px-6 py-4 font-bold">العميل</th>
                <th className="px-6 py-4 font-bold">القيمة الإجمالية</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">لا توجد فواتير حالياً</td></tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs">{inv.order_number}</td>
                    <td className="px-6 py-4">{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-bold">{inv.customer_name || 'عميل نقدي'}</td>
                    <td className="px-6 py-4 font-bold text-primary">{(inv.total || 0).toLocaleString()} {currency}</td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                        مكتملة
                      </Badge>
                    </td>
                    <td className="px-6 py-4 flex gap-1">
                      <Button variant="ghost" size="sm" title="عرض"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" title="طباعة"><Printer className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" title="إرجاع" className="text-destructive"><RotateCcw className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
