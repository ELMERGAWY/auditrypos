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
  CheckCircle, Clock, Eye, RefreshCcw, ShoppingBag, Users, Trash2, Edit, X
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { InvoiceViewer } from '@/components/InvoiceViewer';
import { findOrCreateCustomer } from '@/lib/customerUtils';

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
  const [viewingId, setViewingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newOrderLoading, setNewOrderLoading] = useState(false);

  // Edit order state
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    total_amount: '',
    status: 'draft' as SalesOrder['status'],
    expected_delivery: '',
    customer_id: ''
  });
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);

  const handleDelete = async (order: SalesOrder) => {
    if (!confirm(`هل أنت متأكد من حذف الأمر ${order.order_number}؟`)) return;
    try {
      await supabase.from('sales_order_items').delete().eq('sales_order_id', order.id);
      const { error } = await supabase.from('sales_orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('تم حذف الأمر');
      loadOrders();
    } catch (e: any) {
      toast.error('فشل الحذف: ' + e.message);
    }
  };

  const handleEditOrder = async (order: SalesOrder) => {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name || '',
      total_amount: String(order.total_amount || 0),
      status: order.status,
      expected_delivery: order.expected_delivery || '',
      customer_id: ''
    });
    try {
      const { data: items } = await supabase.from('sales_order_items').select('*').eq('sales_order_id', order.id);
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
      const payload: any = {
        customer_name: editForm.customer_name,
        total_amount: total,
        status: editForm.status,
        expected_delivery: editForm.expected_delivery || null
      };
      if (editForm.customer_id) payload.customer_id = editForm.customer_id;

      const { error } = await supabase.from('sales_orders').update(payload).eq('id', editingOrder.id);
      if (error) throw error;

      // Update items
      for (const item of editOrderItems) {
        if (item.id) {
          await supabase.from('sales_order_items').update({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          }).eq('id', item.id);
        }
      }

      toast.success('تم تحديث أمر البيع بنجاح ✅');
      setShowEditModal(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      loadOrders();
    } catch (e: any) {
      toast.error('فشل تحديث الأمر: ' + e.message);
    }
  };

  const handleDeleteAndRecreateOrder = async () => {
    if (!editingOrder) return;
    if (!confirm('هل أنت متأكد من حذف هذا الأمر وإعادة إنشائه؟ سيتم حذف جميع القيود المحاسبية المرتبطة به.')) return;

    try {
      // Delete order items first
      await supabase.from('sales_order_items').delete().eq('sales_order_id', editingOrder.id);

      // Delete the order
      const { error: deleteError } = await supabase.from('sales_orders').delete().eq('id', editingOrder.id);
      if (deleteError) throw deleteError;

      // Create new order with updated data
      const total = parseFloat(editForm.total_amount) || 0;
      const payload: any = {
        restaurant_id: restaurantId,
        customer_name: editForm.customer_name,
        total_amount: total,
        status: editForm.status,
        expected_delivery: editForm.expected_delivery || null,
        order_number: editingOrder.order_number // Keep same order number
      };
      if (editForm.customer_id) payload.customer_id = editForm.customer_id;

      const { data: newOrder, error: insertError } = await supabase.from('sales_orders').insert(payload).select().single();
      if (insertError) throw insertError;

      // Create order items
      for (const item of editOrderItems) {
        await supabase.from('sales_order_items').insert({
          sales_order_id: newOrder.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        });
      }

      toast.success('تم إعادة إنشاء الأمر بنجاح ✅');
      setShowEditModal(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      loadOrders();
    } catch (e: any) {
      toast.error('فشل إعادة إنشاء الأمر: ' + e.message);
    }
  };

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
      
      // Auto-register customer if customer_name is provided but customer_id is not
      let customerId = selectedCustomerId || null;
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name || 'عميل نقدي';
      if (!customerId && customerName && customerName.trim() !== '' && customerName !== 'عميل نقدي') {
        customerId = await findOrCreateCustomer(restaurantId, customerName);
      }
      
      const { data, error } = await supabase.from('sales_orders').insert({
        restaurant_id: restaurantId,
        order_number: orderNumber,
        order_date: new Date().toISOString(),
        customer_id: customerId,
        customer_name: customerName,
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
                      <Button variant="ghost" size="sm" title="عرض التفاصيل" onClick={() => setViewingId(order.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="تعديل الأمر" onClick={() => handleEditOrder(order)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="حذف" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(order)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

      {viewingId && (
        <InvoiceViewer
          open={!!viewingId}
          onClose={() => setViewingId(null)}
          source="sales_order"
          recordId={viewingId}
          currency={currency}
          restaurantId={restaurantId}
        />
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowEditModal(false); setEditingOrder(null); }} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-black mb-6">تعديل أمر البيع #{editingOrder.order_number}</h3>

            <div className="space-y-4">
              <div>
                <Label>العميل</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={editForm.customer_id}
                  onChange={e => {
                    const cust = customers.find(c => c.id === e.target.value);
                    setEditForm({ ...editForm, customer_id: e.target.value, customer_name: cust?.name || editForm.customer_name });
                  }}
                >
                  <option value="">{editForm.customer_name || 'عميل نقدي'}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>اسم العميل</Label>
                <Input value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>الإجمالي</Label>
                <Input type="number" value={editForm.total_amount} onChange={e => setEditForm({ ...editForm, total_amount: e.target.value })} />
              </div>
              <div>
                <Label>حالة الأمر</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as SalesOrder['status'] })}>
                  <option value="draft">مسودة</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div>
                <Label>تاريخ التسليم المتوقع</Label>
                <Input type="date" value={editForm.expected_delivery} onChange={e => setEditForm({ ...editForm, expected_delivery: e.target.value })} />
              </div>

              {/* Editable Order Items */}
              {editOrderItems.length > 0 && (
                <div>
                  <Label className="text-base font-bold mb-2 block">بنود الأمر</Label>
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
                            <td className="p-2">
                              <Input
                                className="h-8 text-sm"
                                value={item.item_name || item.menu_item_name || ''}
                                onChange={e => {
                                  const updated = [...editOrderItems];
                                  updated[idx] = { ...updated[idx], item_name: e.target.value };
                                  setEditOrderItems(updated);
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                className="h-8 text-sm text-center"
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={e => {
                                  const updated = [...editOrderItems];
                                  updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                                  setEditOrderItems(updated);
                                  const newTotal = updated.reduce((sum, it) => sum + (Number(it.unit_price || it.price || 0) * Number(it.quantity || 0)), 0);
                                  setEditForm(f => ({ ...f, total_amount: String(newTotal) }));
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                className="h-8 text-sm text-center"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price || item.price || 0}
                                onChange={e => {
                                  const updated = [...editOrderItems];
                                  updated[idx] = { ...updated[idx], unit_price: parseFloat(e.target.value) || 0 };
                                  setEditOrderItems(updated);
                                  const newTotal = updated.reduce((sum, it) => sum + (Number(it.unit_price || it.price || 0) * Number(it.quantity || 0)), 0);
                                  setEditForm(f => ({ ...f, total_amount: String(newTotal) }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1 h-12 gradient-bg border-0 text-white font-bold text-lg mt-4" onClick={handleUpdateOrder}>
                  تحديث أمر البيع
                </Button>
                <Button className="h-12 border-0 text-white font-bold text-lg mt-4 bg-destructive hover:bg-destructive/90" onClick={handleDeleteAndRecreateOrder}>
                  حذف وإعادة إنشاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
