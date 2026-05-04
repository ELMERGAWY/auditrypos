// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Percent, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: string;
  is_included_in_price: boolean;
  is_active: boolean;
}

export function TaxManager({ companyId }: { companyId: string }) {
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For new/edit tax
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate: 14,
    is_included_in_price: false
  });

  useEffect(() => {
    loadTaxes();
  }, [companyId]);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('restaurant_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaxes(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error('خطأ في تحميل الضرائب');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الضريبة');
      return;
    }

    try {
      if (editingId === 'new') {
        const { error } = await supabase
          .from('tax_rates')
          .insert({
            restaurant_id: companyId,
            name: formData.name,
            rate: formData.rate,
            is_included_in_price: formData.is_included_in_price,
            type: 'vat'
          });
        if (error) throw error;
        toast.success('تمت إضافة الضريبة');
      } else {
        const { error } = await supabase
          .from('tax_rates')
          .update({
            name: formData.name,
            rate: formData.rate,
            is_included_in_price: formData.is_included_in_price
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الضريبة');
      }
      
      setEditingId(null);
      loadTaxes();
    } catch (error: any) {
      console.error(error);
      toast.error('فشل في حفظ الضريبة');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('tax_rates')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
      
      setTaxes(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
    } catch (error) {
      toast.error('فشل في تغيير الحالة');
    }
  };

  const deleteTax = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الضريبة؟')) return;
    try {
      const { error } = await supabase.from('tax_rates').delete().eq('id', id);
      if (error) throw error;
      setTaxes(prev => prev.filter(t => t.id !== id));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('فشل الحذف، قد تكون مرتبطة بطلبات سابقة');
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent className="w-6 h-6 text-primary" />
          <h2 className="font-display text-xl font-bold">إدارة الضرائب والرسوم</h2>
        </div>
        {!editingId && (
          <Button onClick={() => {
            setFormData({ name: '', rate: 14, is_included_in_price: false });
            setEditingId('new');
          }} className="gradient-bg text-primary-foreground border-0">
            <Plus className="w-4 h-4 ml-2" /> إضافة ضريبة جديدة
          </Button>
        )}
      </div>

      {editingId && (
        <div className="glass-card p-4 mb-6 border-primary/50">
          <h3 className="font-bold mb-4">{editingId === 'new' ? 'ضريبة جديدة' : 'تعديل ضريبة'}</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">اسم الضريبة (مثال: ضريبة قيمة مضافة)</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="اسم الضريبة" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">النسبة %</label>
              <Input type="number" value={formData.rate} onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium">مشمولة في السعر؟</p>
                <p className="text-[10px] text-muted-foreground">إذا تم تفعيلها، سيتم استقطاع الضريبة من سعر المنتج بدلاً من إضافتها فوق السعر.</p>
              </div>
              <Switch checked={formData.is_included_in_price} onCheckedChange={c => setFormData({ ...formData, is_included_in_price: c })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button onClick={handleSave} className="gradient-bg text-primary-foreground border-0">
              <Save className="w-4 h-4 ml-1" /> حفظ الضريبة
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {taxes.length === 0 && !editingId && (
          <p className="text-center text-muted-foreground py-8">لم تقم بإضافة أي ضرائب بعد.</p>
        )}
        
        {taxes.map(tax => (
          <div key={tax.id} className={`glass-card p-4 flex items-center justify-between transition-opacity ${!tax.is_active ? 'opacity-50' : ''}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{tax.name}</span>
                <Badge variant="outline" className="text-xs">{tax.rate}%</Badge>
                {tax.is_included_in_price ? (
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30">مشمولة في السعر</Badge>
                ) : (
                  <Badge variant="secondary">تضاف فوق السعر</Badge>
                )}
                {!tax.is_active && <Badge variant="destructive">معطلة</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">تاريخ الإنشاء: {new Date(tax.created_at || '').toLocaleDateString('ar-EG')}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleActive(tax.id, tax.is_active)}>
                {tax.is_active ? 'تعطيل' : 'تفعيل'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setFormData({ name: tax.name, rate: tax.rate, is_included_in_price: tax.is_included_in_price });
                setEditingId(tax.id);
              }}>
                <Edit2 className="w-4 h-4 text-primary" />
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTax(tax.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
