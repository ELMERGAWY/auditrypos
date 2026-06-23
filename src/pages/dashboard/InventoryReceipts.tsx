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
  Truck, Plus, Search, Calendar, Package, DollarSign, 
  CheckCircle, Clock, FileText, XCircle, Download, Eye,
  TrendingUp, TrendingDown, Warehouse, Barcode
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  supplier_name: string | null;
  supplier_id: string | null;
  warehouse_id: string | null;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  status: 'draft' | 'confirmed' | 'posted' | 'cancelled';
  notes: string | null;
  items_count: number;
  created_at: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface ReceiptItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  batch_number: string | null;
  expiry_date: string | null;
  unit: string | null;
  warehouse_location: string | null;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  cost_price: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function InventoryReceiptsManager({ restaurantId, currency }: Props) {
  const [receipts, setReceipts] = useState<InventoryReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<InventoryReceipt | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);

  // New receipt form state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptItemsData, setReceiptItemsData] = useState<Array<{
    product_id: string;
    quantity: number;
    unit_cost: number;
    batch_number: string;
    expiry_date: string;
    warehouse_location: string;
  }>>([]);

  useEffect(() => {
    loadReceipts();
  }, [restaurantId]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_receipts')
        .select(`
          id, receipt_number, receipt_date, total_amount, discount_amount, 
          tax_amount, net_amount, paid_amount, status, notes, created_at,
          warehouse_id,
          suppliers(name),
          inventory_receipt_items(id, quantity)
        `)
        .eq('restaurant_id', restaurantId)
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      const formattedReceipts: InventoryReceipt[] = (data || []).map((r: any) => ({
        id: r.id,
        receipt_number: r.receipt_number,
        receipt_date: r.receipt_date,
        supplier_name: r.suppliers?.name,
        supplier_id: r.supplier_id,
        warehouse_id: r.warehouse_id,
        total_amount: Number(r.total_amount) || 0,
        discount_amount: Number(r.discount_amount) || 0,
        tax_amount: Number(r.tax_amount) || 0,
        net_amount: Number(r.net_amount) || 0,
        paid_amount: Number(r.paid_amount) || 0,
        status: r.status,
        notes: r.notes,
        items_count: r.inventory_receipt_items?.length || 0,
        created_at: r.created_at
      }));

      setReceipts(formattedReceipts);
    } catch (error: any) {
      toast.error('فشل تحميل فواتير الاستلام: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').eq('restaurant_id', restaurantId);
    setWarehouses(data || []);
  };

  const loadReceiptDetail = async (receiptId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_receipt_items')
        .select(`
          id, quantity, unit_cost, total_cost, batch_number, expiry_date, unit, warehouse_location,
          products(name)
        `)
        .eq('inventory_receipt_id', receiptId);

      if (error) throw error;

      const items: ReceiptItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_name: item.products?.name || 'منتج محذوف',
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        total_cost: Number(item.total_cost),
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        unit: item.unit,
        warehouse_location: item.warehouse_location
      }));

      setReceiptItems(items);
    } catch (error: any) {
      toast.error('فشل تحميل تفاصيل الفاتورة: ' + error.message);
    }
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, phone, balance')
      .eq('restaurant_id', restaurantId)
      .order('name');
    setSuppliers(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, unit, cost_price')
      .eq('restaurant_id', restaurantId)
      .eq('available', true)
      .order('name');
    setProducts(data || []);
  };

  const handleCreateReceipt = async () => {
    if (!selectedSupplier) {
      toast.error('يرجى اختيار المورد');
      return;
    }

    if (receiptItemsData.length === 0) {
      toast.error('يرجى إضافة منتجات للفاتورة');
      return;
    }

    try {
      // Generate receipt number
      const { data: countData } = await supabase
        .from('inventory_receipts')
        .select('id', { count: 'exact' })
        .eq('restaurant_id', restaurantId);
      
      const count = countData?.length || 0;
      const receiptNumber = `RC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count + 1).padStart(4,'0')}`;

      // Calculate totals
      const totalAmount = receiptItemsData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const discountAmount = 0;
      const taxAmount = totalAmount * 0.14; // 14% tax
      const netAmount = totalAmount - discountAmount + taxAmount;

      // Create receipt header
      const { data: receiptData, error: receiptError } = await supabase
        .from('inventory_receipts')
        .insert({
          restaurant_id: restaurantId,
          receipt_number: receiptNumber,
          supplier_id: selectedSupplier,
          warehouse_id: selectedWarehouse || null,
          receipt_date: receiptDate,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          net_amount: netAmount,
          paid_amount: 0,
          status: 'draft',
          notes: receiptNotes
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const itemsData = receiptItemsData.map(item => ({
        inventory_receipt_id: receiptData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        unit: products.find(p => p.id === item.product_id)?.unit || 'piece',
        warehouse_location: item.warehouse_location || null
      }));

      const { error: itemsError } = await supabase
        .from('inventory_receipt_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success('تم إنشاء فاتورة الاستلام بنجاح');
      setShowAddModal(false);
      resetForm();
      loadReceipts();
    } catch (error: any) {
      toast.error('فشل إنشاء الفاتورة: ' + error.message);
    }
  };

  const handleUpdateStatus = async (receiptId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('inventory_receipts')
        .update({ status: newStatus })
        .eq('id', receiptId);

      if (error) throw error;

      // If posting, update inventory and supplier balance
      if (newStatus === 'posted') {
        // This would trigger the accounting integration
        toast.success('تم ترحيل الفاتورة وتحديث المخزون');
      } else {
        toast.success('تم تحديث حالة الفاتورة');
      }
      
      loadReceipts();
    } catch (error: any) {
      toast.error('فشل تحديث الحالة: ' + error.message);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    try {
      const { error } = await supabase
        .from('inventory_receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      toast.success('تم حذف الفاتورة بنجاح');
      loadReceipts();
    } catch (error: any) {
      toast.error('فشل حذف الفاتورة: ' + error.message);
    }
  };

  const addItemRow = () => {
    setReceiptItemsData([...receiptItemsData, {
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      batch_number: '',
      expiry_date: '',
      warehouse_location: ''
    }]);
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    const newItems = [...receiptItemsData];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiptItemsData(newItems);
  };

  const removeItemRow = (index: number) => {
    setReceiptItemsData(receiptItemsData.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedSupplier('');
    setSelectedWarehouse('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setReceiptNotes('');
    setReceiptItemsData([]);
  };

  const filteredReceipts = receipts.filter(r => 
    r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPurchases = receipts
    .filter(r => r.status === 'posted')
    .reduce((sum, r) => sum + r.net_amount, 0);

  const totalUnpaid = receipts
    .filter(r => r.status === 'posted' && r.net_amount > r.paid_amount)
    .reduce((sum, r) => sum + (r.net_amount - r.paid_amount), 0);

  const exportReceipts = () => {
    const worksheet = XLSX.utils.json_to_sheet(receipts.map(r => ({
      'رقم الفاتورة': r.receipt_number,
      'التاريخ': new Date(r.receipt_date).toLocaleDateString('ar-EG'),
      'المورد': r.supplier_name || '-',
      'الإجمالي': r.total_amount,
      'الخصم': r.discount_amount,
      'الضريبة': r.tax_amount,
      'الصافي': r.net_amount,
      'المدفوع': r.paid_amount,
      'المتبقي': r.net_amount - r.paid_amount,
      'الحالة': r.status === 'draft' ? 'مسودة' : r.status === 'confirmed' ? 'مؤكدة' : r.status === 'posted' ? 'مرحلة' : 'ملغاة'
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فواتير الاستلام');
    XLSX.writeFile(workbook, `فواتير_استلام_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">فواتير استلام المخزون</h2>
            <p className="text-xs text-muted-foreground">
              {receipts.length} فاتورة | إجمالي المشتريات: {totalPurchases.toFixed(2)} {currency}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReceipts}>
            <Download className="w-4 h-4 ml-1" /> تصدير
          </Button>
          <Button onClick={() => { loadSuppliers(); loadProducts(); loadWarehouses(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4 ml-1" /> فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">عدد الفواتير</p>
              <p className="font-bold text-lg">{receipts.length}</p>
            </div>
            <FileText className="w-8 h-8 text-primary/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات المرحلة</p>
              <p className="font-bold text-lg text-primary">{totalPurchases.toFixed(2)} {currency}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">مستحقات للموردين</p>
              <p className="font-bold text-lg text-destructive">{totalUnpaid.toFixed(2)} {currency}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive/50" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">مسودة</p>
              <p className="font-bold text-lg">{receipts.filter(r => r.status === 'draft').length}</p>
            </div>
            <Clock className="w-8 h-8 text-warning/50" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الفواتير..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Receipts Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right text-sm font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الأصناف</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الصافي</th>
                <th className="px-4 py-3 text-right text-sm font-medium">المدفوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    لا توجد فواتير
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium">{receipt.receipt_number}</td>
                    <td className="px-4 py-3">{new Date(receipt.receipt_date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">{receipt.supplier_name || '-'}</td>
                    <td className="px-4 py-3">{receipt.items_count} صنف</td>
                    <td className="px-4 py-3 font-bold">{receipt.net_amount.toFixed(2)} {currency}</td>
                    <td className="px-4 py-3">
                      <span className={receipt.paid_amount >= receipt.net_amount ? 'text-success' : 'text-destructive'}>
                        {receipt.paid_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        receipt.status === 'posted' ? 'default' :
                        receipt.status === 'confirmed' ? 'secondary' :
                        receipt.status === 'draft' ? 'outline' :
                        'destructive'
                      }>
                        {receipt.status === 'posted' ? 'مرحلة' :
                         receipt.status === 'confirmed' ? 'مؤكدة' :
                         receipt.status === 'draft' ? 'مسودة' :
                         'ملغاة'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            loadReceiptDetail(receipt.id);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {receipt.status === 'draft' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateStatus(receipt.id, 'confirmed')}
                            >
                              <CheckCircle className="w-4 h-4 text-success" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteReceipt(receipt.id)}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {receipt.status === 'confirmed' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(receipt.id, 'posted')}
                          >
                            <CheckCircle className="w-4 h-4 text-primary" />
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة استلام مخزون جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Supplier & Date & Warehouse */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  المورد *
                </Label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1"
                >
                  <option value="">اختر المورد...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.phone && `- ${s.phone}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4" />
                  المستودع / الفرع *
                </Label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 mt-1"
                >
                  <option value="">اختر المستودع...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ الاستلام
                </Label>
                <Input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>ملاحظات</Label>
              <Input
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="ملاحظات على الفاتورة"
                className="mt-1"
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  الأصناف
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة صنف
                </Button>
              </div>

              {receiptItemsData.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 border rounded-lg">
                  لا توجد أصناف. اضغط "إضافة صنف" لإضافة منتجات
                </p>
              ) : (
                <div className="space-y-2">
                  {receiptItemsData.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/50">
                      {/* Product */}
                      <div className="col-span-3">
                        <Label className="text-xs">المنتج</Label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItemRow(index, 'product_id', e.target.value)}
                          className="w-full h-9 rounded border px-2 text-sm"
                        >
                          <option value="">اختر...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          min={1}
                          step={0.001}
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="col-span-2">
                        <Label className="text-xs">سعر الوحدة</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.0001}
                          value={item.unit_cost}
                          onChange={(e) => updateItemRow(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>

                      {/* Batch */}
                      <div className="col-span-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          Batch
                        </Label>
                        <Input
                          value={item.batch_number}
                          onChange={(e) => updateItemRow(index, 'batch_number', e.target.value)}
                          placeholder="رقم الدفعة"
                          className="h-9"
                        />
                      </div>

                      {/* Expiry */}
                      <div className="col-span-2">
                        <Label className="text-xs">تاريخ الانتهاء</Label>
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateItemRow(index, 'expiry_date', e.target.value)}
                          className="h-9"
                        />
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemRow(index)}
                          className="text-destructive"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Location & Total */}
                      <div className="col-span-6">
                        <Label className="text-xs flex items-center gap-1">
                          <Warehouse className="w-3 h-3" />
                          موقع التخزين
                        </Label>
                        <Input
                          value={item.warehouse_location}
                          onChange={(e) => updateItemRow(index, 'warehouse_location', e.target.value)}
                          placeholder="مثال: رف A-12"
                          className="h-9"
                        />
                      </div>

                      <div className="col-span-6 text-left">
                        <Label className="text-xs">الإجمالي</Label>
                        <p className="font-bold text-primary h-9 flex items-center">
                          {(item.quantity * item.unit_cost).toFixed(2)} {currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {receiptItemsData.length > 0 && (
              <Card className="p-4 bg-primary/5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                    <p className="font-bold">{receiptItemsData.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي التكلفة</p>
                    <p className="font-bold text-primary">
                      {receiptItemsData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)} {currency}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreateReceipt}>
                إنشاء فاتورة الاستلام
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل فاتورة الاستلام: {selectedReceipt?.receipt_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">المورد</p>
                <p className="font-medium">{selectedReceipt?.supplier_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التاريخ</p>
                <p className="font-medium">{selectedReceipt?.receipt_date && new Date(selectedReceipt.receipt_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <Badge variant={
                  selectedReceipt?.status === 'posted' ? 'default' :
                  selectedReceipt?.status === 'confirmed' ? 'secondary' :
                  selectedReceipt?.status === 'draft' ? 'outline' :
                  'destructive'
                }>
                  {selectedReceipt?.status === 'posted' ? 'مرحلة' :
                   selectedReceipt?.status === 'confirmed' ? 'مؤكدة' :
                   selectedReceipt?.status === 'draft' ? 'مسودة' :
                   'ملغاة'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                <p className="font-bold">{selectedReceipt?.items_count}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>الإجمالي:</span>
                  <span className="font-bold">{selectedReceipt?.total_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>الخصم:</span>
                  <span>{selectedReceipt?.discount_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>الضريبة (14%):</span>
                  <span>{selectedReceipt?.tax_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-bold">الصافي:</span>
                  <span className="font-bold text-primary">{selectedReceipt?.net_amount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>المدفوع:</span>
                  <span className={selectedReceipt && selectedReceipt.paid_amount >= selectedReceipt.net_amount ? 'text-success' : 'text-destructive'}>
                    {selectedReceipt?.paid_amount.toFixed(2)} {currency}
                  </span>
                </div>
                {selectedReceipt && selectedReceipt.net_amount > selectedReceipt.paid_amount && (
                  <div className="flex justify-between text-destructive">
                    <span>المتبقي:</span>
                    <span className="font-bold">{(selectedReceipt.net_amount - selectedReceipt.paid_amount).toFixed(2)} {currency}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Items Table */}
            <div>
              <p className="font-medium mb-2">الأصناف المستلمة:</p>
              <table className="w-full text-sm">
                <thead className="bg-primary/5 border-b">
                  <tr>
                    <th className="px-3 py-2 text-right">المنتج</th>
                    <th className="px-3 py-2 text-right">الكمية</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                    <th className="px-3 py-2 text-right">Batch</th>
                    <th className="px-3 py-2 text-right">الموقع</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2">{item.unit_cost.toFixed(4)}</td>
                      <td className="px-3 py-2 font-bold">{item.total_cost.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {item.batch_number && (
                          <Badge variant="outline" className="text-xs">
                            <Barcode className="w-3 h-3 ml-1" />
                            {item.batch_number}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.warehouse_location && (
                          <span className="text-xs text-muted-foreground">{item.warehouse_location}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReceipt?.notes && (
              <div>
                <p className="text-sm text-muted-foreground">ملاحظات:</p>
                <p className="text-sm">{selectedReceipt.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
