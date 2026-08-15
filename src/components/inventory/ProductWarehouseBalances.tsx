// @ts-nocheck
import { useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Warehouse = { id: string; name: string; name_ar?: string | null };

type Props = {
  productId: string;
  workspaceId?: string;
  warehouses: Warehouse[];
  unit?: string;
};

export function ProductWarehouseBalances({ productId, workspaceId, warehouses, unit = 'وحدة' }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!productId || !workspaceId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await (supabase as any).rpc('get_product_warehouse_stock', {
      p_product_id: productId,
      p_workspace_id: workspaceId,
    });
    if (rpcError) {
      setError('تعذر تحميل توزيع المخزون حالياً');
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [productId, workspaceId]);

  if (!workspaceId) {
    return <p className="text-xs text-muted-foreground">اختر فرعاً نشطاً لعرض توزيع المخزون حسب المخزن.</p>;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <Building2 className="w-4 h-4" /> توزيع المخزون حسب المخزن
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">لا توجد أرصدة مسجلة لهذا الصنف في هذا الفرع.</p>
      )}
      {rows.map(row => {
        const warehouse = warehouses.find(item => item.id === row.warehouse_id);
        return (
          <div key={row.id || `${row.warehouse_id}-${row.product_id}`} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/30 px-3 py-2 text-xs">
            <span className="font-medium">{warehouse?.name_ar || warehouse?.name || row.warehouse_id}</span>
            <Badge variant="outline">{Number(row.quantity || 0).toLocaleString('ar-EG')} {unit}</Badge>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">لتعديل الرصيد استخدم حركة مخزون أو تحويل؛ تعديل بيانات الصنف لا يحذف أو يدمج أرصدة المخازن.</p>
    </div>
  );
}
