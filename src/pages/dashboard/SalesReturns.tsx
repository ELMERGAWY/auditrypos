// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  RotateCcw, Plus, Search, Calendar, User, Package, 
  AlertCircle, CheckCircle, XCircle, Clock, Download,
  ArrowRight, Trash2, FileText
} from 'lucide-react';
import { journalService } from '@/lib/accounting/journalService';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';

interface SalesReturn {
  id: string;
  return_number: string;
  return_date: string;
  customer_name: string | null;
  customer_id: string | null;
  total_amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  inventory_adjusted: boolean;
  items_count: number;
  original_order_number: string | null;
}

interface SalesReturnItem {
  id: string;
  menu_item_name: string;
  quantity_returned: number;
  unit_price: number;
  total_price: number;
  condition: string;
  return_to_inventory: boolean;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  product_id: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function SalesReturnsManager({ restaurantId, currency }: Props) {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [returnItems, setReturnItems] = useState<SalesReturnItem[]>([]);

  // New return form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [returnReason, setReturnReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; condition: string; return_to_inventory: boolean }>>(new Map());
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  useEffect(() => {
    loadReturns();
  }, [restaurantId]);

  const loadReturns = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_returns')
        .select(`
          id, return_number, return_date, total_amount, reason, status, inventory_adjusted, customer_id,
          customers(name),
          sales_return_items(id, quantity_returned),
          orders(order_number)
        `)
        .eq('restaurant_id', restaurantId)
        .order('return_date', { ascending: false });

      if (error) {
        console.error('Error loading sales returns:', error);
        throw error;
      }

      console.log('Loaded sales returns:', data?.length || 0);
      const formattedReturns: SalesReturn[] = (data || []).map((r: any) => ({
        id: r.id,
        return_number: r.return_number,
        return_date: r.return_date,
        customer_name: r.customers?.name,
        customer_id: r.customer_id,
        total_amount: Number(r.total_amount) || 0,
        reason: r.reason,
        status: r.status,
        inventory_adjusted: r.inventory_adjusted,
        items_count: r.sales_return_items?.length || 0,
        original_order_number: r.orders?.order_number
      }));

      setReturns(formattedReturns);
    } catch (error: any) {
      console.error('Failed to load sales returns:', error);
      toast.error('فشل تحميل مردودات المبيعات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnDetail = async (returnId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales_return_items')
        .select(`
          id, quantity_returned, unit_price, total_price, condition, return_to_inventory,
          menu_items(name)
        `)
        .eq('sales_return_id', returnId);

      if (error) throw error;

      const items: SalesReturnItem[] = (data || []).map((item: any) => ({
        id: item.id,
        menu_item_name: item.menu_items?.name || 'صنف محذوف',
        quantity_returned: item.quantity_returned,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        condition: item.condition,
        return_to_inventory: item.return_to_inventory
      }));

      setReturnItems(items);
    } catch (error: any) {
      toast.error('فشل تحميل تفاصيل المردود: ' + error.message);
    }
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('restaurant_id', restaurantId)
      .order('name');
    setCustomers(data || []);
  };

  const loadCustomerOrders = async (customerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, total, created_at, customer_id, customer_name,
        order_items(id, menu_item_id, menu_item_name, quantity, price, product_id)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    const formattedOrders: Order[] = (data || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      total: Number(o.total),
      created_at: o.created_at,
      items: o.order_items || []
    }));

    setOrders(formattedOrders);
  };

  const handleCreateReturn = async () => {
    if (!selectedCustomer || !selectedOrder) {
      toast.error('يرجى اختيار العميل والفاتورة الأصلية');
      return;
    }

    const itemsToReturn = Array.from(selectedItems.entries());
    if (itemsToReturn.length === 0) {
      toast.error('يرجى اختيار الأصناف المراد إرجاعها');
      return;
    }

    try {
      // Calculate total amount first
      const totalAmount = itemsToReturn.reduce((sum, [itemId, config]) => {
        const item = orderItems.find(i => i.id === itemId);
        return sum + ((item?.price || 0) * config.quantity);
      }, 0);
      
      // Generate return number
      const { data: countData } = await supabase
        .from('sales_returns')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurantId);
      
      const count = countData?.length || 0;
      const returnNumber = `SR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count + 1).padStart(4,'0')}`;

      // Create return header
      const { data: returnData, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          restaurant_id: restaurantId,
          return_number: returnNumber,
          original_order_id: selectedOrder,
          customer_id: selectedCustomer,
          return_date: returnDate,
          reason: returnReason,
          status: 'pending',
          total_amount: totalAmount
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = itemsToReturn.map(([itemId, config]) => {
        const item = orderItems.find(i => i.id === itemId);
        return {
          sales_return_id: returnData.id,
          original_order_item_id: itemId,
          menu_item_id: item?.menu_item_id,
          product_id: item?.product_id,
          quantity_returned: config.quantity,
          unit_price: item?.price || 0,
          total_price: (item?.price || 0) * config.quantity,
          condition: config.condition,
          return_to_inventory: config.return_to_inventory
        };
      });

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      toast.success('تم إنشاء مردود المبيعات بنجاح');
      setShowAddModal(false);
      resetForm();
      loadReturns();
    } catch (error: any) {
      toast.error('فشل إنشاء المردود: ' + error.message);
    }
  };

  const handleUpdateStatus = async (ret: SalesReturn, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sales_returns')
        .update({ status: newStatus })
        .eq('id', ret.id);

      if (error) throw error;

      // Accounting Integration is handled automatically by database trigger trg_create_sales_return_journal on BEFORE UPDATE of sales_returns status to completed/approved.
      if (newStatus === 'completed') {
        toast.success('✅ تم تأكيد المردود — تم تحديث المخزون ورصيد العميل والقيد المحاسبي تلقائياً');
      } else {
        toast.success('تم تحديث حالة المردود');
      }
      loadReturns();
    } catch (error: any) {
      // Show the underlying trigger/DB error for easier diagnosis
      const msg = error?.message || 'خطأ غير معروف';
      toast.error(`فشل تحديث الحالة: ${msg}`);
      console.error('handleUpdateStatus error:', error);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المردود؟ سيتم إرجاع جميع الحسابات والمخزون لحالتهم السابقة.')) return;

    try {
      const { data, error } = await supabase.rpc('delete_sales_return', {
        p_sales_return_id: returnId
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success('✅ تم حذف المردود وإرجاع الحسابات بنجاح');
        loadReturns();
      } else {
        toast.error('فشل حذف المردود: ' + (result.error || 'خطأ غير معروف'));
      }
    } catch (error: any) {
      toast.error('فشل حذف المردود: ' + error.message);
      console.error('handleDeleteReturn error:', error);
    }
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setSelectedOrder('');
    setOrders([]);
    setOrderItems([]);
    setSelectedItems(new Map());
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnReason('');
  };

  const toggleItemSelection = (itemId: string, item: OrderItem) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.set(itemId, { 
        quantity: 1, 
        condition: 'good',
        return_to_inventory: true 
      });
    }
    setSelectedItems(newSelected);
  };

  const updateItemConfig = (itemId: string, config: Partial<{ quantity: number; condition: string; return_to_inventory: boolean }>) => {
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(itemId);
    if (current) {
      newSelected.set(itemId, { ...current, ...config });
      setSelectedItems(newSelected);
    }
  };

  const onCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    setSelectedOrder('');
    setOrderItems([]);
    loadCustomerOrders(customerId);
  };

  const onOrderSelect = (orderId: string) => {
    setSelectedOrder(orderId);
    const order = orders.find(o => o.id === orderId);
    setOrderItems(order?.items || []);
    setSelectedItems(new Map());
  };

  const filteredReturns = returns.filter(r => 
    r.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.original_order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalReturnsAmount = returns
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">مردودات المبيعات</h2>
            <p className="text-xs text-muted-foreground">
              {returns.length} مردود | إجمالي المرتجعات: {totalReturnsAmount.toFixed(2)} {currency}
            </p>
          </div>
        </div>
        <Button onClick={() => { loadCustomers(); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 ml-1" /> مردود جديد
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المردودات</p>
              <p className="font-bold text-lg">{returns.length}</p>
            </div>
            <RotateCcw className="w-8 h-8 text-primary/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">قيمة المردودات المكتملة</p>
              <p className="font-bold text-lg text-destructive">{totalReturnsAmount.toFixed(2)} {currency}</p>
            </div>
            <FileText className="w-8 h-8 text-destructive/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">معلق</p>
              <p className="font-bold text-lg">{returns.filter(r => r.status === 'pending').length}</p>
            </div>
            <Clock className="w-8 h-8 text-warning/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">مكتمل</p>
              <p className="font-bold text-lg text-success">{returns.filter(r => r.status === 'completed').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success/50" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث في المردودات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Returns Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">رقم المردود</th>
                <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الفاتورة الأصلية</th>
                <th className="px-4 py-3 text-right text-sm font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    لا توجد مردودات
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium">{ret.return_number}</td>
                    <td className="px-4 py-3">{new Date(ret.return_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">{ret.customer_name || 'عميل نقدي'}</td>
                    <td className="px-4 py-3">{ret.original_order_number || '-'}</td>
                    <td className="px-4 py-3 font-bold">{ret.total_amount.toFixed(2)} {currency}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        ret.status === 'completed' ? 'default' :
                        ret.status === 'pending' ? 'secondary' :
                        ret.status === 'approved' ? 'outline' :
                        'destructive'
                      }>
                        {ret.status === 'completed' ? 'مكتمل' :
                         ret.status === 'pending' ? 'معلق' :
                         ret.status === 'approved' ? 'معتمد' :
                         'ملغي'}
                      </Badge>
                      {ret.inventory_adjusted && (
                        <Badge variant="outline" className="mr-2">مخزون</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(ret);
                            loadReturnDetail(ret.id);
                            setShowDetailModal(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        {ret.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateStatus(ret, 'completed')}
                            >
                              <CheckCircle className="w-4 h-4 text-success" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteReturn(ret.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {ret.status === 'approved' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(ret, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>إنشاء مردود مبيعات جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Customer Selection */}
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                اختيار العميل
              </Label>
              <div className="mt-1 space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن العميل..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <select
                  value={selectedCustomer}
                  onChange={(e) => onCustomerSelect(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                >
                  <option value="">اختر العميل...</option>
                  {customers
                    .filter(c => 
                      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                      c.phone?.includes(customerSearchQuery)
                    )
                    .map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone && `- ${c.phone}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Selection */}
            {selectedCustomer && (
              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  اختيار الفاتورة الأصلية
                </Label>
                <select
                  value={selectedOrder}
                  onChange={(e) => onOrderSelect(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1"
                >
                  <option value="">اختر الفاتورة...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {new Date(o.created_at).toLocaleDateString('ar-EG')} - {o.total.toFixed(2)} {currency}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date & Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ المردود
                </Label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>سبب المردود</Label>
                <Input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="مثال: تالف - خطأ في الطلب"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Items Selection */}
            {orderItems.length > 0 && (
              <div>
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  الأصناف المراد إرجاعها
                </Label>
                <div className="border rounded-lg mt-1 divide-y">
                  {orderItems.map((item) => (
                    <div key={item.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id, item)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.menu_item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            سعر: {item.price.toFixed(2)} | كمية مباعة: {item.quantity}
                          </p>
                        </div>
                      </div>
                      {selectedItems.has(item.id) && (
                        <div className="grid grid-cols-3 gap-2 mt-2 mr-7">
                          <div>
                            <Label className="text-xs">الكمية</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={selectedItems.get(item.id)?.quantity || 1}
                              onChange={(e) => updateItemConfig(item.id, { quantity: parseInt(e.target.value) || 1 })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">الحالة</Label>
                            <select
                              value={selectedItems.get(item.id)?.condition || 'good'}
                              onChange={(e) => updateItemConfig(item.id, { condition: e.target.value })}
                              className="w-full h-8 rounded border px-2"
                            >
                              <option value="good">جيد</option>
                              <option value="damaged">تالف</option>
                              <option value="expired">منتهي الصلاحية</option>
                              <option value="defective">به عيب</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedItems.get(item.id)?.return_to_inventory || false}
                                onChange={(e) => updateItemConfig(item.id, { return_to_inventory: e.target.checked })}
                              />
                              إرجاع للمخزون
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedItems.size > 0 && (
              <Card className="p-3 bg-primary/5">
                <p className="font-bold">ملخص المردود:</p>
                <p className="text-sm">
                  عدد الأصناف: {selectedItems.size} | 
                  إجمالي القيمة: {Array.from(selectedItems.entries()).reduce((sum, [itemId, config]) => {
                    const item = orderItems.find(i => i.id === itemId);
                    return sum + ((item?.price || 0) * config.quantity);
                  }, 0).toFixed(2)} {currency}
                </p>
              </Card>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateReturn}>
                إنشاء مردود المبيعات
              </Button>
              <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>تفاصيل مردود المبيعات: {selectedReturn?.return_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">العميل</p>
                <p className="font-medium">{selectedReturn?.customer_name || 'عميل نقدي'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">{selectedReturn?.return_date && new Date(selectedReturn.return_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge variant={
                  selectedReturn?.status === 'completed' ? 'default' :
                  selectedReturn?.status === 'pending' ? 'secondary' :
                  selectedReturn?.status === 'approved' ? 'outline' :
                  'destructive'
                }>
                  {selectedReturn?.status === 'completed' ? 'مكتمل' :
                   selectedReturn?.status === 'pending' ? 'معلق' :
                   selectedReturn?.status === 'approved' ? 'معتمد' :
                   'ملغي'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="font-bold text-lg">{selectedReturn?.total_amount.toFixed(2)} {currency}</p>
              </div>
            </div>

            <div>
              <p className="font-medium mb-2">الأصناف المرتجعة:</p>
              <table className="w-full text-sm">
                <thead className="bg-primary/5 border-b">
                  <tr>
                    <th className="px-3 py-2 text-right">الصنف</th>
                    <th className="px-3 py-2 text-right">الكمية</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-2">{item.menu_item_name}</td>
                      <td className="px-3 py-2">{item.quantity_returned}</td>
                      <td className="px-3 py-2">{item.unit_price.toFixed(2)}</td>
                      <td className="px-3 py-2 font-bold">{item.total_price.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {item.condition === 'good' ? 'جيد' :
                           item.condition === 'damaged' ? 'تالف' :
                           item.condition === 'expired' ? 'منتهي' : 'به عيب'}
                        </Badge>
                        {item.return_to_inventory && (
                          <Badge variant="secondary" className="mr-1">مخزون</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
