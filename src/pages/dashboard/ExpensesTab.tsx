import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Trash2, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const EXPENSE_CATEGORIES = ['إيجار', 'رواتب', 'كهرباء ومياه', 'مشتريات', 'صيانة', 'نقل', 'إعلانات', 'أخرى'];

export function ExpensesTab({ restaurantId, currency }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'أخرى', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const load = async () => {
    const { data } = await supabase.from('expenses').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false });
    setExpenses((data || []) as Expense[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const handleSave = async () => {
    if (!form.amount) { toast.error('أدخل المبلغ'); return; }
    await supabase.from('expenses').insert({
      restaurant_id: restaurantId,
      category: form.category, amount: Number(form.amount),
      description: form.description, date: form.date,
    });
    toast.success('تم تسجيل المصروف');
    setShowForm(false);
    setForm({ category: 'أخرى', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('تم الحذف'); load();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-[10px] text-muted-foreground">مصروفات اليوم</p><p className="font-display font-bold text-sm text-destructive">{todayExpenses.toLocaleString()} {currency}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-warning" /></div>
          <div><p className="text-[10px] text-muted-foreground">مصروفات الشهر</p><p className="font-display font-bold text-sm text-warning">{monthExpenses.toLocaleString()} {currency}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Wallet className="w-5 h-5 text-muted-foreground" /></div>
          <div><p className="text-[10px] text-muted-foreground">إجمالي المصروفات</p><p className="font-display font-bold text-sm">{totalExpenses.toLocaleString()} {currency}</p></div>
        </div>
      </div>

      {/* By Category */}
      {byCategory.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-bold mb-3">التوزيع حسب الفئة</h3>
          <div className="space-y-2">
            {byCategory.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <span className="text-xs w-20 text-muted-foreground">{c.cat}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full gradient-bg rounded-full" style={{ width: `${(c.total / byCategory[0].total) * 100}%` }} />
                </div>
                <span className="text-xs font-bold w-24 text-left">{c.total.toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add */}
      <Button onClick={() => setShowForm(true)} className="gradient-bg text-primary-foreground border-0" size="sm">
        <Plus className="w-4 h-4 ml-1" /> تسجيل مصروف
      </Button>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold">تسجيل مصروف جديد</h3>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input placeholder="المبلغ *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <Input placeholder="الوصف (اختياري)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Button onClick={handleSave} className="w-full gradient-bg text-primary-foreground border-0">حفظ المصروف</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className="glass-card p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                <span className="font-bold text-sm text-destructive">{e.amount.toLocaleString()} {currency}</span>
              </div>
              {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString('ar-EG')}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد مصروفات</p>}
      </div>
    </div>
  );
}
