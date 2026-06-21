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
import { Plus, Trash2, Building2, Package, Factory, Wrench, FolderTree, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type WarehouseType = 'main' | 'sub';
type AccountingStandard = 'EAS' | 'IFRS' | 'US_GAAP';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  type: string;
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
  created_at: string;
  updated_at: string;
}

const warehouseTypeLabels: Record<WarehouseType, string> = {
  main: 'رئيسي',
  sub: 'فرعي'
};

const accountingStandardLabels: Record<AccountingStandard, string> = {
  IFRS: 'IFRS',
  EAS: 'EAS',
  US_GAAP: 'US GAAP'
};

export function WarehouseManager() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    type: 'main' as WarehouseType,
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
    notes: ''
  });
  const [mainWarehouses, setMainWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const warehousesWithParents = await Promise.all(
        (data || []).map(async (warehouse: Warehouse) => {
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

      setWarehouses(warehousesWithParents);
      setMainWarehouses((data || []).filter((w: Warehouse) => w.type === 'main'));
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('فشل في تحميل بيانات المخازن');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.name_ar) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouses')
        .insert({
          code: formData.code,
          name: formData.name,
          name_ar: formData.name_ar,
          type: formData.type,
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
      setDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        name_ar: '',
        type: 'main',
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
        notes: ''
      });
      fetchWarehouses();
    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast.error('فشل في إضافة المخزن');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;

    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف المخزن بنجاح');
      fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('فشل في حذف المخزن');
    }
  };

  const getWarehousesByType = (types: string[]) => {
    return warehouses.filter(w => types.includes(w.type));
  };

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
          <DialogContent className="sm:max-w-[500px]">
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
                  onValueChange={(value: string) => setFormData({ ...formData, type: value })}
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
                  onValueChange={(value: string) => setFormData({ ...formData, accounting_standard: value })}
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
              {formData.type === 'sub' && (
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
              <DialogFooter>
                <Button type="submit">حفظ</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {warehouses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لا توجد مخازن حالياً. قم بإضافة مخزن جديد للبدء.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {(['main', 'sub'] as WarehouseType[]).map((type) => {
            const typeWarehouses = warehouses.filter(w => w.type === type);
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(warehouse.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}
