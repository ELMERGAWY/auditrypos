import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  barcode: string;
}

interface LandedCostsManagerProps {
  restaurantId: string;
  currency: string;
  products: Product[];
  onRefresh: () => void;
}

export function LandedCostsManager({ 
  restaurantId, 
  currency, 
  products, 
  onRefresh 
}: LandedCostsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    costType: '',
    amount: ''
  });

  const costTypes = ['الشحن', 'الجمارك', 'التأمين', 'تكاليف أخرى'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.costType || !formData.amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    toast.success('تم إضافة التكلفة بنجاح (لم يتم تطبيقه على قاعدة البيانات بعد)');
    setDialogOpen(false);
    setFormData({ productId: '', costType: '', amount: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">التكاليف المباشرة</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              تكلفة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة تكلفة مباشرة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="text-sm font-medium">نوع التكلفة</label>
                <Select
                  value={formData.costType}
                  onValueChange={(v) => setFormData({ ...formData, costType: v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر نوع التكلفة" /></SelectTrigger>
                  <SelectContent>
                    {costTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المبلغ ({currency})</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="المبلغ"
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
          هذه الصفحة قيد الإنشاء. سيتم إضافة قائمة التكاليف قريباً.
        </AlertDescription>
      </Alert>
    </div>
  );
}
