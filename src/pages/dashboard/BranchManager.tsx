// @ts-nocheck
import { useState, useEffect } from 'react';
import { useDashboardData } from './useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, Plus, Search, Trash2, 
  Edit2, Save, X, Check, MapPin, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager_name: string;
  status: 'active' | 'inactive';
  created_at: string;
  order_count: number;
  restaurant_id?: string; // Link to independent database
  is_independent_db?: boolean; // Flag for independent database
  currency?: string;
  accounting_standard?: string;
}

interface CreateBranchForm {
  name: string;
  address: string;
  phone: string;
  manager_name: string;
  is_independent_db?: boolean;
  currency?: string;
  accounting_standard?: string;
}

export default function BranchManager() {
  const { restaurant, isOnline } = useDashboardData();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBranchForm>({
    name: '',
    address: '',
    phone: '',
    manager_name: '',
    is_independent_db: false,
    currency: 'ج.م',
    accounting_standard: 'EAS'
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    
    const { data: branchData, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (branchData && !error) {
      setBranches(branchData.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        manager_name: b.manager_name,
        status: b.status,
        created_at: b.created_at,
        order_count: b.order_count || 0
      })));
    }
    setLoading(false);
  };

  const createBranch = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم الفرع');
      return;
    }

    const branchPayload = {
      ...form,
      status: 'active',
      created_at: new Date().toISOString(),
      order_count: 0
    };

    // If independent database, create a new restaurant record
    if (form.is_independent_db) {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: form.name,
          currency: form.currency || 'ج.م',
          accounting_standard: form.accounting_standard || 'EAS',
          is_branch: true,
          branch_settings: {
            address: form.address,
            phone: form.phone,
            manager_name: form.manager_name
          }
        })
        .select('id')
        .single();

      if (restaurantError) {
        toast.error('فشل في إنشاء قاعدة البيانات المستقلة');
        return;
      }

      branchPayload.restaurant_id = restaurantData.id;
    }

    const { error } = await supabase.from('branches').insert(branchPayload);
    
    if (error) {
      toast.error('فشل في إنشاء الفرع');
    } else {
      toast.success(form.is_independent_db ? 'تم إنشاء الفرع بقاعدة بيانات مستقلة' : 'تم إنشاء الفرع بنجاح');
      setShowCreate(false);
      setForm({ 
        name: '', address: '', phone: '', manager_name: '',
        is_independent_db: false, currency: 'ج.م', accounting_standard: 'EAS'
      });
      loadBranches();
    }
  };

  const updateBranch = async (id: string) => {
    const { error } = await supabase.from('branches')
      .update(form)
      .eq('id', id);
    
    if (error) {
      toast.error('فشل في تحديث الفرع');
    } else {
      toast.success('تم تحديث الفرع');
      setEditingId(null);
      setForm({ name: '', address: '', phone: '', manager_name: '' });
      loadBranches();
    }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    
    const { error } = await supabase.from('branches').delete().eq('id', id);
    
    if (error) {
      toast.error('فشل في حذف الفرع');
    } else {
      toast.success('تم حذف الفرع');
      loadBranches();
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('branches').update({ status: newStatus }).eq('id', id);
    loadBranches();
    toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'إلغاء تفعيل'} الفرع`);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: branches.length,
    active: branches.filter(b => b.status === 'active').length,
    totalOrders: branches.reduce((s, b) => s + b.order_count, 0)
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <Building2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة الفروع</h1>
            <p className="text-muted-foreground">إدارة فروع النشاط</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          إضافة فرع
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">إجمالي الفروع</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Check className="w-4 h-4" />
            <span className="text-sm">الفروع النشطة</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">إجمالي الطلبات</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{stats.totalOrders}</p>
        </div>
      </div>

      {showCreate && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">إضافة فرع جديد</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم الفرع *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="اسم الفرع"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">عنوان الفرع</label>
              <Input
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="العنوان"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رقم التليفون</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="التليفون"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">اسم المدير</label>
              <Input
                value={form.manager_name}
                onChange={(e) => setForm(f => ({ ...f, manager_name: e.target.value }))}
                placeholder="اسم المدير"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <input
                type="checkbox"
                id="independent_db"
                checked={form.is_independent_db}
                onChange={(e) => setForm(f => ({ ...f, is_independent_db: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <label htmlFor="independent_db" className="text-sm font-medium cursor-pointer">
                قاعدة بيانات مستقلة (ملف محاسبي منفصل)
              </label>
            </div>
            {form.is_independent_db && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">العملة</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <option value="ج.م">جنيه مصري (ج.م)</option>
                    <option value="ر.س">ريال سعودي (ر.س)</option>
                    <option value="د.إ">درهم إماراتي (د.إ)</option>
                    <option value="$">دولار أمريكي ($)</option>
                    <option value="€">يورو (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">المعيار المحاسبي</label>
                  <select
                    value={form.accounting_standard}
                    onChange={(e) => setForm(f => ({ ...f, accounting_standard: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <option value="EAS">المصري (EAS)</option>
                    <option value="IFRS">الدولي (IFRS)</option>
                    <option value="US_GAAP">الأمريكي (US GAAP)</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={createBranch}>حفظ</Button>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">قائمة الفروع</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3">اسم الفرع</th>
                <th className="text-right p-3">العنوان</th>
                <th className="text-right p-3">التليفون</th>
                <th className="text-right p-3">المدير</th>
                <th className="text-right p-3">الطلبات</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((branch) => (
                <tr key={branch.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-bold">{branch.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {branch.address || '-'}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{branch.phone || '-'}</td>
                  <td className="p-3">{branch.manager_name || '-'}</td>
                  <td className="p-3">
                    <Badge className="bg-amber-500/20 text-amber-400">
                      {branch.order_count}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={branch.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                    }>
                      {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(branch.id);
                          setForm({
                            name: branch.name,
                            address: branch.address,
                            phone: branch.phone,
                            manager_name: branch.manager_name
                          });
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={branch.status === 'active' ? 'text-red-400' : 'text-emerald-400'}
                        onClick={() => toggleStatus(branch.id, branch.status)}
                      >
                        {branch.status === 'active' ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        onClick={() => deleteBranch(branch.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBranches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد فروع</p>
          </div>
        )}
      </div>
    </div>
  );
}