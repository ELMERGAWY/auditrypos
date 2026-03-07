import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  pin: string;
  is_active: boolean;
  created_at: string;
}

const STAFF_ROLES: Record<string, { label: string; icon: string; color: string }> = {
  branch_manager: { label: 'مدير فرع', icon: '👔', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cashier: { label: 'كاشير', icon: '💰', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  waiter: { label: 'ويتر', icon: '🍽️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  stock_keeper: { label: 'أمين مخزن', icon: '📦', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

interface Props {
  restaurantId: string;
}

export function StaffTab({ restaurantId }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: '', role: 'cashier', phone: '', pin: '0000' });
  const [showPin, setShowPin] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase.from as any)('restaurant_staff').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    setStaff((data || []) as StaffMember[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم الموظف'); return; }
    const payload = { restaurant_id: restaurantId, name: form.name, role: form.role, phone: form.phone, pin: form.pin };
    if (editing) {
      await supabase.from('restaurant_staff').update(payload).eq('id', editing.id);
      toast.success('تم تحديث الموظف');
    } else {
      await supabase.from('restaurant_staff').insert(payload);
      toast.success('تم إضافة الموظف');
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الموظف؟')) return;
    await supabase.from('restaurant_staff').delete().eq('id', id);
    toast.success('تم الحذف');
    load();
  };

  const handleToggle = async (s: StaffMember) => {
    await supabase.from('restaurant_staff').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  };

  const resetForm = () => { setShowForm(false); setEditing(null); setForm({ name: '', role: 'cashier', phone: '', pin: '0000' }); };

  const startEdit = (s: StaffMember) => {
    setEditing(s);
    setForm({ name: s.name, role: s.role, phone: s.phone, pin: s.pin });
    setShowForm(true);
  };

  const activeStaff = staff.filter(s => s.is_active);
  const roleCount = (role: string) => staff.filter(s => s.role === role && s.is_active).length;

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">إجمالي الموظفين</p>
            <p className="font-display font-bold text-sm text-primary">{staff.length}</p>
          </div>
        </div>
        {Object.entries(STAFF_ROLES).map(([key, r]) => (
          <div key={key} className="glass-card p-3 flex items-center gap-3">
            <span className="text-xl">{r.icon}</span>
            <div>
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="font-display font-bold text-sm">{roleCount(key)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">إدارة الموظفين ({activeStaff.length} نشط)</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
          <Plus className="w-4 h-4 ml-1" /> إضافة موظف
        </Button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {editing ? 'تعديل موظف' : 'إضافة موظف جديد'}
                </h3>
                <Button size="sm" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
              </div>

              <Input placeholder="اسم الموظف *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">الدور الوظيفي</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STAFF_ROLES).map(([key, r]) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, role: key }))}
                      className={`p-3 rounded-lg text-center transition-all text-sm border ${form.role === key ? 'gradient-bg text-primary-foreground border-transparent' : 'bg-secondary border-border'}`}>
                      <span className="text-lg block mb-1">{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <Input placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رمز PIN (للشفتات)</label>
                <Input type="text" maxLength={6} placeholder="0000" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gradient-bg text-primary-foreground border-0">
                  {editing ? 'حفظ التعديلات' : 'إضافة'}
                </Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff List */}
      <div className="space-y-2">
        {staff.map(s => {
          const roleInfo = STAFF_ROLES[s.role] || STAFF_ROLES.cashier;
          return (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`glass-card p-4 flex items-center gap-4 ${!s.is_active ? 'opacity-50' : ''}`}>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                {roleInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm">{s.name}</p>
                  <Badge className={`text-[10px] border ${roleInfo.color}`}>{roleInfo.label}</Badge>
                  {!s.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {s.phone && <span>📱 {s.phone}</span>}
                  <span>PIN: {showPin === s.id ? s.pin : '••••'}</span>
                  <button onClick={() => setShowPin(showPin === s.id ? null : s.id)} className="text-primary">
                    {showPin === s.id ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                  </button>
                  <span>{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleToggle(s)}>
                  {s.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Edit2 className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </motion.div>
          );
        })}
        {staff.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد موظفين. أضف أول موظف الآن!</p>
          </div>
        )}
      </div>
    </div>
  );
}
