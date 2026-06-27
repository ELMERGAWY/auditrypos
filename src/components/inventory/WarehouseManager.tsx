import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Building2, Package, Factory, Wrench, FolderTree, AlertCircle, MapPin, Edit } from 'lucide-react';
import { toast } from 'sonner';

type WarehouseType = 'MAIN' | 'SUB';
type AccountingStandard = 'EAS' | 'IFRS' | 'US_GAAP';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  type: string;
  warehouse_category?: string;
  parent_warehouse_id: string | null;
  parent?: Warehouse;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
  is_default: boolean;
  currency: string;
  accounting_standard: string;
  accounting_account_code?: string;
  inventory_account_code?: string;
  cogs_account_code?: string;
  notes?: string;
  // Advanced location fields
  location_zone?: string;
  aisle?: string;
  bin?: string;
  floor?: string;
  building?: string;
  // Capacity and control fields
  capacity_quantity?: number;
  capacity_volume?: number;
  temperature_control?: boolean;
  humidity_control?: boolean;
  security_level?: string;
  created_at: string;
  updated_at: string;
}

const warehouseTypeLabels: Record<WarehouseType, string> = {
  MAIN: 'رئيسي',
  SUB: 'فرعي'
};

const accountingStandardLabels: Record<AccountingStandard, string> = {
  IFRS: 'IFRS',
  EAS: 'EAS',
  US_GAAP: 'US GAAP'
};

interface WarehouseManagerProps {
  restaurantId: string;
  warehouses: Warehouse[];
  onRefresh: () => void;
}

export function WarehouseManager({ restaurantId, warehouses: propsWarehouses, onRefresh }: WarehouseManagerProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [warehouseProducts, setWarehouseProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    type: 'MAIN' as WarehouseType,
    warehouse_category: 'STANDARD' as 'STANDARD' | 'MANUFACTURING' | 'SERVICE' | 'PROJECT',
    accounting_standard: 'IFRS' as AccountingStandard,
    parent_warehouse_id: '' as string,
    address: '',
    city: '',
    country: 'Egypt',
    phone: '',
    email: '',
    manager_name: '',
    currency: 'EGP',
    accounting_account_code: '',
    inventory_account_code: '',
    cogs_account_code: '',
    notes: '',
    // Advanced location fields
    location_zone: '',
    aisle: '',
    bin: '',
    floor: '',
    building: '',
    // Capacity and control fields
    capacity_quantity: '',
    capacity_volume: '',
    temperature_control: false,
    humidity_control: false,
    security_level: 'normal'
  });
  const [mainWarehouses, setMainWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    setMainWarehouses((propsWarehouses || []).filter((w: Warehouse) => w.type === 'MAIN'));
  }, [propsWarehouses]);

  const handleEdit = (warehouse: Warehouse) => {
    setIsEditing(true);
    setEditingWarehouseId(warehouse.id);
    setFormData({
      code: warehouse.code || '',
      name: warehouse.name || '',
      name_ar: warehouse.name_ar || '',
      type: (warehouse.type as WarehouseType) || 'MAIN',
      warehouse_category: (warehouse.warehouse_category as 'STANDARD' | 'MANUFACTURING' | 'SERVICE' | 'PROJECT') || 'STANDARD',
      accounting_standard: (warehouse.accounting_standard as AccountingStandard) || 'IFRS',
      parent_warehouse_id: warehouse.parent_warehouse_id || '',
      address: warehouse.address || '',
      city: warehouse.city || '',
      country: warehouse.country || 'Egypt',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      manager_name: warehouse.manager_name || '',
      currency: warehouse.currency || 'EGP',
      accounting_account_code: warehouse.accounting_account_code || '',
      inventory_account_code: warehouse.inventory_account_code || '',
      cogs_account_code: warehouse.cogs_account_code || '',
      notes: warehouse.notes || '',
      // Advanced location fields
      location_zone: '',
      aisle: '',
      bin: '',
      floor: '',
      building: '',
      // Capacity and control fields
      capacity_quantity: '',
      capacity_volume: '',
      temperature_control: false,
      humidity_control: false,
      security_level: 'normal'
    });
    setDialogOpen(true);
  };

  const handleViewWarehouseDetails = async (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setLoadingProducts(true);
    setDetailsDialogOpen(true);

    try {
      // Get products directly assigned to this warehouse
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('warehouse_id', warehouse.id);

      setWarehouseProducts(products || []);
    } catch (error) {
      console.error('Error fetching warehouse products:', error);
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.name_ar) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      
      if (isEditing && editingWarehouseId) {
        // Update existing warehouse
        const { error } = await supabase
          .from('warehouses')
          .update({
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar,
            type: formData.type,
            warehouse_category: formData.warehouse_category,
            accounting_standard: formData.accounting_standard,
            parent_warehouse_id: formData.parent_warehouse_id || null,
            address: formData.address || null,
            city: formData.city || null,
            country: formData.country || 'Egypt',
            phone: formData.phone || null,
            email: formData.email || null,
            manager_name: formData.manager_name || null,
            currency: formData.currency || 'EGP',
            accounting_account_code: formData.accounting_account_code || null,
            inventory_account_code: formData.inventory_account_code || null,
            cogs_account_code: formData.cogs_account_code || null,
            notes: formData.notes || null
          })
          .eq('id', editingWarehouseId);

        if (error) throw error;
        toast.success('تم تحديث المخزن بنجاح');
      } else {
        // Create new warehouse
        const { error } = await supabase
          .from('warehouses')
          .insert({
            restaurant_id: restaurantId,
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar,
            type: formData.type,
            warehouse_category: formData.warehouse_category,
            accounting_standard: formData.accounting_standard,
            parent_warehouse_id: formData.parent_warehouse_id || null,
            address: formData.address || null,
            city: formData.city || null,
            country: formData.country || 'Egypt',
            phone: formData.phone || null,
            email: formData.email || null,
            manager_name: formData.manager_name || null,
            currency: formData.currency || 'EGP',
            accounting_account_code: formData.accounting_account_code || null,
            inventory_account_code: formData.inventory_account_code || null,
            cogs_account_code: formData.cogs_account_code || null,
            notes: formData.notes || null
          });

        if (error) throw error;
        toast.success('تم إضافة المخزن بنجاح');
      }

      setDialogOpen(false);
      setIsEditing(false);
      setEditingWarehouseId(null);
      setFormData({
        code: '',
        name: '',
        name_ar: '',
        type: 'MAIN',
        warehouse_category: 'STANDARD',
        accounting_standard: 'IFRS',
        parent_warehouse_id: '',
        address: '',
        city: '',
        country: 'Egypt',
        phone: '',
        email: '',
        manager_name: '',
        currency: 'EGP',
        accounting_account_code: '',
        inventory_account_code: '',
        cogs_account_code: '',
        notes: '',
        // Advanced location fields
        location_zone: '',
        aisle: '',
        bin: '',
        floor: '',
        building: '',
        // Capacity and control fields
        capacity_quantity: '',
        capacity_volume: '',
        temperature_control: false,
        humidity_control: false,
        security_level: 'normal'
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      toast.error(`فشل في إضافة المخزن: ${error?.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف المخزن بنجاح');
      onRefresh();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('فشل في حذف المخزن');
    } finally {
      setLoading(false);
    }
  };

  const getWarehousesByType = (types: string[]) => {
    return propsWarehouses.filter(w => types.includes(w.type));
  };

  // Fetch parent warehouses for display
  const [warehousesWithParents, setWarehousesWithParents] = useState<Warehouse[]>([]);
  useEffect(() => {
    const fetchParents = async () => {
      const withParents = await Promise.all(
        propsWarehouses.map(async (warehouse) => {
          if (warehouse.parent_warehouse_id) {
            const { data: parent } = await supabase
              .from('warehouses')
              .select('*')
              .eq('id', warehouse.parent_warehouse_id)
              .single();
            return { ...warehouse, parent };
          }
          return warehouse;
        })
      );
      setWarehousesWithParents(withParents);
    };
    fetchParents();
  }, [propsWarehouses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة المخازن</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مخزن جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مخزن جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الرمز *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="مثال: WH-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الاسم *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Warehouse Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الاسم بالعربية *</label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="اسم المخزن"
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">النوع *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: WarehouseType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(warehouseTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المعيار المحاسبي *</label>
                <Select
                  value={formData.accounting_standard}
                  onValueChange={(value: AccountingStandard) => setFormData({ ...formData, accounting_standard: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(accountingStandardLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'SUB' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">المخزن الرئيسي</label>
                  <Select
                    value={formData.parent_warehouse_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_warehouse_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المخزن الرئيسي" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name_ar} ({warehouse.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Advanced Location Fields */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                  <MapPin className="w-4 h-4" /> تفاصيل الموقع
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">المنطقة</label>
                    <Input
                      value={formData.location_zone}
                      onChange={(e) => setFormData({ ...formData, location_zone: e.target.value })}
                      placeholder="مثال: المنطقة A"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الممر</label>
                    <Input
                      value={formData.aisle}
                      onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                      placeholder="مثال: A1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الخزانة</label>
                    <Input
                      value={formData.bin}
                      onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                      placeholder="مثال: BIN-01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الطابق</label>
                    <Input
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="مثال: الطابق الأول"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">المبنى</label>
                    <Input
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      placeholder="مثال: المبنى الرئيسي"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity and Control Fields */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                  <Package className="w-4 h-4" /> السعة والتحكم
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">السعة (الكمية)</label>
                    <Input
                      type="number"
                      value={formData.capacity_quantity}
                      onChange={(e) => setFormData({ ...formData, capacity_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">السعة (الحجم م³)</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.capacity_volume}
                      onChange={(e) => setFormData({ ...formData, capacity_volume: e.target.value })}
                      placeholder="0.000"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="temp-control"
                      checked={formData.temperature_control}
                      onChange={(e) => setFormData({ ...formData, temperature_control: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="temp-control" className="text-sm">تحكم في درجة الحرارة</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="humidity-control"
                      checked={formData.humidity_control}
                      onChange={(e) => setFormData({ ...formData, humidity_control: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="humidity-control" className="text-sm">تحكم في الرطوبة</label>
                  </div>
                  <div>
                    <label className="text-sm font-medium">مستوى الأمان</label>
                    <Select
                      value={formData.security_level}
                      onValueChange={(value) => setFormData({ ...formData, security_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">عادي</SelectItem>
                        <SelectItem value="high">عالي</SelectItem>
                        <SelectItem value="restricted">مقيد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">حفظ</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {warehousesWithParents.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لا توجد مخازن حالياً. قم بإضافة مخزن جديد للبدء.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {(['MAIN', 'SUB'] as WarehouseType[]).map((type) => {
            const typeWarehouses = warehousesWithParents.filter(w => w.type === type);
            if (typeWarehouses.length === 0) return null;

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {warehouseTypeLabels[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرمز</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الاسم بالعربية</TableHead>
                        <TableHead>المعيار المحاسبي</TableHead>
                        <TableHead>العملة</TableHead>
                        <TableHead>المخزن الرئيسي</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeWarehouses.map((warehouse) => (
                        <TableRow key={warehouse.id}>
                          <TableCell className="font-medium">{warehouse.code}</TableCell>
                          <TableCell>{warehouse.name}</TableCell>
                          <TableCell dir="rtl">{warehouse.name_ar}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {accountingStandardLabels[warehouse.accounting_standard as AccountingStandard]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{warehouse.currency}</span>
                          </TableCell>
                          <TableCell>
                            {warehouse.parent ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <FolderTree className="h-3 w-3" />
                                {warehouse.parent.name_ar}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewWarehouseDetails(warehouse)}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(warehouse)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(warehouse.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Warehouse Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              المنتجات في المخزن: {selectedWarehouse?.name_ar}
            </DialogTitle>
          </DialogHeader>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">جاري التحميل...</div>
            </div>
          ) : warehouseProducts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لا توجد منتجات مرتبطة بهذا المخزن
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الباركود</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>سعر التكلفة</TableHead>
                  <TableHead>سعر البيع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.barcode}</TableCell>
                    <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                    <TableCell>{product.quantity?.toLocaleString('ar-EG') || 0}</TableCell>
                    <TableCell>{Number(product.cost_price).toLocaleString('ar-EG')} ج.م</TableCell>
                    <TableCell>{Number(product.price).toLocaleString('ar-EG')} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
