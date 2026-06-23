
// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FileText, TrendingUp, Trash2, Edit2, CheckCircle, 
  XCircle, AlertCircle, Calendar, DollarSign, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  restaurantId: string;
  currency: string;
}

export function SupplierContracts({ restaurantId, currency }: Props) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddContract, setShowAddContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [editingContract, setEditingContract] = useState<any>(null);

  const [contractForm, setContractForm] = useState({
    supplier_id: '',
    contract_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active',
    immediate_commission_percent: '',
    immediate_commission_fixed: '',
    has_annual_bonus: false,
    annual_bonus_type: 'percentage',
    annual_bonus_value: '',
    annual_bonus_threshold: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, suppliersRes, commissionsRes] = await Promise.all([
        supabase.from('supplier_contracts').select('*, suppliers(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name').eq('restaurant_id', restaurantId),
        supabase.from('supplier_commissions').select('*, suppliers(*), supplier_contracts(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
      ]);

      setContracts(contractsRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setCommissions(commissionsRes.data || []);
    } catch (e: any) {
      toast.error('فشل تحميل البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [restaurantId]);

  const handleSaveContract = async () => {
    if (!contractForm.supplier_id || !contractForm.contract_name) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      const data = {
        restaurant_id: restaurantId,
        supplier_id: contractForm.supplier_id,
        contract_name: contractForm.contract_name,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date || null,
        status: contractForm.status,
        immediate_commission_percent: Number(contractForm.immediate_commission_percent) || 0,
        immediate_commission_fixed: Number(contractForm.immediate_commission_fixed) || 0,
        has_annual_bonus: contractForm.has_annual_bonus,
        annual_bonus_type: contractForm.annual_bonus_type,
        annual_bonus_value: Number(contractForm.annual_bonus_value) || 0,
        annual_bonus_threshold: Number(contractForm.annual_bonus_threshold) || 0,
        notes: contractForm.notes
      };

      let error;
      if (editingContract) {
        ({ error } = await supabase.from('supplier_contracts').update(data).eq('id', editingContract.id));
      } else {
        ({ error } = await supabase.from('supplier_contracts').insert(data));
      }

      if (error) throw error;
      toast.success(editingContract ? 'تم تحديث العقد بنجاح' : 'تم إنشاء العقد بنجاح');
      setShowAddContract(false);
      setEditingContract(null);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error('فشل حفظ العقد: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العقد؟')) return;
    try {
      const { error } = await supabase.from('supplier_contracts').delete().eq('id', contractId);
      if (error) throw error;
      toast.success('تم حذف العقد');
      loadData();
    } catch (e: any) {
      toast.error('فشل حذف العقد: ' + e.message);
    }
  };

  const handleMarkCommissionPaid = async (commissionId: string) => {
    try {
      const { error } = await supabase.from('supplier_commissions').update({ status: 'paid' }).eq('id', commissionId);
      if (error) throw error;
      toast.success('تم تحديث حالة العمولة');
      loadData();
    } catch (e: any) {
      toast.error('فشل تحديث الحالة: ' + e.message);
    }
  };

  const handleStartEdit = (contract: any) => {
    setEditingContract(contract);
    setContractForm({
      supplier_id: contract.supplier_id,
      contract_name: contract.contract_name,
      start_date: contract.start_date,
      end_date: contract.end_date || '',
      status: contract.status,
      immediate_commission_percent: contract.immediate_commission_percent?.toString() || '',
      immediate_commission_fixed: contract.immediate_commission_fixed?.toString() || '',
      has_annual_bonus: contract.has_annual_bonus,
      annual_bonus_type: contract.annual_bonus_type || 'percentage',
      annual_bonus_value: contract.annual_bonus_value?.toString() || '',
      annual_bonus_threshold: contract.annual_bonus_threshold?.toString() || '',
      notes: contract.notes || ''
    });
    setShowAddContract(true);
  };

  const resetForm = () => {
    setContractForm({
      supplier_id: '',
      contract_name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'active',
      immediate_commission_percent: '',
      immediate_commission_fixed: '',
      has_annual_bonus: false,
      annual_bonus_type: 'percentage',
      annual_bonus_value: '',
      annual_bonus_threshold: '',
      notes: ''
    });
    setEditingContract(null);
  };

  const totalEarnedCommissions = useMemo(() => 
    commissions.filter(c => c.status === 'earned').reduce((s, c) => s + Number(c.amount), 0),
    [commissions]
  );
  const totalPaidCommissions = useMemo(() => 
    commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0),
    [commissions]
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black">عقود الموردين والعمولات</h2>
            <p className="text-muted-foreground">إدارة عقود الموردين وتتبع العمولات الفورية والسنوية.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="p-3 bg-green-100 text-green-700 rounded-xl text-center min-w-[150px]">
            <p className="text-xs font-bold mb-1">مستحقات العمولات</p>
            <p className="font-black text-lg">{totalEarnedCommissions.toLocaleString()} {currency}</p>
          </div>
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl text-center min-w-[150px]">
            <p className="text-xs font-bold mb-1">العمولات المدفوعة</p>
            <p className="font-black text-lg">{totalPaidCommissions.toLocaleString()} {currency}</p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddContract(true); }} className="gap-2 text-lg h-12 px-6">
            <Plus className="w-5 h-5" /> عقد جديد
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contracts List */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> العقود النشطة
          </h3>
          <div className="space-y-3">
            {contracts.map(contract => (
              <div 
                key={contract.id} 
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedContract?.id === contract.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setSelectedContract(contract)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{contract.contract_name}</h4>
                    <p className="text-sm text-muted-foreground">المورد: {contract.suppliers?.name || 'غير محدد'}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className={contract.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                        {contract.status === 'active' ? 'نشط' : contract.status === 'expired' ? 'منتهي' : 'معلق'}
                      </Badge>
                      {contract.has_annual_bonus && <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">بونص سنوي</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleStartEdit(contract); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteContract(contract.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">عمولة فورية</p>
                    <p className="font-bold">{contract.immediate_commission_percent}% + {contract.immediate_commission_fixed} {currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">المدة</p>
                    <p className="font-bold">{new Date(contract.start_date).toLocaleDateString('ar-EG')} - {contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-EG') : 'غير محدود'}</p>
                  </div>
                </div>
              </div>
            ))}
            {contracts.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد عقود حالياً</p>
              </div>
            )}
          </div>
        </Card>

        {/* Selected Contract Details & Commissions */}
        <Card className="p-6">
          {selectedContract ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedContract.contract_name}</h3>
                  <p className="text-sm text-muted-foreground">المورد: {selectedContract.suppliers?.name}</p>
                </div>
                <Badge variant="outline" className={selectedContract.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                  {selectedContract.status === 'active' ? 'نشط' : 'منتهي'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">العمولة الفورية</p>
                  <p className="font-bold">{selectedContract.immediate_commission_percent}% + {selectedContract.immediate_commission_fixed} {currency}</p>
                </div>
                {selectedContract.has_annual_bonus && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600">البونص السنوي</p>
                    <p className="font-bold text-orange-700">
                      {selectedContract.annual_bonus_type === 'percentage' ? `${selectedContract.annual_bonus_value}%` : `${selectedContract.annual_bonus_value} ${currency}`} 
                      {selectedContract.annual_bonus_threshold > 0 && ` (عند ${selectedContract.annual_bonus_threshold.toLocaleString()} ${currency})`}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> العمولات المتعلقة بهذا العقد
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {commissions
                    .filter(c => c.contract_id === selectedContract.id)
                    .map(commission => (
                      <div key={commission.id} className="p-3 bg-secondary/30 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-bold">{commission.type === 'immediate' ? 'عمولة فورية' : 'بونص سنوي'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(commission.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{Number(commission.amount).toLocaleString()} {currency}</p>
                          <Badge variant="outline" className={
                            commission.status === 'paid' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            commission.status === 'earned' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }>
                            {commission.status === 'paid' ? 'مدفوعة' : 'مستحقة'}
                          </Badge>
                          {commission.status === 'earned' && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkCommissionPaid(commission.id)}>
                              <CheckCircle className="w-3 h-3 ml-1" /> تسديد
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {commissions.filter(c => c.contract_id === selectedContract.id).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                      <p>لا توجد عمولات بعد</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>اختر عقداً لعرض تفاصيله والعمولات الخاصة به</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Contract Modal */}
      <AnimatePresence>
        {showAddContract && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddContract(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="glass-card p-8 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                  <FileText className="w-5 h-5 text-primary" /> {editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowAddContract(false)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>المورد *</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={contractForm.supplier_id} onChange={e => setContractForm({ ...contractForm, supplier_id: e.target.value })}>
                      <option value="">اختر المورد</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>اسم العقد *</Label>
                    <Input value={contractForm.contract_name} onChange={e => setContractForm({ ...contractForm, contract_name: e.target.value })} placeholder="مثال: عقد توريد خضروات" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>تاريخ البداية</Label>
                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>تاريخ النهاية</Label>
                    <Input type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} placeholder="غير محدود" />
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={contractForm.status} onChange={e => setContractForm({ ...contractForm, status: e.target.value })}>
                      <option value="active">نشط</option>
                      <option value="suspended">معلق</option>
                      <option value="expired">منتهي</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="font-bold mb-3">العمولة الفورية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>نسبة العمولة (%)</Label>
                      <Input type="number" value={contractForm.immediate_commission_percent} onChange={e => setContractForm({ ...contractForm, immediate_commission_percent: e.target.value })} placeholder="0.00" step="0.01" />
                    </div>
                    <div>
                      <Label>مبلغ ثابت ({currency})</Label>
                      <Input type="number" value={contractForm.immediate_commission_fixed} onChange={e => setContractForm({ ...contractForm, immediate_commission_fixed: e.target.value })} placeholder="0.00" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="has_annual_bonus" checked={contractForm.has_annual_bonus} onChange={e => setContractForm({ ...contractForm, has_annual_bonus: e.target.checked })} />
                    <Label htmlFor="has_annual_bonus" className="!mb-0">تفعيل البونص السنوي</Label>
                  </div>
                  {contractForm.has_annual_bonus && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>نوع البونص</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={contractForm.annual_bonus_type} onChange={e => setContractForm({ ...contractForm, annual_bonus_type: e.target.value })}>
                          <option value="percentage">نسبة %</option>
                          <option value="fixed">مبلغ ثابت</option>
                        </select>
                      </div>
                      <div>
                        <Label>قيمة البونص</Label>
                        <Input type="number" value={contractForm.annual_bonus_value} onChange={e => setContractForm({ ...contractForm, annual_bonus_value: e.target.value })} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>حد التفعيل ({currency})</Label>
                        <Input type="number" value={contractForm.annual_bonus_threshold} onChange={e => setContractForm({ ...contractForm, annual_bonus_threshold: e.target.value })} placeholder="0.00" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>ملاحظات</Label>
                  <textarea className="w-full rounded-md border border-input bg-background p-3" rows="3" value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} placeholder="ملاحظات إضافية" />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSaveContract} disabled={loading} className="flex-1 gradient-bg text-primary-foreground border-0">
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddContract(false)} className="flex-1" disabled={loading}>إلغاء</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

