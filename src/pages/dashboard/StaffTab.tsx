// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X, DollarSign, Building2, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  pin: string;
  is_active: boolean;
  base_salary?: number;
  payment_cycle?: 'monthly' | 'weekly' | 'daily';
  created_at: string;
  profile?: any; // staff_profiles linked record
}

interface CustomRole {
  id: string;
  name_ar: string;
  description: string;
}

const STANDARD_ROLES: Record<string, { label: string; icon: string; color: string }> = {
  branch_manager: { label: 'مدير فرع', icon: '👔', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cashier: { label: 'كاشير', icon: '💰', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  waiter: { label: 'ويتر', icon: '🍽️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  stock_keeper: { label: 'أمين مخزن', icon: '📦', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  accountant: { label: 'محاسب', icon: '📊', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  chef: { label: 'شيف', icon: '👨‍🍳', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface Props {
  restaurantId: string;
  currency: string;
}

export function StaffTab({ restaurantId, currency }: Props) {
  const [activeSubView, setActiveSubView] = useState<'staff' | 'departments'>('staff');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({ 
    name: '', role: 'cashier', phone: '', pin: '0000',
    base_salary: '', payment_cycle: 'monthly' as 'monthly' | 'weekly' | 'daily',
    department_id: '', expense_account_id: '', allowances: '0', deductions: '0',
    email: '', hire_date: ''
  });
  
  const [showPin, setShowPin] = useState<string | null>(null);

  // Department Modal & Form State
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '', code: '', expense_account_id: '', manager_id: ''
  });
  
  // Payroll transaction modal state
  const [showPayroll, setShowPayroll] = useState<StaffMember | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    allowances: '0',
    deductions: '0',
    net_salary: '0',
    expense_account_id: '',
    payment_account_id: '',
    notes: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes, profilesRes, deptRes, accountsRes] = await Promise.all([
        supabase.from('restaurant_staff').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('restaurant_custom_roles').select('*').eq('restaurant_id', restaurantId),
        supabase.from('staff_profiles').select('*, staff_departments(*)').eq('restaurant_id', restaurantId),
        supabase.from('staff_departments').select('*').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('chart_of_accounts').select('id, code, name, account_type, is_cash_account, is_bank_account').eq('restaurant_id', restaurantId).eq('is_active', true).order('code')
      ]);
      
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.restaurant_staff_id || p.full_name, p]));
      
      const mappedStaff = (staffRes.data || []).map((s: any) => {
        // Try linking by restaurant_staff_id, fallback to name
        const profile = profilesMap.get(s.id) || profilesMap.get(s.name);
        return {
          ...s,
          profile
        };
      });

      setStaff(mappedStaff);
      setCustomRoles((rolesRes.data || []) as CustomRole[]);
      setDepartments(deptRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (e: any) {
      toast.error('حدث خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const expenseAccounts = useMemo(() =>
    accounts.filter(a => a.code?.startsWith('6') || a.account_type === 'expense' || a.name?.includes('مصروف') || a.name?.includes('رواتب')),
    [accounts]
  );
  
  const paymentAccounts = useMemo(() =>
    accounts.filter(a => a.code?.startsWith('11') || a.code?.startsWith('14') || a.is_cash_account || a.is_bank_account),
    [accounts]
  );

  const getRoleDisplay = (roleKey: string) => {
    if (STANDARD_ROLES[roleKey]) return STANDARD_ROLES[roleKey];
    const custom = customRoles.find(r => r.name_ar === roleKey);
    if (custom) return { label: custom.name_ar, icon: '👤', color: 'bg-primary/10 text-primary border-primary/20' };
    return { label: roleKey, icon: '👤', color: 'bg-secondary text-muted-foreground border-border' };
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('أدخل اسم الموظف'); return; }
    
    setLoading(true);
    try {
      const staffPayload = { 
        restaurant_id: restaurantId, 
        name: form.name, 
        role: form.role, 
        phone: form.phone, 
        pin: form.pin,
        base_salary: Number(form.base_salary) || 0,
        payment_cycle: form.payment_cycle
      };

      let staffId = '';
      if (editing) {
        staffId = editing.id;
        const { error } = await supabase.from('restaurant_staff').update(staffPayload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('restaurant_staff').insert(staffPayload).select('id').single();
        if (error) throw error;
        staffId = data.id;
      }

      // Sync/Create related staff_profile
      const profilePayload = {
        restaurant_id: restaurantId,
        restaurant_staff_id: staffId,
        full_name: form.name,
        position: getRoleDisplay(form.role).label || form.role,
        basic_salary: Number(form.base_salary) || 0,
        allowances: Number(form.allowances) || 0,
        deductions: Number(form.deductions) || 0,
        department_id: form.department_id || null,
        expense_account_id: form.expense_account_id || null,
        phone: form.phone || null,
        email: form.email || null,
        hire_date: form.hire_date || null,
        status: 'active'
      };

      // Check if profile exists
      let existingProfile = editing?.profile;
      if (!existingProfile && editing) {
        // Fallback check by name or id if profile wasn't pre-loaded
        const { data } = await supabase.from('staff_profiles').select('id').eq('restaurant_staff_id', staffId).maybeSingle();
        existingProfile = data;
      }

      if (existingProfile) {
        const { error } = await supabase.from('staff_profiles').update(profilePayload).eq('id', existingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_profiles').insert(profilePayload as any);
        if (error) throw error;
      }

      toast.success(editing ? 'تم تحديث بيانات الموظف بنجاح ✅' : 'تم إضافة الموظف بنجاح ✅');
      resetForm();
      load();
    } catch (e: any) {
      toast.error('فشل حفظ الموظف: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف: ${member.name}؟`)) return;
    try {
      if (member.profile?.id) {
        await supabase.from('staff_profiles').delete().eq('id', member.profile.id);
      }
      await supabase.from('restaurant_staff').delete().eq('id', member.id);
      toast.success('تم حذف الموظف');
      load();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const handleToggle = async (s: StaffMember) => {
    await supabase.from('restaurant_staff').update({ is_active: !s.is_active }).eq('id', s.id);
    if (s.profile?.id) {
      await supabase.from('staff_profiles').update({ status: !s.is_active ? 'active' : 'inactive' }).eq('id', s.profile.id);
    }
    load();
  };

  const resetForm = () => { 
    setShowForm(false); 
    setEditing(null); 
    setForm({ 
      name: '', role: 'cashier', phone: '', pin: '0000', 
      base_salary: '', payment_cycle: 'monthly',
      department_id: '', expense_account_id: '', allowances: '0', deductions: '0',
      email: '', hire_date: ''
    }); 
  };

  const resetDeptForm = () => {
    setShowDeptForm(false);
    setEditingDept(null);
    setDeptForm({
      name: '', code: '', expense_account_id: '', manager_id: ''
    });
  };

  const startEditDept = (dept: any) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      expense_account_id: dept.expense_account_id || '',
      manager_id: dept.manager_id || ''
    });
    setShowDeptForm(true);
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) { toast.error('أدخل اسم القسم'); return; }
    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        name: deptForm.name.trim(),
        code: deptForm.code.trim() || null,
        expense_account_id: deptForm.expense_account_id || null,
        manager_id: deptForm.manager_id || null
      };

      if (editingDept) {
        const { error } = await supabase.from('staff_departments').update(payload).eq('id', editingDept.id);
        if (error) throw error;
        toast.success('تم تحديث القسم بنجاح ✅');
      } else {
        const { error } = await supabase.from('staff_departments').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة القسم بنجاح ✅');
      }
      resetDeptForm();
      load();
    } catch (e: any) {
      toast.error('حدث خطأ أثناء حفظ القسم: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ قد يؤثر هذا على الموظفين والمهام المرتبطة.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('staff_departments').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف القسم بنجاح');
      load();
    } catch (e: any) {
      toast.error('فشل حذف القسم: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s: StaffMember) => {
    setEditing(s);
    setForm({ 
      name: s.name, 
      role: s.role, 
      phone: s.phone || '', 
      pin: s.pin || '0000',
      base_salary: String(s.base_salary || s.profile?.basic_salary || ''),
      payment_cycle: s.payment_cycle || s.profile?.payment_cycle || 'monthly',
      department_id: s.profile?.department_id || '',
      expense_account_id: s.profile?.expense_account_id || '',
      allowances: String(s.profile?.allowances || 0),
      deductions: String(s.profile?.deductions || 0),
      email: s.profile?.email || '',
      hire_date: s.profile?.hire_date ? s.profile.hire_date.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const openPayrollModal = (s: StaffMember) => {
    const basic = Number(s.base_salary || s.profile?.basic_salary || 0);
    const allowances = Number(s.profile?.allowances || 0);
    const deductions = Number(s.profile?.deductions || 0);
    const net = basic + allowances - deductions;

    setPayrollForm({
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      allowances: String(allowances),
      deductions: String(deductions),
      net_salary: String(net),
      expense_account_id: s.profile?.expense_account_id || s.profile?.staff_departments?.expense_account_id || '',
      payment_account_id: accounts.find(a => a.code === '1100')?.id || '',
      notes: ''
    });
    setShowPayroll(s);
  };

  const handlePayroll = async () => {
    if (!showPayroll || !showPayroll.profile?.id) {
      toast.error('لا يمكن صرف الراتب: لم يتم العثور على ملف مالي مرتبط للموظف.');
      return;
    }

    const net = Number(payrollForm.net_salary);
    if (net <= 0) {
      toast.error('صافي الراتب يجب أن يكون أكبر من صفر');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('record_payroll_payment', {
        p_restaurant_id: restaurantId,
        p_staff_id: showPayroll.profile.id,
        p_net_salary: net,
        p_month: Number(payrollForm.month),
        p_year: Number(payrollForm.year),
        p_expense_account_id: payrollForm.expense_account_id || null,
        p_payment_account_id: payrollForm.payment_account_id || null,
        p_department_id: showPayroll.profile.department_id || null,
        p_allowances: Number(payrollForm.allowances) || 0,
        p_deductions: Number(payrollForm.deductions) || 0,
        p_notes: payrollForm.notes || null
      });

      if (error) throw error;

      toast.success(`تم صرف الراتب للموظف ${showPayroll.name} وترحيله بنجاح ✅`);
      setShowPayroll(null);
      load();
    } catch (e: any) {
      toast.error('خطأ في ترحيل الراتب محاسبياً: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const activeStaff = staff.filter(s => s.is_active);
  const roleCount = (role: string) => staff.filter(s => s.role === role && s.is_active).length;

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 flex items-center gap-3 border border-primary/10">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">إجمالي الموظفين</p>
            <p className="font-display font-bold text-sm text-primary">{staff.length}</p>
          </div>
        </div>
        {Object.entries(STANDARD_ROLES).slice(0, 5).map(([key, r]) => (
          <div key={key} className="glass-card p-3 flex items-center gap-3 border border-border/50">
            <span className="text-xl">{r.icon}</span>
            <div>
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="font-display font-bold text-sm">{roleCount(key)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-2 border-border/40">
        <Button 
          variant={activeSubView === 'staff' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveSubView('staff')}
          className={activeSubView === 'staff' ? 'gradient-bg text-primary-foreground border-0' : ''}
        >
          <Users className="w-4 h-4 ml-1" /> تيم العمل والموظفين
        </Button>
        <Button 
          variant={activeSubView === 'departments' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveSubView('departments')}
          className={activeSubView === 'departments' ? 'gradient-bg text-primary-foreground border-0' : ''}
        >
          <Building2 className="w-4 h-4 ml-1" /> الأقسام والقطاعات الإدارية
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {activeSubView === 'staff' ? (
          <>
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                إدارة تيم العمل والموظفين ({activeStaff.length} نشط)
                {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
              </h2>
              <p className="text-xs text-muted-foreground">إدارة الموظفين والوظائف والرواتب مع التوجيه التلقائي للحسابات</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
              <Plus className="w-4 h-4 ml-1" /> إضافة موظف
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                الأقسام والقطاعات الإدارية ({departments.length} أقسام)
                {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
              </h2>
              <p className="text-xs text-muted-foreground">توزيع تيم العمل على قطاعات وتعيين مديرين لكل قسم لمراقبة أداء الموظفين</p>
            </div>
            <Button onClick={() => { resetDeptForm(); setShowDeptForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
              <Plus className="w-4 h-4 ml-1" /> إضافة قسم جديد
            </Button>
          </>
        )}
      </div>

      {/* Form Modal (Staff) */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-lg w-full space-y-4 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5 text-primary" />
                  {editing ? 'تعديل ملف الموظف' : 'إضافة موظف جديد للتيم'}
                </h3>
                <Button size="sm" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">اسم الموظف *</Label>
                    <Input placeholder="الاسم الكامل" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">رقم الهاتف</Label>
                    <Input placeholder="05xxxxxxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الدور الوظيفي</Label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      {Object.entries(STANDARD_ROLES).map(([key, r]) => (
                        <option key={key} value={key}>{r.icon} {r.label}</option>
                      ))}
                      {customRoles.map(role => (
                        <option key={role.id} value={role.name_ar}>👤 {role.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">القسم الإداري</Label>
                    <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">بدون قسم</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">الراتب الأساسي</Label>
                    <Input type="number" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-xs">البدلات الافتراضية</Label>
                    <Input type="number" value={form.allowances} onChange={e => setForm(f => ({ ...f, allowances: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-xs">الخصومات الافتراضية</Label>
                    <Input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">دورة الصرف</Label>
                    <select value={form.payment_cycle} onChange={e => setForm(f => ({ ...f, payment_cycle: e.target.value as any }))}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="monthly">شهري</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="daily">يومي</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">رمز PIN (لورديات الموظفين)</Label>
                    <Input type="text" maxLength={6} placeholder="0000" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@domain.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">تاريخ التعيين</Label>
                    <Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs font-bold text-primary">التوجيه المحاسبي للموظف (دليل الحسابات)</Label>
                  <select value={form.expense_account_id} onChange={e => setForm(f => ({ ...f, expense_account_id: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1">
                    <option value="">6100 رواتب (الافتراضي)</option>
                    {expenseAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">توجيه مصروف هذا الموظف على الحساب المحدد في قيود اليومية التلقائية.</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSave} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">
                  {loading ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </Button>
                <Button variant="outline" onClick={resetForm} className="flex-1" disabled={loading}>إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal (Department) */}
      <AnimatePresence>
        {showDeptForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => resetDeptForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                  <Building2 className="w-5 h-5 text-primary" />
                  {editingDept ? 'تعديل بيانات القسم' : 'إضافة قسم إداري جديد'}
                </h3>
                <Button size="sm" variant="ghost" onClick={resetDeptForm}><X className="w-4 h-4" /></Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">اسم القسم *</Label>
                  <Input placeholder="مثال: قسم التسويق والميديا باينج" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                
                <div>
                  <Label className="text-xs">رمز كود القسم</Label>
                  <Input placeholder="مثال: MKTG" value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))} />
                </div>

                <div>
                  <Label className="text-xs">مدير القسم</Label>
                  <select value={deptForm.manager_id} onChange={e => setDeptForm(f => ({ ...f, manager_id: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">لا يوجد (غير محدد)</option>
                    {staff.map(s => (
                      <option key={s.profile?.id || s.id} value={s.profile?.id || s.id}>{s.name} ({getRoleDisplay(s.role).label})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">حساب مصروف القسم (دليل الحسابات)</Label>
                  <select value={deptForm.expense_account_id} onChange={e => setDeptForm(f => ({ ...f, expense_account_id: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">حساب رواتب ومصروفات عامة</option>
                    {expenseAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSaveDept} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">
                  {loading ? 'جاري الحفظ...' : editingDept ? 'تحديث القسم' : 'حفظ القسم'}
                </Button>
                <Button variant="outline" onClick={resetDeptForm} className="flex-1" disabled={loading}>إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payroll Modal */}
      <AnimatePresence>
        {showPayroll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPayroll(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                  <DollarSign className="w-5 h-5 text-primary" />
                  صرف راتب: {showPayroll.name}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowPayroll(null)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الشهر</Label>
                    <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.month} 
                      onChange={e => {
                        const newMonth = e.target.value;
                        setPayrollForm(prev => ({ ...prev, month: newMonth }));
                      }}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">السنة</Label>
                    <Input type="number" value={payrollForm.year} onChange={e => setPayrollForm(prev => ({ ...prev, year: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">البدلات</Label>
                    <Input type="number" value={payrollForm.allowances} 
                      onChange={e => {
                        const val = e.target.value;
                        const basic = Number(showPayroll.base_salary || 0);
                        const net = basic + Number(val || 0) - Number(payrollForm.deductions || 0);
                        setPayrollForm(prev => ({ ...prev, allowances: val, net_salary: String(net) }));
                      }} />
                  </div>
                  <div>
                    <Label className="text-xs">الخصومات</Label>
                    <Input type="number" value={payrollForm.deductions} 
                      onChange={e => {
                        const val = e.target.value;
                        const basic = Number(showPayroll.base_salary || 0);
                        const net = basic + Number(payrollForm.allowances || 0) - Number(val || 0);
                        setPayrollForm(prev => ({ ...prev, deductions: val, net_salary: String(net) }));
                      }} />
                  </div>
                  <div>
                    <Label className="text-xs">الصافي *</Label>
                    <Input type="number" value={payrollForm.net_salary} onChange={e => setPayrollForm(prev => ({ ...prev, net_salary: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">حساب مصروف الرواتب (المدين)</Label>
                  <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.expense_account_id} onChange={e => setPayrollForm(prev => ({ ...prev, expense_account_id: e.target.value }))}>
                    <option value="">6100 رواتب (الافتراضي)</option>
                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">حساب الدفع (الدائن — الخزينة/البنك)</Label>
                  <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.payment_account_id} onChange={e => setPayrollForm(prev => ({ ...prev, payment_account_id: e.target.value }))}>
                    <option value="">1100 الخزينة (الافتراضي)</option>
                    {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">ملاحظات</Label>
                  <Input placeholder="تفاصيل إضافية عن صرف الراتب..." value={payrollForm.notes} onChange={e => setPayrollForm(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handlePayroll} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0 gap-2">
                  <Calendar className="w-4 h-4" /> صرف وترحيل محاسبي
                </Button>
                <Button variant="outline" onClick={() => setShowPayroll(null)} className="flex-1" disabled={loading}>إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conditional Rendering of Views */}
      {activeSubView === 'staff' ? (
        /* Staff List View */
        <div className="space-y-2">
          {staff.map(s => {
            const roleInfo = getRoleDisplay(s.role);
            const basicSalary = s.base_salary || s.profile?.basic_salary || 0;
            // Check if this person is a department manager
            const managedDept = departments.find(d => d.manager_id === s.profile?.id);

            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`glass-card p-4 flex items-center justify-between gap-4 border border-border/50 hover:border-primary/20 transition-all ${!s.is_active ? 'opacity-50 bg-secondary/50' : ''}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl shrink-0">
                    {roleInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">{s.name}</p>
                      <Badge className={`text-[10px] border ${roleInfo.color}`}>{roleInfo.label}</Badge>
                      
                      {s.profile?.staff_departments?.name && (
                        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">
                          <Building2 className="w-2.5 h-2.5 ml-1" /> {s.profile.staff_departments.name}
                        </Badge>
                      )}

                      {managedDept && (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          👑 مدير قسم: {managedDept.name}
                        </Badge>
                      )}

                      {!s.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {s.phone && <span>📱 {s.phone}</span>}
                      {s.profile?.email && <span>📧 {s.profile.email}</span>}
                      <span>PIN: {showPin === s.id ? s.pin : '••••'}</span>
                      <button onClick={() => setShowPin(showPin === s.id ? null : s.id)} className="text-primary hover:underline">
                        {showPin === s.id ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                      </button>
                      {s.profile?.expense_account_id && (
                        <span className="text-primary-foreground bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                          🎯 موجه: {accounts.find(a => a.id === s.profile.expense_account_id)?.name}
                        </span>
                      )}
                    </div>
                    {basicSalary > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                          الراتب: {basicSalary.toLocaleString()} {currency} / {s.payment_cycle === 'monthly' ? 'شهر' : s.payment_cycle === 'weekly' ? 'أسبوع' : 'يوم'}
                        </Badge>
                        {s.profile?.allowances > 0 && <span className="text-[10px] text-emerald-600 font-bold">+ {Number(s.profile.allowances).toLocaleString()} بدلات</span>}
                        {s.profile?.deductions > 0 && <span className="text-[10px] text-destructive font-bold">- {Number(s.profile.deductions).toLocaleString()} خصومات</span>}
                        
                        <Button size="xs" variant="outline" className="h-6 text-[10px]" onClick={() => openPayrollModal(s)}>
                          <DollarSign className="w-3.5 h-3.5 ml-0.5" /> صرف راتب
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(s)}>
                    {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </motion.div>
            );
          })}
          {staff.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا يوجد موظفين حالياً. أضف موظفاً جديداً للبدء!</p>
            </div>
          )}
        </div>
      ) : (
        /* Departments List View */
        <div className="grid md:grid-cols-2 gap-4">
          {departments.map(d => {
            // Find department employees
            const deptEmployees = staff.filter(s => s.profile?.department_id === d.id);
            // Calculate total salaries in department
            const totalSalaries = deptEmployees.reduce((sum, s) => {
              const basic = Number(s.base_salary || s.profile?.basic_salary || 0);
              const allowances = Number(s.profile?.allowances || 0);
              const deductions = Number(s.profile?.deductions || 0);
              return sum + (basic + allowances - deductions);
            }, 0);

            // Find manager details
            const manager = staff.find(s => s.profile?.id === d.manager_id || s.id === d.manager_id);

            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 border border-border hover:border-primary/20 transition-all flex flex-col justify-between space-y-4">
                
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-primary flex items-center gap-2">
                        <Building2 className="w-4.5 h-4.5" />
                        {d.name}
                      </h3>
                      {d.code && <p className="text-[10px] text-muted-foreground mt-0.5">رمز القسم: {d.code}</p>}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEditDept(d)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteDept(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-y py-2.5 my-3 bg-secondary/5 rounded px-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">مدير القسم:</p>
                      <p className="font-bold mt-0.5 text-foreground">{manager ? manager.name : 'غير معين'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">التوجيه المالي:</p>
                      <p className="font-bold mt-0.5 text-primary">
                        {accounts.find(a => a.id === d.expense_account_id)?.name || 'افتراضي'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-bold">فريق العمل بالقسم ({deptEmployees.length} موظفين):</p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {deptEmployees.map(e => (
                        <Badge key={e.id} variant="outline" className="text-[9px] bg-secondary/30">
                          {e.name}
                        </Badge>
                      ))}
                      {deptEmployees.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">لا يوجد موظفون معينون في هذا القسم حالياً.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-dashed flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">التكلفة الشهرية للموظفين:</span>
                  <span className="font-black text-emerald-600 bg-emerald-500/10 p-1 px-2.5 rounded-lg">
                    {totalSalaries.toLocaleString()} {currency}
                  </span>
                </div>

              </motion.div>
            );
          })}
          
          {departments.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground border border-dashed rounded-xl">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد أقسام مسجلة حتى الآن.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
