import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ShoppingCart, Plus, Search, Calendar, Package, DollarSign, 
  CheckCircle, Clock, Eye, RefreshCcw, Truck, Users
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  supplier_name: string | null;
  total_amount: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  expected_arrival?: string;
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function PurchaseOrders({ restaurantId, currency }: Props) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [restaurantId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('po_date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
           console.warn('Purchase orders table not found, please create it in Supabase.');
           setOrders([]);
           return;
        }
        throw error;
      }
      setOrders(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل أوامر الشراء: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-indigo-600">أوامر الشراء (Purchase Orders)</h2>
          <p className="text-muted-foreground text-sm">إدارة الطلبيات الصادرة للموردين ومتابعة وصول البضائع.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> طلب شراء جديد
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 glass-card border-indigo-500/20 bg-indigo-500/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الطلبيات</p>
            <h4 className="text-xl font-bold">{orders.length}</h4>
         </Card>
         <Card className="p-4 glass-card border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-muted-foreground mb-1">بانتظار التوريد</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'ordered').length}</h4>
         </Card>
         <Card className="p-4 glass-card border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-muted-foreground mb-1">تم الاستلام</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'received').length}</h4>
         </Card>
         <Card className="p-4 glass-card border-destructive/20 bg-destructive/5">
            <p className="text-xs text-muted-foreground mb-1">ملغاة</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'cancelled').length}</h4>
         </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="البحث برقم الطلب أو المورد..." 
          className="pr-10 h-11 bg-card/50" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-indigo-500/5 border-b border-border">
                <th className="px-6 py-4 font-bold">رقم الطلب</th>
                <th className="px-6 py-4 font-bold">التاريخ</th>
                <th className="px-6 py-4 font-bold">المورد</th>
                <th className="px-6 py-4 font-bold">القيمة التقديرية</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-indigo-600 opacity-20" /></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">لا توجد طلبات شراء حالياً</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-indigo-500/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs">{order.po_number}</td>
                    <td className="px-6 py-4">{new Date(order.po_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-bold">{order.supplier_name || 'مورد عام'}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{(order.total_amount || 0).toLocaleString()} {currency}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-medium bg-indigo-100 text-indigo-700">
                        {order.status === 'draft' ? 'مسودة' : order.status === 'ordered' ? 'بانتظار التوريد' : order.status === 'received' ? 'تم الاستلام' : 'ملغي'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء طلب شراء جديد</DialogTitle></DialogHeader>
          <div className="py-12 text-center text-muted-foreground italic">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            جاري العمل على وحدة التوريد الذكية...
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
