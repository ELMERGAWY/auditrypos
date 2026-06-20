import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Edit, User, Phone, MapPin, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Restaurant } from './types';

interface Contractor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  specialty?: string;
  payment_type: 'fixed' | 'percentage';
  payment_value: number;
  balance: number;
  notes?: string;
  is_active: boolean;
}

interface ContractorService {
  id: string;
  contractor_id: string;
  service_name: string;
  service_amount: number;
  contractor_amount: number;
  status: 'pending' | 'completed' | 'approved' | 'paid';
  completion_date?: string;
  notes?: string;
  created_at: string;
}

interface Props {
  restaurant: Restaurant;
}

export function ContractorsTab({ restaurant }: Props) {
  if (!restaurant) return <div className="p-8 text-center">جاري تحميل بيانات النشاط...</div>;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorServices, setContractorServices] = useState<ContractorService[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    specialty: '',
    payment_type: 'fixed' as 'fixed' | 'percentage',
    payment_value: '',
    notes: ''
  });

  const loadContractors = async () => {
    const { data } = await supabase
      .from('contractors')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name');
    setContractors(data || []);
  };

  const loadContractorServices = async (contractorId: string) => {
    const { data } = await supabase
      .from('contractor_services')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });
    setContractorServices(data || []);
  };

  useEffect(() => {
    loadContractors();
  }, [restaurant.id]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      address: '',
      specialty: '',
      payment_type: 'fixed',
      payment_value: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingContractor(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.payment_value) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const payload = {
      restaurant_id: restaurant.id,
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      specialty: form.specialty || null,
      payment_type: form.payment_type,
      payment_value: Number(form.payment_value),
      notes: form.notes || null,
      is_active: true
    };

    if (editingContractor) {
      const { error } = await supabase
        .from('contractors')
        .update(payload)
        .eq('id', editingContractor.id);
      if (error) {
        toast.error('خطأ في التحديث: ' + error.message);
        return;
      }
      toast.success('تم تحديث الصنايعي');
    } else {
      const { error } = await supabase
        .from('contractors')
        .insert(payload);
      if (error) {
        toast.error('خطأ في الإضافة: ' + error.message);
        return;
      }
      toast.success('تم إضافة الصنايعي');
    }
    resetForm();
    loadContractors();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('contractors').delete().eq('id', id);
    setContractors(contractors.filter(c => c.id !== id));
    toast.success('تم حذف الصنايعي');
  };

  const handleToggleActive = async (contractor: Contractor) => {
    await supabase
      .from('contractors')
      .update({ is_active: !contractor.is_active })
      .eq('id', contractor.id);
    setContractors(contractors.map(c => c.id === contractor.id ? { ...c, is_active: !contractor.is_active } : c));
  };

  const startEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setForm({
      name: contractor.name,
      phone: contractor.phone || '',
      address: contractor.address || '',
      specialty: contractor.specialty || '',
      payment_type: contractor.payment_type,
      payment_value: String(contractor.payment_value),
      notes: contractor.notes || ''
    });
    setShowAddForm(true);
  };

  const selectContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    loadContractorServices(contractor.id);
  };

  const updateServiceStatus = async (serviceId: string, status: string) => {
    const { error } = await supabase
      .from('contractor_services')
      .update({ 
        status,
        completion_date: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', serviceId);
    if (error) {
      toast.error('خطأ في تحديث الحالة');
      return;
    }
    toast.success('تم تحديث الحالة');
    if (selectedContractor) {
      loadContractorServices(selectedContractor.id);
      loadContractors();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'قيد الانتظار', className: 'bg-yellow-500/20 text-yellow-700' },
      completed: { label: 'تم الإنجاز', className: 'bg-blue-500/20 text-blue-700' },
      approved: { label: 'معتمد', className: 'bg-green-500/20 text-green-700' },
      paid: { label: 'مدفوع', className: 'bg-purple-500/20 text-purple-700' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">إدارة الصنايعية ({contractors.length})</h2>
        <Button onClick={() => { resetForm(); setShowAddForm(true); }} className="gradient-bg text-primary-foreground border-0">
          <Plus className="w-4 h-4 ml-1" /> إضافة صنايعي
        </Button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-display font-bold">{editingContractor ? 'تعديل الصنايعي' : 'إضافة صنايعي جديد'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>الاسم *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الصنايعي" />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف" />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان" />
                </div>
                <div>
                  <Label>التخصص</Label>
                  <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="مثال: سباك، كهربائي" />
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <select
                    value={form.payment_type}
                    onChange={e => setForm({ ...form, payment_type: e.target.value as 'fixed' | 'percentage' })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="fixed">مبلغ مقطوع</option>
                    <option value="percentage">نسبة من الخدمة</option>
                  </select>
                </div>
                <div>
                  <Label>{form.payment_type === 'fixed' ? 'المبلغ المقطوع (ج.م)' : 'النسبة (%)'}</Label>
                  <Input
                    type="number"
                    value={form.payment_value}
                    onChange={e => setForm({ ...form, payment_value: e.target.value })}
                    placeholder={form.payment_type === 'fixed' ? 'مثال: 100' : 'مثال: 20'}
                  />
                </div>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="gradient-bg text-primary-foreground border-0">
                  <Save className="w-4 h-4 ml-1" /> {editingContractor ? 'حفظ التعديلات' : 'إضافة'}
                </Button>
                <Button variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contractors List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {contractors.map(contractor => (
          <div
            key={contractor.id}
            className={`glass-card p-4 cursor-pointer transition-all ${selectedContractor?.id === contractor.id ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
            onClick={() => selectContractor(contractor)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{contractor.name}</p>
                  <p className="text-xs text-muted-foreground">{contractor.specialty || 'بدون تخصص'}</p>
                </div>
              </div>
              <Badge className={!contractor.is_active ? 'status-suspended' : 'status-active'}>
                {contractor.is_active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              {contractor.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {contractor.phone}
                </div>
              )}
              {contractor.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {contractor.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                {contractor.payment_type === 'fixed' ? `${contractor.payment_value} ج.م` : `${contractor.payment_value}%`}
              </div>
              <div className="flex items-center gap-2 text-primary font-bold">
                <DollarSign className="w-3 h-3" />
                الرصيد المستحق: {contractor.balance.toFixed(2)} ج.م
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(contractor); }}>
                <Edit className="w-3 h-3 ml-1" /> تعديل
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleToggleActive(contractor); }}>
                {contractor.is_active ? 'إيقاف' : 'تفعيل'}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(contractor.id); }}>
                <Trash2 className="w-3 h-3 ml-1" /> حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Contractor Services Detail */}
      {selectedContractor && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">خدمات {selectedContractor.name}</h3>
            <Button size="sm" variant="outline" onClick={() => setSelectedContractor(null)}>إغلاق</Button>
          </div>
          <div className="space-y-2">
            {contractorServices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد خدمات مسجلة لهذا الصنايعي</p>
            ) : (
              contractorServices.map(service => (
                <div key={service.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{service.service_name}</p>
                    {getStatusBadge(service.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قيمة الخدمة: {service.service_amount} ج.م</span>
                    <span className="text-primary font-bold">المستحق: {service.contractor_amount} ج.م</span>
                  </div>
                  {service.completion_date && (
                    <p className="text-xs text-muted-foreground">تاريخ الإنجاز: {new Date(service.completion_date).toLocaleDateString('ar-EG')}</p>
                  )}
                  <div className="flex gap-2">
                    {service.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateServiceStatus(service.id, 'completed')}>
                        <CheckCircle className="w-3 h-3 ml-1" /> تم الإنجاز
                      </Button>
                    )}
                    {service.status === 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => updateServiceStatus(service.id, 'approved')}>
                        <CheckCircle className="w-3 h-3 ml-1" /> اعتماد للدفع
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
