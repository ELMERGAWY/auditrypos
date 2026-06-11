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
  ShoppingCart, Plus, Search, Calendar, Package, DollarSign, 
  CheckCircle, Clock, Eye, RefreshCcw, Truck, Users, Edit, Trash2, X
} from 'lucide-react';
import { Label } from '@/components/ui/label';

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

  // Edit state
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    supplier_name: '',
    total_amount: '',
    status: 'draft' as PurchaseOrder['status'],
    expected_arrival: ''
  });
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);

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

  const handleDelete = async (order: PurchaseOrder) => {
    if (!confirm(`هل أنت متأكد من حذف طلب الشراء ${order.po_number}؟`)) return;
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('تم حذف طلب الشراء');
      loadOrders();
    } catch (e: any) {
      toast.error('فشل الحذف: ' + e.message);
    }
  };

  const handleEditOrder = async (order: PurchaseOrder) => {
    setEditingOrder(order);
    setEditForm({
      supplier_name: order.supplier_name || '',
      total_amount: String(order.total_amount || 0),
      status: order.status,
      expected_arrival: order.expected_arrival || ''
    });
    try {
      const { data: items } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', order.id);
      setEditOrderItems(items || []);
    } catch {
      setEditOrderItems([]);
    }
    setShowEditModal(true);
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    try {
      const total = parseFloat(editForm.total_amount) || 0;
      const { error } = await supabase.from('purchase_orders').update({
        supplier_name: editForm.supplier_name,
        total_amount: total,
        status: editForm.status,
        expected_arrival: editForm.expected_arrival || null
      }).eq('id', editingOrder.id);
      if (error) throw error;

      for (const item of editOrderItems) {
        if (item.id) {
          await supabase.from('purchase_order_items').update({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          }).eq('id', item.id);
        }
      }

      toast.success('تم تحديث طلب الشراء بنجاح ✅');
      setShowEditModal(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      loadOrders();
    } catch (e: any) {
      toast.error('فشل تحديث الطلب: ' + e.message);
    }
  };

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
                    <td className="px-6 py-4 flex gap-1">
                      <Button variant="ghost" size="sm" title="تعديل" onClick={() => handleEditOrder(order)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" title="حذف" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(order)}><Trash2 className="w-4 h-4" /></Button>
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

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowEditModal(false); setEditingOrder(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black mb-6">تعديل طلب الشراء #{editingOrder.po_number}</h3>

            <div className="space-y-4">
              <div>
                <Label>المورد</Label>
                <Input value={editForm.supplier_name} onChange={e => setEditForm({ ...editForm, supplier_name: e.target.value })} />
              </div>
              <div>
                <Label>الإجمالي</Label>
                <Input type="number" value={editForm.total_amount} onChange={e => setEditForm({ ...editForm, total_amount: e.target.value })} />
              </div>
              <div>
                <Label>حالة الطلب</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as PurchaseOrder['status'] })}>
                  <option value="draft">مسودة</option>
                  <option value="ordered">بانتظار التوريد</option>
                  <option value="received">تم الاستلام</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div>
                <Label>تاريخ الوصول المتوقع</Label>
                <Input type="date" value={editForm.expected_arrival} onChange={e => setEditForm({ ...editForm, expected_arrival: e.target.value })} />
              </div>

              {editOrderItems.length > 0 && (
                <div>
                  <Label className="text-base font-bold mb-2 block">بنود الطلب</Label>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="p-2 text-right">الصنف</th>
                          <th className="p-2 text-center w-20">الكمية</th>
                          <th className="p-2 text-center w-24">السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editOrderItems.map((item, idx) => (
                          <tr key={item.id || idx} className="border-t border-border">
                            <td className="p-2"><Input className="h-8 text-sm" value={item.item_name || ''} onChange={e => { const u=[...editOrderItems]; u[idx]={...u[idx], item_name: e.target.value}; setEditOrderItems(u); }} /></td>
                            <td className="p-2"><Input className="h-8 text-sm text-center" type="number" min="1" value={item.quantity||1} onChange={e => { const u=[...editOrderItems]; u[idx]={...u[idx], quantity: Number(e.target.value)}; setEditOrderItems(u); const t=u.reduce((s,it)=>s+(Number(it.unit_price||0)*Number(it.quantity||0)),0); setEditForm(f=>({...f,total_amount:String(t)})); }} /></td>
                            <td className="p-2"><Input className="h-8 text-sm text-center" type="number" min="0" step="0.01" value={item.unit_price||0} onChange={e => { const u=[...editOrderItems]; u[idx]={...u[idx], unit_price: parseFloat(e.target.value)||0}; setEditOrderItems(u); const t=u.reduce((s,it)=>s+(Number(it.unit_price||0)*Number(it.quantity||0)),0); setEditForm(f=>({...f,total_amount:String(t)})); }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg mt-4" onClick={handleUpdateOrder}>
                تحديث طلب الشراء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
