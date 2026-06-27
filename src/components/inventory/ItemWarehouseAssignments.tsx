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
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Link2, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

type CostingMethod = 'FIFO' | 'AVERAGE' | 'SPECIFIC' | 'LIFO';
type AccountingStandard = 'EAS' | 'IFRS' | 'US_GAAP';
type InventoryValuationRule = 'IAS2_FIFO' | 'IAS2_AVERAGE' | 'IAS2_SPECIFIC' | 'GAAP_FIFO' | 'GAAP_AVERAGE' | 'GAAP_LIFO';

interface SubWarehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  warehouse_id: string;
}

interface ItemWarehouseAssignment {
  id: string;
  item_id: string;
  sub_warehouse_id: string;
  costing_method: CostingMethod;
  accounting_standard: AccountingStandard;
  inventory_valuation_rule: InventoryValuationRule;
  is_primary: boolean;
  min_stock_level: number;
  max_stock_level: number | null;
  reorder_point: number | null;
  reorder_quantity: number | null;
  stock_unit: string | null;
  sales_unit: string | null;
  purchase_unit: string | null;
  lead_time_days: number;
  low_stock_alert: boolean;
  overstock_alert: boolean;
  sub_warehouse?: SubWarehouse;
  created_at: string;
}

interface ItemWarehouseAssignmentsProps {
  itemId: string;
  itemName?: string;
}

const costingMethodLabels: Record<CostingMethod, string> = {
  FIFO: 'FIFO',
  AVERAGE: 'متوسط',
  SPECIFIC: 'محدد',
  LIFO: 'LIFO'
};

const accountingStandardLabels: Record<AccountingStandard, string> = {
  IFRS: 'IFRS',
  EAS: 'EAS',
  US_GAAP: 'US GAAP'
};

const inventoryValuationRuleLabels: Record<InventoryValuationRule, string> = {
  IAS2_FIFO: 'IAS2 FIFO',
  IAS2_AVERAGE: 'IAS2 متوسط',
  IAS2_SPECIFIC: 'IAS2 محدد',
  GAAP_FIFO: 'GAAP FIFO',
  GAAP_AVERAGE: 'GAAP متوسط',
  GAAP_LIFO: 'GAAP LIFO'
};

export function ItemWarehouseAssignments({ itemId, itemName }: ItemWarehouseAssignmentsProps) {
  const [assignments, setAssignments] = useState<ItemWarehouseAssignment[]>([]);
  const [subWarehouses, setSubWarehouses] = useState<SubWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sub_warehouse_id: '',
    costing_method: 'AVERAGE' as CostingMethod,
    accounting_standard: 'IFRS' as AccountingStandard,
    inventory_valuation_rule: 'IAS2_AVERAGE' as InventoryValuationRule,
    is_primary: false,
    min_stock_level: 0,
    max_stock_level: '',
    reorder_point: '',
    reorder_quantity: '',
    stock_unit: '',
    sales_unit: '',
    purchase_unit: '',
    lead_time_days: 0,
    low_stock_alert: true,
    overstock_alert: false
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
        .select('*, sub_warehouse:sub_warehouses(*)')
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
        .from('sub_warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name_ar', { ascending: true });

      if (error) throw error;
      setSubWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching sub-warehouses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sub_warehouse_id) {
      toast.error('يرجى اختيار مخزن فرعي');
      return;
    }

    try {
      const { error } = await supabase.rpc('insert_item_warehouse_assignment', {
        p_item_id: itemId,
        p_sub_warehouse_id: formData.sub_warehouse_id,
        p_costing_method: formData.costing_method,
        p_accounting_standard: formData.accounting_standard,
        p_inventory_valuation_rule: formData.inventory_valuation_rule,
        p_is_primary: formData.is_primary,
        p_min_stock_level: formData.min_stock_level,
        p_max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : null,
        p_reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : null,
        p_reorder_quantity: formData.reorder_quantity ? parseFloat(formData.reorder_quantity) : null,
        p_stock_unit: formData.stock_unit || null,
        p_sales_unit: formData.sales_unit || null,
        p_purchase_unit: formData.purchase_unit || null,
        p_lead_time_days: formData.lead_time_days,
        p_low_stock_alert: formData.low_stock_alert,
        p_overstock_alert: formData.overstock_alert
      });

      if (error) throw error;

      toast.success('تم إضافة الارتباط بنجاح');
      setDialogOpen(false);
      setFormData({
        sub_warehouse_id: '',
        costing_method: 'AVERAGE',
        accounting_standard: 'IFRS',
        inventory_valuation_rule: 'IAS2_AVERAGE',
        is_primary: false,
        min_stock_level: 0,
        max_stock_level: '',
        reorder_point: '',
        reorder_quantity: '',
        stock_unit: '',
        sales_unit: '',
        purchase_unit: '',
        lead_time_days: 0,
        low_stock_alert: true,
        overstock_alert: false
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
                  value={formData.sub_warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, sub_warehouse_id: value })}
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
                <label className="text-sm font-medium">طريقة التكلفة *</label>
                <Select
                  value={formData.costing_method}
                  onValueChange={(value: CostingMethod) => {
                    const newValuationRule = value === 'LIFO' ? 'GAAP_LIFO' : 
                                            value === 'FIFO' ? 'IAS2_FIFO' : 'IAS2_AVERAGE';
                    setFormData({ ...formData, costing_method: value, inventory_valuation_rule: newValuationRule as InventoryValuationRule });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(costingMethodLabels).map(([key, label]) => (
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
                <label className="text-sm font-medium">قاعدة تقييم المخزون</label>
                <Select
                  value={formData.inventory_valuation_rule}
                  onValueChange={(value: InventoryValuationRule) => setFormData({ ...formData, inventory_valuation_rule: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(inventoryValuationRuleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is-primary" className="text-sm">مخزن رئيسي للصنف</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">الحد الأدنى للمخزون</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الحد الأقصى للمخزون</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">نقطة إعادة الطلب</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">كمية إعادة الطلب</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorder_quantity}
                    onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">زمن التوريد (أيام)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة المخزون</label>
                  <Input
                    value={formData.stock_unit}
                    onChange={(e) => setFormData({ ...formData, stock_unit: e.target.value })}
                    placeholder="مثال: قطعة"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة البيع</label>
                  <Input
                    value={formData.sales_unit}
                    onChange={(e) => setFormData({ ...formData, sales_unit: e.target.value })}
                    placeholder="مثال: علبة"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة الشراء</label>
                  <Input
                    value={formData.purchase_unit}
                    onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                    placeholder="مثال: كرتون"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="low-stock-alert"
                    checked={formData.low_stock_alert}
                    onChange={(e) => setFormData({ ...formData, low_stock_alert: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="low-stock-alert" className="text-sm">تنبيه انخفاض المخزون</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="overstock-alert"
                    checked={formData.overstock_alert}
                    onChange={(e) => setFormData({ ...formData, overstock_alert: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="overstock-alert" className="text-sm">تنبيه زيادة المخزون</Label>
                </div>
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
                  <TableHead>طريقة التكلفة</TableHead>
                  <TableHead>المعيار المحاسبي</TableHead>
                  <TableHead>رئيسي</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.sub_warehouse ? (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span dir="rtl">{assignment.sub_warehouse.name_ar}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.sub_warehouse?.code || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {costingMethodLabels[assignment.costing_method]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {accountingStandardLabels[assignment.accounting_standard]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.is_primary ? (
                        <Badge variant="default">نعم</Badge>
                      ) : (
                        <span className="text-muted-foreground">لا</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.min_stock_level.toLocaleString('ar-EG')}
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
