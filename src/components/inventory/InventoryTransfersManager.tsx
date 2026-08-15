// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, History, X, ArrowRightLeft, Package, Trash2, Search, RefreshCw } from 'lucide-react';
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
  workspaceId?: string;
  warehouses: Warehouse[];
  products: Product[];
  onRefresh: () => void;
}

export function InventoryTransfersManager({
  restaurantId,
  workspaceId,
  warehouses,
  products,
  onRefresh
}: InventoryTransfersManagerProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [form, setForm] = useState({ from_wh: '', to_wh: '', product_id: '', quantity: '', notes: '' });
  const [productSearch, setProductSearch] = useState('');
  const [sourceStock, setSourceStock] = useState<Record<string, number>>({});
  const [loadingSourceStock, setLoadingSourceStock] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);

  const loadTransfers = async () => {
    try {
      const [transfersRes, itemsRes] = await Promise.all([
        (() => {
          let query = supabase
            .from('inventory_transfers')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });
          return workspaceId ? query.eq('workspace_id', workspaceId) : query;
        })(),
        (() => {
          let query = supabase
            .from('inventory_transfer_items')
            .select('*')
            .eq('restaurant_id', restaurantId);
          return workspaceId ? query.eq('workspace_id', workspaceId) : query;
        })()
      ]);

      if (transfersRes.error) throw transfersRes.error;

      const rawTransfers = transfersRes.data || [];
      const rawItems = itemsRes.data || [];

      const mapped: Transfer[] = rawTransfers.map((t: any) => {
        const fromWh = warehouses.find(w => w.id === t.from_warehouse_id);
        const toWh = warehouses.find(w => w.id === t.to_warehouse_id);
        
        const matchedItems = rawItems
          .filter((item: any) => item.transfer_id === t.id)
          .map((item: any) => {
            const prod = products.find(p => p.id === item.product_id);
            return {
              product_id: item.product_id,
              quantity: Number(item.quantity || 0),
              product: prod ? { name: prod.name } : { name: 'صنف غير معروف' }
            };
          });

        return {
          id: t.id,
          created_at: t.created_at,
          notes: t.notes,
          status: t.status,
          from_warehouse_id: t.from_warehouse_id,
          to_warehouse_id: t.to_warehouse_id,
          from: fromWh ? { name: fromWh.name, name_ar: fromWh.name_ar } : undefined,
          to: toWh ? { name: toWh.name, name_ar: toWh.name_ar } : undefined,
          items: matchedItems
        };
      });

      setTransfers(mapped);
    } catch (err: any) {
      console.error('Failed to load transfers:', err);
      toast.error('حدث خطأ أثناء تحميل التحويلات: ' + err.message);
    }
  };

  useEffect(() => {
    if (restaurantId && warehouses.length > 0) loadTransfers();
  }, [restaurantId, workspaceId, warehouses.length, products.length]);

  useEffect(() => {
    let cancelled = false;
    const loadSourceStock = async () => {
      if (!form.from_wh) {
        setSourceStock({});
        return;
      }
      setLoadingSourceStock(true);
      let query = supabase
        .from('warehouse_stock')
        .select('product_id, quantity')
        .eq('restaurant_id', restaurantId)
        .eq('warehouse_id', form.from_wh);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      const { data, error } = await query;
      if (!cancelled) {
        if (error) {
          toast.error('تعذر تحميل رصيد المخزن المصدر');
          setSourceStock({});
        } else {
          setSourceStock(Object.fromEntries((data || []).map((row: any) => [row.product_id, Number(row.quantity || 0)])));
        }
        setLoadingSourceStock(false);
      }
    };
    loadSourceStock();
    return () => { cancelled = true; };
  }, [restaurantId, workspaceId, form.from_wh]);

  const availableProducts = products
    .filter(product => {
      const sourceQuantity = form.from_wh ? (sourceStock[product.id] || 0) : 0;
      const haystack = `${product.name} ${product.barcode || ''} ${product.id}`.toLowerCase();
      return sourceQuantity > 0 && haystack.includes(productSearch.trim().toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const handleTransfer = async () => {
    if (!form.from_wh || !form.to_wh || !form.product_id || !form.quantity)
      return toast.error('يرجى ملء كافة الحقول');
    if (form.from_wh === form.to_wh)
      return toast.error('لا يمكن التحويل لنفس المخزن');

    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return toast.error('الكمية يجب أن تكون أكبر من صفر');

    try {
      if (!workspaceId) {
        toast.error('لم يتم تحديد الفرع النشط؛ أعد تحميل الصفحة ثم حاول مرة أخرى');
        return;
      }

      setProcessingTransfer(true);
      // Use the workspace-aware SECURITY DEFINER RPC to execute transfer atomically.
      const { data: result, error: rpcError } = await (supabase as any).rpc('execute_inventory_transfer_v2', {
        p_restaurant_id: restaurantId,
        p_workspace_id: workspaceId,
        p_from_warehouse_id: form.from_wh,
        p_to_warehouse_id: form.to_wh,
        p_product_id: form.product_id,
        p_quantity: qty,
        p_notes: form.notes || null,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (rpcError) throw rpcError;

      const res = result as { success: boolean; error?: string; transfer_id?: string };
      if (!res?.success) {
        toast.error(res?.error || 'فشل التحويل');
        return;
      }

      toast.success('تم تنفيذ التحويل بنجاح وتحديث أرصدة المستودعات');
      setShowTransfer(false);
      setProductSearch('');
      setForm({ from_wh: '', to_wh: '', product_id: '', quantity: '', notes: '' });
      await loadTransfers();
      onRefresh();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error('فشل التحويل: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setProcessingTransfer(false);
    }
  };

  const handleVoidTransfer = async (id: string) => {
    if (!workspaceId) return toast.error('لا يوجد فرع نشط لعكس التحويل');
    if (!confirm('سيتم عكس حركة المخزون وإنشاء أثر محاسبي. هل تريد المتابعة؟')) return;
    try {
      setProcessingTransfer(true);
      const { data, error } = await (supabase as any).rpc('void_inventory_transfer_v2', {
        p_restaurant_id: restaurantId,
        p_workspace_id: workspaceId,
        p_transfer_id: id,
        p_reason: 'عكس التحويل من شاشة إدارة المخزون',
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل عكس التحويل');
      toast.success(data.replayed ? 'التحويل معكوس بالفعل' : 'تم عكس التحويل وتحديث الأرصدة');
      await loadTransfers();
      onRefresh();
    } catch (error: any) {
      toast.error('فشل عكس التحويل: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setProcessingTransfer(false);
    }
  };

  const whName = (wh: Warehouse) => wh.name || wh.name_ar;

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
                <th className="p-3 font-bold text-center">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-3">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 font-bold">{t.from?.name || t.from?.name_ar || '---'}</td>
                  <td className="p-3 font-bold">{t.to?.name || t.to?.name_ar || '---'}</td>
                  <td className="p-3">
                    {(t.items || []).map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 mr-2">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        {item.product?.name || '---'} ({item.quantity})
                      </span>
                    ))}
                  </td>
                  <td className="p-3">
                                          <Badge className={t.status === 'voided' ? 'bg-destructive/10 text-destructive border-0 text-[10px]' : 'bg-success/10 text-success border-0 text-[10px]'}>
                        {t.status === 'voided' ? 'معكوس' : t.status === 'shipped' ? 'مشحون' : 'مكتمل'}
                      </Badge>

                  </td>
                  <td className="p-3 text-muted-foreground truncate max-w-[150px]">{t.notes || '---'}</td>
                  <td className="p-3 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => handleVoidTransfer(t.id)}
                      disabled={processingTransfer || t.status === 'voided'}
                      title="عكس التحويل مع استرجاع الكمية"
                    >
                      {processingTransfer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center opacity-50">لا توجد تحويلات مسجلة</td>
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
                    onChange={e => setForm({ ...form, from_wh: e.target.value, product_id: '', quantity: '' })}
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
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الباركود..."
                      className="pr-9 h-10 rounded-xl"
                      disabled={!form.from_wh}
                    />
                  </div>
                  <select
                    value={form.product_id}
                    onChange={e => setForm({ ...form, product_id: e.target.value })}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                    disabled={!form.from_wh || loadingSourceStock}
                  >
                    <option value="">{!form.from_wh ? '-- اختر المخزن المصدر أولاً --' : loadingSourceStock ? 'جاري تحميل الرصيد...' : '-- اختر الصنف المتاح --'}</option>
                    {availableProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({sourceStock[p.id] || 0} {p.unit || 'وحدة'})
                      </option>
                    ))}
                  </select>
                  {form.from_wh && !loadingSourceStock && availableProducts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">لا يوجد صنف برصيد موجب يطابق البحث في المخزن المصدر.</p>
                  )}
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
                  disabled={processingTransfer || loadingSourceStock || !form.from_wh || !form.to_wh || !form.product_id}
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
