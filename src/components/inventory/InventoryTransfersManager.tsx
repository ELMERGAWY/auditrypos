// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, History, X, ArrowRightLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
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
  quantity?: number;
  unit?: string;
  cost_price?: number;
}

interface Transfer {
  id: string;
  created_at: string;
  notes: string | null;
  status: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from?: { name: string; name_ar: string | null };
  to?: { name: string; name_ar: string | null };
  items?: { product_id: string; quantity: number; product?: { name: string } }[];
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
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [form, setForm] = useState({ from_wh: '', to_wh: '', product_id: '', quantity: '', notes: '' });

  const loadTransfers = async () => {
    const { data } = await supabase
      .from('inventory_transfers')
      .select(`
        *,
        from:from_warehouse_id(name, name_ar),
        to:to_warehouse_id(name, name_ar),
        items:inventory_transfer_items(product_id, quantity, product:products(name))
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setTransfers(data || []);
  };

  useEffect(() => { loadTransfers(); }, []);

  const handleTransfer = async () => {
    if (!form.from_wh || !form.to_wh || !form.product_id || !form.quantity)
      return toast.error('يرجى ملء كافة الحقول');
    if (form.from_wh === form.to_wh)
      return toast.error('لا يمكن التحويل لنفس المخزن');

    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return toast.error('الكمية يجب أن تكون أكبر من صفر');

    try {
      // Use SECURITY DEFINER RPC to execute transfer atomically (bypasses RLS)
      const { data: result, error: rpcError } = await supabase.rpc('execute_inventory_transfer', {
        p_restaurant_id: restaurantId,
        p_from_warehouse_id: form.from_wh,
        p_to_warehouse_id: form.to_wh,
        p_product_id: form.product_id,
        p_quantity: qty,
        p_notes: form.notes || null
      });

      if (rpcError) throw rpcError;

      const res = result as { success: boolean; error?: string; transfer_id?: string };
      if (!res?.success) {
        toast.error(res?.error || 'فشل التحويل');
        return;
      }

      toast.success('تم تنفيذ التحويل بنجاح وتحديث أرصدة المستودعات');
      setShowTransfer(false);
      setForm({ from_wh: '', to_wh: '', product_id: '', quantity: '', notes: '' });
      loadTransfers();
      onRefresh();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error('فشل التحويل: ' + (error.message || 'خطأ غير معروف'));
    }
  };


  const whName = (wh: Warehouse) => wh.name_ar || wh.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> سجل تحويلات المخزون
        </h3>
        <Button onClick={() => setShowTransfer(true)} size="sm" className="gradient-bg text-primary-foreground border-0 rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> طلب تحويل جديد
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        <div className="max-h-[400px] overflow-auto custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-secondary/50 text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold">التاريخ</th>
                <th className="p-3 font-bold">من</th>
                <th className="p-3 font-bold">إلى</th>
                <th className="p-3 font-bold">الأصناف</th>
                <th className="p-3 font-bold">الحالة</th>
                <th className="p-3 font-bold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 font-bold">{t.from?.name_ar || t.from?.name || '---'}</td>
                  <td className="p-3 font-bold">{t.to?.name_ar || t.to?.name || '---'}</td>
                  <td className="p-3">
                    {(t.items || []).map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 mr-2">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        {item.product?.name || '---'} ({item.quantity})
                      </span>
                    ))}
                  </td>
                  <td className="p-3">
                    <Badge className="bg-success/10 text-success border-0 text-[10px]">مكتمل</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground truncate max-w-[150px]">{t.notes || '---'}</td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center opacity-50">لا توجد تحويلات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showTransfer && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4 rounded-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" /> طلب تحويل مخزني
                </h3>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setShowTransfer(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] mb-1 block mr-1">من مستودع</Label>
                  <select
                    value={form.from_wh}
                    onChange={e => setForm({ ...form, from_wh: e.target.value })}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">-- اختر المصدر --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{whName(w)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[10px] mb-1 block mr-1">إلى مستودع</Label>
                  <select
                    value={form.to_wh}
                    onChange={e => setForm({ ...form, to_wh: e.target.value })}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">-- اختر الوجهة --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{whName(w)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[10px] mb-1 block mr-1">الصنف المراد تحويله</Label>
                  <select
                    value={form.product_id}
                    onChange={e => setForm({ ...form, product_id: e.target.value })}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">-- اختر الصنف --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.quantity ?? 0} {p.unit || 'وحدة'})
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  placeholder="الكمية المراد تحويلها"
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="h-11 rounded-xl"
                />
                <Input
                  placeholder="ملاحظات التحويل (اختياري)"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTransfer}
                  className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold"
                >
                  تنفيذ التحويل
                </Button>
                <Button
                  onClick={() => setShowTransfer(false)}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-bold"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
