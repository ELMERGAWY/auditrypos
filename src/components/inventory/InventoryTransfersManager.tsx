import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowRightLeft, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
}

interface InventoryTransfersManagerProps {
  restaurantId: string;
  warehouses: Warehouse[];
  products: Product[];
  onRefresh: () => void;
}

export function InventoryTransfersManager({ 
  restaurantId, 
  warehouses, 
  products, 
  onRefresh 
}: InventoryTransfersManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    quantity: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromWarehouseId || !formData.toWarehouseId || !formData.productId || !formData.quantity) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    toast.success('تم إنشاء التحويل بنجاح (لم يتم تطبيقه على قاعدة البيانات بعد)');
    setDialogOpen(false);
    setFormData({ fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">حركات التحويل</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              تحويل جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>تحويل مخزون</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">من المخزن</label>
                <Select
                  value={formData.fromWarehouseId}
                  onValueChange={(v) => setFormData({ ...formData, fromWarehouseId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name_ar || w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">إلى المخزن</label>
                <Select
                  value={formData.toWarehouseId}
                  onValueChange={(v) => setFormData({ ...formData, toWarehouseId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name_ar || w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الصنف</label>
                <Select
                  value={formData.productId}
                  onValueChange={(v) => setFormData({ ...formData, productId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.barcode ? `(${p.barcode})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الكمية</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="الكمية"
                />
              </div>
              <DialogFooter>
                <Button type="submit">حفظ</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          هذه الصفحة قيد الإنشاء. سيتم إضافة قائمة التحويلات قريباً.
        </AlertDescription>
      </Alert>
    </div>
  );
}
