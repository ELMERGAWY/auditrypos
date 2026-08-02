import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Search, Filter, Calendar, DollarSign,
  TrendingUp, Edit2, Trash2, MoreVertical, CheckCircle,
  AlertTriangle, Clock, RefreshCw, Download
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

interface RetainerContract {
  id: string;
  contract_code: string;
  contract_name: string;
  contract_type: string;
  retainer_amount: number;
  currency: string;
  billing_cycle: string;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  notice_period_days: number;
  payment_terms: string;
  invoicing_day: number;
  status: string;
  revenue_recognition_method: string;
  client_id: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;
}

interface RetainerInvoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  invoice_amount: number;
  currency: string;
  status: string;
  recognized_amount: number;
  recognition_date?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const CONTRACT_TYPES = [
  { id: 'monthly', label: 'شهري' },
  { id: 'quarterly', label: 'ربع سنوي' },
  { id: 'annual', label: 'سنوي' },
  { id: 'custom', label: 'مخصص' }
];

const BILLING_CYCLES = [
  { id: 'monthly', label: 'شهري' },
  { id: 'quarterly', label: 'ربع سنوي' },
  { id: 'annual', label: 'سنوي' },
  { id: 'custom', label: 'مخصص' }
];

const CONTRACT_STATUS = [
  { id: 'draft', label: 'مسودة', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'active', label: 'نشط', color: 'bg-green-500/20 text-green-400' },
  { id: 'paused', label: 'معلق', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'expired', label: 'منتهي', color: 'bg-red-500/20 text-red-400' },
  { id: 'terminated', label: 'ملغي', color: 'bg-rose-500/20 text-rose-400' }
];

const INVOICE_STATUS = [
  { id: 'pending', label: 'قيد الانتظار', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'generated', label: 'تم الإنشاء', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'sent', label: 'تم الإرسال', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'paid', label: 'مدفوع', color: 'bg-green-500/20 text-green-400' },
  { id: 'overdue', label: 'متأخر', color: 'bg-red-500/20 text-red-400' },
  { id: 'cancelled', label: 'ملغي', color: 'bg-rose-500/20 text-rose-400' }
];

export function RetainersManager({ restaurantId, currency }: Props) {
  const [contracts, setContracts] = useState<RetainerContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<RetainerContract | null>(null);
  const [invoices, setInvoices] = useState<RetainerInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<RetainerContract | null>(null);

  const [contractForm, setContractForm] = useState({
    contract_name: '',
    contract_type: 'monthly',
    retainer_amount: '',
    currency: 'EGP',
    billing_cycle: 'monthly',
    start_date: '',
    end_date: '',
    auto_renew: false,
    notice_period_days: '30',
    payment_terms: 'net_30',
    invoicing_day: '1',
    revenue_recognition_method: 'straight_line',
    client_id: '',
    project_id: '',
    terms_conditions: '',
    notes: ''
  });

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_retainer_contracts')
        .select(`
          *,
          customers(name),
          marketing_projects(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedContracts = (data || []).map((c: any) => ({
        ...c,
        client_name: c.customers?.name,
        project_name: c.marketing_projects?.name
      }));

      setContracts(mappedContracts);
    } catch (error: any) {
      toast.error('فشل تحميل العقود: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('marketing_retainer_invoices')
        .select('*')
        .eq('retainer_contract_id', contractId)
        .order('period_start', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الفواتير: ' + error.message);
    }
  };

  useEffect(() => { loadContracts(); }, [restaurantId]);

  const handleSaveContract = async () => {
    if (!contractForm.contract_name.trim()) {
      toast.error('أدخل اسم العقد');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const contractCode = `RET-${new Date().getFullYear()}-${(contracts.length + 1).toString().padStart(4, '0')}`;

      const payload = {
        restaurant_id: restaurantId,
        contract_code: editingContract?.contract_code || contractCode,
        contract_name: contractForm.contract_name,
        contract_type: contractForm.contract_type,
        retainer_amount: parseFloat(contractForm.retainer_amount) || 0,
        currency: contractForm.currency,
        billing_cycle: contractForm.billing_cycle,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date || null,
        auto_renew: contractForm.auto_renew,
        notice_period_days: parseInt(contractForm.notice_period_days) || 30,
        payment_terms: contractForm.payment_terms,
        invoicing_day: parseInt(contractForm.invoicing_day) || 1,
        revenue_recognition_method: contractForm.revenue_recognition_method,
        client_id: contractForm.client_id || null,
        project_id: contractForm.project_id || null,
        terms_conditions: contractForm.terms_conditions || null,
        notes: contractForm.notes || null,
        created_by: user?.id
      };

      if (editingContract) {
        const { error } = await supabase.from('marketing_retainer_contracts').update(payload).eq('id', editingContract.id);
        if (error) throw error;
        toast.success('تم تحديث العقد بنجاح');
      } else {
        const { error } = await supabase.from('marketing_retainer_contracts').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة العقد بنجاح');
      }

      setShowContractForm(false);
      setEditingContract(null);
      resetContractForm();
      loadContracts();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (contractId: string) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;

      // Calculate period based on billing cycle
      const today = new Date();
      let periodStart, periodEnd;

      if (contract.billing_cycle === 'monthly') {
        periodStart = new Date(today.getFullYear(), today.getMonth(), contract.invoicing_day);
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, contract.invoicing_day - 1);
      } else if (contract.billing_cycle === 'quarterly') {
        const quarter = Math.floor(today.getMonth() / 3);
        periodStart = new Date(today.getFullYear(), quarter * 3, contract.invoicing_day);
        periodEnd = new Date(today.getFullYear(), (quarter + 1) * 3, contract.invoicing_day - 1);
      } else {
        periodStart = new Date(today.getFullYear(), today.getMonth(), contract.invoicing_day);
        periodEnd = new Date(today.getFullYear() + 1, today.getMonth(), contract.invoicing_day - 1);
      }

      const { data, error } = await supabase.rpc('generate_retainer_invoice', {
        p_retainer_id: contractId,
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success('تم إنشاء الفاتورة بنجاح');
      if (selectedContract?.id === contractId) {
        loadInvoices(contractId);
      }
    } catch (error: any) {
      toast.error('فشل إنشاء الفاتورة: ' + error.message);
    }
  };

  const resetContractForm = () => {
    setContractForm({
      contract_name: '',
      contract_type: 'monthly',
      retainer_amount: '',
      currency: 'EGP',
      billing_cycle: 'monthly',
      start_date: '',
      end_date: '',
      auto_renew: false,
      notice_period_days: '30',
      payment_terms: 'net_30',
      invoicing_day: '1',
      revenue_recognition_method: 'straight_line',
      client_id: '',
      project_id: '',
      terms_conditions: '',
      notes: ''
    });
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.contract_name.toLowerCase().includes(search.toLowerCase()) ||
      contract.contract_code.toLowerCase().includes(search.toLowerCase()) ||
      contract.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    totalValue: contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + c.retainer_amount, 0),
    monthlyRevenue: contracts.filter(c => c.status === 'active' && c.billing_cycle === 'monthly').reduce((sum, c) => sum + c.retainer_amount, 0)
  };

  const getContractStatusDisplay = (status: string) => {
    return CONTRACT_STATUS.find(s => s.id === status) || CONTRACT_STATUS[0];
  };

  const getInvoiceStatusDisplay = (status: string) => {
    return INVOICE_STATUS.find(s => s.id === status) || INVOICE_STATUS[0];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <FileText className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة العقود الشهرية</h1>
            <p className="text-muted-foreground">إدارة العقود الشهرية والفواتير التلقائية</p>
          </div>
        </div>
        <Button onClick={() => setShowContractForm(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          عقد جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي العقود</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">نشطة</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">القيمة الكلية</p>
              <p className="text-xl font-bold">{stats.totalValue.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">الإيراد الشهري</p>
              <p className="text-xl font-bold">{stats.monthlyRevenue.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في العقود..."
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
          {CONTRACT_STATUS.map(status => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </div>

      {/* Contracts List */}
      <div className="space-y-2">
        {filteredContracts.map((contract) => {
          const statusDisplay = getContractStatusDisplay(contract.status);
          return (
            <Card key={contract.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedContract(contract); loadInvoices(contract.id); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusDisplay.color}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">{contract.contract_name}</h4>
                    <p className="text-xs text-muted-foreground">{contract.contract_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{contract.retainer_amount.toLocaleString()} {contract.currency}</p>
                    <p className="text-xs text-muted-foreground">{contract.client_name || '-'}</p>
                  </div>
                  <Badge variant="outline" className={statusDisplay.color}>
                    {statusDisplay.label}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingContract(contract); setShowContractForm(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
                <span>من: {new Date(contract.start_date).toLocaleDateString('ar-EG')}</span>
                {contract.end_date && <span>إلى: {new Date(contract.end_date).toLocaleDateString('ar-EG')}</span>}
                <span>• {contract.billing_cycle === 'monthly' ? 'شهري' : contract.billing_cycle === 'quarterly' ? 'ربع سنوي' : contract.billing_cycle === 'annual' ? 'سنوي' : 'مخصص'}</span>
                {contract.auto_renew && <span>• تجديد تلقائي</span>}
              </div>
            </Card>
          );
        })}

        {filteredContracts.length === 0 && (
          <div className="py-20 text-center border-dashed border rounded-xl">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا توجد عقود مسجلة</p>
            <Button variant="link" onClick={() => setShowContractForm(true)} className="text-indigo-500">
              أضف عقد جديد
            </Button>
          </div>
        )}
      </div>

      {/* Selected Contract Details */}
      <AnimatePresence>
        {selectedContract && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedContract.contract_name}</h2>
                  <p className="text-muted-foreground">{selectedContract.contract_code}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => generateInvoice(selectedContract.id)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إنشاء فاتورة
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedContract(null)}>
                    إغلاق
                  </Button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold mb-4">الفواتير</h3>
                <div className="space-y-2">
                  {invoices.map((invoice) => {
                    const statusDisplay = getInvoiceStatusDisplay(invoice.status);
                    return (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${statusDisplay.color}`} />
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(invoice.period_start).toLocaleDateString('ar-EG')} - {new Date(invoice.period_end).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{invoice.invoice_amount.toLocaleString()} {invoice.currency}</p>
                            <p className="text-xs text-muted-foreground">معترف: {invoice.recognized_amount.toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className={statusDisplay.color}>
                            {statusDisplay.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}

                  {invoices.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      لا توجد فواتير لهذا العقد
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract Form Modal */}
      <Dialog open={showContractForm} onOpenChange={setShowContractForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'تعديل العقد' : 'عقد جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم العقد *</Label>
              <Input
                value={contractForm.contract_name}
                onChange={(e) => setContractForm({ ...contractForm, contract_name: e.target.value })}
                placeholder="اسم العقد"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع العقد</Label>
                <select
                  value={contractForm.contract_type}
                  onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {CONTRACT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>دورة الفوترة</Label>
                <select
                  value={contractForm.billing_cycle}
                  onChange={(e) => setContractForm({ ...contractForm, billing_cycle: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {BILLING_CYCLES.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>{cycle.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>قيمة العقد *</Label>
                <Input
                  type="number"
                  value={contractForm.retainer_amount}
                  onChange={(e) => setContractForm({ ...contractForm, retainer_amount: e.target.value })}
                  placeholder="القيمة"
                />
              </div>
              <div className="space-y-2">
                <Label>العملة</Label>
                <Input
                  value={contractForm.currency}
                  onChange={(e) => setContractForm({ ...contractForm, currency: e.target.value })}
                  placeholder="EGP"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البدء *</Label>
                <Input
                  type="date"
                  value={contractForm.start_date}
                  onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={contractForm.end_date}
                  onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>يوم الفوترة</Label>
                <Input
                  type="number"
                  value={contractForm.invoicing_day}
                  onChange={(e) => setContractForm({ ...contractForm, invoicing_day: e.target.value })}
                  placeholder="1-31"
                  min="1"
                  max="31"
                />
              </div>
              <div className="space-y-2">
                <Label>فترة الإشعار (أيام)</Label>
                <Input
                  type="number"
                  value={contractForm.notice_period_days}
                  onChange={(e) => setContractForm({ ...contractForm, notice_period_days: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contractForm.auto_renew}
                onChange={(e) => setContractForm({ ...contractForm, auto_renew: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label>تجديد تلقائي</Label>
            </div>

            <div className="space-y-2">
              <Label>طريقة الاعتراف بالإيراد</Label>
              <select
                value={contractForm.revenue_recognition_method}
                onChange={(e) => setContractForm({ ...contractForm, revenue_recognition_method: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="straight_line">خط مستقيم</option>
                <option value="milestone">حسب المعالم</option>
                <option value="usage_based">حسب الاستخدام</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowContractForm(false)}>إلغاء</Button>
              <Button onClick={handleSaveContract} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
