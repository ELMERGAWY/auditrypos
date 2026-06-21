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
import { Plus, Trash2, Link2, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

type CostPolicy = 'FIFO' | 'AVERAGE' | 'SPECIFIC';
type AccountingStandard = 'IFRS' | 'EAS' | 'US_GAAP';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
}

interface ItemWarehouseAssignment {
  id: string;
  item_id: string;
  warehouse_id: string;
  cost_policy: CostPolicy;
  accounting_standard: AccountingStandard;
  minimum_stock: number;
  warehouse?: Warehouse;
  created_at: string;
}

interface ItemWarehouseAssignmentsProps {
  itemId: string;
  itemName?: string;
}

const costPolicyLabels: Record<CostPolicy, string> = {
  FIFO: 'FIFO',
  AVERAGE: 'متوسط',
  SPECIFIC: 'محدد'
};

const accountingStandardLabels: Record<AccountingStandard, string> = {
  IFRS: 'IFRS',
  EAS: 'EAS',
  US_GAAP: 'US GAAP'
};

export function ItemWarehouseAssignments({ itemId, itemName }: ItemWarehouseAssignmentsProps) {
  const [assignments, setAssignments] = useState<ItemWarehouseAssignment[]>([]);
  const [subWarehouses, setSubWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    warehouse_id: '',
    cost_policy: 'FIFO' as CostPolicy,
    accounting_standard: 'IFRS' as AccountingStandard,
    minimum_stock: 0
  });

  useEffect(() => {
    if (itemId) {
      fetchAssignments();
      fetchSubWarehouses();
    }
  }, [itemId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('item_warehouse_assignments')
        .select('*, warehouse:warehouses(*)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('فشل في تحميل بيانات ارتباطات الصنف');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('type', 'SUB')
        .order('name_ar', { ascending: true });

      if (error) throw error;
      setSubWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching sub-warehouses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.warehouse_id) {
      toast.error('يرجى اختيار مخزن فرعي');
      return;
    }

    try {
      const { error } = await supabase
        .from('item_warehouse_assignments')
        .insert({
          item_id: itemId,
          warehouse_id: formData.warehouse_id,
          cost_policy: formData.cost_policy,
          accounting_standard: formData.accounting_standard,
          minimum_stock: formData.minimum_stock
        });

      if (error) throw error;

      toast.success('تم إضافة الارتباط بنجاح');
      setDialogOpen(false);
      setFormData({
        warehouse_id: '',
        cost_policy: 'FIFO',
        accounting_standard: 'IFRS',
        minimum_stock: 0
      });
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('فشل في إضافة الارتباط');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الارتباط؟')) return;

    try {
      const { error } = await supabase
        .from('item_warehouse_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الارتباط بنجاح');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('فشل في حذف الارتباط');
    }
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
        <div>
          <h2 className="text-2xl font-bold">ارتباطات الصنف بالمخازن</h2>
          {itemName && (
            <p className="text-muted-foreground mt-1">الصنف: {itemName}</p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مخزن فرعي
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة ارتباط بمخزن فرعي</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المخزن الفرعي *</label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المخزن الفرعي" />
                  </SelectTrigger>
                  <SelectContent>
                    {subWarehouses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        لا توجد مخازن فرعية متاحة
                      </div>
                    ) : (
                      subWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name_ar} ({warehouse.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">سياسة التكلفة *</label>
                <Select
                  value={formData.cost_policy}
                  onValueChange={(value: CostPolicy) => setFormData({ ...formData, cost_policy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(costPolicyLabels).map(([key, label]) => (
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
              <div className="space-y-2">
                <label className="text-sm font-medium">الحد الأدنى للمخزون</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <DialogFooter>
                <Button type="submit">حفظ</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لا توجد ارتباطات حالياً. قم بإضافة مخزن فرعي للصنف.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              المخازن الفرعية المرتبطة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المخزن</TableHead>
                  <TableHead>الرمز</TableHead>
                  <TableHead>سياسة التكلفة</TableHead>
                  <TableHead>المعيار المحاسبي</TableHead>
                  <TableHead>الحد الأدنى للمخزون</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.warehouse ? (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span dir="rtl">{assignment.warehouse.name_ar}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.warehouse?.code || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {costPolicyLabels[assignment.cost_policy]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {accountingStandardLabels[assignment.accounting_standard]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.minimum_stock.toLocaleString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(assignment.id)}
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
      )}
    </div>
  );
}
