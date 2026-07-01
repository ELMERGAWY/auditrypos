// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Plus, Trash2, Save, X, Package, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
}

interface SubWarehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  main_warehouse_id: string;
}

interface Product {
  id: string;
  name: string;
  name_ar: string;
  barcode: string;
  sku: string;
  quantity: number;
  unit: string;
  item_type_id?: string;
}

interface TransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
}

interface Transfer {
  id: string;
  from_warehouse_id: string;
  from_sub_warehouse_id?: string;
  to_warehouse_id: string;
  to_sub_warehouse_id?: string;
  items: TransferItem[];
  status: string;
  created_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  from_sub_warehouse?: SubWarehouse;
  to_sub_warehouse?: SubWarehouse;
}

export default function InventoryTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [subWarehouses, setSubWarehouses] = useState<SubWarehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [fromSubWarehouseId, setFromSubWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [toSubWarehouseId, setToSubWarehouseId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  useEffect(() => {
    fetchWarehouses();
    fetchSubWarehouses();
    fetchProducts();
    fetchTransfers();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name_ar');

      if (error) throw error;
      setWarehouses((data || []) as Warehouse[]);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('فشل في تحميل المخازن');
    }
  };

  const fetchSubWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_warehouses')
        .select('*')
        .order('name_ar');

      if (error) throw error;
      setSubWarehouses((data || []) as SubWarehouse[]);
    } catch (error) {
      console.error('Error fetching sub-warehouses:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name_ar')
        .limit(100);

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select('*, from_warehouse:warehouses(*), to_warehouse:warehouses(*), from_sub_warehouse:sub_warehouses(*), to_sub_warehouse:sub_warehouses(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers((data || []) as Transfer[]);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('فشل في تحميل التحويلات');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || !transferQuantity) {
      toast.error('يرجى اختيار الصنف وتحديد الكمية');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingItem = transferItems.find(item => item.product_id === selectedProductId);
    if (existingItem) {
      toast.error('الصنف موجود بالفعل في قائمة التحويل');
      return;
    }

    setTransferItems([
      ...transferItems,
      {
        product_id: selectedProductId,
        product_name: product.name_ar || product.name,
        quantity: Number(transferQuantity),
        unit: product.unit
      }
    ]);

    setSelectedProductId('');
    setTransferQuantity('');
  };

  const handleRemoveItem = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.product_id !== productId));
  };

  const handleSaveTransfer = async () => {
    if (!fromWarehouseId || !toWarehouseId || transferItems.length === 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (fromWarehouseId === toWarehouseId && fromSubWarehouseId === toSubWarehouseId) {
      toast.error('لا يمكن التحويل إلى نفس المخزن');
      return;
    }

    try {
      // Create transfer record
      const { data: transferData, error: transferError } = await supabase
        .from('inventory_transfers')
        .insert({
          from_warehouse_id: fromWarehouseId,
          from_sub_warehouse_id: fromSubWarehouseId || null,
          to_warehouse_id: toWarehouseId,
          to_sub_warehouse_id: toSubWarehouseId || null,
          items: transferItems,
          status: 'COMPLETED'
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create inventory movements for each item
      for (const item of transferItems) {
        // TRANSFER_OUT movement
        await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          warehouse_id: fromWarehouseId,
          sub_warehouse_id: fromSubWarehouseId || null,
          movement_type: 'TRANSFER_OUT',
          quantity: item.quantity,
          reference_type: 'TRANSFER',
          reference_id: transferData.id,
          created_at: new Date().toISOString()
        });

        // TRANSFER_IN movement
        await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          warehouse_id: toWarehouseId,
          sub_warehouse_id: toSubWarehouseId || null,
          movement_type: 'TRANSFER_IN',
          quantity: item.quantity,
          reference_type: 'TRANSFER',
          reference_id: transferData.id,
          created_at: new Date().toISOString()
        });
      }

      toast.success('تم إضافة التحويل بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchTransfers();
    } catch (error) {
      console.error('Error saving transfer:', error);
      toast.error('فشل في إضافة التحويل');
    }
  };

  const resetForm = () => {
    setFromWarehouseId('');
    setFromSubWarehouseId('');
    setToWarehouseId('');
    setToSubWarehouseId('');
    setSelectedProductId('');
    setTransferQuantity('');
    setTransferItems([]);
  };

  const filteredFromSubWarehouses = subWarehouses.filter(sw => sw.main_warehouse_id === fromWarehouseId);
  const filteredToSubWarehouses = subWarehouses.filter(sw => sw.main_warehouse_id === toWarehouseId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">تحويلات المخزون</h1>
                <p className="text-sm text-muted-foreground">إدارة تحويلات المخزون بين المخازن والمخازن الفرعية</p>
              </div>
            </motion.div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  تحويل جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>تحويل مخزون جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* From Warehouse */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <Package className="w-4 h-4" /> من
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">المخزن *</Label>
                        <Select
                          value={fromWarehouseId}
                          onValueChange={(value) => {
                            setFromWarehouseId(value);
                            setFromSubWarehouseId('');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المخزن" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name_ar} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">المخزن الفرعي</Label>
                        <Select
                          value={fromSubWarehouseId}
                          onValueChange={setFromSubWarehouseId}
                          disabled={!fromWarehouseId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المخزن الفرعي" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredFromSubWarehouses.map((subWarehouse) => (
                              <SelectItem key={subWarehouse.id} value={subWarehouse.id}>
                                {subWarehouse.name_ar} ({subWarehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* To Warehouse */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <Building2 className="w-4 h-4" /> إلى
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">المخزن *</Label>
                        <Select
                          value={toWarehouseId}
                          onValueChange={(value) => {
                            setToWarehouseId(value);
                            setToSubWarehouseId('');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المخزن" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name_ar} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">المخزن الفرعي</Label>
                        <Select
                          value={toSubWarehouseId}
                          onValueChange={setToSubWarehouseId}
                          disabled={!toWarehouseId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المخزن الفرعي" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredToSubWarehouses.map((subWarehouse) => (
                              <SelectItem key={subWarehouse.id} value={subWarehouse.id}>
                                {subWarehouse.name_ar} ({subWarehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <Package className="w-4 h-4" /> الأصناف
                    </h4>
                    <div className="flex gap-2">
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="اختر الصنف" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name_ar || product.name} ({product.barcode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="الكمية"
                        value={transferQuantity}
                        onChange={(e) => setTransferQuantity(e.target.value)}
                        className="w-32"
                      />
                      <Button type="button" onClick={handleAddItem} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {transferItems.length > 0 && (
                      <div className="space-y-2">
                        {transferItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                            <div>
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button onClick={handleSaveTransfer} disabled={transferItems.length === 0}>
                      <Save className="h-4 w-4 ml-2" />
                      حفظ التحويل
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {transfers.length === 0 ? (
            <Alert>
              <ArrowRightLeft className="h-4 w-4" />
              <AlertDescription>
                لا توجد تحويلات حالياً. قم بإضافة تحويل جديد للبدء.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>سجل التحويلات</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>الأصناف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {transfer.from_warehouse?.name_ar}
                            </div>
                            {transfer.from_sub_warehouse && (
                              <div className="text-xs text-muted-foreground">
                                {transfer.from_sub_warehouse.name_ar}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {transfer.to_warehouse?.name_ar}
                            </div>
                            {transfer.to_sub_warehouse && (
                              <div className="text-xs text-muted-foreground">
                                {transfer.to_sub_warehouse.name_ar}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {transfer.items?.map((item: TransferItem, index: number) => (
                              <div key={index} className="text-sm">
                                {item.product_name}: {item.quantity} {item.unit}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transfer.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {transfer.status === 'COMPLETED' ? 'مكتمل' : transfer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(transfer.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
