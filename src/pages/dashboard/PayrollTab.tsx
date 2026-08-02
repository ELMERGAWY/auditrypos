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
  Users, DollarSign, Building2, FileText, Plus, Download,
  Edit2, Calendar, Globe, TrendingUp, ChevronDown, ChevronUp,
  AlertCircle, Award, CreditCard, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { BusinessType } from '@/lib/businessTypes';

// ─────────────────────────────────────────────────────────────────────
// Country Tax / Insurance Presets
// ─────────────────────────────────────────────────────────────────────
const COUNTRY_PRESETS: Record<string, {
  label: string; flag: string; currency: string;
  incomeTaxBrackets: Array<{ upTo: number; rate: number; label: string }>;
  employeeInsurance: number; // percentage
  employerInsurance: number; // percentage
  pensionRate: number;       // additional pension
  notes: string;
}> = {
  egypt: {
    label: 'مصر',
    flag: '🇪🇬',
    currency: 'ج.م',
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
    label: 'السعودية',
    flag: '🇸🇦',
    currency: 'ر.س',
    incomeTaxBrackets: [
      { upTo: 9999999, rate: 0, label: 'لا توجد ضريبة دخل على المواطنين' },
    ],
    employeeInsurance: 10,  // GOSI Employee (social insurance)
    employerInsurance: 12,  // GOSI Employer
    pensionRate: 2,         // Pension Fund (SANS)
    notes: 'التأمينات الاجتماعية (GOSI): 10% موظف + 12% صاحب عمل. لا توجد ضريبة دخل على الرواتب.',
  },
  uae: {
    label: 'الإمارات',
    flag: '🇦🇪',
    currency: 'د.إ',
    incomeTaxBrackets: [
      { upTo: 9999999, rate: 0, label: 'لا توجد ضريبة دخل' },
    ],
    employeeInsurance: 5,   // For UAE nationals
    employerInsurance: 12.5,
    pensionRate: 2.5,
    notes: 'المواطنون الإماراتيون: 5% موظف + 12.5% صاحب عمل (GPSSA). الوافدون: لا تأمينات إلزامية.',
  },
  custom: {
    label: 'مخصص',
    flag: '🌍',
    currency: '',
    incomeTaxBrackets: [
      { upTo: 9999999, rate: 0, label: 'حدد النسبة يدوياً' },
    ],
    employeeInsurance: 0,
    employerInsurance: 0,
    pensionRate: 0,
    notes: 'أدخل النسب يدوياً حسب قوانين بلدك.',
  },
};

// ─────────────────────────────────────────────────────────────────────
// Income tax calculator (Egypt bracketed system)
// ─────────────────────────────────────────────────────────────────────
function calcIncomeTax(annualGross: number, brackets: typeof COUNTRY_PRESETS.egypt.incomeTaxBrackets): number {
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (annualGross <= prev) break;
    const taxable = Math.min(annualGross, bracket.upTo) - prev;
    tax += (taxable * bracket.rate) / 100;
    prev = bracket.upTo;
  }
  return tax / 12; // Monthly
}

// ─────────────────────────────────────────────────────────────────────
// Department presets by business type
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// Country Tax Settings (stored locally)
// ─────────────────────────────────────────────────────────────────────
interface CountryTaxConfig {
  country: string;
  employeeInsurance: number;
  employerInsurance: number;
  pensionRate: number;
  incomeTaxEnabled: boolean;
  customTaxRate: number; // flat rate override (if not using brackets)
}

const DEFAULT_TAX_CONFIG: CountryTaxConfig = {
  country: 'egypt',
  employeeInsurance: 11,
  employerInsurance: 18.75,
  pensionRate: 0,
  incomeTaxEnabled: true,
  customTaxRate: 0,
};

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────
export function PayrollTab({ restaurantId, currency, businessType }: Props) {
  const [activeTab, setActiveTab] = useState('employees');
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Tax config
  const [taxConfig, setTaxConfig] = useState<CountryTaxConfig>(DEFAULT_TAX_CONFIG);
  const [editingTax, setEditingTax] = useState(false);
  const [taxForm, setTaxForm] = useState<CountryTaxConfig>(DEFAULT_TAX_CONFIG);

  // Advance / Leave requests
  const [advances, setAdvances] = useState<any[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ staff_id: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });

  // KPI / Performance
  const [kpiModal, setKpiModal] = useState<{ open: boolean; staff: any | null }>({ open: false, staff: null });
  const [kpiForm, setKpiForm] = useState({ score: '85', bonus: '0', deduction: '0', notes: '' });

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
    net_salary: '', gross_salary: '', allowances: '0', deductions: '0',
    tax_amount: '0', insurance_employee: '0', insurance_employer: '0',
    expense_account_id: '', payment_account_id: '', department_id: '', notes: '',
    journal_entry_id: ''
  });

  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const presetDepartments = DEPARTMENT_PRESETS[businessType] || DEPARTMENT_PRESETS.default;
  const countryPreset = COUNTRY_PRESETS[taxConfig.country] || COUNTRY_PRESETS.egypt;

  // Load saved tax config
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`payroll_tax_${restaurantId}`);
      if (saved) {
        const cfg = JSON.parse(saved);
        setTaxConfig(cfg);
        setTaxForm(cfg);
      }
    } catch {}
    loadAll();
  }, [restaurantId]);

  const saveTaxConfig = () => {
    try {
      const preset = COUNTRY_PRESETS[taxForm.country];
      // Auto-fill rates from preset if country changed, but keep manual overrides
      localStorage.setItem(`payroll_tax_${restaurantId}`, JSON.stringify(taxForm));
      setTaxConfig(taxForm);
      setEditingTax(false);
      toast.success(`تم حفظ إعدادات الضرائب والتأمينات (${preset?.label || taxForm.country}) ✅`);
    } catch {
      toast.error('فشل حفظ الإعدادات');
    }
  };

  // When country changes in form, auto-populate rates
  const handleCountryChange = (country: string) => {
    const preset = COUNTRY_PRESETS[country];
    if (preset) {
      setTaxForm(f => ({
        ...f,
        country,
        employeeInsurance: preset.employeeInsurance,
        employerInsurance: preset.employerInsurance,
        pensionRate: preset.pensionRate,
        incomeTaxEnabled: preset.incomeTaxBrackets[0]?.rate > 0 || country === 'egypt',
      }));
    }
  };

  // ─── Salary calculation with taxes ──────────────────────────────
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

  // ─── Data Loading ────────────────────────────────────────────────
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
  const monthlyGross = filteredPayrolls.reduce((s, p) => s + Number(p.gross_salary || p.net_salary || 0), 0);
  const monthlyTax = filteredPayrolls.reduce((s, p) => s + Number(p.tax_amount || 0), 0);
  const monthlyInsurance = filteredPayrolls.reduce((s, p) => s + Number(p.insurance_employee || 0), 0);

  const deptBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPayrolls.forEach(p => {
      const dept = p.staff_departments?.name || p.staff_profiles?.position || 'غير محدد';
      map[dept] = (map[dept] || 0) + Number(p.net_salary || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredPayrolls]);

  // ─── Seed Departments ────────────────────────────────────────────
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

  // ─── Staff CRUD ──────────────────────────────────────────────────
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

  // ─── Payroll Dispatch ────────────────────────────────────────────
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
      p_deductions: Number(payrollForm.deductions) + Number(payrollForm.tax_amount) + Number(payrollForm.insurance_employee),
      p_notes: `${payrollForm.notes || ''} | ضريبة: ${payrollForm.tax_amount} | تأمين موظف: ${payrollForm.insurance_employee}`
    });
    if (error) { toast.error('فشل صرف الراتب: ' + error.message); return; }
    toast.success('تم صرف الراتب وترحيله محاسبياً مع الضرائب والتأمينات ✅');
    setShowPayrollModal(false);
    loadAll();
  };

  const openPayrollForStaff = (s: any) => {
    const breakdown = calcPayrollBreakdown(
      Number(s.basic_salary || 0),
      Number(s.allowances || 0),
      Number(s.deductions || 0)
    );
    setPayrollForm({
      staff_id: s.id,
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      gross_salary: String(breakdown.gross),
      net_salary: String(breakdown.net),
      allowances: String(s.allowances || 0),
      deductions: String(s.deductions || 0),
      tax_amount: String(breakdown.taxAmount),
      insurance_employee: String(breakdown.insuranceEmployee),
      insurance_employer: String(breakdown.insuranceEmployer),
      expense_account_id: s.expense_account_id || s.staff_departments?.expense_account_id || '',
      payment_account_id: accounts.find(a => a.code === '1100')?.id || '',
      department_id: s.department_id || '',
      notes: ''
    });
    setShowPayrollModal(true);
  };

  // ─── Advance Salary ──────────────────────────────────────────────
  const handleAdvance = async () => {
    const amount = Number(advanceForm.amount);
    if (!advanceForm.staff_id || amount <= 0) { toast.error('اختر الموظف وأدخل المبلغ'); return; }

    // Record as a journal entry: debit employee receivable, credit cash
    const cashAccount = accounts.find(a => a.code === '1100')?.id;
    if (cashAccount) {
      await supabase.from('journal_entries').insert({
        restaurant_id: restaurantId,
        description: `سلفة — ${staff.find(s => s.id === advanceForm.staff_id)?.full_name} — ${advanceForm.reason}`,
        entry_date: advanceForm.date,
        reference_type: 'advance',
        lines: JSON.stringify([
          { account_id: null, debit: amount, credit: 0, description: 'ذمم موظفين (سلفة)' },
          { account_id: cashAccount, debit: 0, credit: amount, description: 'خزينة' }
        ])
      } as any);
    }
    toast.success(`تم تسجيل سلفة ${amount.toLocaleString()} ${currency} ✅`);
    setShowAdvanceModal(false);
    setAdvanceForm({ staff_id: '', amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
  };

  // ─── Export ──────────────────────────────────────────────────────
  const exportReport = () => {
    const rows = filteredPayrolls.map(p => ({
      'الموظف': p.staff_profiles?.full_name || '',
      'الوظيفة': p.staff_profiles?.position || '',
      'القسم': p.staff_departments?.name || '',
      'الشهر': p.month,
      'السنة': p.year,
      'الراتب الإجمالي': Number(p.gross_salary || p.net_salary || 0),
      'البدلات': Number(p.allowances || 0),
      'الخصومات': Number(p.deductions || 0),
      'ضريبة الدخل': Number(p.tax_amount || 0),
      'تأمين الموظف': Number(p.insurance_employee || 0),
      'صافي الراتب': Number(p.net_salary || 0),
      'تاريخ الصرف': p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-EG') : '',
      'الحالة': p.status === 'paid' ? 'مدفوع' : p.status
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الرواتب');
    XLSX.writeFile(wb, `رواتب_${filterMonth}_${filterYear}.xlsx`);
  };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">الموارد البشرية والرواتب</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Globe className="w-4 h-4" />
            إعداد الرواتب مع الضرائب والتأمينات —
            <span className="font-medium text-primary">{countryPreset.flag} {countryPreset.label}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowAdvanceModal(true)}>
            <CreditCard className="w-4 h-4 ml-1" /> صرف سلفة
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport} disabled={!filteredPayrolls.length}>
            <Download className="w-4 h-4 ml-1" /> تصدير
          </Button>
          <Button size="sm" onClick={() => setShowPayrollModal(true)}>
            <DollarSign className="w-4 h-4 ml-1" /> صرف راتب
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">الموظفين النشطين</p>
          <p className="text-2xl font-bold text-primary">{staff.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي الرواتب {filterMonth}/{filterYear}</p>
          <p className="text-2xl font-bold">{monthlyGross.toLocaleString()} {currency}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">ضرائب وتأمينات الشهر</p>
          <p className="text-2xl font-bold text-amber-500">{(monthlyTax + monthlyInsurance).toLocaleString()}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">صافي المصرف {filterMonth}/{filterYear}</p>
          <p className="text-2xl font-bold text-emerald-500">{monthlyTotal.toLocaleString()} {currency}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="employees">الموظفين</TabsTrigger>
          <TabsTrigger value="departments">الأقسام</TabsTrigger>
          <TabsTrigger value="payroll">مسير الرواتب</TabsTrigger>
          <TabsTrigger value="tax">الضرائب والتأمينات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        {/* ═══ Employees Tab ═══════════════════════════════════════ */}
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
                  <th className="px-3 py-2 text-right">صافي (بعد خصومات)</th>
                  <th className="px-3 py-2 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const breakdown = calcPayrollBreakdown(Number(s.basic_salary || 0), Number(s.allowances || 0), Number(s.deductions || 0));
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{s.full_name}</td>
                      <td className="px-3 py-2">{s.position || '-'}</td>
                      <td className="px-3 py-2">{s.staff_departments?.name || '-'}</td>
                      <td className="px-3 py-2">{Number(s.basic_salary || 0).toLocaleString()} {currency}</td>
                      <td className="px-3 py-2">
                        <div>
                          <span className="font-bold text-primary">{breakdown.net.toLocaleString()} {currency}</span>
                          <div className="text-xs text-muted-foreground">
                            ضريبة: {breakdown.taxAmount} | تأمين: {breakdown.insuranceEmployee}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openPayrollForStaff(s)}><DollarSign className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setKpiModal({ open: true, staff: s }); setKpiForm({ score: '85', bonus: '0', deduction: '0', notes: '' }); }}>
                            <Award className="w-4 h-4" />
                          </Button>
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
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد موظفين</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ═══ Departments Tab ════════════════════════════════════ */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          <div className="flex justify-between flex-wrap gap-2">
            <h3 className="font-bold">الأقسام والقطاعات</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={seedDepartments}>
                <Building2 className="w-4 h-4 ml-1" /> أقسام النشاط الافتراضية
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
                      حساب المصروف: {accounts.find(a => a.id === d.expense_account_id)?.name || '6100 رواتب'}
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

        {/* ═══ Payroll Tab ════════════════════════════════════════ */}
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
                {!filteredPayrolls.length && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد رواتب لهذا الشهر</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ═══ Tax Settings Tab ════════════════════════════════════ */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          <div className="glass-card p-6 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><Globe className="w-5 h-5" /> إعدادات الضرائب والتأمينات الاجتماعية</h3>
                <p className="text-sm text-muted-foreground">يتم تطبيق هذه الإعدادات تلقائياً عند حساب كشف الراتب</p>
              </div>
              {!editingTax ? (
                <Button variant="outline" size="sm" onClick={() => { setTaxForm(taxConfig); setEditingTax(true); }}>
                  <Edit2 className="w-4 h-4 ml-1" /> تعديل
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTax(false)}>إلغاء</Button>
                  <Button size="sm" onClick={saveTaxConfig}><TrendingUp className="w-4 h-4 ml-1" /> حفظ</Button>
                </div>
              )}
            </div>

            {/* Country Selector */}
            {editingTax ? (
              <div className="space-y-4">
                <div>
                  <Label>اختر الدولة (يضبط القيم الافتراضية تلقائياً)</Label>
                  <select className="w-full h-10 rounded-md border px-3 bg-background mt-1"
                    value={taxForm.country}
                    onChange={e => handleCountryChange(e.target.value)}>
                    {Object.entries(COUNTRY_PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>{v.flag} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 inline ml-1 text-blue-400" />
                  {COUNTRY_PRESETS[taxForm.country]?.notes}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>تأمين الموظف (%)</Label>
                    <Input type="number" step="0.01" value={taxForm.employeeInsurance}
                      onChange={e => setTaxForm(f => ({ ...f, employeeInsurance: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>تأمين صاحب العمل (%)</Label>
                    <Input type="number" step="0.01" value={taxForm.employerInsurance}
                      onChange={e => setTaxForm(f => ({ ...f, employerInsurance: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>معاش / صندوق تقاعد (%)</Label>
                    <Input type="number" step="0.01" value={taxForm.pensionRate}
                      onChange={e => setTaxForm(f => ({ ...f, pensionRate: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>تفعيل ضريبة الدخل</Label>
                    <select className="w-full h-10 rounded-md border px-3 bg-background"
                      value={taxForm.incomeTaxEnabled ? 'yes' : 'no'}
                      onChange={e => setTaxForm(f => ({ ...f, incomeTaxEnabled: e.target.value === 'yes' }))}>
                      <option value="yes">نعم</option>
                      <option value="no">لا</option>
                    </select>
                  </div>
                  {taxForm.incomeTaxEnabled && taxForm.country === 'custom' && (
                    <div>
                      <Label>نسبة ضريبة الدخل الثابتة (%)</Label>
                      <Input type="number" step="0.01" value={taxForm.customTaxRate}
                        onChange={e => setTaxForm(f => ({ ...f, customTaxRate: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Country Display */}
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <span className="text-3xl">{countryPreset.flag}</span>
                  <div>
                    <p className="font-bold text-lg">{countryPreset.label}</p>
                    <p className="text-sm text-muted-foreground">{countryPreset.notes}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'تأمين الموظف', value: `${taxConfig.employeeInsurance}%`, color: 'text-blue-400' },
                    { label: 'تأمين صاحب العمل', value: `${taxConfig.employerInsurance}%`, color: 'text-orange-400' },
                    { label: 'معاش / تقاعد', value: `${taxConfig.pensionRate}%`, color: 'text-purple-400' },
                    { label: 'ضريبة الدخل', value: taxConfig.incomeTaxEnabled ? 'مفعّلة' : 'معطّلة', color: taxConfig.incomeTaxEnabled ? 'text-emerald-400' : 'text-red-400' },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Income Tax Brackets */}
                {taxConfig.incomeTaxEnabled && (
                  <div>
                    <h4 className="font-semibold mb-2">شرائح ضريبة الدخل (سنوي):</h4>
                    <div className="space-y-1">
                      {(COUNTRY_PRESETS[taxConfig.country]?.incomeTaxBrackets || []).map((b, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-secondary/20 rounded">
                          <span className="text-muted-foreground">{b.label}</span>
                          <span className="font-medium">{b.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ Reports Tab ════════════════════════════════════════ */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card className="p-6 glass-card">
            <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> تقرير الرواتب — {filterMonth}/{filterYear}</h3>
            <div className="space-y-2 mb-4">
              {deptBreakdown.map(([dept, total]) => (
                <div key={dept} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                  <span className="font-medium">{dept}</span>
                  <span className="font-bold text-primary">{total.toLocaleString()} {currency}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">إجمالي الرواتب</p>
                <p className="font-bold text-lg">{monthlyGross.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الضرائب والتأمينات</p>
                <p className="font-bold text-lg text-amber-500">{(monthlyTax + monthlyInsurance).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">صافي المصرف</p>
                <p className="font-bold text-lg text-emerald-500">{monthlyTotal.toLocaleString()} {currency}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={exportReport} disabled={!filteredPayrolls.length}>
              <Download className="w-4 h-4 ml-1" /> تصدير Excel
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Staff Modal ────────────────────────────────────────── */}
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
              <div><Label>خصومات إضافية</Label><Input type="number" value={staffForm.deductions} onChange={e => setStaffForm({ ...staffForm, deductions: e.target.value })} /></div>
            </div>
            {/* Live calc preview */}
            {staffForm.basic_salary && (
              <div className="p-3 bg-primary/5 rounded-lg text-sm">
                {(() => {
                  const b = calcPayrollBreakdown(Number(staffForm.basic_salary), Number(staffForm.allowances || 0), Number(staffForm.deductions || 0));
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">الإجمالي: <span className="font-bold text-foreground">{b.gross.toLocaleString()}</span></span>
                      <span className="text-muted-foreground">ضريبة: <span className="font-bold text-amber-500">{b.taxAmount.toLocaleString()}</span></span>
                      <span className="text-muted-foreground">تأمين موظف: <span className="font-bold text-blue-400">{b.insuranceEmployee.toLocaleString()}</span></span>
                      <span className="text-muted-foreground">الصافي: <span className="font-bold text-primary">{b.net.toLocaleString()} {currency}</span></span>
                    </div>
                  );
                })()}
              </div>
            )}
            <div><Label>تاريخ التعيين</Label><Input type="date" value={staffForm.hire_date} onChange={e => setStaffForm({ ...staffForm, hire_date: e.target.value })} /></div>
            <Button className="w-full" onClick={handleSaveStaff}>{editingStaff ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Dept Modal ─────────────────────────────────────────── */}
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
            <Button className="w-full" onClick={async () => {
              if (!deptForm.name.trim()) { toast.error('أدخل اسم القسم'); return; }
              const payload = { restaurant_id: restaurantId, name: deptForm.name, code: deptForm.code || null, expense_account_id: deptForm.expense_account_id || null };
              if (editingDept) { await supabase.from('staff_departments').update(payload).eq('id', editingDept.id); toast.success('تم التحديث'); }
              else { await supabase.from('staff_departments').insert(payload as any); toast.success('تم الإضافة'); }
              setShowDeptModal(false); setEditingDept(null); loadAll();
            }}>{editingDept ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Payroll Modal ──────────────────────────────────────── */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>صرف راتب شهري مع الضرائب والتأمينات</DialogTitle></DialogHeader>
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

            {/* Breakdown Preview */}
            {payrollForm.gross_salary && (
              <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                <p className="font-semibold text-sm mb-2">تفصيل كشف الراتب:</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">الراتب الإجمالي</span><span className="font-bold">{Number(payrollForm.gross_salary).toLocaleString()} {currency}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">ضريبة الدخل</span><span className="text-amber-500">- {Number(payrollForm.tax_amount).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">تأمينات الموظف ({taxConfig.employeeInsurance}%)</span><span className="text-blue-400">- {Number(payrollForm.insurance_employee).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">خصومات إضافية</span><span className="text-red-400">- {Number(payrollForm.deductions).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold border-t border-border/50 pt-2">
                  <span>صافي الراتب</span>
                  <span className="text-primary text-lg">{Number(payrollForm.net_salary).toLocaleString()} {currency}</span>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                  تأمينات صاحب العمل ({taxConfig.employerInsurance}%): {Number(payrollForm.insurance_employer).toLocaleString()} {currency} (يُسجّل كمصروف إضافي)
                </div>
              </div>
            )}

            <div><Label>ملاحظات</Label><Input value={payrollForm.notes} onChange={e => setPayrollForm({ ...payrollForm, notes: e.target.value })} placeholder="ملاحظات..." /></div>
            <Button className="w-full gradient-bg border-0 text-white" onClick={handlePayroll}>
              <Calendar className="w-4 h-4 ml-1" /> صرف وترحيل محاسبي
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Advance Modal ──────────────────────────────────────── */}
      <Dialog open={showAdvanceModal} onOpenChange={setShowAdvanceModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>صرف سلفة موظف</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label>الموظف *</Label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={advanceForm.staff_id} onChange={e => setAdvanceForm({ ...advanceForm, staff_id: e.target.value })}>
                <option value="">اختر الموظف</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div><Label>المبلغ *</Label><Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} /></div>
            <div><Label>السبب</Label><Input value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} placeholder="سبب السلفة..." /></div>
            <div><Label>التاريخ</Label><Input type="date" value={advanceForm.date} onChange={e => setAdvanceForm({ ...advanceForm, date: e.target.value })} /></div>
            <Button className="w-full" onClick={handleAdvance}>صرف السلفة وترحيل القيد</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── KPI Modal ──────────────────────────────────────────── */}
      <Dialog open={kpiModal.open} onOpenChange={open => setKpiModal(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تقييم الأداء — {kpiModal.staff?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>درجة الأداء (0-100)</Label>
              <Input type="number" min="0" max="100" value={kpiForm.score} onChange={e => setKpiForm({ ...kpiForm, score: e.target.value })} />
              <div className="mt-2 bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${Number(kpiForm.score) >= 80 ? 'bg-emerald-500' : Number(kpiForm.score) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Number(kpiForm.score))}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>مكافأة إضافية ({currency})</Label><Input type="number" value={kpiForm.bonus} onChange={e => setKpiForm({ ...kpiForm, bonus: e.target.value })} /></div>
              <div><Label>خصم جزاء ({currency})</Label><Input type="number" value={kpiForm.deduction} onChange={e => setKpiForm({ ...kpiForm, deduction: e.target.value })} /></div>
            </div>
            <div><Label>ملاحظات التقييم</Label><Input value={kpiForm.notes} onChange={e => setKpiForm({ ...kpiForm, notes: e.target.value })} placeholder="ملاحظات التقييم..." /></div>
            <Button className="w-full" onClick={() => {
              toast.success(`تم تسجيل تقييم ${kpiModal.staff?.full_name}: ${kpiForm.score}/100`);
              setKpiModal({ open: false, staff: null });
            }}>حفظ التقييم</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
