// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Edit2, Trash2, Shield, Eye, EyeOff, X, DollarSign, 
  Building2, Calendar, RefreshCw, Download, Globe, Award, CreditCard, 
  TrendingUp, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StaffAccessApprovals } from './StaffAccessApprovals';
import * as XLSX from 'xlsx';

const STANDARD_ROLES: Record<string, { label: string; icon: string; color: string }> = {
  branch_manager: { label: 'مدير فرع', icon: '👔', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  cashier: { label: 'كاشير', icon: '💰', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  waiter: { label: 'ويتر', icon: '🍽️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  stock_keeper: { label: 'أمين مخزن', icon: '📦', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  accountant: { label: 'محاسب', icon: '📊', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  chef: { label: 'شيف', icon: '👨‍🍳', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const COUNTRY_PRESETS: Record<string, any> = {
  egypt: {
    label: 'مصر', flag: '🇪🇬', currency: 'ج.م',
    incomeTaxBrackets: [
      { upTo: 15000, rate: 0, label: 'معفى (حتى 15,000 ج.م)' },
      { upTo: 30000, rate: 2.5, label: '2.5% (15,001 – 30,000)' },
      { upTo: 45000, rate: 10, label: '10% (30,001 – 45,000)' },
      { upTo: 60000, rate: 15, label: '15% (45,001 – 60,000)' },
      { upTo: 200000, rate: 20, label: '20% (60,001 – 200,000)' },
      { upTo: 400000, rate: 22.5, label: '22.5% (200,001 – 400,000)' },
      { upTo: 9999999, rate: 25, label: '25% (فوق 400,000)' },
    ],
    employeeInsurance: 11,
    employerInsurance: 18.75,
    pensionRate: 0,
    notes: 'تأمينات اجتماعية: 11% موظف + 18.75% صاحب عمل (قانون 148 لسنة 2019)',
  },
  saudi: {
    label: 'السعودية', flag: '🇸🇦', currency: 'ر.س',
    incomeTaxBrackets: [{ upTo: 9999999, rate: 0, label: 'لا توجد ضريبة دخل على المواطنين' }],
    employeeInsurance: 10,
    employerInsurance: 12,
    pensionRate: 2,
    notes: 'التأمينات الاجتماعية (GOSI): 10% موظف + 12% صاحب عمل. لا توجد ضريبة دخل على الرواتب.',
  },
  uae: {
    label: 'الإمارات', flag: '🇦🇪', currency: 'د.إ',
    incomeTaxBrackets: [{ upTo: 9999999, rate: 0, label: 'لا توجد ضريبة دخل' }],
    employeeInsurance: 5,
    employerInsurance: 12.5,
    pensionRate: 2.5,
    notes: 'المواطنون الإماراتيون: 5% موظف + 12.5% صاحب عمل (GPSSA). الوافدون: لا تأمينات إلزامية.',
  },
  custom: {
    label: 'مخصص', flag: '🌍', currency: '',
    incomeTaxBrackets: [{ upTo: 9999999, rate: 0, label: 'حدد النسبة يدوياً' }],
    employeeInsurance: 0,
    employerInsurance: 0,
    pensionRate: 0,
    notes: 'أدخل النسب يدوياً حسب قوانين بلدك.',
  },
};

function calcIncomeTax(annualGross: number, brackets: any): number {
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (annualGross <= prev) break;
    const taxable = Math.min(annualGross, bracket.upTo) - prev;
    tax += (taxable * bracket.rate) / 100;
    prev = bracket.upTo;
  }
  return tax / 12;
}

interface Props {
  restaurantId: string;
  currency: string;
  businessType?: any;
}

export function EmployeesTab({ restaurantId, currency, businessType }: Props) {
  const [activeSubView, setActiveSubView] = useState<'access' | 'staff' | 'departments' | 'payroll' | 'tax' | 'roles'>('access');
  const [staff, setStaff] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '', role: 'cashier', phone: '', pin: '0000',
    base_salary: '', payment_cycle: 'monthly' as any,
    department_id: '', expense_account_id: '', allowances: '0', deductions: '0',
    email: '', hire_date: ''
  });

  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '', code: '', expense_account_id: '', manager_id: ''
  });

  const [showPayrollModal, setShowPayrollModal] = useState<any | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    staff_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
    net_salary: '', gross_salary: '', allowances: '0', deductions: '0',
    tax_amount: '0', insurance_employee: '0', insurance_employer: '0',
    expense_account_id: '', payment_account_id: '', department_id: '', notes: ''
  });

  const [taxConfig, setTaxConfig] = useState<any>(COUNTRY_PRESETS.egypt);
  const [editingTax, setEditingTax] = useState(false);
  const [taxForm, setTaxForm] = useState<any>(COUNTRY_PRESETS.egypt);

  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [showPin, setShowPin] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes, profilesRes, deptRes, accountsRes, payrollRes] = await Promise.all([
        supabase.from('restaurant_staff').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('restaurant_custom_roles').select('*').eq('restaurant_id', restaurantId),
        supabase.from('staff_profiles').select('*, staff_departments(*)').eq('restaurant_id', restaurantId),
        supabase.from('staff_departments').select('*').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('chart_of_accounts').select('id, code, name, account_type, is_cash_account, is_bank_account').eq('restaurant_id', restaurantId).eq('is_active', true).order('code'),
        supabase.from('payroll_transactions').select('*, staff_profiles(full_name, position), staff_departments(name)').eq('restaurant_id', restaurantId).order('year', { ascending: false }).order('month', { ascending: false })
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.restaurant_staff_id || p.full_name, p]));
      const mappedStaff = (staffRes.data || []).map((s: any) => {
        const profile = profilesMap.get(s.id) || profilesMap.get(s.name);
        return { ...s, profile };
      });

      setStaff(mappedStaff);
      setCustomRoles((rolesRes.data || []));
      setDepartments(deptRes.data || []);
      setAccounts(accountsRes.data || []);
      setPayrolls(payrollRes.data || []);

      const savedTax = localStorage.getItem(`payroll_tax_${restaurantId}`);
      if (savedTax) {
        const cfg = JSON.parse(savedTax);
        setTaxConfig(cfg);
        setTaxForm(cfg);
      }
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
  const filteredPayrolls = useMemo(() =>
    payrolls.filter(p => String(p.month) === filterMonth && String(p.year) === filterYear),
    [payrolls, filterMonth, filterYear]
  );
  const monthlyTotal = filteredPayrolls.reduce((s, p) => s + Number(p.net_salary || 0), 0);
  const monthlyGross = filteredPayrolls.reduce((s, p) => s + Number(p.gross_salary || p.net_salary || 0), 0);
  const monthlyTax = filteredPayrolls.reduce((s, p) => s + Number(p.tax_amount || 0), 0);
  const monthlyInsurance = filteredPayrolls.reduce((s, p) => s + Number(p.insurance_employee || 0), 0);
  const activeStaff = staff.filter(s => s.is_active);

  const getRoleDisplay = (roleKey: string) => {
    if (STANDARD_ROLES[roleKey]) return STANDARD_ROLES[roleKey];
    const custom = customRoles.find(r => r.name_ar === roleKey);
    if (custom) return { label: custom.name_ar, icon: '👤', color: 'bg-primary/10 text-primary border-primary/20' };
    return { label: roleKey, icon: '👤', color: 'bg-secondary text-muted-foreground border-border' };
  };

  const calcPayrollBreakdown = (basicSalary: number, allowances: number, extraDeductions: number) => {
    const gross = basicSalary + allowances;
    const annualGross = gross * 12;
    let taxAmount = 0;
    if (taxConfig.incomeTaxEnabled && taxConfig.country === 'egypt') {
      taxAmount = calcIncomeTax(annualGross, COUNTRY_PRESETS.egypt.incomeTaxBrackets);
    } else if (taxConfig.customTaxRate > 0) {
      taxAmount = (gross * taxConfig.customTaxRate) / 100;
    }
    const insuranceEmployee = (gross * taxConfig.employeeInsurance) / 100;
    const insuranceEmployer = (gross * taxConfig.employerInsurance) / 100;
    const pension = (gross * taxConfig.pensionRate) / 100;
    const net = gross - taxAmount - insuranceEmployee - pension - extraDeductions;
    return {
      gross: Math.round(gross),
      taxAmount: Math.round(taxAmount * 100) / 100,
      insuranceEmployee: Math.round(insuranceEmployee * 100) / 100,
      insuranceEmployer: Math.round(insuranceEmployer * 100) / 100,
      pension: Math.round(pension * 100) / 100,
      net: Math.round(Math.max(0, net) * 100) / 100,
    };
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name.trim()) { toast.error('أدخل اسم الموظف'); return; }
    setLoading(true);
    try {
      const staffPayload = {
        restaurant_id: restaurantId,
        name: staffForm.name,
        role: staffForm.role,
        phone: staffForm.phone,
        pin: staffForm.pin,
        base_salary: Number(staffForm.base_salary) || 0,
        payment_cycle: staffForm.payment_cycle
      };
      let staffId = '';
      if (editingStaff) {
        staffId = editingStaff.id;
        const { error } = await supabase.from('restaurant_staff').update(staffPayload).eq('id', editingStaff.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('restaurant_staff').insert(staffPayload).select('id').single();
        if (error) throw error;
        staffId = data.id;
      }
      const profilePayload = {
        restaurant_id: restaurantId,
        restaurant_staff_id: staffId,
        full_name: staffForm.name,
        position: getRoleDisplay(staffForm.role).label || staffForm.role,
        basic_salary: Number(staffForm.base_salary) || 0,
        allowances: Number(staffForm.allowances) || 0,
        deductions: Number(staffForm.deductions) || 0,
        department_id: staffForm.department_id || null,
        expense_account_id: staffForm.expense_account_id || null,
        phone: staffForm.phone || null,
        email: staffForm.email || null,
        hire_date: staffForm.hire_date || null,
        status: 'active'
      };
      let existingProfile = editingStaff?.profile;
      if (!existingProfile && editingStaff) {
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
      toast.success(editingStaff ? 'تم تحديث بيانات الموظف بنجاح ✅' : 'تم إضافة الموظف بنجاح ✅');
      resetStaffForm();
      load();
    } catch (e: any) {
      toast.error('فشل حفظ الموظف: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetStaffForm = () => {
    setShowStaffForm(false);
    setEditingStaff(null);
    setStaffForm({
      name: '', role: 'cashier', phone: '', pin: '0000',
      base_salary: '', payment_cycle: 'monthly',
      department_id: '', expense_account_id: '', allowances: '0', deductions: '0',
      email: '', hire_date: ''
    });
  };

  const handleDeleteStaff = async (member: any) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف: ${member.name}؟`)) return;
    try {
      if (member.profile?.id) await supabase.from('staff_profiles').delete().eq('id', member.profile.id);
      await supabase.from('restaurant_staff').delete().eq('id', member.id);
      toast.success('تم حذف الموظف');
      load();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const handleToggleStaff = async (s: any) => {
    await supabase.from('restaurant_staff').update({ is_active: !s.is_active }).eq('id', s.id);
    if (s.profile?.id) {
      await supabase.from('staff_profiles').update({ status: !s.is_active ? 'active' : 'inactive' }).eq('id', s.profile.id);
    }
    load();
  };

  const startEditStaff = (s: any) => {
    setEditingStaff(s);
    setStaffForm({
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
    setShowStaffForm(true);
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

  const resetDeptForm = () => {
    setShowDeptForm(false);
    setEditingDept(null);
    setDeptForm({ name: '', code: '', expense_account_id: '', manager_id: '' });
  };

  const startEditDept = (d: any) => {
    setEditingDept(d);
    setDeptForm({
      name: d.name,
      code: d.code || '',
      expense_account_id: d.expense_account_id || '',
      manager_id: d.manager_id || ''
    });
    setShowDeptForm(true);
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    setLoading(true);
    try {
      await supabase.from('staff_departments').delete().eq('id', id);
      toast.success('تم حذف القسم بنجاح');
      load();
    } catch (e: any) {
      toast.error('فشل حذف القسم: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openPayrollModal = (s: any) => {
    const basic = Number(s.base_salary || s.profile?.basic_salary || 0);
    const allowances = Number(s.profile?.allowances || 0);
    const deductions = Number(s.profile?.deductions || 0);
    const breakdown = calcPayrollBreakdown(basic, allowances, deductions);
    setPayrollForm({
      staff_id: s.profile?.id || '',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      gross_salary: String(breakdown.gross),
      net_salary: String(breakdown.net),
      allowances: String(allowances),
      deductions: String(deductions),
      tax_amount: String(breakdown.taxAmount),
      insurance_employee: String(breakdown.insuranceEmployee),
      insurance_employer: String(breakdown.insuranceEmployer),
      expense_account_id: s.profile?.expense_account_id || s.profile?.staff_departments?.expense_account_id || '',
      payment_account_id: accounts.find(a => a.code === '1100')?.id || '',
      department_id: s.profile?.department_id || '',
      notes: ''
    });
    setShowPayrollModal(s);
  };

  const handlePayroll = async () => {
    if (!showPayrollModal?.profile?.id) {
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
        p_staff_id: showPayrollModal.profile.id,
        p_net_salary: net,
        p_month: Number(payrollForm.month),
        p_year: Number(payrollForm.year),
        p_expense_account_id: payrollForm.expense_account_id || null,
        p_payment_account_id: payrollForm.payment_account_id || null,
        p_department_id: payrollForm.department_id || null,
        p_allowances: Number(payrollForm.allowances) || 0,
        p_deductions: Number(payrollForm.deductions) + Number(payrollForm.tax_amount) + Number(payrollForm.insurance_employee),
        p_notes: payrollForm.notes || ''
      });
      if (error) throw error;
      toast.success(`تم صرف الراتب للموظف ${showPayrollModal.name} وترحيله بنجاح ✅`);
      setShowPayrollModal(null);
      load();
    } catch (e: any) {
      toast.error('خطأ في ترحيل الراتب محاسبياً: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTaxConfig = () => {
    try {
      localStorage.setItem(`payroll_tax_${restaurantId}`, JSON.stringify(taxForm));
      setTaxConfig(taxForm);
      setEditingTax(false);
      toast.success(`تم حفظ إعدادات الضرائب والتأمينات ✅`);
    } catch {
      toast.error('فشل حفظ الإعدادات');
    }
  };

  const handleCountryChange = (country: string) => {
    const preset = COUNTRY_PRESETS[country];
    if (preset) {
      setTaxForm({ ...preset, incomeTaxEnabled: country === 'egypt' });
    }
  };

  const exportReport = () => {
    const rows = filteredPayrolls.map(p => ({
      'الموظف': p.staff_profiles?.full_name || '',
      'القسم': p.staff_departments?.name || '',
      'الشهر': p.month,
      'السنة': p.year,
      'الإجمالي': Number(p.gross_salary || p.net_salary || 0),
      'البدلات': Number(p.allowances || 0),
      'الخصومات': Number(p.deductions || 0),
      'ضريبة الدخل': Number(p.tax_amount || 0),
      'تأمين الموظف': Number(p.insurance_employee || 0),
      'الصافي': Number(p.net_salary || 0),
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 flex items-center gap-3 border border-primary/10">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground">إجمالي الموظفين</p><p className="font-display font-bold text-sm text-primary">{staff.length}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3 border border-border/50"><span className="text-xl">💰</span><div><p className="text-[10px] text-muted-foreground">كاشير</p><p className="font-display font-bold text-sm">{staff.filter(s => s.role === 'cashier').length}</p></div></div>
        <div className="glass-card p-3 flex items-center gap-3 border border-border/50"><span className="text-xl">👨‍🍳</span><div><p className="text-[10px] text-muted-foreground">شيف</p><p className="font-display font-bold text-sm">{staff.filter(s => s.role === 'chef').length}</p></div></div>
        <div className="glass-card p-3 flex items-center gap-3 border border-border/50"><span className="text-xl">👔</span><div><p className="text-[10px] text-muted-foreground">مدير</p><p className="font-display font-bold text-sm">{staff.filter(s => s.role === 'branch_manager').length}</p></div></div>
        <div className="glass-card p-3 flex items-center gap-3 border border-border/50"><DollarSign className="w-5 h-5 text-primary" /><div><p className="text-[10px] text-muted-foreground">إجمالي رواتب {filterMonth}/{filterYear}</p><p className="font-display font-bold text-sm">{monthlyGross.toLocaleString()} {currency}</p></div></div>
        <div className="glass-card p-3 flex items-center gap-3 border border-border/50"><CreditCard className="w-5 h-5 text-emerald-500" /><div><p className="text-[10px] text-muted-foreground">صافي مصروف</p><p className="font-display font-bold text-sm text-emerald-500">{monthlyTotal.toLocaleString()} {currency}</p></div></div>
      </div>

      <div className="flex gap-2 border-b pb-2 border-border/40 flex-wrap">
        <Button variant={activeSubView === 'access' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('access')} className={activeSubView === 'access' ? 'gradient-bg text-primary-foreground border-0' : ''}><Shield className="w-4 h-4 ml-1" /> موافقات الدخول</Button>
        <Button variant={activeSubView === 'staff' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('staff')} className={activeSubView === 'staff' ? 'gradient-bg text-primary-foreground border-0' : ''}><Users className="w-4 h-4 ml-1" /> الموظفين</Button>
        <Button variant={activeSubView === 'departments' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('departments')} className={activeSubView === 'departments' ? 'gradient-bg text-primary-foreground border-0' : ''}><Building2 className="w-4 h-4 ml-1" /> الأقسام</Button>
        <Button variant={activeSubView === 'payroll' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('payroll')} className={activeSubView === 'payroll' ? 'gradient-bg text-primary-foreground border-0' : ''}><DollarSign className="w-4 h-4 ml-1" /> الرواتب</Button>
        <Button variant={activeSubView === 'roles' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('roles')} className={activeSubView === 'roles' ? 'gradient-bg text-primary-foreground border-0' : ''}><Shield className="w-4 h-4 ml-1" /> الأدوار الوظيفية</Button>
        <Button variant={activeSubView === 'tax' ? 'default' : 'outline'} size="sm" onClick={() => setActiveSubView('tax')} className={activeSubView === 'tax' ? 'gradient-bg text-primary-foreground border-0' : ''}><Globe className="w-4 h-4 ml-1" /> الضرائب</Button>
      </div>

      {activeSubView === 'access' && (
        <StaffAccessApprovals restaurantId={restaurantId} />
      )}

      {activeSubView === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-xl font-bold flex items-center gap-2">إدارة الموظفين ({activeStaff.length} نشط){loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}</h2><p className="text-xs text-muted-foreground">إدارة الموظفين والوظائف والرواتب</p></div>
            <Button onClick={() => { resetStaffForm(); setShowStaffForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة موظف</Button>
          </div>

          <div className="space-y-2">
            {staff.map(s => {
              const roleInfo = getRoleDisplay(s.role);
              const basicSalary = s.base_salary || s.profile?.basic_salary || 0;
              const managedDept = departments.find(d => d.manager_id === s.profile?.id);
              return (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card p-4 flex items-center justify-between gap-4 border border-border/50 hover:border-primary/20 transition-all ${!s.is_active ? 'opacity-50 bg-secondary/50' : ''}`}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl shrink-0">{roleInfo.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{s.name}</p>
                        <Badge className={`text-[10px] border ${roleInfo.color}`}>{roleInfo.label}</Badge>
                        {s.profile?.staff_departments?.name && <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5"><Building2 className="w-2.5 h-2.5 ml-1" /> {s.profile.staff_departments.name}</Badge>}
                        {managedDept && <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">👑 مدير قسم: {managedDept.name}</Badge>}
                        {!s.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {s.phone && <span>📱 {s.phone}</span>}
                        {s.profile?.email && <span>📧 {s.profile.email}</span>}
                        <span>PIN: {showPin === s.id ? s.pin : '••••'}</span>
                        <button onClick={() => setShowPin(showPin === s.id ? null : s.id)} className="text-primary hover:underline">{showPin === s.id ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}</button>
                      </div>
                      {basicSalary > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">الراتب: {basicSalary.toLocaleString()} {currency} / {s.payment_cycle === 'monthly' ? 'شهر' : s.payment_cycle === 'weekly' ? 'أسبوع' : 'يوم'}</Badge>
                          {s.profile?.allowances > 0 && <span className="text-[10px] text-emerald-600 font-bold">+ {Number(s.profile.allowances).toLocaleString()} بدلات</span>}
                          {s.profile?.deductions > 0 && <span className="text-[10px] text-destructive font-bold">- {Number(s.profile.deductions).toLocaleString()} خصومات</span>}
                          <Button size="xs" variant="outline" className="h-6 text-[10px]" onClick={() => openPayrollModal(s)}><DollarSign className="w-3.5 h-3.5 ml-0.5" /> صرف راتب</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleStaff(s)}>{s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</Button>
                    <Button size="sm" variant="ghost" onClick={() => startEditStaff(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteStaff(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </motion.div>
              );
            })}
            {staff.length === 0 && !loading && (
              <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد موظفين حالياً. أضف موظفاً جديداً للبدء!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubView === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-xl font-bold flex items-center gap-2">الأقسام ({departments.length} أقسام){loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}</h2><p className="text-xs text-muted-foreground">توزيع الموظفين على الأقسام</p></div>
            <Button onClick={() => { resetDeptForm(); setShowDeptForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة قسم</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(d => {
              const deptStaff = staff.filter(s => s.profile?.department_id === d.id);
              const manager = staff.find(s => s.profile?.id === d.manager_id);
              return (
                <Card key={d.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold flex items-center gap-2">{d.name}{d.code && <Badge variant="outline">{d.code}</Badge>}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{deptStaff.length} موظف</p>
                      {manager && <p className="text-xs text-primary mt-1">👑 {manager.name}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEditDept(d)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteDept(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {d.expense_account_id && <p className="text-[10px] text-muted-foreground mt-2">حساب مصروف: {accounts.find(a => a.id === d.expense_account_id)?.name || '6100 رواتب'}</p>}
                </Card>
              );
            })}
            {departments.length === 0 && !loading && <div className="md:col-span-2 lg:col-span-3 text-center py-20 text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>لا يوجد أقسام. أضف قسماً جديداً!</p></div>}
          </div>
        </div>
      )}

      {activeSubView === 'payroll' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><h2 className="font-display text-xl font-bold flex items-center gap-2">مسير الرواتب{loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}</h2><p className="text-xs text-muted-foreground">إدارة الرواتب الشهرية والتصدير</p></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2"><Label className="text-xs">الشهر</Label><select className="h-10 rounded-md border border-input bg-background px-3" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>{Array.from({length:12},(_,i)=> <option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></div>
              <div className="flex items-center gap-2"><Label className="text-xs">السنة</Label><Input type="number" className="w-24 h-10" value={filterYear} onChange={e => setFilterYear(e.target.value)} /></div>
              <Button variant="outline" size="sm" onClick={exportReport} disabled={!filteredPayrolls.length}><Download className="w-4 h-4 ml-1" /> تصدير</Button>
            </div>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-3 py-2 text-right">الموظف</th>
                  <th className="px-3 py-2 text-right">القسم</th>
                  <th className="px-3 py-2 text-right">الإجمالي</th>
                  <th className="px-3 py-2 text-right">ضريبة</th>
                  <th className="px-3 py-2 text-right">تأمين</th>
                  <th className="px-3 py-2 text-right">الصافي</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-medium">{p.staff_profiles?.full_name}</td>
                    <td className="px-3 py-2">{p.staff_departments?.name || '-'}</td>
                    <td className="px-3 py-2">{Number(p.gross_salary || p.net_salary || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-amber-500">{Number(p.tax_amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-blue-400">{Number(p.insurance_employee || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-bold text-primary">{Number(p.net_salary).toLocaleString()} {currency}</td>
                    <td className="px-3 py-2"><Badge>{p.status === 'paid' ? 'مدفوع' : p.status}</Badge></td>
                  </tr>
                ))}
                {!filteredPayrolls.length && <tr><td colSpan={7} className="text-center py-20 text-muted-foreground">لا توجد رواتب لهذا الشهر</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubView === 'tax' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-xl font-bold flex items-center gap-2"><Globe className="w-5 h-5" /> إعدادات الضرائب والتأمينات</h2><p className="text-xs text-muted-foreground">إعداد الضرائب حسب بلدك</p></div>
            {!editingTax ? <Button variant="outline" size="sm" onClick={() => { setTaxForm(taxConfig); setEditingTax(true); }}><Edit2 className="w-4 h-4 ml-1" /> تعديل</Button> : <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditingTax(false)}>إلغاء</Button><Button size="sm" onClick={saveTaxConfig}><TrendingUp className="w-4 h-4 ml-1" /> حفظ</Button></div>}
          </div>
          <div className="glass-card p-6 rounded-xl">
            {editingTax ? (
              <div className="space-y-4">
                <div><Label>اختر البلد</Label><select className="w-full h-10 rounded-md border border-input bg-background mt-1" value={taxForm.country} onChange={e => handleCountryChange(e.target.value)}>{Object.entries(COUNTRY_PRESETS).map(([k,v])=> <option key={k} value={k}>{v.flag} {v.label}</option>)}</select></div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm"><AlertCircle className="w-4 h-4 inline ml-1 text-blue-400" /> {COUNTRY_PRESETS[taxForm.country]?.notes}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><Label>تأمين الموظف (%)</Label><Input type="number" step="0.01" value={taxForm.employeeInsurance} onChange={e => setTaxForm(prev => ({...prev, employeeInsurance: Number(e.target.value)}))} /></div>
                  <div><Label>تأمين صاحب العمل (%)</Label><Input type="number" step="0.01" value={taxForm.employerInsurance} onChange={e => setTaxForm(prev => ({...prev, employerInsurance: Number(e.target.value)}))} /></div>
                  <div><Label>معاش/تقاعد (%)</Label><Input type="number" step="0.01" value={taxForm.pensionRate} onChange={e => setTaxForm(prev => ({...prev, pensionRate: Number(e.target.value)}))} /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20"><span className="text-3xl">{taxConfig.flag}</span><div><p className="font-bold text-lg">{taxConfig.label}</p><p className="text-sm text-muted-foreground">{taxConfig.notes}</p></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[ {label:'تأمين الموظف', value:`${taxConfig.employeeInsurance}%`, color:'text-blue-400'}, {label:'تأمين صاحب العمل', value:`${taxConfig.employerInsurance}%`, color:'text-orange-400'}, {label:'معاش/تقاعد', value:`${taxConfig.pensionRate}%`, color:'text-purple-400'} ].map(item => <div key={item.label} className="bg-secondary/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">{item.label}</p><p className={`font-bold text-lg ${item.color}`}>{item.value}</p></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubView === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="font-display text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> إدارة الأدوار الوظيفية</h2><p className="text-xs text-muted-foreground">إضافة وتعديل الأدوار الوظيفية للموظفين</p></div>
            <Button onClick={() => setShowAddRole(true)} className="gradient-bg text-primary-foreground border-0" size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة دور جديد</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(STANDARD_ROLES).map(([key, role]) => (
              <Card key={key} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <p className="font-bold">{role.label}</p>
                      <Badge variant="outline" className="text-[10px] bg-primary/5">دور نظامي</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                    {staff.filter(s => s.role === key).length} موظف
                  </span>
                </div>
              </Card>
            ))}
            {customRoles.map(role => (
              <Card key={role.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-bold">{role.name_ar}</p>
                      <Badge variant="outline" className="text-[10px] bg-primary/5">دور مخصص</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                      {staff.filter(s => s.role === role.name_ar).length} موظف
                    </span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                      if (!confirm('حذف هذا الدور؟')) return;
                      try {
                        const { error } = await supabase.from('restaurant_custom_roles').delete().eq('id', role.id).eq('restaurant_id', restaurantId);
                        if (error) throw error;
                        toast.success('تم حذف الدور');
                        load();
                      } catch (e: any) { toast.error('خطأ: ' + e.message); }
                    }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showStaffForm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetStaffForm}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="glass-card p-6 max-w-lg w-full space-y-4 max-h-[95vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2"><h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary"><Shield className="w-5 h-5 text-primary" /> {editingStaff ? 'تعديل موظف' : 'إضافة موظف'}</h3><Button size="sm" variant="ghost" onClick={resetStaffForm}><X className="w-4 h-4" /></Button></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">اسم الموظف *</Label><Input placeholder="الاسم الكامل" value={staffForm.name} onChange={e=>setStaffForm(prev=>({...prev, name:e.target.value}))} /></div>
                  <div><Label className="text-xs">رقم الهاتف</Label><Input placeholder="05xxxxxxxx" value={staffForm.phone} onChange={e=>setStaffForm(prev=>({...prev, phone:e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">الدور الوظيفي</Label><select value={staffForm.role} onChange={e=>setStaffForm(prev=>({...prev, role:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm">{Object.entries(STANDARD_ROLES).map(([k,r])=> <option key={k} value={k}>{r.icon} {r.label}</option>)}{customRoles.map(role=> <option key={role.id} value={role.name_ar}>👤 {role.name_ar}</option>)}</select></div>
                  <div><Label className="text-xs">القسم</Label><select value={staffForm.department_id} onChange={e=>setStaffForm(prev=>({...prev, department_id:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"><option value="">بدون قسم</option>{departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">الراتب الأساسي</Label><Input type="number" value={staffForm.base_salary} onChange={e=>setStaffForm(prev=>({...prev, base_salary:e.target.value}))} /></div>
                  <div><Label className="text-xs">البدلات</Label><Input type="number" value={staffForm.allowances} onChange={e=>setStaffForm(prev=>({...prev, allowances:e.target.value}))} /></div>
                  <div><Label className="text-xs">الخصومات</Label><Input type="number" value={staffForm.deductions} onChange={e=>setStaffForm(prev=>({...prev, deductions:e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">دورة الصرف</Label><select value={staffForm.payment_cycle} onChange={e=>setStaffForm(prev=>({...prev, payment_cycle:e.target.value as any}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"><option value="monthly">شهري</option><option value="weekly">أسبوعي</option><option value="daily">يومي</option></select></div>
                  <div><Label className="text-xs">PIN</Label><Input type="text" maxLength={6} placeholder="0000" value={staffForm.pin} onChange={e=>setStaffForm(prev=>({...prev, pin:e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">البريد الإلكتروني</Label><Input type="email" placeholder="email@example.com" value={staffForm.email} onChange={e=>setStaffForm(prev=>({...prev, email:e.target.value}))} /></div>
                  <div><Label className="text-xs">تاريخ التعيين</Label><Input type="date" value={staffForm.hire_date} onChange={e=>setStaffForm(prev=>({...prev, hire_date:e.target.value}))} /></div>
                </div>
                <div><Label className="text-xs">حساب مصروف الرواتب</Label><select value={staffForm.expense_account_id} onChange={e=>setStaffForm(prev=>({...prev, expense_account_id:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"><option value="">6100 رواتب (الافتراضي)</option>{expenseAccounts.map(a=> <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
              </div>
              <div className="flex gap-2 pt-2 border-t"><Button onClick={handleSaveStaff} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">{loading ? 'جاري الحفظ...' : 'حفظ'}</Button><Button variant="outline" onClick={resetStaffForm} className="flex-1" disabled={loading}>إلغاء</Button></div>
            </motion.div>
          </motion.div>
        )}
        {showDeptForm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetDeptForm}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="glass-card p-6 max-w-md w-full space-y-4" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2"><h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary"><Building2 className="w-5 h-5 text-primary" /> {editingDept ? 'تعديل قسم' : 'إضافة قسم'}</h3><Button size="sm" variant="ghost" onClick={resetDeptForm}><X className="w-4 h-4" /></Button></div>
              <div className="space-y-3">
                <div><Label className="text-xs">اسم القسم *</Label><Input placeholder="مثال: قسم المبيعات" value={deptForm.name} onChange={e=>setDeptForm(prev=>({...prev, name:e.target.value}))} /></div>
                <div><Label className="text-xs">كود القسم</Label><Input placeholder="مثال: MKT" value={deptForm.code} onChange={e=>setDeptForm(prev=>({...prev, code:e.target.value}))} /></div>
                <div><Label className="text-xs">مدير القسم</Label><select value={deptForm.manager_id} onChange={e=>setDeptForm(prev=>({...prev, manager_id:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"><option value="">غير محدد</option>{staff.map(s=> <option key={s.profile?.id || s.id} value={s.profile?.id || s.id}>{s.name} ({getRoleDisplay(s.role).label})</option>)}</select></div>
                <div><Label className="text-xs">حساب مصروف القسم</Label><select value={deptForm.expense_account_id} onChange={e=>setDeptForm(prev=>({...prev, expense_account_id:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"><option value="">6100 رواتب (الافتراضي)</option>{expenseAccounts.map(a=> <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
              </div>
              <div className="flex gap-2 pt-2 border-t"><Button onClick={handleSaveDept} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">{loading ? 'جاري الحفظ...' : 'حفظ'}</Button><Button variant="outline" onClick={resetDeptForm} className="flex-1" disabled={loading}>إلغاء</Button></div>
            </motion.div>
          </motion.div>
        )}
        {showPayrollModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowPayrollModal(null)}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="glass-card p-6 max-w-md w-full space-y-4" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2"><h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary"><DollarSign className="w-5 h-5 text-primary" /> صرف راتب: {showPayrollModal.name}</h3><Button size="sm" variant="ghost" onClick={()=>setShowPayrollModal(null)}><X className="w-4 h-4" /></Button></div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">الشهر</Label><select value={payrollForm.month} onChange={e=>setPayrollForm(prev=>({...prev, month:e.target.value}))} className="w-full h-10 rounded-md border border-input bg-background px-3">{Array.from({length:12},(_,i)=> <option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></div>
                  <div><Label className="text-xs">السنة</Label><Input type="number" value={payrollForm.year} onChange={e=>setPayrollForm(prev=>({...prev, year:e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">البدلات</Label><Input type="number" value={payrollForm.allowances} onChange={e=>{ const newVal=e.target.value; const basic=Number(showPayrollModal.base_salary || 0); const breakdown=calcPayrollBreakdown(basic, Number(newVal), Number(payrollForm.deductions)); setPayrollForm(prev=>({...prev, allowances:newVal, gross_salary:String(breakdown.gross), net_salary:String(breakdown.net), tax_amount:String(breakdown.taxAmount), insurance_employee:String(breakdown.insuranceEmployee)})); }} /></div>
                  <div><Label className="text-xs">الخصومات</Label><Input type="number" value={payrollForm.deductions} onChange={e=>{ const newVal=e.target.value; const basic=Number(showPayrollModal.base_salary || 0); const breakdown=calcPayrollBreakdown(basic, Number(payrollForm.allowances), Number(newVal)); setPayrollForm(prev=>({...prev, deductions:newVal, gross_salary:String(breakdown.gross), net_salary:String(breakdown.net), tax_amount:String(breakdown.taxAmount), insurance_employee:String(breakdown.insuranceEmployee)})); }} /></div>
                  <div><Label className="text-xs">الصافي</Label><Input type="number" value={payrollForm.net_salary} onChange={e=>setPayrollForm(prev=>({...prev, net_salary:e.target.value}))} /></div>
                </div>
                <div><Label className="text-xs">حساب مصروف الرواتب</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3" value={payrollForm.expense_account_id} onChange={e=>setPayrollForm(prev=>({...prev, expense_account_id:e.target.value}))}><option value="">6100 رواتب (الافتراضي)</option>{expenseAccounts.map(a=> <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div><Label className="text-xs">حساب الدفع (خزنة/بنك)</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3" value={payrollForm.payment_account_id} onChange={e=>setPayrollForm(prev=>({...prev, payment_account_id:e.target.value}))}><option value="">1100 الخزنة (الافتراضي)</option>{paymentAccounts.map(a=> <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                <div><Label className="text-xs">ملاحظات</Label><Input placeholder="ملاحظات..." value={payrollForm.notes} onChange={e=>setPayrollForm(prev=>({...prev, notes:e.target.value}))} /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t"><Button onClick={handlePayroll} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0 gap-2"><Calendar className="w-4 h-4" /> {loading ? 'جاري الصرف...' : 'صرف وترحيل'}</Button><Button variant="outline" onClick={()=>setShowPayrollModal(null)} className="flex-1" disabled={loading}>إلغاء</Button></div>
            </motion.div>
          </motion.div>
        )}
        {showAddRole && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddRole(false)}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="glass-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5 text-primary" /> إضافة دور جديد
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowAddRole(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">اسم الدور *</Label>
                  <Input placeholder="مثال: مدير خدمة العملاء" value={newRoleForm.name} onChange={e => setNewRoleForm(prev => ({...prev, name: e.target.value}))} />
                </div>
                <div>
                  <Label className="text-xs">الوصف</Label>
                  <Input placeholder="وصف مختصر للدور" value={newRoleForm.description} onChange={e => setNewRoleForm(prev => ({...prev, description: e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={async () => {
                  if (!newRoleForm.name.trim()) {
                    toast.error('أدخل اسم الدور');
                    return;
                  }
                  try {
                    setLoading(true);
                    const { error } = await supabase.from('restaurant_custom_roles').insert({
                      restaurant_id: restaurantId,
                      name_ar: newRoleForm.name,
                      description: newRoleForm.description
                    });
                    if (error) throw error;
                    toast.success('تم إضافة الدور');
                    setShowAddRole(false);
                    setNewRoleForm({ name: '', description: '' });
                    load();
                  } catch (e: any) {
                    toast.error('خطأ: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddRole(false)} className="flex-1" disabled={loading}>
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
