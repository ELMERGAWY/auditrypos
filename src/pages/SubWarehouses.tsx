import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Trash2, Edit2, MapPin, Package, X } from 'lucide-react';
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

interface MainWarehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
}

interface SubWarehouse {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  name_ar: string;
  location_zone?: string;
  aisle?: string;
  bin?: string;
  floor?: string;
  building?: string;
  capacity_quantity?: number;
  capacity_volume?: number;
  is_active: boolean;
  is_default: boolean;
  temperature_control?: boolean;
  humidity_control?: boolean;
  security_level?: string;
  accounting_account_code?: string;
  notes?: string;
  warehouse?: MainWarehouse;
  created_at: string;
}

export default function SubWarehouses() {
  const [subWarehouses, setSubWarehouses] = useState<SubWarehouse[]>([]);
  const [mainWarehouses, setMainWarehouses] = useState<MainWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubWarehouse, setEditingSubWarehouse] = useState<SubWarehouse | null>(null);
  const [formData, setFormData] = useState({
    warehouse_id: '',
    code: '',
    name: '',
    name_ar: '',
    location_zone: '',
    aisle: '',
    bin: '',
    floor: '',
    building: '',
    capacity_quantity: '',
    capacity_volume: '',
    temperature_control: false,
    humidity_control: false,
    security_level: 'normal',
    accounting_account_code: '',
    notes: ''
  });

  useEffect(() => {
    fetchMainWarehouses();
    fetchSubWarehouses();
  }, []);

  const fetchMainWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('type', 'main')
        .order('name_ar');

      if (error) throw error;
      setMainWarehouses((data || []) as MainWarehouse[]);
    } catch (error) {
      console.error('Error fetching main warehouses:', error);
      toast.error('فشل في تحميل المخازن الرئيسية');
    }
  };

  const fetchSubWarehouses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sub_warehouses')
        .select('*, warehouse:warehouses(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubWarehouses((data || []) as SubWarehouse[]);
    } catch (error) {
      console.error('Error fetching sub-warehouses:', error);
      toast.error('فشل في تحميل المخازن الفرعية');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.warehouse_id || !formData.code || !formData.name || !formData.name_ar) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const data: any = {
        warehouse_id: formData.warehouse_id,
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        location_zone: formData.location_zone || null,
        aisle: formData.aisle || null,
        bin: formData.bin || null,
        floor: formData.floor || null,
        building: formData.building || null,
        capacity_quantity: formData.capacity_quantity ? parseFloat(formData.capacity_quantity) : null,
        capacity_volume: formData.capacity_volume ? parseFloat(formData.capacity_volume) : null,
        temperature_control: formData.temperature_control,
        humidity_control: formData.humidity_control,
        security_level: formData.security_level,
        accounting_account_code: formData.accounting_account_code || null,
        notes: formData.notes || null,
      };

      if (editingSubWarehouse) {
        const { error } = await supabase
          .from('sub_warehouses')
          .update(data)
          .eq('id', editingSubWarehouse.id);

        if (error) throw error;
        toast.success('تم تحديث المخزن الفرعي بنجاح');
      } else {
        const { error } = await supabase
          .from('sub_warehouses')
          .insert(data);

        if (error) throw error;
        toast.success('تم إضافة المخزن الفرعي بنجاح');
      }

      setDialogOpen(false);
      resetForm();
      fetchSubWarehouses();
    } catch (error) {
      console.error('Error saving sub-warehouse:', error);
      toast.error('فشل في حفظ المخزن الفرعي');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المخزن الفرعي؟')) return;

    try {
      const { error } = await supabase
        .from('sub_warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف المخزن الفرعي بنجاح');
      fetchSubWarehouses();
    } catch (error) {
      console.error('Error deleting sub-warehouse:', error);
      toast.error('فشل في حذف المخزن الفرعي');
    }
  };

  const handleEdit = (subWarehouse: SubWarehouse) => {
    setEditingSubWarehouse(subWarehouse);
    setFormData({
      warehouse_id: subWarehouse.warehouse_id,
      code: subWarehouse.code,
      name: subWarehouse.name,
      name_ar: subWarehouse.name_ar,
      location_zone: subWarehouse.location_zone || '',
      aisle: subWarehouse.aisle || '',
      bin: subWarehouse.bin || '',
      floor: subWarehouse.floor || '',
      building: subWarehouse.building || '',
      capacity_quantity: subWarehouse.capacity_quantity?.toString() || '',
      capacity_volume: subWarehouse.capacity_volume?.toString() || '',
      temperature_control: subWarehouse.temperature_control || false,
      humidity_control: subWarehouse.humidity_control || false,
      security_level: subWarehouse.security_level || 'normal',
      accounting_account_code: subWarehouse.accounting_account_code || '',
      notes: subWarehouse.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSubWarehouse(null);
    setFormData({
      warehouse_id: '',
      code: '',
      name: '',
      name_ar: '',
      location_zone: '',
      aisle: '',
      bin: '',
      floor: '',
      building: '',
      capacity_quantity: '',
      capacity_volume: '',
      temperature_control: false,
      humidity_control: false,
      security_level: 'normal',
      accounting_account_code: '',
      notes: ''
    });
  };

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
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">المخازن الفرعية</h1>
                <p className="text-sm text-muted-foreground">إدارة وتنظيم المخازن الفرعية</p>
              </div>
            </motion.div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة مخزن فرعي
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSubWarehouse ? 'تعديل مخزن فرعي' : 'إضافة مخزن فرعي جديد'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label className="text-sm mb-1 block">المخزن الرئيسي *</Label>
                      <Select
                        value={formData.warehouse_id}
                        onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
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
                    <div>
                      <Label className="text-sm mb-1 block">الرمز *</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="مثال: SW-001"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">الاسم *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Sub Warehouse Name"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm mb-1 block">الاسم بالعربية *</Label>
                      <Input
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        placeholder="اسم المخزن الفرعي"
                        required
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <MapPin className="w-4 h-4" /> تفاصيل الموقع
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">المنطقة</Label>
                        <Input
                          value={formData.location_zone}
                          onChange={(e) => setFormData({ ...formData, location_zone: e.target.value })}
                          placeholder="مثال: المنطقة A"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">الممر</Label>
                        <Input
                          value={formData.aisle}
                          onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                          placeholder="مثال: A1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">الخزانة</Label>
                        <Input
                          value={formData.bin}
                          onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                          placeholder="مثال: BIN-01"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">الطابق</Label>
                        <Input
                          value={formData.floor}
                          onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                          placeholder="مثال: الطابق الأول"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm mb-1 block">المبنى</Label>
                        <Input
                          value={formData.building}
                          onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                          placeholder="مثال: المبنى الرئيسي"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                      <Package className="w-4 h-4" /> السعة والتحكم
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block">السعة (الكمية)</Label>
                        <Input
                          type="number"
                          value={formData.capacity_quantity}
                          onChange={(e) => setFormData({ ...formData, capacity_quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">السعة (الحجم م³)</Label>
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
                        <Label htmlFor="temp-control" className="text-sm">تحكم في درجة الحرارة</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="humidity-control"
                          checked={formData.humidity_control}
                          onChange={(e) => setFormData({ ...formData, humidity_control: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="humidity-control" className="text-sm">تحكم في الرطوبة</Label>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">مستوى الأمان</Label>
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
                      <div>
                        <Label className="text-sm mb-1 block">كود الحساب المحاسبي</Label>
                        <Input
                          value={formData.accounting_account_code}
                          onChange={(e) => setFormData({ ...formData, accounting_account_code: e.target.value })}
                          placeholder="مثال: 1200"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm mb-1 block">ملاحظات</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="ملاحظات إضافية..."
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingSubWarehouse ? 'حفظ التعديلات' : 'إضافة المخزن الفرعي'}
                    </Button>
                  </DialogFooter>
                </form>
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
          {subWarehouses.length === 0 ? (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                لا توجد مخازن فرعية حالياً. قم بإضافة مخزن فرعي جديد للبدء.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>قائمة المخازن الفرعية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرمز</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الاسم بالعربية</TableHead>
                      <TableHead>المخزن الرئيسي</TableHead>
                      <TableHead>الموقع</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subWarehouses.map((subWarehouse) => (
                      <TableRow key={subWarehouse.id}>
                        <TableCell className="font-medium">{subWarehouse.code}</TableCell>
                        <TableCell>{subWarehouse.name}</TableCell>
                        <TableCell dir="rtl">{subWarehouse.name_ar}</TableCell>
                        <TableCell>
                          {subWarehouse.warehouse ? (
                            <Badge variant="outline">
                              {subWarehouse.warehouse.name_ar}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {subWarehouse.location_zone && <div>المنطقة: {subWarehouse.location_zone}</div>}
                            {subWarehouse.aisle && <div>الممر: {subWarehouse.aisle}</div>}
                            {subWarehouse.bin && <div>الخزانة: {subWarehouse.bin}</div>}
                            {subWarehouse.floor && <div>الطابق: {subWarehouse.floor}</div>}
                            {subWarehouse.building && <div>المبنى: {subWarehouse.building}</div>}
                            {!subWarehouse.location_zone && !subWarehouse.aisle && !subWarehouse.bin && !subWarehouse.floor && !subWarehouse.building && (
                              <span>-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(subWarehouse)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(subWarehouse.id)}
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
          )}
        </motion.div>
      </div>
    </div>
  );
}
