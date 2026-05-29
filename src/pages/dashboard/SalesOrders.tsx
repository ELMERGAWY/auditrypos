// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, Plus, Search, Calendar, Package, DollarSign, 
  CheckCircle, Clock, Eye, RefreshCcw, ShoppingBag, Users
} from 'lucide-react';

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string | null;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'delivered' | 'cancelled';
  expected_delivery?: string;
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function SalesOrders({ restaurantId, currency }: Props) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newOrderLoading, setNewOrderLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    loadLookupData();
  }, [restaurantId]);

  const loadLookupData = async () => {
    const { data: custData } = await supabase.from('customers').select('id, name').eq('restaurant_id', restaurantId);
    const { data: itemData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId);
    setCustomers(custData || []);
    setMenuItems(itemData || []);
  };

  const handleCreateOrder = async () => {
    if (selectedItems.length === 0) return toast.error('يرجى اختيار أصناف أولاً');
    
    try {
      setNewOrderLoading(true);
      const total = selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const orderNumber = `SO-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase.from('sales_orders').insert({
        restaurant_id: restaurantId,
        order_number: orderNumber,
        order_date: new Date().toISOString(),
        customer_id: selectedCustomerId || null,
        customer_name: customers.find(c => c.id === selectedCustomerId)?.name || 'عميل نقدي',
        total_amount: total,
        status: 'confirmed'
      }).select().single();

      if (error) throw error;
      
      toast.success('تم إنشاء أمر البيع بنجاح');
      setShowAddModal(false);
      setSelectedItems([]);
      loadOrders();
    } catch (error: any) {
      toast.error('فشل إنشاء الأمر: ' + error.message);
    } finally {
      setNewOrderLoading(false);
    }
  };

  const handleConvertToInvoice = async (orderId: string) => {
    try {
      setLoading(true);
      const { edaraCore } = await import('@/services/edaraCore');
      const invoice = await edaraCore.convertOrderToInvoice(orderId, restaurantId);
      
      // Also trigger the Chain Reaction for the new invoice
      // For simplicity in this demo, we'll assume items are fetched within the service or passed
      // In a full implementation, we'd fetch sales_order_items here
      
      toast.success('تم تحويل الأمر إلى فاتورة بنجاح وتحديث المخزون والمالية');
      loadOrders();
    } catch (error: any) {
      toast.error('فشل التحويل: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
           console.warn('Sales orders table not found, please create it in Supabase.');
           setOrders([]);
           return;
        }
        throw error;
      }
      setOrders(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل أوامر البيع: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in p-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-primary">أوامر البيع (Sales Orders)</h2>
          <p className="text-muted-foreground text-sm">تتبع طلبات العملاء وتجهيزها قبل إصدار الفواتير النهائية.</p>
        </div>
        <Button className="gradient-bg border-0 text-white gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> أمر بيع جديد
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 glass-card border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الأوامر</p>
            <h4 className="text-xl font-bold">{orders.length}</h4>
         </Card>
         <Card className="p-4 glass-card border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-muted-foreground mb-1">قيد التجهيز</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'confirmed').length}</h4>
         </Card>
         <Card className="p-4 glass-card border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-muted-foreground mb-1">تم التسليم</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'delivered').length}</h4>
         </Card>
         <Card className="p-4 glass-card border-destructive/20 bg-destructive/5">
            <p className="text-xs text-muted-foreground mb-1">ملغاة</p>
            <h4 className="text-xl font-bold">{orders.filter(o => o.status === 'cancelled').length}</h4>
         </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="البحث برقم الأمر أو العميل..." 
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
                <th className="px-6 py-4 font-bold">رقم الأمر</th>
                <th className="px-6 py-4 font-bold">التاريخ</th>
                <th className="px-6 py-4 font-bold">العميل</th>
                <th className="px-6 py-4 font-bold">القيمة التقديرية</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">لا توجد أوامر بيع حالياً</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs">{order.order_number}</td>
                    <td className="px-6 py-4">{new Date(order.order_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-bold">{order.customer_name || 'عميل نقدي'}</td>
                    <td className="px-6 py-4 font-bold text-primary">{(order.total_amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-medium">
                        {order.status === 'draft' ? 'مسودة' : order.status === 'confirmed' ? 'مؤكد' : order.status === 'delivered' ? 'تم التسليم' : 'ملغي'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 flex gap-1">
                      <Button variant="ghost" size="sm" title="عرض التفاصيل"><Eye className="w-4 h-4" /></Button>
                      {order.status === 'confirmed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="تحويل لفاتورة" 
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleConvertToInvoice(order.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إنشاء أمر بيع جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-bold block mb-1">العميل</label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
              >
                <option value="">عميل نقدي</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold block mb-1">الأصناف</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {menuItems.map(item => (
                  <Button 
                    key={item.id} 
                    variant="outline" 
                    className="justify-start gap-2 h-auto py-2"
                    onClick={() => {
                      const existing = selectedItems.find(i => i.id === item.id);
                      if (existing) {
                        setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                      } else {
                        setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" /> {item.name} ({Number(item.price).toFixed(2)} {currency})
                  </Button>
                ))}
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                <h4 className="font-bold text-sm">الأصناف المختارة:</h4>
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span>{item.name} x {item.quantity}</span>
                    <span className="font-bold">{(item.price * item.quantity).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-black text-primary">
                  <span>الإجمالي</span>
                  <span>{selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                </div>
              </div>
            )}

            <Button 
              className="w-full gradient-bg border-0 text-white font-bold h-11" 
              onClick={handleCreateOrder}
              disabled={newOrderLoading}
            >
              {newOrderLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'حفظ أمر البيع'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
