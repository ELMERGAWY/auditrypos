import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Users, Truck, UserCog, Package, Loader2, Search, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Section = 'customers' | 'suppliers' | 'staff' | 'products' | 'orders';

const SECTIONS: { key: Section; label: string; icon: any; table: string }[] = [
  { key: 'customers', label: 'العملاء', icon: Users, table: 'customers' },
  { key: 'suppliers', label: 'الموردين', icon: Truck, table: 'suppliers' },
  { key: 'staff', label: 'الموظفين', icon: UserCog, table: 'staff' },
  { key: 'products', label: 'الأصناف', icon: Package, table: 'products' },
  { key: 'orders', label: 'الطلبات', icon: ShoppingBag, table: 'orders' },
];

export function CompanyDrillIn({
  restaurantId, restaurantName, open, onClose,
}: { restaurantId: string | null; restaurantName?: string; open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<Section>('customers');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const sec = SECTIONS.find(s => s.key === section)!;
    const { data, error } = await supabase
      .from(sec.table as any)
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error('فشل التحميل: ' + error.message);
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && restaurantId) load(); /* eslint-disable-next-line */ }, [open, restaurantId, section]);

  const del = async (id: string) => {
    if (!confirm('تأكيد حذف هذا العنصر نهائياً؟')) return;
    const sec = SECTIONS.find(s => s.key === section)!;
    const { error } = await supabase.from(sec.table as any).delete().eq('id', id);
    if (error) return toast.error('فشل الحذف: ' + error.message);
    toast.success('تم الحذف');
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const filtered = rows.filter(r => {
    if (!q) return true;
    const hay = JSON.stringify(r).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">إدارة شاملة:</span> {restaurantName || '—'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap border-b pb-3">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                section === s.key ? 'gradient-bg text-primary-foreground shadow' : 'bg-secondary/50 hover:bg-secondary'
              }`}>
              <s.icon className="w-4 h-4" />
              {s.label}
              <Badge variant="outline" className="text-[10px]">{section === s.key ? filtered.length : ''}</Badge>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." className="pr-10 rounded-xl" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">لا توجد بيانات</div>
          ) : (
            filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40 hover:border-destructive/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {r.name || r.full_name || r.customer_name || r.order_number || r.id?.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[r.email, r.phone, r.category, r.total && `${r.total} ج.م`, r.status]
                      .filter(Boolean).join(' • ')}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
