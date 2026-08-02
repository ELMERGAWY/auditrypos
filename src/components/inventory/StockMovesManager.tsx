import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Plus, Search, Filter, Calendar,
  Package, Truck, User, Building2, CheckCircle, Clock,
  XCircle, FileText, Download, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StockMove {
  id: string;
  product_id: string;
  product_name?: string;
  location_id: string;
  location_src_name?: string;
  location_dest_id: string;
  location_dest_name?: string;
  quantity: number;
  quantity_done: number;
  state: string;
  reference?: string;
  origin?: string;
  date: string;
  picking_id?: string;
  partner_id?: string;
  partner_name?: string;
}

interface StockLocation {
  id: string;
  name: string;
  name_ar?: string;
  location_type: string;
  code?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const MOVE_STATES = [
  { id: 'draft', label: 'مسودة', icon: Clock, color: 'bg-gray-500/20 text-gray-400' },
  { id: 'confirmed', label: 'مؤكد', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'assigned', label: 'مخصص', icon: Package, color: 'bg-amber-500/20 text-amber-400' },
  { id: 'done', label: 'مكتمل', icon: CheckCircle, color: 'bg-green-500/20 text-green-400' },
  { id: 'cancel', label: 'ملغي', icon: XCircle, color: 'bg-red-500/20 text-red-400' },
];

export function StockMovesManager({ restaurantId, currency }: Props) {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    product_id: '',
    location_src_id: '',
    location_dest_id: '',
    quantity: '',
    reference: '',
    origin: '',
    note: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [movesRes, locationsRes, productsRes] = await Promise.all([
        supabase
          .from('stock_moves')
          .select(`
            *,
            products(name, sku, barcode),
            stock_locations!stock_moves_location_id_fkey(name, name_ar, code),
            stock_locations_dest:stock_locations!stock_moves_location_dest_id_fkey(name, name_ar, code)
          `)
          .eq('restaurant_id', restaurantId)
          .order('date', { ascending: false })
          .limit(100),
        supabase.from('stock_locations').select('*').eq('restaurant_id', restaurantId).eq('is_active', true),
        supabase.from('products').select('id, name, sku, barcode').eq('restaurant_id', restaurantId)
      ]);

      const mappedMoves = (movesRes.data || []).map((move: any) => ({
        ...move,
        product_name: move.products?.name,
        location_src_name: move.stock_locations?.name,
        location_dest_name: move.stock_locations_dest?.name,
      }));

      setMoves(mappedMoves);
      setLocations(locationsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast.error('فشل تحميل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleCreateMove = async () => {
    if (!form.product_id || !form.location_src_id || !form.location_dest_id || !form.quantity) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (form.location_src_id === form.location_dest_id) {
      toast.error('الموقع المصدر والوجهة يجب أن يكونا مختلفين');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('create_stock_move', {
        p_restaurant_id: restaurantId,
        p_product_id: form.product_id,
        p_location_src_id: form.location_src_id,
        p_location_dest_id: form.location_dest_id,
        p_quantity: parseFloat(form.quantity),
        p_reference: form.reference || null,
        p_note: form.note || null,
        p_created_by: user?.id
      });

      if (error) throw error;

      toast.success('تم إنشاء حركة المخزون بنجاح');
      setShowForm(false);
      resetForm();
      load();
    } catch (error: any) {
      toast.error('فشل إنشاء الحركة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      product_id: '',
      location_src_id: '',
      location_dest_id: '',
      quantity: '',
      reference: '',
      origin: '',
      note: '',
    });
  };

  const filteredMoves = moves.filter(move => {
    const matchesSearch = 
      move.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      move.reference?.toLowerCase().includes(search.toLowerCase()) ||
      move.origin?.toLowerCase().includes(search.toLowerCase());
    
    const matchesState = filterState === 'all' || move.state === filterState;
    
    return matchesSearch && matchesState;
  });

  const getStateDisplay = (state: string) => {
    return MOVE_STATES.find(s => s.id === state) || MOVE_STATES[0];
  };

  const stats = {
    total: moves.length,
    done: moves.filter(m => m.state === 'done').length,
    pending: moves.filter(m => ['draft', 'confirmed', 'assigned'].includes(m.state)).length,
  };

  const internalLocations = locations.filter(l => l.location_type === 'internal');
  const otherLocations = locations.filter(l => l.location_type !== 'internal');

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <ArrowRightLeft className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">حركات المخزون</h1>
            <p className="text-muted-foreground">إدارة حركات المخزون (نظام القيد المزدوج)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={() => setShowForm(true)} className="gradient-bg">
            <Plus className="w-4 h-4 ml-2" />
            حركة جديدة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الحركات</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">مكتملة</p>
              <p className="text-xl font-bold">{stats.done}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الحركات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="h-10 px-3 rounded-lg bg-white/5 border border-white/10"
        >
          <option value="all">جميع الحالات</option>
          {MOVE_STATES.map(state => (
            <option key={state.id} value={state.id}>{state.label}</option>
          ))}
        </select>
      </div>

      {/* Moves List */}
      <div className="space-y-2">
        {filteredMoves.map((move) => {
          const stateDisplay = getStateDisplay(move.state);
          const StateIcon = stateDisplay.icon;

          return (
            <Card key={move.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stateDisplay.color}`}>
                    <StateIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">{move.product_name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{move.location_src_name}</span>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{move.location_dest_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-lg">{move.quantity.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{currency}</p>
                  </div>
                  <Badge variant="outline" className={stateDisplay.color}>
                    {stateDisplay.label}
                  </Badge>
                  {move.reference && (
                    <Badge variant="outline" className="text-xs">{move.reference}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                <div className="flex gap-4">
                  {move.origin && <span>المصدر: {move.origin}</span>}
                  <span>التاريخ: {new Date(move.date).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredMoves.length === 0 && (
          <div className="py-20 text-center border-dashed border rounded-xl">
            <ArrowRightLeft className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا توجد حركات مسجلة</p>
            <Button variant="link" onClick={() => setShowForm(true)} className="text-indigo-500">
              أنشئ حركة جديدة
            </Button>
          </div>
        )}
      </div>

      {/* Create Move Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء حركة مخزون جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المنتج *</Label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
              >
                <option value="">اختر المنتج...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الموقع المصدر *</Label>
                <select
                  value={form.location_src_id}
                  onChange={(e) => setForm({ ...form, location_src_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">اختر الموقع المصدر...</option>
                  <optgroup label="مواقع داخلية">
                    {internalLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="مواقع أخرى">
                    {otherLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <Label>الموقع الوجهة *</Label>
                <select
                  value={form.location_dest_id}
                  onChange={(e) => setForm({ ...form, location_dest_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">اختر الموقع الوجهة...</option>
                  <optgroup label="مواقع داخلية">
                    {internalLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="مواقع أخرى">
                    {otherLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الكمية *</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="أدخل الكمية"
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المرجع</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="رقم المرجع"
                />
              </div>
              <div className="space-y-2">
                <Label>المصدر</Label>
                <Input
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  placeholder="مثال: PO-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleCreateMove} disabled={loading} className="flex-1">
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحركة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
