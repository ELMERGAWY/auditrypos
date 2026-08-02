import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Plus, Edit2, Trash2, Search, 
  ChevronDown, ChevronUp, Package, Truck, User, 
  Factory, AlertTriangle, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StockLocation {
  id: string;
  name: string;
  name_ar?: string;
  code?: string;
  location_type: string;
  usage: string;
  parent_id?: string;
  path?: string;
  address?: string;
  city?: string;
  country?: string;
  is_scrap_location: boolean;
  is_return_location: boolean;
  is_internal: boolean;
  warehouse_id?: string;
  is_active: boolean;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const LOCATION_TYPES = [
  { id: 'internal', label: 'داخلي', icon: Building2, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'customer', label: 'عميل', icon: User, color: 'bg-green-500/20 text-green-400' },
  { id: 'supplier', label: 'مورد', icon: Truck, color: 'bg-amber-500/20 text-amber-400' },
  { id: 'transit', label: 'نقل', icon: Package, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'production', label: 'إنتاج', icon: Factory, color: 'bg-red-500/20 text-red-400' },
  { id: 'loss', label: 'فقدان', icon: AlertTriangle, color: 'bg-rose-500/20 text-rose-400' },
  { id: 'inventory', label: 'جرد', icon: Package, color: 'bg-cyan-500/20 text-cyan-400' },
];

const USAGE_TYPES = [
  { id: 'internal', label: 'داخلي' },
  { id: 'supplier', label: 'مورد' },
  { id: 'customer', label: 'عميل' },
  { id: 'inventory', label: 'جرد' },
  { id: 'production', label: 'إنتاج' },
  { id: 'transit', label: 'نقل' },
];

export function StockLocationsManager({ restaurantId, currency }: Props) {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StockLocation | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    code: '',
    location_type: 'internal',
    usage: 'internal',
    parent_id: '',
    address: '',
    city: '',
    country: 'Egypt',
    is_scrap_location: false,
    is_return_location: false,
    is_internal: true,
    warehouse_id: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [locationsRes, warehousesRes] = await Promise.all([
        supabase.from('stock_locations').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
        supabase.from('warehouses').select('id, name').eq('restaurant_id', restaurantId)
      ]);

      setLocations(locationsRes.data || []);
      setWarehouses(warehousesRes.data || []);
    } catch (error: any) {
      toast.error('فشل تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('أدخل اسم الموقع');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        name: form.name,
        name_ar: form.name_ar || null,
        code: form.code || null,
        location_type: form.location_type,
        usage: form.usage,
        parent_id: form.parent_id || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country,
        is_scrap_location: form.is_scrap_location,
        is_return_location: form.is_return_location,
        is_internal: form.is_internal,
        warehouse_id: form.warehouse_id || null,
      };

      if (editing) {
        const { error } = await supabase.from('stock_locations').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('تم تحديث الموقع بنجاح');
      } else {
        const { error } = await supabase.from('stock_locations').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة الموقع بنجاح');
      }

      setShowForm(false);
      setEditing(null);
      resetForm();
      load();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (location: StockLocation) => {
    if (!confirm(`هل أنت متأكد من حذف الموقع: ${location.name}؟`)) return;
    
    try {
      const { error } = await supabase.from('stock_locations').delete().eq('id', location.id);
      if (error) throw error;
      toast.success('تم حذف الموقع');
      load();
    } catch (error: any) {
      toast.error('فشل الحذف: ' + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      name_ar: '',
      code: '',
      location_type: 'internal',
      usage: 'internal',
      parent_id: '',
      address: '',
      city: '',
      country: 'Egypt',
      is_scrap_location: false,
      is_return_location: false,
      is_internal: true,
      warehouse_id: '',
    });
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    (loc.name_ar && loc.name_ar.includes(search)) ||
    (loc.code && loc.code.toLowerCase().includes(search.toLowerCase()))
  );

  const getLocationTypeDisplay = (type: string) => {
    return LOCATION_TYPES.find(t => t.id === type) || LOCATION_TYPES[0];
  };

  const stats = {
    total: locations.length,
    internal: locations.filter(l => l.location_type === 'internal').length,
    active: locations.filter(l => l.is_active).length,
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <MapPin className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المواقع</h1>
            <p className="text-muted-foreground">إدارة مواقع المخزون (نظام القيد المزدوج)</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          إضافة موقع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المواقع</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">مواقع داخلية</p>
              <p className="text-xl font-bold">{stats.internal}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">نشطة</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث في المواقع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Locations List */}
      <div className="space-y-2">
        {filteredLocations.map((location) => {
          const typeDisplay = getLocationTypeDisplay(location.location_type);
          const TypeIcon = typeDisplay.icon;
          const isExpanded = expandedRows.has(location.id);

          return (
            <Card key={location.id} className="overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleRow(location.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeDisplay.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">{location.name}</h4>
                    {location.name_ar && <p className="text-sm text-muted-foreground">{location.name_ar}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {location.code && (
                    <Badge variant="outline" className="text-xs">{location.code}</Badge>
                  )}
                  <Badge variant={location.is_active ? 'default' : 'secondary'} className="text-xs">
                    {location.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t px-4 py-3 space-y-2"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">النوع</p>
                        <p className="font-medium">{typeDisplay.label}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الاستخدام</p>
                        <p className="font-medium">{location.usage}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">المدينة</p>
                        <p className="font-medium">{location.city || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الدولة</p>
                        <p className="font-medium">{location.country}</p>
                      </div>
                    </div>
                    {location.address && (
                      <div>
                        <p className="text-muted-foreground text-sm">العنوان</p>
                        <p className="text-sm">{location.address}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(location); setShowForm(true); }}>
                        <Edit2 className="w-4 h-4 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(location); }}>
                        <Trash2 className="w-4 h-4 ml-1" /> حذف
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}

        {filteredLocations.length === 0 && (
          <div className="py-20 text-center border-dashed border rounded-xl">
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا توجد مواقع مسجلة</p>
            <Button variant="link" onClick={() => setShowForm(true)} className="text-indigo-500">
              أضف موقع جديد
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الموقع' : 'إضافة موقع جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الموقع *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم الموقع"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالعربية</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكود</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="مثال: WH-001"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الموقع *</Label>
                <select
                  value={form.location_type}
                  onChange={(e) => setForm({ ...form, location_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {LOCATION_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاستخدام *</Label>
                <select
                  value={form.usage}
                  onChange={(e) => setForm({ ...form, usage: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {USAGE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>الموقع الأب</Label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">بدون</option>
                  {locations.filter(l => l.id !== editing?.id).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ربط بالمخزن</Label>
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="">بدون</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="المدينة"
                />
              </div>
              <div className="space-y-2">
                <Label>الدولة</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="الدولة"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان الكامل"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_scrap_location}
                  onChange={(e) => setForm({ ...form, is_scrap_location: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">موقع للهالك</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_return_location}
                  onChange={(e) => setForm({ ...form, is_return_location: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">موقع للمرتجعات</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
