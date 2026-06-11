// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, DollarSign, Building2, FileText, Plus, Download, Trash2, Edit2, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { BusinessType } from '@/lib/businessTypes';

const DEPARTMENT_PRESETS: Record<string, string[]> = {
  marketing_agency: ['الإبداع والتصميم', 'التسويق الرقمي', 'المبيعات', 'خدمة العملاء', 'الإدارة', 'المحاسبة'],
  restaurant: ['المطبخ', 'الصالة', 'التوصيل', 'الإدارة', 'المحاسبة'],
  cafe: ['المطبخ', 'الصالة', 'التوصيل', 'الإدارة'],
  retail: ['المبيعات', 'المخزون', 'الإدارة', 'المحاسبة'],
  contracting: ['المشاريع', 'الهندسة', 'المشتريات', 'الإدارة', 'المحاسبة'],
  law_firm: ['القضايا', 'الاستشارات', 'الإدارة', 'المحاسبة'],
  default: ['الإدارة', 'المبيعات', 'العمليات', 'المحاسبة', 'الموارد البشرية'],
};

interface Props {
  restaurantId: string;
  currency: string;
  businessType: BusinessType;
}

export function PayrollTab({ restaurantId, currency, businessType }: Props) {
  const [activeTab, setActiveTab] = useState('employees');
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  const [staffForm, setStaffForm] = useState({
    full_name: '', position: '', basic_salary: '', allowances: '0', deductions: '0',
    department_id: '', expense_account_id: '', phone: '', email: '', hire_date: ''
  });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', expense_account_id: '' });
  const [payrollForm, setPayrollForm] = useState({
    staff_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
    net_salary: '', allowances: '0', deductions: '0',
    expense_account_id: '', payment_account_id: '', department_id: '', notes: ''
  });

  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const presetDepartments = DEPARTMENT_PRESETS[businessType] || DEPARTMENT_PRESETS.default;

  const loadAll = async () => {
    setLoading(true);
    try {
      const [staffRes, deptRes, accRes, payrollRes] = await Promise.all([
        supabase.from('staff_profiles').select('*, staff_departments(name)').eq('restaurant_id', restaurantId).order('full_name'),
        supabase.from('staff_departments').select('*').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('restaurant_id', restaurantId).eq('is_active', true).order('code'),
        supabase.from('payroll_transactions').select('*, staff_profiles(full_name, position), staff_departments(name)').eq('restaurant_id', restaurantId).order('year', { ascending: false }).order('month', { ascending: false })
      ]);
      setStaff(staffRes.data || []);
      setDepartments(deptRes.data || []);
      setAccounts(accRes.data || []);
      setPayrolls(payrollRes.data || []);
    } catch (e: any) {
      toast.error('فشل تحميل بيانات الرواتب: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [restaurantId]);

  const expenseAccounts = useMemo(() =>
    accounts.filter(a => a.code?.startsWith('6') || a.account_type === 'expense' || a.name?.includes('مصروف') || a.name?.includes('رواتب')),
    [accounts]
  );
  const paymentAccounts = useMemo(() =>
    accounts.filter(a => a.code?.startsWith('11') || a.code?.startsWith('14') || a.is_cash_account || a.is_bank_account),
    [accounts]
  );

  const filteredPayrolls = payrolls.filter(p =>
    String(p.month) === filterMonth && String(p.year) === filterYear
  );

  const monthlyTotal = filteredPayrolls.reduce((s, p) => s + Number(p.net_salary || 0), 0);
  const deptBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPayrolls.forEach(p => {
      const dept = p.staff_departments?.name || p.staff_profiles?.position || 'غير محدد';
      map[dept] = (map[dept] || 0) + Number(p.net_salary || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredPayrolls]);

  const seedDepartments = async () => {
    const existing = new Set(departments.map(d => d.name));
    const toCreate = presetDepartments.filter(n => !existing.has(n));
    if (!toCreate.length) { toast.info('الأقسام موجودة بالفعل'); return; }
    const salaryAcct = accounts.find(a => a.code === '6100')?.id || expenseAccounts[0]?.id || null;
    for (const name of toCreate) {
      await supabase.from('staff_departments').insert({
        restaurant_id: restaurantId, name, expense_account_id: salaryAcct
      } as any);
    }
    toast.success(`تم إضافة ${toCreate.length} قسم`);
    loadAll();
  };

  const handleSaveStaff = async () => {
    if (!staffForm.full_name.trim()) { toast.error('أدخل اسم الموظف'); return; }
    const payload = {
      restaurant_id: restaurantId,
      full_name: staffForm.full_name,
      position: staffForm.position || null,
      basic_salary: Number(staffForm.basic_salary) || 0,
      allowances: Number(staffForm.allowances) || 0,
      deductions: Number(staffForm.deductions) || 0,
      department_id: staffForm.department_id || null,
      expense_account_id: staffForm.expense_account_id || null,
      phone: staffForm.phone || null,
      email: staffForm.email || null,
      hire_date: staffForm.hire_date || null,
      status: 'active'
    };
    if (editingStaff) {
      const { error } = await supabase.from('staff_profiles').update(payload).eq('id', editingStaff.id);
      if (error) { toast.error(error.message); return; }
      toast.success('تم تحديث الموظف');
    } else {
      const { error } = await supabase.from('staff_profiles').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة الموظف');
    }
    setShowStaffModal(false);
    setEditingStaff(null);
    loadAll();
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) { toast.error('أدخل اسم القسم'); return; }
    const payload = {
      restaurant_id: restaurantId,
      name: deptForm.name,
      code: deptForm.code || null,
      expense_account_id: deptForm.expense_account_id || null
    };
    if (editingDept) {
      await supabase.from('staff_departments').update(payload).eq('id', editingDept.id);
      toast.success('تم تحديث القسم');
    } else {
      await supabase.from('staff_departments').insert(payload as any);
      toast.success('تم إضافة القسم');
    }
    setShowDeptModal(false);
    setEditingDept(null);
    loadAll();
  };

  const handlePayroll = async () => {
    const net = Number(payrollForm.net_salary);
    if (!payrollForm.staff_id || net <= 0) { toast.error('اختر الموظف وأدخل صافي الراتب'); return; }
    const { error } = await supabase.rpc('record_payroll_payment', {
      p_restaurant_id: restaurantId,
      p_staff_id: payrollForm.staff_id,
      p_net_salary: net,
      p_month: Number(payrollForm.month),
      p_year: Number(payrollForm.year),
      p_expense_account_id: payrollForm.expense_account_id || null,
      p_payment_account_id: payrollForm.payment_account_id || null,
      p_department_id: payrollForm.department_id || null,
      p_allowances: Number(payrollForm.allowances) || 0,
      p_deductions: Number(payrollForm.deductions) || 0,
      p_notes: payrollForm.notes || null
    });
    if (error) { toast.error('فشل صرف الراتب: ' + error.message); return; }
    toast.success('تم صرف الراتب وترحيله محاسبياً ✅');
    setShowPayrollModal(false);
    loadAll();
  };

  const openPayrollForStaff = (s: any) => {
    const net = Number(s.basic_salary || 0) + Number(s.allowances || 0) - Number(s.deductions || 0);
    setPayrollForm({
      staff_id: s.id,
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      net_salary: String(net),
      allowances: String(s.allowances || 0),
      deductions: String(s.deductions || 0),
      expense_account_id: s.expense_account_id || s.staff_departments?.expense_account_id || '',
      payment_account_id: accounts.find(a => a.code === '1100')?.id || '',
      department_id: s.department_id || '',
      notes: ''
    });
    setShowPayrollModal(true);
  };

  const exportReport = () => {
    const rows = filteredPayrolls.map(p => ({
      'الموظف': p.staff_profiles?.full_name || '',
      'الوظيفة': p.staff_profiles?.position || '',
      'القسم': p.staff_departments?.name || '',
      'الشهر': p.month,
      'السنة': p.year,
      'البدلات': Number(p.allowances || 0),
      'الخصومات': Number(p.deductions || 0),
      'صافي الراتب': Number(p.net_salary || 0),
      'تاريخ الصرف': p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-EG') : '',
      'الحالة': p.status === 'paid' ? 'مدفوع' : p.status
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الرواتب');
    XLSX.writeFile(wb, `رواتب_${filterMonth}_${filterYear}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">الرواتب الشهرية</h2>
          <p className="text-sm text-muted-foreground">إدارة الموظفين والأقسام وصرف الرواتب مع التوجيه المحاسبي</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportReport} disabled={!filteredPayrolls.length}>
            <Download className="w-4 h-4 ml-1" /> تصدير التقرير
          </Button>
          <Button size="sm" onClick={() => setShowPayrollModal(true)}>
            <DollarSign className="w-4 h-4 ml-1" /> صرف راتب
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">الموظفين</p>
          <p className="text-2xl font-bold text-primary">{staff.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">الأقسام</p>
          <p className="text-2xl font-bold">{departments.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">رواتب الشهر</p>
          <p className="text-2xl font-bold text-emerald-600">{filteredPayrolls.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي {filterMonth}/{filterYear}</p>
          <p className="text-2xl font-bold">{monthlyTotal.toLocaleString()} {currency}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="departments">الأقسام</TabsTrigger>
          <TabsTrigger value="payroll">مسير الرواتب</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4 mt-4">
          <div className="flex justify-between">
            <h3 className="font-bold">سجل الموظفين</h3>
            <Button size="sm" onClick={() => {
              setEditingStaff(null);
              setStaffForm({ full_name: '', position: '', basic_salary: '', allowances: '0', deductions: '0', department_id: '', expense_account_id: '', phone: '', email: '', hire_date: '' });
              setShowStaffModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> موظف جديد
            </Button>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-3 py-2 text-right">الاسم</th>
                  <th className="px-3 py-2 text-right">الوظيفة</th>
                  <th className="px-3 py-2 text-right">القسم</th>
                  <th className="px-3 py-2 text-right">الراتب الأساسي</th>
                  <th className="px-3 py-2 text-right">صافي</th>
                  <th className="px-3 py-2 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const net = Number(s.basic_salary || 0) + Number(s.allowances || 0) - Number(s.deductions || 0);
                  return (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{s.full_name}</td>
                      <td className="px-3 py-2">{s.position || '-'}</td>
                      <td className="px-3 py-2">{s.staff_departments?.name || '-'}</td>
                      <td className="px-3 py-2">{Number(s.basic_salary || 0).toLocaleString()} {currency}</td>
                      <td className="px-3 py-2 font-bold text-primary">{net.toLocaleString()} {currency}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openPayrollForStaff(s)}><DollarSign className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingStaff(s);
                            setStaffForm({
                              full_name: s.full_name, position: s.position || '',
                              basic_salary: String(s.basic_salary || ''), allowances: String(s.allowances || 0),
                              deductions: String(s.deductions || 0), department_id: s.department_id || '',
                              expense_account_id: s.expense_account_id || '', phone: s.phone || '',
                              email: s.email || '', hire_date: s.hire_date?.split('T')[0] || ''
                            });
                            setShowStaffModal(true);
                          }}><Edit2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!staff.length && !loading && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد موظفين — أضف موظفاً أو أنشئ الأقسام أولاً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4 mt-4">
          <div className="flex justify-between flex-wrap gap-2">
            <h3 className="font-bold">الأقسام والقطاعات</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={seedDepartments}>
                <Building2 className="w-4 h-4 ml-1" /> أقسام {businessType === 'marketing_agency' ? 'الوكالة' : 'النشاط'}
              </Button>
              <Button size="sm" onClick={() => { setEditingDept(null); setDeptForm({ name: '', code: '', expense_account_id: '' }); setShowDeptModal(true); }}>
                <Plus className="w-4 h-4 ml-1" /> قسم جديد
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map(d => (
              <Card key={d.id} className="p-4 glass-card">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{d.name}</h4>
                    {d.code && <Badge variant="outline" className="mt-1">{d.code}</Badge>}
                    <p className="text-xs text-muted-foreground mt-2">
                      حساب المصروف: {accounts.find(a => a.id === d.expense_account_id)?.name || '6100 رواتب (افتراضي)'}
                    </p>
                    <p className="text-xs mt-1">{staff.filter(s => s.department_id === d.id).length} موظف</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingDept(d);
                    setDeptForm({ name: d.name, code: d.code || '', expense_account_id: d.expense_account_id || '' });
                    setShowDeptModal(true);
                  }}><Edit2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4 mt-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label>الشهر</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>السنة</Label>
              <Input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-28" />
            </div>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-3 py-2 text-right">الموظف</th>
                  <th className="px-3 py-2 text-right">القسم</th>
                  <th className="px-3 py-2 text-right">البدلات</th>
                  <th className="px-3 py-2 text-right">الخصومات</th>
                  <th className="px-3 py-2 text-right">الصافي</th>
                  <th className="px-3 py-2 text-right">التاريخ</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-medium">{p.staff_profiles?.full_name}</td>
                    <td className="px-3 py-2">{p.staff_departments?.name || '-'}</td>
                    <td className="px-3 py-2">{Number(p.allowances || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{Number(p.deductions || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-bold text-primary">{Number(p.net_salary).toLocaleString()} {currency}</td>
                    <td className="px-3 py-2">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-EG') : '-'}</td>
                    <td className="px-3 py-2"><Badge>{p.status === 'paid' ? 'مدفوع' : p.status}</Badge></td>
                  </tr>
                ))}
                {!filteredPayrolls.length && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد رواتب لهذا الشهر</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card className="p-6 glass-card">
            <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> تقرير الرواتب حسب القسم — {filterMonth}/{filterYear}</h3>
            <div className="space-y-3">
              {deptBreakdown.map(([dept, total]) => (
                <div key={dept} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                  <span className="font-medium">{dept}</span>
                  <span className="font-bold text-primary">{total.toLocaleString()} {currency}</span>
                </div>
              ))}
              {deptBreakdown.length === 0 && <p className="text-muted-foreground text-center py-4">لا توجد بيانات للتقرير</p>}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="text-primary">{monthlyTotal.toLocaleString()} {currency}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Staff Modal */}
      <Dialog open={showStaffModal} onOpenChange={setShowStaffModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStaff ? 'تعديل موظف' : 'موظف جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label>الاسم *</Label><Input value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الوظيفة</Label><Input value={staffForm.position} onChange={e => setStaffForm({ ...staffForm, position: e.target.value })} /></div>
              <div><Label>القسم</Label>
                <select className="w-full h-10 rounded-md border px-3 bg-background" value={staffForm.department_id} onChange={e => setStaffForm({ ...staffForm, department_id: e.target.value })}>
                  <option value="">بدون قسم</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>الراتب الأساسي</Label><Input type="number" value={staffForm.basic_salary} onChange={e => setStaffForm({ ...staffForm, basic_salary: e.target.value })} /></div>
              <div><Label>البدلات</Label><Input type="number" value={staffForm.allowances} onChange={e => setStaffForm({ ...staffForm, allowances: e.target.value })} /></div>
              <div><Label>الخصومات</Label><Input type="number" value={staffForm.deductions} onChange={e => setStaffForm({ ...staffForm, deductions: e.target.value })} /></div>
            </div>
            <div><Label>حساب مصروف الراتب</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={staffForm.expense_account_id} onChange={e => setStaffForm({ ...staffForm, expense_account_id: e.target.value })}>
                <option value="">افتراضي (6100 رواتب)</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={handleSaveStaff}>{editingStaff ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Modal */}
      <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDept ? 'تعديل قسم' : 'قسم جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label>اسم القسم *</Label><Input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
            <div><Label>حساب المصروف في الشجرة</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={deptForm.expense_account_id} onChange={e => setDeptForm({ ...deptForm, expense_account_id: e.target.value })}>
                <option value="">6100 رواتب (افتراضي)</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={handleSaveDept}>{editingDept ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Modal */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>صرف راتب شهري</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label>الموظف *</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.staff_id} onChange={e => {
                const s = staff.find(x => x.id === e.target.value);
                if (s) openPayrollForStaff(s);
                else setPayrollForm({ ...payrollForm, staff_id: e.target.value });
              }}>
                <option value="">اختر الموظف</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشهر</Label><Input type="number" min={1} max={12} value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: e.target.value })} /></div>
              <div><Label>السنة</Label><Input type="number" value={payrollForm.year} onChange={e => setPayrollForm({ ...payrollForm, year: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>البدلات</Label><Input type="number" value={payrollForm.allowances} onChange={e => setPayrollForm({ ...payrollForm, allowances: e.target.value })} /></div>
              <div><Label>الخصومات</Label><Input type="number" value={payrollForm.deductions} onChange={e => setPayrollForm({ ...payrollForm, deductions: e.target.value })} /></div>
              <div><Label>الصافي *</Label><Input type="number" value={payrollForm.net_salary} onChange={e => setPayrollForm({ ...payrollForm, net_salary: e.target.value })} /></div>
            </div>
            <div><Label>حساب مصروف الرواتب (مدين)</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.expense_account_id} onChange={e => setPayrollForm({ ...payrollForm, expense_account_id: e.target.value })}>
                <option value="">تلقائي من القسم/الموظف</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <div><Label>حساب الدفع (دائن — خزينة/بنك)</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={payrollForm.payment_account_id} onChange={e => setPayrollForm({ ...payrollForm, payment_account_id: e.target.value })}>
                <option value="">1100 خزينة (افتراضي)</option>
                {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
            <Button className="w-full gradient-bg border-0 text-white" onClick={handlePayroll}>
              <Calendar className="w-4 h-4 ml-1" /> صرف وترحيل محاسبي
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
