import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Edit2, Trash2, Shield, CheckCircle,
  XCircle, Key, Clock, DollarSign, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgencyEmployee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  can_access_all_projects: boolean;
  allowed_project_ids?: string[];
  hourly_rate: number;
  currency: string;
  is_active: boolean;
  user_id?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const ROLES = [
  { id: 'admin', label: 'مدير', color: 'bg-red-500/20 text-red-400' },
  { id: 'manager', label: 'مشرف', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'employee', label: 'موظف', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'contractor', label: 'متعاقد', color: 'bg-purple-500/20 text-purple-400' }
];

export function AgencyEmployeesManager({ restaurantId, currency }: Props) {
  const [employees, setEmployees] = useState<AgencyEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgencyEmployee | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    department: '',
    can_access_all_projects: false,
    hourly_rate: '',
    currency: 'USD',
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_agency_employees')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل الموظفين: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, [restaurantId]);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('أدخل الاسم والبريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        department: form.department || null,
        can_access_all_projects: form.can_access_all_projects,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        currency: form.currency,
      };

      if (editing) {
        const { error } = await supabase.from('marketing_agency_employees').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('تم تحديث الموظف بنجاح');
      } else {
        const { error } = await supabase.from('marketing_agency_employees').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة الموظف بنجاح');
      }

      setShowForm(false);
      setEditing(null);
      resetForm();
      loadEmployees();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee: AgencyEmployee) => {
    try {
      const { error } = await supabase.from('marketing_agency_employees')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);
      if (error) throw error;
      toast.success(employee.is_active ? 'تم إلغاء التفعيل' : 'تم التفعيل');
      loadEmployees();
    } catch (error: any) {
      toast.error('فشل التحديث: ' + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      department: '',
      can_access_all_projects: false,
      hourly_rate: '',
      currency: 'USD',
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    admins: employees.filter(e => e.role === 'admin').length,
  };

  const getRoleDisplay = (role: string) => {
    return ROLES.find(r => r.id === role) || ROLES[2];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة موظفي الوكالة</h1>
            <p className="text-muted-foreground">إدارة الموظفين والصلاحيات</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          موظف جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الموظفين</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">نشط</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">مدراء</p>
              <p className="text-xl font-bold">{stats.admins}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث في الموظفين..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Employees List */}
      <div className="space-y-2">
        {filteredEmployees.map((employee) => {
          const roleDisplay = getRoleDisplay(employee.role);
          return (
            <Card key={employee.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${employee.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {employee.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold">{employee.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm">{employee.hourly_rate.toLocaleString()} {employee.currency}/ساعة</p>
                    <p className="text-xs text-muted-foreground">{employee.department || '-'}</p>
                  </div>
                  <Badge variant="outline" className={roleDisplay.color}>
                    {roleDisplay.label}
                  </Badge>
                  {employee.can_access_all_projects && (
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400">
                      <Shield className="w-3 h-3 inline mr-1" />
                      الوصول الكامل
                    </Badge>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(employee); setShowForm(true); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleToggleActive(employee)}>
                    {employee.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="py-20 text-center border-dashed border rounded-xl">
            <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">لا يوجد موظفين مسجلين</p>
            <Button variant="link" onClick={() => setShowForm(true)} className="text-indigo-500">
              أضف موظف جديد
            </Button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الموظف' : 'موظف جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="space-y-2">
                <Label>القسم</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="القسم"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الدور</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10"
                >
                  {ROLES.map(role => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>السعر بالساعة</Label>
                <Input
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                  placeholder="السعر"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.can_access_all_projects}
                onChange={(e) => setForm({ ...form, can_access_all_projects: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label>الوصول الكامل للمشاريع</Label>
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
