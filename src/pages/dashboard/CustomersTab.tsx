import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit2, Trash2, CreditCard, FileText, X, BarChart3, TrendingUp, ShoppingCart, AlertTriangle, Star, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { journalService } from '@/lib/accounting/journalService';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customer_type: string;
  credit_limit: number;
  balance: number;
  notes: string;
  risk_level?: string;
  warning_flags?: number;
  vip_status?: boolean;
}

interface WarningHistory {
  id: string;
  action: string;
  warning_count_before: number;
  warning_count_after: number;
  reason: string;
  created_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  payment_method?: string;
  reference_number?: string;
  order_id?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const CHART_COLORS = ['hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(210, 80%, 50%)', 'hsl(280, 65%, 50%)'];

export function CustomersTab({ restaurantId, currency }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showLedger, setShowLedger] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPayment, setShowPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentMethodLocal, setPaymentMethodLocal] = useState('cash');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    customerCopy: true,
    businessCopy: true,
    kitchenCopy: false
  });
  const [showReports, setShowReports] = useState(false);
  const [allTransactions, setAllTransactions] = useState<(Transaction & { customer_name?: string })[]>([]);
  const [showWarningModal, setShowWarningModal] = useState<Customer | null>(null);
  const [warningReason, setWarningReason] = useState('');
  const [warningHistory, setWarningHistory] = useState<WarningHistory[]>([]);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', customer_type: 'retail',
    credit_limit: '', notes: '', vip_status: false, risk_level: 'normal',
  });

  const load = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, customer_type, credit_limit, balance, notes, risk_level, warning_flags, vip_status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setCustomers((data || []) as Customer[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const totalDebt = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
  const totalCredit = customers.reduce((s, c) => s + Math.abs(Math.min(0, c.balance)), 0);

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name) { toast.error('أدخل اسم العميل'); return; }
    const data = {
      restaurant_id: restaurantId,
      name: form.name, phone: form.phone, email: form.email, address: form.address,
      customer_type: form.customer_type, credit_limit: Number(form.credit_limit) || 0,
      notes: form.notes, vip_status: form.vip_status, risk_level: form.risk_level,
    };
    if (editingCustomer) {
      await supabase.from('customers').update(data).eq('id', editingCustomer.id);
      toast.success('تم التحديث');
    } else {
      await supabase.from('customers').insert(data);
      toast.success('تم إضافة العميل');
    }
    resetForm(); load();
  };

  const handleAddWarning = async () => {
    if (!showWarningModal || !warningReason.trim()) {
      toast.error('يرجى إدخال سبب التحذير');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('add_customer_warning', {
        p_customer_id: showWarningModal.id,
        p_reason: warningReason,
        p_user_id: user?.id || null
      });

      if (error) throw error;

      toast.success('تم إضافة علامة تحذيرية');
      setWarningReason('');
      setShowWarningModal(null);
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const handleRemoveWarning = async () => {
    if (!showWarningModal) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('remove_customer_warning', {
        p_customer_id: showWarningModal.id,
        p_reason: 'إزالة يدوية',
        p_user_id: user?.id || null
      });

      if (error) throw error;

      toast.success('تم إزالة علامة تحذيرية');
      setShowWarningModal(null);
      load();
    } catch (e: any) {
      toast.error('خطأ: ' + e.message);
    }
  };

  const loadWarningHistory = async (customerId: string) => {
    const { data } = await supabase
      .from('customer_warning_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setWarningHistory((data || []) as WarningHistory[]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا العميل؟')) return;
    await supabase.from('customers').delete().eq('id', id);
    toast.success('تم الحذف'); load();
  };

  const handleSavePayment = async () => {
    if (!showPayment || !paymentAmount) return;
    const amount = Number(paymentAmount);
    
    // Insert transaction - database trigger will automatically update customer balance
    await supabase.from('customer_transactions').insert({
      customer_id: showPayment.id, restaurant_id: restaurantId,
      type: 'payment', amount: -amount, description: paymentDesc || 'دفعة نقدية',
      payment_method: paymentMethodLocal,
    });
    
    // Create accounting journal entry
    await journalService.createCustomerPaymentJournalEntry(
      restaurantId,
      {
        customerId: showPayment.id,
        customerName: showPayment.name,
        amount,
        paymentMethod: paymentMethodLocal as 'cash' | 'bank' | 'instapay' | 'vodafone_cash',
        description: paymentDesc,
      },
      currency
    );
    
    toast.success(`تم تسجيل دفعة ${amount} ${currency}`);
    setShowPayment(null); setPaymentAmount(''); setPaymentDesc(''); setPaymentMethodLocal('cash');
    load();
  };

  const handlePrintReceipt = () => {
    if (!showPayment || !paymentAmount) return;
    const amount = Number(paymentAmount);
    const newBalance = showPayment.balance - amount;
    const receiptDate = new Date().toLocaleDateString('ar-EG');
    const receiptTime = new Date().toLocaleTimeString('ar-EG');
    
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      let content = '';
      
      if (printSettings.customerCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة العميل</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${showPayment.name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${showPayment.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            <div class="row"><span>الرصيد السابق:</span><span>${showPayment.balance.toFixed(2)} ${currency}</span></div>
            <div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>
            ${paymentDesc ? `<div class="divider"></div><div>ملاحظات: ${paymentDesc}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px;">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.businessCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المؤسسة</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${showPayment.name}</span></div>
            <div class="row"><span>الهاتف:</span><span>${showPayment.phone || '-'}</span></div>
            <div class="divider"></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            <div class="row"><span>الرصيد السابق:</span><span>${showPayment.balance.toFixed(2)} ${currency}</span></div>
            <div class="row"><span>الرصيد الجديد:</span><span class="bold">${newBalance.toFixed(2)} ${currency}</span></div>
            ${paymentDesc ? `<div class="divider"></div><div>ملاحظات: ${paymentDesc}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px;">Powered by AuditryPOS</div>
          </div>
        `;
      }
      
      if (printSettings.kitchenCopy) {
        content += `
          <div class="page-break">
            <div class="center bold" style="margin-bottom: 5px;">نسخة المطبخ</div>
            <div class="center title">سند قبض</div>
            <div class="divider"></div>
            <div class="row"><span>التاريخ:</span><span>${receiptDate}</span></div>
            <div class="row"><span>الوقت:</span><span>${receiptTime}</span></div>
            <div class="divider"></div>
            <div class="row"><span>اسم العميل:</span><span class="bold">${showPayment.name}</span></div>
            <div class="amount">${amount.toFixed(2)} ${currency}</div>
            ${paymentDesc ? `<div class="divider"></div><div>ملاحظات: ${paymentDesc}</div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size:10px;color:#666;margin-top:8px;">Powered by AuditryPOS</div>
          </div>
        `;
      }

      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>سند قبض</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .title { font-size: 18px; font-weight: bold; margin: 8px 0; border: 2px solid #000; padding: 4px; }
  .divider { border-top: 1px dashed #333; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .amount { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; }
  .page-break { page-break-after: always; }
  .page-break:last-child { page-break-after: avoid; }
  @media print { @page { margin: 0; } }
</style></head>
<body>
  ${content}
</body></html>`);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    }
  };

  const openLedger = async (c: Customer) => {
    setShowLedger(c);
    const { data } = await supabase.from('customer_transactions').select('*').eq('customer_id', c.id).order('created_at', { ascending: false });
    setTransactions((data || []) as Transaction[]);
  };

  const loadReports = async () => {
    setShowReports(true);
    const { data } = await supabase.from('customer_transactions').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500);
    const txns = (data || []) as Transaction[];
    // enrich with customer names
    const enriched = txns.map(t => {
      const cust = customers.find(c => c.id === (t as any).customer_id);
      return { ...t, customer_name: cust?.name || 'غير معروف' };
    });
    setAllTransactions(enriched);
  };

  const resetForm = () => {
    setShowForm(false); setEditingCustomer(null);
    setForm({ name: '', phone: '', email: '', address: '', customer_type: 'retail', credit_limit: '', notes: '', vip_status: false, risk_level: 'normal' });
  };

  const startEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name, phone: c.phone, email: c.email, address: c.address,
      customer_type: c.customer_type, credit_limit: String(c.credit_limit), notes: c.notes,
      vip_status: c.vip_status || false, risk_level: c.risk_level || 'normal',
    });
    setShowForm(true);
  };

  // Reports data
  const typeDistribution = [
    { name: 'تجزئة', value: customers.filter(c => c.customer_type === 'retail').length },
    { name: 'جملة', value: customers.filter(c => c.customer_type === 'wholesale').length },
    { name: 'VIP', value: customers.filter(c => c.customer_type === 'vip').length },
  ].filter(d => d.value > 0);

  const topDebtors = [...customers].filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العملاء', value: customers.length, color: 'text-primary', bg: 'bg-primary/10', icon: Users },
          { label: 'عملاء جملة', value: customers.filter(c => c.customer_type === 'wholesale').length, color: 'text-accent', bg: 'bg-accent/10', icon: Users },
          { label: 'إجمالي المديونيات', value: `${totalDebt.toLocaleString()} ${currency}`, color: 'text-destructive', bg: 'bg-destructive/10', icon: CreditCard },
          { label: 'إجمالي الأرصدة الدائنة', value: `${totalCredit.toLocaleString()} ${currency}`, color: 'text-success', bg: 'bg-success/10', icon: CreditCard },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`font-display font-bold text-sm ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="pr-10 h-9 text-xs" />
        </div>
        <Button onClick={loadReports} variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 ml-1" /> تقارير
        </Button>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-bg text-primary-foreground border-0" size="sm">
          <Plus className="w-4 h-4 ml-1" /> إضافة عميل
        </Button>
      </div>

      {/* Reports Modal */}
      <AnimatePresence>
        {showReports && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReports(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-2xl w-full max-h-[85vh] overflow-auto space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> تقارير العملاء</h3>
                <button onClick={() => setShowReports(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Customer Type Distribution */}
                {typeDistribution.length > 0 && (
                  <div className="glass-card p-4">
                    <h4 className="font-bold text-sm mb-3">توزيع أنواع العملاء</h4>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {typeDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Debtors */}
                <div className="glass-card p-4">
                  <h4 className="font-bold text-sm mb-3">أكبر المدينين</h4>
                  {topDebtors.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد مديونيات</p>}
                  <div className="space-y-2">
                    {topDebtors.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                          {c.name}
                        </span>
                        <span className="text-destructive font-bold">{c.balance.toLocaleString()} {currency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="glass-card p-4">
                <h4 className="font-bold text-sm mb-3">آخر المعاملات</h4>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {allTransactions.slice(0, 20).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg text-xs">
                      <div>
                        <span className="font-medium">{t.customer_name}</span>
                        <span className="text-muted-foreground mr-2">{t.description}</span>
                      </div>
                      <div className="text-left">
                        <span className={`font-bold ${t.amount > 0 ? 'text-destructive' : 'text-success'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount} {currency}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  ))}
                  {allTransactions.length === 0 && <p className="text-muted-foreground text-center py-4 text-xs">لا توجد معاملات</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => resetForm()}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg">{editingCustomer ? 'تعديل عميل' : 'إضافة عميل جديد'}</h3>
              <Input placeholder="اسم العميل *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <Input placeholder="العنوان" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.customer_type} onChange={e => setForm(f => ({ ...f, customer_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                  <option value="retail">عميل تجزئة</option>
                  <option value="wholesale">عميل جملة</option>
                  <option value="vip">عميل VIP</option>
                </select>
                <Input placeholder="حد الائتمان" type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                  <option value="normal">عادي</option>
                  <option value="medium">متوسط الخطورة</option>
                  <option value="high">عالي الخطورة</option>
                  <option value="blocked">محظور</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-secondary border border-border">
                  <input type="checkbox" checked={form.vip_status} onChange={e => setForm(f => ({ ...f, vip_status: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">عميل مميز ⭐</span>
                </label>
              </div>
              <Input placeholder="ملاحظات" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gradient-bg text-primary-foreground border-0">{editingCustomer ? 'حفظ' : 'إضافة'}</Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPayment(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold">سند قبض — {showPayment.name}</h3>
              <p className="text-sm">الرصيد الحالي: <span className={`font-bold ${showPayment.balance > 0 ? 'text-destructive' : 'text-success'}`}>{showPayment.balance} {currency}</span></p>
              <Input placeholder="المبلغ" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              <div className="flex gap-1 rounded-lg bg-secondary p-1">
                {[
                  { key: 'cash', label: '💵 نقدي' },
                  { key: 'instapay', label: '📱 إنستاباي' },
                  { key: 'vodafone_cash', label: '📲 فودافون كاش' },
                  { key: 'bank', label: '🏦 بنكي' },
                ].map(m => (
                  <button key={m.key} onClick={() => setPaymentMethodLocal(m.key)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${paymentMethodLocal === m.key ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <Input placeholder="الوصف (اختياري)" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={handleSavePayment} className="flex-1 gradient-bg text-primary-foreground border-0">حفظ الدفعة</Button>
                <Button onClick={handlePrintReceipt} className="flex-1" variant="outline">طباعة السند</Button>
              </div>
              <Button onClick={() => setShowPrintSettings(true)} className="w-full" variant="ghost">إعدادات الطباعة</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ledger Modal */}
      <AnimatePresence>
        {showLedger && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLedger(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">كشف حساب — {showLedger.name}</h3>
                <button onClick={() => setShowLedger(null)}><X className="w-5 h-5" /></button>
              </div>
              <div className="flex justify-between text-sm">
                <span>الرصيد الحالي:</span>
                <span className={`font-bold ${showLedger.balance > 0 ? 'text-destructive' : 'text-success'}`}>{showLedger.balance.toFixed(2)} {currency}</span>
              </div>
              {transactions.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">لا توجد حركات</p>}
              
              {/* Detailed ledger table */}
              {transactions.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-right p-2">التاريخ</th>
                        <th className="text-right p-2">البيان</th>
                        <th className="text-right p-2">مدين</th>
                        <th className="text-right p-2">دائن</th>
                        <th className="text-right p-2">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let runningBalance = 0;
                        // Reverse to show oldest first for running balance
                        const sorted = [...transactions].reverse();
                        return sorted.map(t => {
                          const debit = t.amount > 0 ? t.amount : 0;
                          const credit = t.amount < 0 ? Math.abs(t.amount) : 0;
                          runningBalance += t.amount;
                          return (
                            <tr key={t.id} className="border-b border-border hover:bg-secondary/20">
                              <td className="p-2 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                              <td className="p-2">
                                <div>{t.description}</div>
                                {t.payment_method && <span className="text-[10px] text-muted-foreground">({
                                  t.payment_method === 'cash' ? 'نقدي' : t.payment_method === 'instapay' ? 'إنستاباي' : t.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'بنكي'
                                })</span>}
                              </td>
                              <td className="p-2 text-destructive font-bold">{debit > 0 ? debit.toFixed(2) : '-'}</td>
                              <td className="p-2 text-success font-bold">{credit > 0 ? credit.toFixed(2) : '-'}</td>
                              <td className={`p-2 font-bold ${runningBalance > 0 ? 'text-destructive' : 'text-success'}`}>{runningBalance.toFixed(2)}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Settings Modal */}
      <AnimatePresence>
        {showPrintSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPrintSettings(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">إعدادات الطباعة</h3>
                <button onClick={() => setShowPrintSettings(false)}><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.customerCopy} onChange={(e) => setPrintSettings({ ...printSettings, customerCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة العميل</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.businessCopy} onChange={(e) => setPrintSettings({ ...printSettings, businessCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة المؤسسة</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={printSettings.kitchenCopy} onChange={(e) => setPrintSettings({ ...printSettings, kitchenCopy: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">نسخة المطبخ</span>
                </label>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setShowPrintSettings(false)} className="flex-1 gradient-bg text-primary-foreground border-0">حفظ</Button>
                <Button variant="outline" onClick={() => setShowPrintSettings(false)} className="flex-1">إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Management Modal */}
      <Dialog open={!!showWarningModal} onOpenChange={(open) => !open && setShowWarningModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              إدارة التحذيرات — {showWarningModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Status */}
            <div className="p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">العلامات التحذيرية الحالية:</span>
                <Badge className={showWarningModal?.warning_flags >= 3 ? 'bg-red-500' : showWarningModal?.warning_flags >= 2 ? 'bg-yellow-500' : 'bg-green-500'}>
                  {showWarningModal?.warning_flags || 0} / 4
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>مستوى الخطورة:</span>
                <Badge variant="outline" className={
                  showWarningModal?.risk_level === 'blocked' ? 'bg-red-100 text-red-700 border-red-300' :
                  showWarningModal?.risk_level === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                  showWarningModal?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                  'bg-green-100 text-green-700 border-green-300'
                }>
                  {showWarningModal?.risk_level === 'blocked' ? 'محظور' :
                   showWarningModal?.risk_level === 'high' ? 'عالي' :
                   showWarningModal?.risk_level === 'medium' ? 'متوسط' : 'عادي'}
                </Badge>
              </div>
            </div>

            {/* Add Warning */}
            <div className="space-y-2">
              <label className="text-sm font-medium">إضافة علامة تحذيرية</label>
              <Textarea
                placeholder="اكتب سبب التحذير..."
                value={warningReason}
                onChange={e => setWarningReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddWarning} className="flex-1" disabled={!warningReason.trim()}>
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  إضافة علامة
                </Button>
                <Button onClick={handleRemoveWarning} variant="outline" disabled={showWarningModal?.warning_flags === 0}>
                  <ShieldCheck className="w-4 h-4 ml-2" />
                  إزالة علامة
                </Button>
              </div>
            </div>

            {/* Warning History */}
            <div className="space-y-2">
              <label className="text-sm font-medium">سجل التحذيرات</label>
              <div className="max-h-40 overflow-auto space-y-2">
                {warningHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">لا يوجد سجل تحذيرات</p>
                ) : (
                  warningHistory.map(h => (
                    <div key={h.id} className="p-2 bg-secondary/20 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className={h.action === 'add' ? 'text-red-600' : 'text-green-600'}>
                          {h.action === 'add' ? 'إضافة' : 'إزالة'}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                      <div className="text-muted-foreground mt-1">
                        {h.warning_count_before} → {h.warning_count_after}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningModal(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customers List */}
      <div className="space-y-2">
        {filtered.map(c => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                c.customer_type === 'vip' ? 'bg-accent/20 text-accent' :
                c.customer_type === 'wholesale' ? 'bg-primary/20 text-primary' :
                'bg-secondary text-secondary-foreground'
              }`}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">{c.name}</p>
                  {c.vip_status && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  <Badge variant="outline" className="text-[10px]">
                    {c.customer_type === 'wholesale' ? 'جملة' : c.customer_type === 'vip' ? 'VIP' : 'تجزئة'}
                  </Badge>
                  {c.warning_flags > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                      <AlertTriangle className="w-2 h-2 mr-1" />
                      {c.warning_flags}
                    </Badge>
                  )}
                  {c.risk_level === 'high' && <Badge className="text-[10px] bg-red-500">خطر</Badge>}
                  {c.risk_level === 'blocked' && <Badge className="text-[10px] bg-red-700">محظور</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {c.phone && <span>📱 {c.phone}</span>}
                  <span className={c.balance > 0 ? 'text-destructive font-bold' : c.balance < 0 ? 'text-success font-bold' : ''}>
                    الرصيد: {c.balance} {currency}
                  </span>
                  {c.credit_limit > 0 && <span>حد الائتمان: {c.credit_limit} {currency}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setShowWarningModal(c); loadWarningHistory(c.id); }} title="إدارة التحذيرات">
                  <ShieldAlert className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPayment(c)} title="سند قبض / تسجيل دفعة"><CreditCard className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => openLedger(c)} title="كشف حساب"><FileText className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Edit2 className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">لا يوجد عملاء</p>}
      </div>
    </div>
  );
}
