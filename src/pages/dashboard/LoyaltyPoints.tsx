import { useState, useEffect } from 'react';
import { useDashboardData } from './dashboard/useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Heart, Star, Gift, Plus, Search, 
  Trash2, Edit2, Save, X, Check, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface LoyaltyProgram {
  id: string;
  points_per_currency: number;
  min_points_for_redemption: number;
  reward_value: number;
  is_active: boolean;
  expiry_days: number;
}

interface CustomerPoints {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  points: number;
  total_earned: number;
  total_redeemed: number;
  last_earned: string;
}

export default function LoyaltyPoints() {
  const { restaurant, isOnline } = useDashboardData();
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [customers, setCustomers] = useState<CustomerPoints[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    points_per_currency: 1,
    min_points_for_redemption: 100,
    reward_value: 10,
    expiry_days: 90,
    is_active: true
  });

  useEffect(() => {
    if (restaurant?.id) loadData();
  }, [restaurant?.id]);

  const loadData = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    
    const { data: progData } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();
    
    if (progData) {
      setProgram(progData);
      setProgramForm({
        points_per_currency: progData.points_per_currency || 1,
        min_points_for_redemption: progData.min_points_for_redemption || 100,
        reward_value: progData.reward_value || 10,
        expiry_days: progData.expiry_days || 90,
        is_active: progData.is_active ?? true
      });
    }

    const { data: customerPoints } = await supabase
      .from('customer_points')
      .select('*, customer:customers(*)')
      .eq('restaurant_id', restaurant.id)
      .order('points', { ascending: false });
    
    if (customerPoints) {
      setCustomers(customerPoints.map((cp: any) => ({
        id: cp.id,
        customer_id: cp.customer_id,
        customer_name: cp.customer?.name || cp.customer_name || 'غير معروف',
        phone: cp.customer?.phone || '',
        points: cp.points || 0,
        total_earned: cp.total_earned || 0,
        total_redeemed: cp.total_redeemed || 0,
        last_earned: cp.last_earned
      })));
    }
    
    setLoading(false);
  };

  const saveProgram = async () => {
    if (!restaurant?.id) return;
    
    const data = {
      restaurant_id: restaurant.id,
      ...programForm
    };
    
    if (program?.id) {
      await supabase.from('loyalty_programs').update(data).eq('id', program.id);
    } else {
      await supabase.from('loyalty_programs').insert(data);
    }
    
    toast.success('تم حفظ إعدادات نقاط الولاء');
    setEditingProgram(false);
    loadData();
  };

  const adjustPoints = async (customerId: string, adjustment: number, reason: string) => {
    if (!restaurant?.id) return;
    
    const { data: existing } = await supabase
      .from('customer_points')
      .select('*')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();
    
    if (existing) {
      await supabase.from('customer_points')
        .update({
          points: existing.points + adjustment,
          total_earned: adjustment > 0 ? existing.total_earned + adjustment : existing.total_earned,
          total_redeemed: adjustment < 0 ? existing.total_redeemed + Math.abs(adjustment) : existing.total_redeemed,
          last_earned: adjustment > 0 ? new Date().toISOString() : existing.last_earned
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('customer_points').insert({
        restaurant_id: restaurant.id,
        customer_id: customerId,
        points: Math.max(0, adjustment),
        total_earned: Math.max(0, adjustment),
        total_redeemed: 0,
        last_earned: adjustment > 0 ? new Date().toISOString() : null
      });
    }
    
    toast.success(`تم ${adjustment > 0 ? 'إضافة' : 'خصم'} ${Math.abs(adjustment)} نقطة`);
    loadData();
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-500/20 rounded-xl">
            <Heart className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">نقاط الولاء</h1>
            <p className="text-muted-foreground">برنامج ولاء العملاء</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Heart className="w-4 h-4" />
            <span className="text-sm">إجمالي النقاط</span>
          </div>
          <p className="text-3xl font-bold">{totalPoints.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">أعضاء البرنامج</span>
          </div>
          <p className="text-3xl font-bold">{customers.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="w-4 h-4" />
            <span className="text-sm">نقاط美術館</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{program?.points_per_currency || 1}:1</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gift className="w-4 h-4" />
            <span className="text-sm">قيمة الاستبدال</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{program?.reward_value || 10} ج.م</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">إعدادات البرنامج</h2>
          {!editingProgram ? (
            <Button variant="outline" size="sm" onClick={() => setEditingProgram(true)}>
              <Edit2 className="w-4 h-4 ml-1" />
              تعديل
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingProgram(false)}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={saveProgram}>
                <Save className="w-4 h-4 ml-1" />
                حفظ
              </Button>
            </div>
          )}
        </div>
        
        {editingProgram ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm">نقاط لكل جنيه</Label>
              <Input
                type="number"
                value={programForm.points_per_currency}
                onChange={(e) => setProgramForm(p => ({ ...p, points_per_currency: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-sm">الحد الأدنى للاستبدال</Label>
              <Input
                type="number"
                value={programForm.min_points_for_redemption}
                onChange={(e) => setProgramForm(p => ({ ...p, min_points_for_redemption: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-sm">قيمة الاستبدال (ج.م)</Label>
              <Input
                type="number"
                value={programForm.reward_value}
                onChange={(e) => setProgramForm(p => ({ ...p, reward_value: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-sm">مدة الصلاحية (أيام)</Label>
              <Input
                type="number"
                value={programForm.expiry_days}
                onChange={(e) => setProgramForm(p => ({ ...p, expiry_days: Number(e.target.value) }))}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-6 text-sm">
            <span>كل {program?.points_per_currency || 1} ج.م = {program?.points_per_currency || 1} نقطة</span>
            <span>الحد الأدنى: {program?.min_points_for_redemption || 100} نقطة</span>
            <span>القيمة: {program?.reward_value || 10} ج.م لكل {program?.min_points_for_redemption || 100} نقطة</span>
            <span>الصلاحية: {program?.expiry_days || 90} يوم</span>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold"> أعضاء الولاء</h2>
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
                <th className="text-right p-3">العميل</th>
                <th className="text-right p-3">التليفون</th>
                <th className="text-right p-3">النقاط</th>
                <th className="text-right p-3">المكتسبة</th>
                <th className="text-right p-3">المستبدلة</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{customer.customer_name}</td>
                  <td className="p-3 text-muted-foreground">{customer.phone}</td>
                  <td className="p-3">
                    <Badge className="bg-amber-500/20 text-amber-400">
                      <Star className="w-3 h-3 ml-1" />
                      {customer.points}
                    </Badge>
                  </td>
                  <td className="p-3 text-emerald-400">+{customer.total_earned}</td>
                  <td className="p-3 text-red-400">-{customer.total_redeemed}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400"
                        onClick={() => adjustPoints(customer.customer_id, 10, 'bonus')}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        onClick={() => adjustPoints(customer.customer_id, -10, 'redemption')}
                        disabled={customer.points < 10}
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
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium mb-1 block ${className}`}>{children}</label>;
}