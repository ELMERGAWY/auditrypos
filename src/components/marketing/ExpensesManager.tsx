import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Plus, Search, Filter, Calendar, TrendingUp,
  Edit2, Trash2, MoreVertical, CheckCircle, AlertTriangle,
  Clock, User, Facebook, Instagram, Music, Twitter, Linkedin, Download, Upload, Search as SearchIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdSpendExpense {
  id: string;
  platform: string;
  platform_account_id?: string;
  campaign_name?: string;
  campaign_id?: string;
  spend_amount: number;
  currency: string;
  exchange_rate: number;
  base_currency_amount: number;
  spend_date: string;
  is_billable_to_client: boolean;
  billed_amount: number;
  status: string;
  project_id?: string;
  project_name?: string;
  client_id?: string;
  client_name?: string;
  notes?: string;
}

interface Freelancer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  hourly_rate: number;
  currency: string;
  payment_method: string;
  is_active: boolean;
}

interface FreelancerPayment {
  id: string;
  freelancer_id: string;
  freelancer_name?: string;
  payment_amount: number;
  currency: string;
  payment_date: string;
  hours_worked: number;
  hourly_rate: number;
  task_description?: string;
  status: string;
  project_id?: string;
  project_name?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const PLATFORMS = [
  { id: 'facebook', label: 'فيسبوك', icon: Facebook, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'instagram', label: 'إنستغرام', icon: Instagram, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'google', label: 'جوجل', icon: SearchIcon, color: 'bg-red-500/20 text-red-400' },
  { id: 'tiktok', label: 'تيك توك', icon: Music, color: 'bg-black/20 text-black' },
  { id: 'twitter', label: 'تويتر', icon: Twitter, color: 'bg-sky-500/20 text-sky-400' },
  { id: 'linkedin', label: 'لينكد إن', icon: Linkedin, color: 'bg-blue-600/20 text-blue-600' },
  { id: 'other', label: 'أخرى', icon: MoreVertical, color: 'bg-gray-500/20 text-gray-400' }
];

const EXPENSE_STATUS = [
  { id: 'pending', label: 'قيد الانتظار', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'verified', label: 'موثق', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'billed', label: 'مفوتر', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'paid', label: 'مدفوع', color: 'bg-green-500/20 text-green-400' },
  { id: 'disputed', label: 'متنازع عليه', color: 'bg-red-500/20 text-red-400' }
];

const PAYMENT_STATUS = [
  { id: 'pending', label: 'قيد الانتظار', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'approved', label: 'معتمد', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'paid', label: 'مدفوع', color: 'bg-green-500/20 text-green-400' },
  { id: 'cancelled', label: 'ملغي', color: 'bg-red-500/20 text-red-400' }
];

export function ExpensesManager({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState<'ad_spend' | 'freelancers'>('ad_spend');
  const [adSpendExpenses, setAdSpendExpenses] = useState<AdSpendExpense[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [freelancerPayments, setFreelancerPayments] = useState<FreelancerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFreelancerForm, setShowFreelancerForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    platform: 'facebook',
    platform_account_id: '',
    campaign_name: '',
    campaign_id: '',
    spend_amount: '',
    currency: 'USD',
    exchange_rate: '1',
    spend_date: '',
    is_billable_to_client: true,
    project_id: '',
    client_id: '',
    notes: ''
  });

  const [freelancerForm, setFreelancerForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    hourly_rate: '',
    currency: 'USD',
    payment_method: 'bank_transfer',
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    freelancer_id: '',
    payment_amount: '',
    currency: 'USD',
    payment_date: '',
    hours_worked: '',
    hourly_rate: '',
    task_description: '',
    project_id: ''
  });

  const loadAdSpendExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_ad_spend_expenses')
        .select(`
          *,
          customers(name),
          marketing_projects(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('spend_date', { ascending: false });

      if (error) throw error;

      const mappedExpenses = (data || []).map((e: any) => ({
        ...e,
        client_name: e.customers?.name,
        project_name: e.marketing_projects?.name
      }));

      setAdSpendExpenses(mappedExpenses);
    } catch (error: any) {
      toast.error('فشل تحميل مصروفات الإعلانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFreelancers = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_freelancers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFreelancers(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الفرييلانسرز: ' + error.message);
    }
  };

  const loadFreelancerPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_freelancer_payments')
        .select(`
          *,
          marketing_freelancers(name),
          marketing_projects(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const mappedPayments = (data || []).map((p: any) => ({
        ...p,
        freelancer_name: p.marketing_freelancers?.name,
        project_name: p.marketing_projects?.name
      }));

      setFreelancerPayments(mappedPayments);
    } catch (error: any) {
      toast.error('فشل تحميل المدفوعات: ' + error.message);
    }
  };

  useEffect(() => {
    loadAdSpendExpenses();
    loadFreelancers();
    loadFreelancerPayments();
  }, [restaurantId]);

  const handleSaveExpense = async () => {
    if (!expenseForm.spend_amount || !expenseForm.spend_date) {
      toast.error('أدخل المبلغ وتاريخ الصرف');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        platform: expenseForm.platform,
        platform_account_id: expenseForm.platform_account_id || null,
        campaign_name: expenseForm.campaign_name || null,
        campaign_id: expenseForm.campaign_id || null,
        spend_amount: parseFloat(expenseForm.spend_amount),
        currency: expenseForm.currency,
        exchange_rate: parseFloat(expenseForm.exchange_rate) || 1,
        spend_date: expenseForm.spend_date,
        is_billable_to_client: expenseForm.is_billable_to_client,
        project_id: expenseForm.project_id || null,
        client_id: expenseForm.client_id || null,
        notes: expenseForm.notes || null,
        created_by: user?.id
      };

      const { error } = await supabase.from('marketing_ad_spend_expenses').insert(payload);
      if (error) throw error;

      toast.success('تم إضافة المصروف بنجاح');
      setShowExpenseForm(false);
      resetExpenseForm();
      loadAdSpendExpenses();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFreelancer = async () => {
    if (!freelancerForm.name.trim()) {
      toast.error('أدخل اسم الفرييلانسر');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        name: freelancerForm.name,
        email: freelancerForm.email || null,
        phone: freelancerForm.phone || null,
        specialization: freelancerForm.specialization || null,
        hourly_rate: parseFloat(freelancerForm.hourly_rate) || 0,
        currency: freelancerForm.currency,
        payment_method: freelancerForm.payment_method,
        notes: freelancerForm.notes || null,
        created_by: user?.id
      };

      const { error } = await supabase.from('marketing_freelancers').insert(payload);
      if (error) throw error;

      toast.success('تم إضافة الفرييلانسر بنجاح');
      setShowFreelancerForm(false);
      resetFreelancerForm();
      loadFreelancers();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.freelancer_id || !paymentForm.payment_amount || !paymentForm.payment_date) {
      toast.error('أدخل الفرييلانسر والمبلغ وتاريخ الدفع');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        freelancer_id: paymentForm.freelancer_id,
        payment_amount: parseFloat(paymentForm.payment_amount),
        currency: paymentForm.currency,
        payment_date: paymentForm.payment_date,
        hours_worked: parseFloat(paymentForm.hours_worked) || 0,
        hourly_rate: parseFloat(paymentForm.hourly_rate) || 0,
        task_description: paymentForm.task_description || null,
        project_id: paymentForm.project_id || null,
        created_by: user?.id
      };

      const { error } = await supabase.from('marketing_freelancer_payments').insert(payload);
      if (error) throw error;

      toast.success('تم إضافة الدفعة بنجاح');
      setShowPaymentForm(false);
      resetPaymentForm();
      loadFreelancerPayments();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      platform: 'facebook',
      platform_account_id: '',
      campaign_name: '',
      campaign_id: '',
      spend_amount: '',
      currency: 'USD',
      exchange_rate: '1',
      spend_date: '',
      is_billable_to_client: true,
      project_id: '',
      client_id: '',
      notes: ''
    });
  };

  const resetFreelancerForm = () => {
    setFreelancerForm({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      hourly_rate: '',
      currency: 'USD',
      payment_method: 'bank_transfer',
      notes: ''
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      freelancer_id: '',
      payment_amount: '',
      currency: 'USD',
      payment_date: '',
      hours_worked: '',
      hourly_rate: '',
      task_description: '',
      project_id: ''
    });
  };

  const filteredAdSpend = adSpendExpenses.filter(expense => {
    const matchesSearch = 
      expense.campaign_name?.toLowerCase().includes(search.toLowerCase()) ||
      expense.platform_account_id?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = freelancerPayments.filter(payment => {
    const matchesSearch = 
      payment.freelancer_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.task_description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const adSpendStats = {
    total: adSpendExpenses.length,
    totalSpend: adSpendExpenses.reduce((sum, e) => sum + e.base_currency_amount, 0),
    billable: adSpendExpenses.filter(e => e.is_billable_to_client).reduce((sum, e) => sum + e.base_currency_amount, 0),
    paid: adSpendExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.base_currency_amount, 0)
  };

  const freelancerStats = {
    total: freelancers.length,
    active: freelancers.filter(f => f.is_active).length,
    totalPayments: freelancerPayments.reduce((sum, p) => sum + p.payment_amount, 0),
    pendingPayments: freelancerPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.payment_amount, 0)
  };

  const getPlatformDisplay = (platform: string) => {
    return PLATFORMS.find(p => p.id === platform) || PLATFORMS[6];
  };

  const getExpenseStatusDisplay = (status: string) => {
    return EXPENSE_STATUS.find(s => s.id === status) || EXPENSE_STATUS[0];
  };

  const getPaymentStatusDisplay = (status: string) => {
    return PAYMENT_STATUS.find(s => s.id === status) || PAYMENT_STATUS[0];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <DollarSign className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المصروفات</h1>
            <p className="text-muted-foreground">مصروفات الإعلانات والفرييلانسرز</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'ad_spend' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ad_spend')}
          className="flex-1"
        >
          <Facebook className="w-4 h-4 ml-2" />
          مصروفات الإعلانات
        </Button>
        <Button
          variant={activeTab === 'freelancers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('freelancers')}
          className="flex-1"
        >
          <User className="w-4 h-4 ml-2" />
          الفرييلانسرز
        </Button>
      </div>

      {/* Ad Spend Tab */}
      {activeTab === 'ad_spend' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-xl font-bold">{adSpendStats.totalSpend.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">قابل للفوترة</p>
                  <p className="text-xl font-bold">{adSpendStats.billable.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">مدفوع</p>
                  <p className="text-xl font-bold">{adSpendStats.paid.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-3">
                <Facebook className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">عدد العمليات</p>
                  <p className="text-xl font-bold">{adSpendStats.total}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في المصروفات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/5 border border-white/10"
            >
              <option value="all">جميع الحالات</option>
              {EXPENSE_STATUS.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
            <Button onClick={() => setShowExpenseForm(true)} className="gradient-bg">
              <Plus className="w-4 h-4 ml-2" />
              مصروف جديد
            </Button>
          </div>

          {/* Ad Spend List */}
          <div className="space-y-2">
            {filteredAdSpend.map((expense) => {
              const platformDisplay = getPlatformDisplay(expense.platform);
              const statusDisplay = getExpenseStatusDisplay(expense.status);
              const PlatformIcon = platformDisplay.icon;

              return (
                <Card key={expense.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platformDisplay.color}`}>
                        <PlatformIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold">{expense.campaign_name || 'حملة بدون اسم'}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{platformDisplay.label}</span>
                          {expense.campaign_id && <span>• {expense.campaign_id}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{expense.spend_amount.toLocaleString()} {expense.currency}</p>
                        <p className="text-xs text-muted-foreground">{new Date(expense.spend_date).toLocaleDateString('ar-EG')}</p>
                      </div>
                      {expense.is_billable_to_client && (
                        <Badge variant="outline" className="bg-green-500/20 text-green-400">
                          قابل للفوترة
                        </Badge>
                      )}
                      <Badge variant="outline" className={statusDisplay.color}>
                        {statusDisplay.label}
                      </Badge>
                    </div>
                  </div>
                  {expense.client_name && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <span>العميل: {expense.client_name}</span>
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredAdSpend.length === 0 && (
              <div className="py-20 text-center border-dashed border rounded-xl">
                <Facebook className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">لا توجد مصروفات إعلانية مسجلة</p>
                <Button variant="link" onClick={() => setShowExpenseForm(true)} className="text-indigo-500">
                  أضف مصروف جديد
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Freelancers Tab */}
      {activeTab === 'freelancers' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الفرييلانسرز</p>
                  <p className="text-xl font-bold">{freelancerStats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">نشط</p>
                  <p className="text-xl font-bold">{freelancerStats.active}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المدفوعات</p>
                  <p className="text-xl font-bold">{freelancerStats.totalPayments.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                  <p className="text-xl font-bold">{freelancerStats.pendingPayments.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Freelancers List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">الفرييلانسرز</h3>
              <Button onClick={() => setShowFreelancerForm(true)} className="gradient-bg">
                <Plus className="w-4 h-4 ml-2" />
                فرييلانسر جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freelancers.map((freelancer) => (
                <Card key={freelancer.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold">{freelancer.name}</h4>
                      <p className="text-xs text-muted-foreground">{freelancer.specialization || '-'}</p>
                    </div>
                    <Badge variant={freelancer.is_active ? 'default' : 'secondary'}>
                      {freelancer.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">السعر بالساعة:</span>
                      <span className="font-medium">{freelancer.hourly_rate.toLocaleString()} {freelancer.currency}</span>
                    </div>
                    {freelancer.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">البريد:</span>
                        <span className="font-medium text-xs">{freelancer.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setPaymentForm({ ...paymentForm, freelancer_id: freelancer.id, hourly_rate: freelancer.hourly_rate.toString(), currency: freelancer.currency }); setShowPaymentForm(true); }}>
                      <DollarSign className="w-4 h-4 ml-1" />
                      دفع
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Payments List */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">المدفوعات</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <option value="all">جميع الحالات</option>
                    {PAYMENT_STATUS.map(status => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {filteredPayments.map((payment) => {
                  const statusDisplay = getPaymentStatusDisplay(payment.status);
                  return (
                    <Card key={payment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusDisplay.color}`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold">{payment.freelancer_name}</h4>
                            <p className="text-xs text-muted-foreground">{payment.task_description || '-'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{payment.payment_amount.toLocaleString()} {payment.currency}</p>
                            <p className="text-xs text-muted-foreground">{payment.hours_worked} ساعة @ {payment.hourly_rate}</p>
                          </div>
                          <Badge variant="outline" className={statusDisplay.color}>
                            {statusDisplay.label}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    لا توجد مدفوعات مسجلة
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Expense Form Modal */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>مصروف إعلاني جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المنصة</Label>
                <select
                  value={expenseForm.platform}
                  onChange={(e) => setExpenseForm({ ...expenseForm, platform: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {PLATFORMS.map(platform => (
                    <option key={platform.id} value={platform.id}>{platform.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>معرف الحساب</Label>
                <Input
                  value={expenseForm.platform_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, platform_account_id: e.target.value })}
                  placeholder="معرف الحساب"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الحملة</Label>
                <Input
                  value={expenseForm.campaign_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, campaign_name: e.target.value })}
                  placeholder="اسم الحملة"
                />
              </div>
              <div className="space-y-2">
                <Label>معرف الحملة</Label>
                <Input
                  value={expenseForm.campaign_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, campaign_id: e.target.value })}
                  placeholder="معرف الحملة"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  value={expenseForm.spend_amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, spend_amount: e.target.value })}
                  placeholder="المبلغ"
                />
              </div>
              <div className="space-y-2">
                <Label>العملة</Label>
                <Input
                  value={expenseForm.currency}
                  onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>سعر الصرف</Label>
                <Input
                  type="number"
                  value={expenseForm.exchange_rate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, exchange_rate: e.target.value })}
                  placeholder="1"
                  step="0.0001"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الصرف *</Label>
                <Input
                  type="date"
                  value={expenseForm.spend_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, spend_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={expenseForm.is_billable_to_client}
                onChange={(e) => setExpenseForm({ ...expenseForm, is_billable_to_client: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label>قابل للفوترة للعميل</Label>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="ملاحظات"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExpenseForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveExpense} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freelancer Form Modal */}
      <Dialog open={showFreelancerForm} onOpenChange={setShowFreelancerForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>فرييلانسر جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                value={freelancerForm.name}
                onChange={(e) => setFreelancerForm({ ...freelancerForm, name: e.target.value })}
                placeholder="الاسم"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={freelancerForm.email}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={freelancerForm.phone}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التخصص</Label>
                <Input
                  value={freelancerForm.specialization}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, specialization: e.target.value })}
                  placeholder="التخصص"
                />
              </div>
              <div className="space-y-2">
                <Label>السعر بالساعة</Label>
                <Input
                  type="number"
                  value={freelancerForm.hourly_rate}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, hourly_rate: e.target.value })}
                  placeholder="السعر"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العملة</Label>
                <Input
                  value={freelancerForm.currency}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, currency: e.target.value })}
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <select
                  value={freelancerForm.payment_method}
                  onChange={(e) => setFreelancerForm({ ...freelancerForm, payment_method: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="paypal">PayPal</option>
                  <option value="wise">Wise</option>
                  <option value="crypto">عملات رقمية</option>
                  <option value="cash">نقد</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={freelancerForm.notes}
                onChange={(e) => setFreelancerForm({ ...freelancerForm, notes: e.target.value })}
                placeholder="ملاحظات"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowFreelancerForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveFreelancer} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Form Modal */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دفعة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الفرييلانسر</Label>
              <select
                value={paymentForm.freelancer_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, freelancer_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="">اختر الفرييلانسر...</option>
                {freelancers.filter(f => f.is_active).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: e.target.value })}
                  placeholder="المبلغ"
                />
              </div>
              <div className="space-y-2">
                <Label>العملة</Label>
                <Input
                  value={paymentForm.currency}
                  onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الساعات</Label>
                <Input
                  type="number"
                  value={paymentForm.hours_worked}
                  onChange={(e) => setPaymentForm({ ...paymentForm, hours_worked: e.target.value })}
                  placeholder="الساعات"
                />
              </div>
              <div className="space-y-2">
                <Label>السعر بالساعة</Label>
                <Input
                  type="number"
                  value={paymentForm.hourly_rate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, hourly_rate: e.target.value })}
                  placeholder="السعر"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الدفع *</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>المشروع</Label>
                <Input
                  value={paymentForm.project_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, project_id: e.target.value })}
                  placeholder="معرف المشروع"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>وصف المهمة</Label>
              <Input
                value={paymentForm.task_description}
                onChange={(e) => setPaymentForm({ ...paymentForm, task_description: e.target.value })}
                placeholder="وصف المهمة"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPaymentForm(false)}>إلغاء</Button>
              <Button onClick={handleSavePayment} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
