import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  notes: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function SuppliersTab({ restaurantId, currency }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  const load = async () => {
    const { data } = await supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    setSuppliers((data || []) as Supplier[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const filtered = suppliers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name) { toast.error('أدخل اسم المورد'); return; }
    const data = { restaurant_id: restaurantId, name: form.name, phone: form.phone, email: form.email, address: form.address, notes: form.notes };
    if (editingSupplier) {
      await supabase.from('suppliers').update(data).eq('id', editingSupplier.id);
      toast.success('تم التحديث');
    } else {
      await supabase.from('suppliers').insert(data);
      toast.success('تم إضافة المورد');
    }
    resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف؟')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    toast.success('تم الحذف'); load();
  };

  const resetForm = () => { setShowForm(false); setEditingSupplier(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); };

  const startEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, notes: s.notes });
    setShowForm(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، الهاتف، البريد، العنوان..." className="pr-10 h-9 text-xs" />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
          <Plus className="w-4 h-4 ml-1" /> إضافة مورد
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg">{editingSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}</h3>
              <Input placeholder="اسم المورد *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input placeholder="البريد" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <Input placeholder="العنوان" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              <Input placeholder="ملاحظات" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gradient-bg text-primary-foreground border-0">{editingSupplier ? 'حفظ' : 'إضافة'}</Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {filtered.map(s => (
          <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{s.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {s.phone && <span>📱 {s.phone}</span>}
                {s.address && <span>📍 {s.address}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Edit2 className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">لا يوجد موردين</p>}
      </div>
    </div>
  );
}
