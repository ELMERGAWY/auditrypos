
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileCheck, CheckCircle, XCircle, Eye, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketingService {
  id: string;
  name: string;
  description: string;
  base_price: number;
}

interface ContractService {
  service_id?: string;
  service_name: string;
  description: string;
  price: number;
}

interface MarketingContract {
  id: string;
  customer_id?: string;
  customer_name?: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string;
  services: ContractService[];
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const CONTRACT_TEMPLATES = {
  general: `
## اتفاقية الخدمات التسويقية

تاريخ الاتفاقية: [DATE]

الطرف الأول: [COMPANY_NAME]

الطرف الثاني: [CLIENT_NAME]

### الموضوع
يتعهد الطرف الأول بتقديم الخدمات التسويقية المذكورة في هذا العقد للطرف الثاني وفقاً للشروط والأحكام التالية:

### الخدمات
[INCLUDED_SERVICES]

### مدة العقد
يبدأ العقد من [START_DATE] وينتهي في [END_DATE]

### الأجور والمبالغ
الإجمالي المستحق للطرف الأول هو: [TOTAL_AMOUNT] [CURRENCY]

### شروط وإخلاء مسؤولية
- هذا العقد لا يشكل أي ضمان أو مسؤولية على الطرف الأول سواء كانت مباشرة أو غير مباشرة.
- يلتزم الطرف الثاني بتقديم جميع المتطلبات اللازمة للتنفيذ في الوقت المناسب.
- لا يتحمل الطرف الأول أي مسؤولية عن أي خسائر أو أضرار ناتجة عن استخدام الخدمات أو منتجات الطرف الثاني.
- يجوز للطرف الأول إنهاء العقد في حال امتناع الطرف الثاني عن دفع الأجور في الموعد المحدد.
- هذا العقد يخضع للقوانين المعمول بها في [COUNTRY].

### التوقيعات
[COMPANY_NAME]:

[CLIENT_NAME]:
  `
};

export function MarketingContracts({ restaurantId, currency }: Props) {
  const [contracts, setContracts] = useState<MarketingContract[]>([]);
  const [services, setServices] = useState<MarketingService[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewingContract, setPreviewingContract] = useState<MarketingContract | null>(null);
  const [editingContract, setEditingContract] = useState<MarketingContract | null>(null);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    notes: ''
  });
  const [contractServices, setContractServices] = useState<ContractService[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, servicesRes, customersRes] = await Promise.all([
        supabase.from('marketing_contracts').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('marketing_services').select('*').eq('restaurant_id', restaurantId).eq('is_active', true),
        supabase.from('customers').select('id, name').eq('restaurant_id', restaurantId).order('name')
      ]);
      setContracts(contractsRes.data || []);
      setServices(servicesRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (e: any) {
      toast.error('خطأ في تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const calculateTotal = () => {
    return contractServices.reduce((sum, item) => sum + item.price, 0);
  };

  const addService = () => {
    setContractServices([...contractServices, { service_name: '', description: '', price: 0 }]);
  };

  const removeService = (index: number) => {
    if (contractServices.length > 0) {
      setContractServices(contractServices.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: string, value: any) => {
    const newServices = [...contractServices];
    if (field === 'service_id') {
      const selected = services.find(s => s.id === value);
      if (selected) {
        newServices[index].service_name = selected.name;
        newServices[index].description = selected.description;
        newServices[index].price = selected.base_price;
      }
    }
    newServices[index][field] = value;
    setContractServices(newServices);
  };

  const generateContractPreview = (contract: MarketingContract) => {
    let template = CONTRACT_TEMPLATES.general;
    const total = calculateTotal();
    template = template.replace('[DATE]', new Date().toLocaleDateString('ar-EG'));
    template = template.replace('[COMPANY_NAME]', 'شركتك (اسم الشركة)');
    template = template.replace('[CLIENT_NAME]', form.customer_name || 'العميل');
    template = template.replace('[START_DATE]', form.start_date);
    template = template.replace('[END_DATE]', form.end_date);
    template = template.replace('[TOTAL_AMOUNT]', total.toLocaleString());
    template = template.replace('[CURRENCY]', currency);
    template = template.replace('[COUNTRY]', 'مصر');
    
    let servicesText = '';
    contractServices.forEach((s, idx) => {
      servicesText += `${idx + 1}. ${s.service_name}: ${s.description} - ${s.price.toLocaleString()} ${currency}\n`;
    });
    template = template.replace('[INCLUDED_SERVICES]', servicesText);
    
    return template;
  };

  const handleSave = async () => {
    if (contractServices.length === 0) {
      toast.error('يرجى إضافة خدمة واحدة على الأقل');
      return;
    }
    setLoading(true);
    try {
      const contractNumber = editingContract ? editingContract.contract_number : `C-${Date.now().toString().slice(-8)}`;
      const payload = {
        restaurant_id: restaurantId,
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        contract_number: contractNumber,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        notes: form.notes
      };
      
      let contractId;
      if (editingContract) {
        const { error } = await supabase.from('marketing_contracts').update(payload).eq('id', editingContract.id);
        if (error) throw error;
        contractId = editingContract.id;
        await supabase.from('marketing_contract_services').delete().eq('contract_id', editingContract.id);
      } else {
        const { data, error } = await supabase.from('marketing_contracts').insert(payload as any).select();
        if (error) throw error;
        contractId = data[0].id;
      }
      
      await supabase.from('marketing_contract_services').insert(
        contractServices.map(s => ({
          contract_id: contractId,
          service_id: s.service_id || null,
          service_name: s.service_name,
          description: s.description,
          price: s.price
        }))
      );

      toast.success(editingContract ? 'تم تحديث العقد بنجاح' : 'تم إنشاء العقد بنجاح');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contract: MarketingContract) => {
    if (!confirm(`هل تريد حذف العقد رقم "${contract.contract_number}"؟`)) return;
    try {
      await supabase.from('marketing_contracts').delete().eq('id', contract.id);
      toast.success('تم الحذف');
      loadData();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const openPreview = async (contract: MarketingContract) => {
    try {
      const { data } = await supabase.from('marketing_contract_services').select('*').eq('contract_id', contract.id);
      setContractServices(data || []);
      setForm({
        customer_id: contract.customer_id,
        customer_name: contract.customer_name,
        start_date: contract.start_date,
        end_date: contract.end_date,
        status: contract.status,
        notes: contract.notes
      });
      setPreviewingContract(contract);
      setShowPreviewModal(true);
    } catch (e) {
      toast.error('خطأ في تحميل التفاصيل');
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: '',
      customer_name: '',
      start_date: '',
      end_date: '',
      status: 'draft',
      notes: ''
    });
    setContractServices([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'active': return 'نشط';
      case 'completed': return 'مكتمل';
      case 'terminated': return 'منتهي';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            العقود الاحترافية
          </h2>
          <p className="text-sm text-muted-foreground mt-1">إنشاء عقود تسويقية احترافية بدون مسؤولية على الشركة</p>
        </div>
        <Button onClick={() => {
          setEditingContract(null);
          resetForm();
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 ml-2" /> عقد جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي العقود</p>
          <p className="text-2xl font-bold text-primary">{contracts.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">العقود النشطة</p>
          <p className="text-2xl font-bold text-emerald-600">
            {contracts.filter(c => c.status === 'active').length}
          </p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">المسودة</p>
          <p className="text-2xl font-bold">{contracts.filter(c => c.status === 'draft').length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">المكتملة</p>
          <p className="text-2xl font-bold text-blue-600">{contracts.filter(c => c.status === 'completed').length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map(contract => (
          <Card key={contract.id} className="p-5 hover:shadow-lg transition-all border-border/60">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">
                    عقد رقم {contract.contract_number}
                  </h3>
                  <Badge className={getStatusColor(contract.status)}>
                    {getStatusLabel(contract.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{contract.customer_name || 'عميل غير محدد'}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openPreview(contract)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingContract(contract);
                  setForm({
                    customer_id: contract.customer_id,
                    customer_name: contract.customer_name,
                    start_date: contract.start_date,
                    end_date: contract.end_date,
                    status: contract.status,
                    notes: contract.notes
                  });
                  (async () => {
                    const { data } = await supabase.from('marketing_contract_services').select('*').eq('contract_id', contract.id);
                    setContractServices(data || []);
                    setShowModal(true);
                  })();
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(contract)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="pt-3 border-t border-border/40">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ البدء:</p>
                  <p className="font-bold">{contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-EG') : '-'}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">تاريخ الانتهاء:</p>
                  <p className="font-bold">{contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-EG') : '-'}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {contracts.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد عقود حتى الآن</p>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'تعديل العقد' : 'إنشاء عقد جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label>العميل</Label>
                <Select value={form.customer_id} onValueChange={(v) => {
                  const customer = customers.find(c => c.id === v);
                  setForm({ ...form, customer_id: v, customer_name: customer?.name || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>اسم العميل (إذا لم يكن في القائمة)</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value})} />
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v})}>
                  <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="terminated">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ بدء العقد</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>تاريخ انتهاء العقد</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="border rounded-xl border-primary/10 p-4 bg-primary/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">الخدمات المدرجة في العقد</h3>
                <Button variant="outline" size="sm" onClick={addService}>
                  <Plus className="w-4 h-4" /> إضافة خدمة
                </Button>
              </div>
              <div className="space-y-3">
                {contractServices.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label>الخدمة</Label>
                      <Select value={item.service_id} onValueChange={(v) => updateService(index, 'service_id', v)}>
                        <SelectTrigger><SelectValue placeholder="اختر الخدمة" /></SelectTrigger>
                        <SelectContent>
                          {services.map(service => <SelectItem key={service.id} value={service.id}>{service.name} - {service.base_price.toLocaleString()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6">
                      <Label>وصف الخدمة في العقد</Label>
                      <Input value={item.description} onChange={(e) => updateService(index, 'description', e.target.value)} placeholder="وصف الخدمة" />
                    </div>
                    <div className="col-span-2">
                      <Label>السعر</Label>
                      <Input type="number" value={item.price} onChange={(e) => updateService(index, 'price', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeService(index)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                  <p className="text-muted-foreground text-sm">ملاحظة: هذا العقد يخلّي مسؤولية الشركة بشكل كامل حسب النموذج</p>
                  <p className="font-bold text-xl">{calculateTotal().toLocaleString()} {currency}</p>
                </div>
              </div>
            </div>
            <div>
              <Label>ملاحظات إضافية للعقد</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value})} placeholder="ملاحظات إضافية للعقد" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setPreviewingContract(editingContract || { ...form });
              setShowPreviewModal(true);
            }}>
              <Eye className="w-4 h-4" /> معاينة العقد
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingContract ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة العقد</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-white border rounded-xl shadow">
            <pre className="whitespace-pre-wrap text-sm font-sans">{generateContractPreview(previewingContract)}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>إغلاق</Button>
            <Button variant="default" onClick={() => {
              const preview = generateContractPreview(previewingContract);
              const blob = new Blob([preview], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `عقد-${form.customer_name}.txt`;
              a.click();
            }}>
              <Download className="w-4 h-4" /> تحميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
