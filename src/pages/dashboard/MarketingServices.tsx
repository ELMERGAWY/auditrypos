
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
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
  category: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const SERVICE_CATEGORIES = [
  { value: 'brand_design', label: 'تصميم هوية تجارية' },
  { value: 'digital_marketing', label: 'خدمات التسويق الالكتروني' },
  { value: 'social_media', label: 'إدارة السوشيال ميديا' },
  { value: 'content_creation', label: 'إنشاء محتوى' },
  { value: 'graphic_design', label: 'تصميم جرافيك' },
  { value: 'video_production', label: 'إنتاج فيديو' },
  { value: 'other', label: 'خدمات أخرى' }
];

export function MarketingServices({ restaurantId, currency }: Props) {
  const [services, setServices] = useState<MarketingService[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<MarketingService | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    base_price: '',
    is_active: true
  });

  // Safety checks for arrays to prevent React error #306
  const safeServices = Array.isArray(services) ? services : [];

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_services')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (e: any) {
      toast.error('خطأ في تحميل الخدمات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [restaurantId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم الخدمة');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        name: form.name,
        description: form.description,
        category: form.category,
        base_price: Number(form.base_price) || 0,
        is_active: form.is_active
      };

      if (editingService) {
        const { error } = await supabase
          .from('marketing_services')
          .update(payload)
          .eq('id', editingService.id);
        if (error) throw error;
        toast.success('تم تحديث الخدمة بنجاح');
      } else {
        const { error } = await supabase
          .from('marketing_services')
          .insert(payload as any);
        if (error) throw error;
        toast.success('تم إضافة الخدمة بنجاح');
      }
      setShowModal(false);
      setEditingService(null);
      resetForm();
      loadServices();
    } catch (e: any) {
      toast.error('خطأ في الحفظ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service: MarketingService) => {
    if (!confirm(`هل تريد حذف الخدمة "${service.name}"؟`)) return;
    try {
      const { error } = await supabase.from('marketing_services').delete().eq('id', service.id);
      if (error) throw error;
      toast.success('تم حذف الخدمة');
      loadServices();
    } catch (e: any) {
      toast.error('خطأ في الحذف: ' + e.message);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: '',
      base_price: '',
      is_active: true
    });
  };

  const getCategoryLabel = (category: string) => {
    return SERVICE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            إدارة الخدمات التسويقية
          </h2>
          <p className="text-sm text-muted-foreground mt-1">أضف وادارة الخدمات التي توفرها وكالتك مثل تصميم الهوية التجارية، إدارة السوشيال ميديا، الخ</p>
        </div>
        <Button onClick={() => {
          setEditingService(null);
          resetForm();
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 ml-2" /> خدمة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إجمالي الخدمات</p>
          <p className="text-2xl font-bold text-primary">{safeServices.length}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">الخدمات النشطة</p>
          <p className="text-2xl font-bold text-emerald-600">
            {safeServices.filter(s => s.is_active).length}
          </p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">تصميم الهوية التجارية</p>
          <p className="text-2xl font-bold">
            {safeServices.filter(s => s.category === 'brand_design').length}
          </p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">إدارة السوشيال ميديا</p>
          <p className="text-2xl font-bold">
            {safeServices.filter(s => s.category === 'social_media').length}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeServices.map(service => (
          <Card key={service.id} className="p-5 hover:shadow-lg transition-all border-border/60">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{service.name}</h3>
                <Badge variant="outline" className="mt-1">
                  {getCategoryLabel(service.category)}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditingService(service);
                  setForm({
                    name: service.name,
                    description: service.description || '',
                    category: service.category,
                    base_price: String(service.base_price),
                    is_active: service.is_active
                  });
                  setShowModal(true);
                }}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(service)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-border/40">
              <div>
                <span className="text-xs text-muted-foreground">السعر الأساسي:</span>
                <p className="text-xl font-bold text-primary">{service.base_price.toLocaleString()} {currency}</p>
              </div>
              {service.is_active ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </Card>
        ))}
        {services.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد خدمات مضافة حتى الآن</p>
            <Button variant="link" onClick={() => {
              setEditingService(null);
              resetForm();
              setShowModal(true);
            }}>أضف خدمتك الأولى</Button>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الخدمة *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: تصميم هوية تجارية كاملة" />
            </div>
            <div>
              <Label>تصنيف الخدمة</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>السعر الأساسي ({currency})</Label>
              <Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>وصف الخدمة</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مفصل للخدمة التي توفرها" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active_status" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="active_status">الخدمة نشطة</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingService ? 'تحديث' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

