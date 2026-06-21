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

type WarehouseType = 'MAIN' | 'SUB' | 'RAW_MATERIALS' | 'WORK_IN_PROGRESS' | 'FINISHED_GOODS' | 'SERVICE' | 'PROJECT';
type AccountingStandard = 'IFRS' | 'EAS' | 'US_GAAP';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: WarehouseType;
  accounting_standard: AccountingStandard;
  parent_id: string | null;
  parent?: Warehouse;
  created_at: string;
}

interface CategoryGroup {
  title: string;
  icon: React.ReactNode;
  types: WarehouseType[];
}

const categoryGroups: CategoryGroup[] = [
  {
    title: 'تقليدي',
    icon: <Building2 className="h-5 w-5" />,
    types: ['MAIN', 'SUB']
  },
  {
    title: 'تصنيعي',
    icon: <Factory className="h-5 w-5" />,
    types: ['RAW_MATERIALS', 'WORK_IN_PROGRESS', 'FINISHED_GOODS']
  },
  {
    title: 'خدمي',
    icon: <Wrench className="h-5 w-5" />,
    types: ['SERVICE']
  },
  {
    title: 'مشاريع',
    icon: <Package className="h-5 w-5" />,
    types: ['PROJECT']
  }
];

const warehouseTypeLabels: Record<WarehouseType, string> = {
  MAIN: 'رئيسي',
  SUB: 'فرعي',
  RAW_MATERIALS: 'مواد خام',
  WORK_IN_PROGRESS: 'تحت التصنيع',
  FINISHED_GOODS: 'منتج تام',
  SERVICE: 'خدمي',
  PROJECT: 'مشروع'
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
    type: 'MAIN' as WarehouseType,
    accounting_standard: 'IFRS' as AccountingStandard,
    parent_id: '' as string
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
          if (warehouse.parent_id) {
            const { data: parent } = await supabase
              .from('warehouses')
              .select('*')
              .eq('id', warehouse.parent_id)
              .single();
            return { ...warehouse, parent };
          }
          return warehouse;
        })
      );

      setWarehouses(warehousesWithParents);
      setMainWarehouses((data || []).filter((w: Warehouse) => w.type === 'MAIN'));
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
          parent_id: formData.parent_id || null
        });

      if (error) throw error;

      toast.success('تم إضافة المخزن بنجاح');
      setDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        name_ar: '',
        type: 'MAIN',
        accounting_standard: 'IFRS',
        parent_id: ''
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

  const getWarehousesByType = (types: WarehouseType[]) => {
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
                    value={formData.parent_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
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
          {categoryGroups.map((group) => {
            const groupWarehouses = getWarehousesByType(group.types);
            if (groupWarehouses.length === 0) return null;

            return (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {group.icon}
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الرمز</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الاسم بالعربية</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المعيار المحاسبي</TableHead>
                        <TableHead>المخزن الرئيسي</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupWarehouses.map((warehouse) => (
                        <TableRow key={warehouse.id}>
                          <TableCell className="font-medium">{warehouse.code}</TableCell>
                          <TableCell>{warehouse.name}</TableCell>
                          <TableCell dir="rtl">{warehouse.name_ar}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {warehouseTypeLabels[warehouse.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {accountingStandardLabels[warehouse.accounting_standard]}
                            </Badge>
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
