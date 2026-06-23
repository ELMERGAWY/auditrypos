// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useDashboardData } from './useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Heart, Star, Gift, Plus, Search,
  Trash2, Edit2, Save, X, Crown, Shield,
  Award, TrendingUp, Settings, ChevronUp,
  Users, DollarSign, Target, Zap, ChevronRight,
  BarChart3, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─────────────────────────────────────────────
// Default Tier Configuration
// ─────────────────────────────────────────────
const DEFAULT_TIERS = [
  {
    id: 'bronze',
    name: 'برونزي',
    nameEn: 'Bronze',
    icon: '🥉',
    color: 'text-amber-700',
    bg: 'bg-amber-700/10',
    border: 'border-amber-700/30',
    minSpend: 0,
    maxSpend: 2999,
    multiplier: 1,
    benefits: ['نقطة لكل وحدة عملة', 'عروض خاصة شهرية'],
  },
  {
    id: 'silver',
    name: 'فضي',
    nameEn: 'Silver',
    icon: '🥈',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    minSpend: 3000,
    maxSpend: 9999,
    multiplier: 1.5,
    benefits: ['1.5× نقاط على كل شراء', 'خصم 5% على المنتجات المميزة', 'أولوية الدعم'],
  },
  {
    id: 'gold',
    name: 'ذهبي',
    nameEn: 'Gold',
    icon: '🥇',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    minSpend: 10000,
    maxSpend: 29999,
    multiplier: 2,
    benefits: ['2× نقاط على كل شراء', 'خصم 10% دائم', 'هدايا عيد الميلاد', 'دعم VIP'],
  },
  {
    id: 'platinum',
    name: 'بلاتيني',
    nameEn: 'Platinum',
    icon: '💎',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    minSpend: 30000,
    maxSpend: 999999999,
    multiplier: 3,
    benefits: ['3× نقاط على كل شراء', 'خصم 20% دائم', 'مدير حساب شخصي', 'دعوات حصرية', 'شحن مجاني دائم'],
  },
];

// ─────────────────────────────────────────────
// CRM Pipeline Stages
// ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'lead', label: 'عميل محتمل', color: 'bg-blue-500/20 border-blue-500/40', textColor: 'text-blue-400', prob: 0.1 },
  { id: 'qualified', label: 'مؤهّل', color: 'bg-purple-500/20 border-purple-500/40', textColor: 'text-purple-400', prob: 0.3 },
  { id: 'proposal', label: 'عرض سعر', color: 'bg-orange-500/20 border-orange-500/40', textColor: 'text-orange-400', prob: 0.6 },
  { id: 'negotiation', label: 'تفاوض', color: 'bg-yellow-500/20 border-yellow-500/40', textColor: 'text-yellow-400', prob: 0.8 },
  { id: 'won', label: 'فُزنا ✅', color: 'bg-emerald-500/20 border-emerald-500/40', textColor: 'text-emerald-400', prob: 1.0 },
  { id: 'lost', label: 'خسرنا ❌', color: 'bg-red-500/20 border-red-500/40', textColor: 'text-red-400', prob: 0 },
];

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
  total_spend?: number;
  tier?: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  customer_name: string;
  expected_close: string;
  notes: string;
  probability?: number;
}

// ─────────────────────────────────────────────
// Helper: Determine Tier by total spend
// ─────────────────────────────────────────────
function getTier(totalSpend: number, tiers: typeof DEFAULT_TIERS) {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (totalSpend >= tiers[i].minSpend) return tiers[i];
  }
  return tiers[0];
}

// ─────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass-card p-4 rounded-xl">
      <div className={`flex items-center gap-2 mb-1 ${color || 'text-muted-foreground'}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function LoyaltyPoints() {
  const { restaurant, isOnline } = useDashboardData();
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [customers, setCustomers] = useState<CustomerPoints[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  // Tiers config — stored in localStorage & synced to supabase metadata
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [editingTiers, setEditingTiers] = useState(false);
  const [tiersForm, setTiersForm] = useState(DEFAULT_TIERS);

  // Program settings
  const [editingProgram, setEditingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    points_per_currency: 1,
    min_points_for_redemption: 100,
    reward_value: 10,
    expiry_days: 90,
    is_active: true
  });

  // Manual adjust modal
  const [adjustModal, setAdjustModal] = useState<{ customer: CustomerPoints | null; open: boolean }>({ customer: null, open: false });
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('bonus');

  // CRM Pipeline (stored locally using crm_leads table)
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState({
    title: '', value: '', stage: 'lead', customer_name: '', expected_close: '', notes: ''
  });

  // ────────────────────────────────────
  useEffect(() => {
    if (restaurant?.id) {
      loadData();
      loadDeals();
      loadSavedTiers();
    }
  }, [restaurant?.id]);

  // Load saved tier config from local storage (fallback to defaults)
  const loadSavedTiers = () => {
    try {
      const saved = localStorage.getItem(`loyalty_tiers_${restaurant?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTiers(parsed);
        setTiersForm(parsed);
      }
    } catch {}
  };

  const saveTiersConfig = () => {
    try {
      localStorage.setItem(`loyalty_tiers_${restaurant?.id}`, JSON.stringify(tiersForm));
      setTiers(tiersForm);
      setEditingTiers(false);
      toast.success('تم حفظ إعدادات مستويات الولاء ✅');
    } catch {
      toast.error('فشل حفظ الإعدادات');
    }
  };

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
        last_earned: cp.last_earned,
        total_spend: cp.total_spend || (cp.total_earned || 0) / (programForm.points_per_currency || 1),
      })));
    }
    setLoading(false);
  };

  // ─── CRM Pipeline (using crm_leads table) ───────────────────────
  const loadDeals = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .neq('name', 'MARKETING_ERP_SYSTEM_METADATA')
      .order('created_at', { ascending: false });

    if (data) {
      setDeals(data.map((d: any) => ({
        id: d.id,
        title: d.name || d.company || 'بدون عنوان',
        value: Number(d.estimated_value || 0),
        stage: d.status || 'lead',
        customer_name: d.contact_name || d.company || '',
        expected_close: d.expected_close_date || '',
        notes: d.notes || '',
        probability: PIPELINE_STAGES.find(s => s.id === (d.status || 'lead'))?.prob || 0.1,
      })));
    }
  };

  const saveDeal = async () => {
    if (!dealForm.title.trim()) { toast.error('أدخل عنوان الفرصة'); return; }
    const payload = {
      restaurant_id: restaurant.id,
      name: dealForm.title,
      status: dealForm.stage,
      estimated_value: Number(dealForm.value) || 0,
      contact_name: dealForm.customer_name,
      expected_close_date: dealForm.expected_close || null,
      notes: dealForm.notes,
    };
    if (editingDeal) {
      const { error } = await supabase.from('crm_leads').update(payload).eq('id', editingDeal.id);
      if (error) { toast.error(error.message); return; }
      toast.success('تم تحديث الفرصة البيعية');
    } else {
      const { error } = await supabase.from('crm_leads').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة الفرصة البيعية');
    }
    setShowDealModal(false);
    setEditingDeal(null);
    loadDeals();
  };

  const moveDeal = async (dealId: string, newStage: string) => {
    await supabase.from('crm_leads').update({ status: newStage }).eq('id', dealId);
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage, probability: PIPELINE_STAGES.find(s => s.id === newStage)?.prob || d.probability } : d));
    toast.success('تم تحديث مرحلة الصفقة');
  };

  const deleteDeal = async (dealId: string) => {
    await supabase.from('crm_leads').delete().eq('id', dealId);
    setDeals(prev => prev.filter(d => d.id !== dealId));
    toast.success('تم حذف الصفقة');
  };

  // ─── Loyalty Program CRUD ────────────────────────────────────────
  const saveProgram = async () => {
    if (!restaurant?.id) return;
    const data = { restaurant_id: restaurant.id, ...programForm };
    if (program?.id) {
      await supabase.from('loyalty_programs').update(data).eq('id', program.id);
    } else {
      await supabase.from('loyalty_programs').insert(data);
    }
    toast.success('تم حفظ إعدادات نقاط الولاء ✅');
    setEditingProgram(false);
    loadData();
  };

  const adjustPoints = async () => {
    if (!restaurant?.id || !adjustModal.customer) return;
    const amount = Number(adjustAmount);
    if (!amount || isNaN(amount)) { toast.error('أدخل قيمة صحيحة'); return; }

    const customerId = adjustModal.customer.customer_id;
    const { data: existing } = await supabase
      .from('customer_points')
      .select('*')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('customer_points').update({
        points: Math.max(0, existing.points + amount),
        total_earned: amount > 0 ? existing.total_earned + amount : existing.total_earned,
        total_redeemed: amount < 0 ? existing.total_redeemed + Math.abs(amount) : existing.total_redeemed,
        last_earned: amount > 0 ? new Date().toISOString() : existing.last_earned
      }).eq('id', existing.id);
    }

    toast.success(`تم ${amount > 0 ? 'إضافة' : 'خصم'} ${Math.abs(amount)} نقطة`);
    setAdjustModal({ customer: null, open: false });
    setAdjustAmount('');
    loadData();
  };

  // ─── Computed Values ─────────────────────────────────────────────
  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const totalRedeemed = customers.reduce((s, c) => s + c.total_redeemed, 0);

  const tierStats = useMemo(() => {
    const stats: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    customers.forEach(c => {
      const tier = getTier(c.total_spend || 0, tiers);
      stats[tier.id] = (stats[tier.id] || 0) + 1;
    });
    return stats;
  }, [customers, tiers]);

  // CRM pipeline stats
  const pipelineValue = useMemo(() =>
    deals.filter(d => d.stage !== 'lost').reduce((s, d) => s + d.value * (d.probability || 0.1), 0),
    [deals]
  );
  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-500/20 rounded-xl">
            <Crown className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الولاء والفرص البيعية</h1>
            <p className="text-muted-foreground text-sm">برنامج الولاء متعدد المستويات + لوحة كانبان CRM</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="إجمالي النقاط النشطة" value={totalPoints.toLocaleString()} color="text-amber-400" />
        <StatCard icon={Users} label="أعضاء البرنامج" value={customers.length} color="text-blue-400" />
        <StatCard icon={Gift} label="نقاط تم استبدالها" value={totalRedeemed.toLocaleString()} color="text-pink-400" />
        <StatCard icon={DollarSign} label="قيمة فرص CRM المتوقعة" value={`${pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${restaurant?.currency || ''}`} color="text-emerald-400" />
      </div>

      {/* Tier Summary Row */}
      <div className="grid grid-cols-4 gap-3">
        {tiers.map(tier => (
          <div key={tier.id} className={`glass-card p-3 rounded-xl border ${tier.border} flex items-center gap-3`}>
            <span className="text-2xl">{tier.icon}</span>
            <div>
              <p className={`font-bold text-sm ${tier.color}`}>{tier.name}</p>
              <p className="text-2xl font-bold">{tierStats[tier.id] || 0}</p>
              <p className="text-xs text-muted-foreground">{tier.multiplier}× نقاط</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="members">أعضاء الولاء</TabsTrigger>
          <TabsTrigger value="crm">لوحة الفرص (CRM)</TabsTrigger>
          <TabsTrigger value="program">إعدادات البرنامج</TabsTrigger>
          <TabsTrigger value="tiers">مستويات الولاء</TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Members ═══════════════════════════════════════ */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو التليفون..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Badge variant="outline">{filteredCustomers.length} عضو</Badge>
          </div>

          <div className="glass-card overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="text-right px-4 py-3">العميل</th>
                  <th className="text-right px-4 py-3">الفئة</th>
                  <th className="text-right px-4 py-3">النقاط</th>
                  <th className="text-right px-4 py-3">إجمالي الإنفاق</th>
                  <th className="text-right px-4 py-3">المكتسبة</th>
                  <th className="text-right px-4 py-3">المستبدلة</th>
                  <th className="text-right px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => {
                  const tier = getTier(customer.total_spend || 0, tiers);
                  const nextTier = tiers[tiers.indexOf(tier) + 1];
                  const progressToNext = nextTier
                    ? Math.min(100, ((customer.total_spend || 0 - tier.minSpend) / (nextTier.minSpend - tier.minSpend)) * 100)
                    : 100;
                  return (
                    <tr key={customer.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{customer.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tier.bg} ${tier.color} border ${tier.border}`}>
                          {tier.icon} {tier.name}
                        </span>
                        {nextTier && (
                          <div className="mt-1 w-20 bg-muted rounded-full h-1">
                            <div className="h-1 rounded-full bg-primary" style={{ width: `${progressToNext}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-amber-500/20 text-amber-400 gap-1">
                          <Star className="w-3 h-3" />{customer.points.toLocaleString()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(customer.total_spend || 0).toLocaleString()} {restaurant?.currency || ''}
                      </td>
                      <td className="px-4 py-3 text-emerald-400">+{customer.total_earned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-400">-{customer.total_redeemed.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => { setAdjustModal({ customer, open: true }); setAdjustAmount(''); }}
                        >
                          <Edit2 className="w-3 h-3 ml-1" /> تعديل
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredCustomers.length && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">لا يوجد أعضاء — النقاط تُضاف تلقائياً عند المبيعات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ═══ Tab: CRM Pipeline Kanban ════════════════════════════ */}
        <TabsContent value="crm" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-lg">لوحة الفرص البيعية (Pipeline)</h2>
              <p className="text-sm text-muted-foreground">
                {activeDeals} صفقة نشطة · قيمة الفرص المتوقعة: <span className="text-emerald-400 font-bold">{pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} {restaurant?.currency || ''}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => {
              setEditingDeal(null);
              setDealForm({ title: '', value: '', stage: 'lead', customer_name: '', expected_close: '', notes: '' });
              setShowDealModal(true);
            }}>
              <Plus className="w-4 h-4 ml-1" /> فرصة جديدة
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.id);
              const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
              return (
                <div key={stage.id} className={`flex-shrink-0 w-60 rounded-xl border ${stage.color} p-3 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-bold text-sm ${stage.textColor}`}>{stage.label}</p>
                      <p className="text-xs text-muted-foreground">{stageDeals.length} صفقة · {stageValue.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{Math.round(stage.prob * 100)}%</Badge>
                  </div>

                  {stageDeals.map(deal => (
                    <div key={deal.id} className="glass-card p-3 rounded-lg space-y-2 cursor-pointer hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm">{deal.title}</p>
                      {deal.customer_name && <p className="text-xs text-muted-foreground">{deal.customer_name}</p>}
                      <p className="text-sm font-bold text-primary">{deal.value.toLocaleString()} {restaurant?.currency || ''}</p>
                      {deal.expected_close && (
                        <p className="text-xs text-muted-foreground">إغلاق: {new Date(deal.expected_close).toLocaleDateString('ar-EG')}</p>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        {PIPELINE_STAGES.filter(s => s.id !== stage.id && s.id !== 'lost').map(s => (
                          <button key={s.id}
                            onClick={() => moveDeal(deal.id, s.id)}
                            className={`text-xs px-2 py-0.5 rounded-full border ${s.color} ${s.textColor} hover:opacity-80`}
                          >
                            {s.label}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setEditingDeal(deal);
                            setDealForm({
                              title: deal.title, value: String(deal.value),
                              stage: deal.stage, customer_name: deal.customer_name,
                              expected_close: deal.expected_close, notes: deal.notes
                            });
                            setShowDealModal(true);
                          }}
                          className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground"
                        >تعديل</button>
                        <button
                          onClick={() => deleteDeal(deal.id)}
                          className="text-xs px-2 py-0.5 rounded-full border border-red-500/30 text-red-400 hover:opacity-80"
                        >حذف</button>
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">لا توجد صفقات</div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══ Tab: Program Settings ═══════════════════════════════ */}
        <TabsContent value="program" className="space-y-4">
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> إعدادات برنامج النقاط</h2>
              {!editingProgram ? (
                <Button variant="outline" size="sm" onClick={() => setEditingProgram(true)}>
                  <Edit2 className="w-4 h-4 ml-1" /> تعديل
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingProgram(false)}><X className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={saveProgram}><Save className="w-4 h-4 ml-1" /> حفظ</Button>
                </div>
              )}
            </div>

            {editingProgram ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'نقاط لكل وحدة عملة', key: 'points_per_currency' },
                  { label: 'الحد الأدنى للاستبدال (نقطة)', key: 'min_points_for_redemption' },
                  { label: 'قيمة الاستبدال (عملة)', key: 'reward_value' },
                  { label: 'مدة الصلاحية (يوم)', key: 'expiry_days' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-sm font-medium mb-1 block">{field.label}</label>
                    <Input
                      type="number"
                      value={(programForm as any)[field.key]}
                      onChange={e => setProgramForm(p => ({ ...p, [field.key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'نقاط لكل وحدة', value: `${program?.points_per_currency || 1} نقطة` },
                  { label: 'الحد الأدنى للاستبدال', value: `${program?.min_points_for_redemption || 100} نقطة` },
                  { label: 'قيمة الاستبدال', value: `${program?.reward_value || 10} ${restaurant?.currency || ''}` },
                  { label: 'مدة الصلاحية', value: `${program?.expiry_days || 90} يوم` },
                ].map(item => (
                  <div key={item.label} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ Tab: Tiers Configuration ════════════════════════════ */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2"><Award className="w-5 h-5" /> إعدادات مستويات الولاء</h2>
              {!editingTiers ? (
                <Button variant="outline" size="sm" onClick={() => { setTiersForm(tiers); setEditingTiers(true); }}>
                  <Edit2 className="w-4 h-4 ml-1" /> تعديل المستويات
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTiers(false)}><X className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={saveTiersConfig}><Save className="w-4 h-4 ml-1" /> حفظ التغييرات</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(editingTiers ? tiersForm : tiers).map((tier, idx) => (
                <div key={tier.id} className={`rounded-xl border ${tier.border} p-4 space-y-3`}>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{tier.icon}</span>
                    <div>
                      <p className={`font-bold ${tier.color}`}>{tier.name}</p>
                      <p className="text-xs text-muted-foreground">{tierStats[tier.id] || 0} عميل</p>
                    </div>
                  </div>

                  {editingTiers ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">الحد الأدنى للإنفاق</label>
                        <Input
                          type="number"
                          value={tiersForm[idx].minSpend}
                          onChange={e => {
                            const updated = [...tiersForm];
                            updated[idx] = { ...updated[idx], minSpend: Number(e.target.value) };
                            setTiersForm(updated);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">مضاعف النقاط</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={tiersForm[idx].multiplier}
                          onChange={e => {
                            const updated = [...tiersForm];
                            updated[idx] = { ...updated[idx], multiplier: Number(e.target.value) };
                            setTiersForm(updated);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الحد الأدنى</span>
                        <span className="font-medium">{tier.minSpend.toLocaleString()} {restaurant?.currency || ''}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">مضاعف النقاط</span>
                        <span className={`font-bold ${tier.color}`}>{tier.multiplier}×</span>
                      </div>
                      <div className="border-t border-border/50 pt-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">المزايا:</p>
                        {tier.benefits.map((b, i) => (
                          <div key={i} className="text-xs flex items-start gap-1 mt-1">
                            <Zap className={`w-3 h-3 mt-0.5 flex-shrink-0 ${tier.color}`} />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!editingTiers && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400">
                💡 الترقية بين الفئات تتم تلقائياً بناءً على إجمالي إنفاق العميل التراكمي. اضغط "تعديل المستويات" لتخصيص الحدود والمضاعفات.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Adjust Points Modal ─────────────────────────────────── */}
      <Dialog open={adjustModal.open} onOpenChange={open => setAdjustModal(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل النقاط — {adjustModal.customer?.customer_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-center p-3 bg-amber-500/10 rounded-lg">
              <Star className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <p className="font-bold text-2xl">{adjustModal.customer?.points.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">النقاط الحالية</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ (موجب = إضافة، سالب = خصم)</label>
              <Input
                type="number"
                placeholder="مثال: 50 أو -20"
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">السبب</label>
              <select className="w-full h-10 rounded-md border px-3 bg-background" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}>
                <option value="bonus">مكافأة</option>
                <option value="compensation">تعويض</option>
                <option value="redemption">استبدال</option>
                <option value="correction">تصحيح</option>
                <option value="manual">يدوي</option>
              </select>
            </div>
            <Button className="w-full" onClick={adjustPoints}>تأكيد التعديل</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Deal Modal ──────────────────────────────────────────── */}
      <Dialog open={showDealModal} onOpenChange={setShowDealModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDeal ? 'تعديل الفرصة' : 'فرصة بيعية جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">عنوان الصفقة *</label>
              <Input value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} placeholder="مثال: عقد توريد منتجات 2024" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">القيمة المتوقعة</label>
                <Input type="number" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المرحلة</label>
                <select className="w-full h-10 rounded-md border px-3 bg-background" value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}>
                  {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">اسم العميل / الشركة</label>
              <Input value={dealForm.customer_name} onChange={e => setDealForm({ ...dealForm, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">تاريخ الإغلاق المتوقع</label>
              <Input type="date" value={dealForm.expected_close} onChange={e => setDealForm({ ...dealForm, expected_close: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Input value={dealForm.notes} onChange={e => setDealForm({ ...dealForm, notes: e.target.value })} placeholder="تفاصيل إضافية..." />
            </div>
            <Button className="w-full gradient-bg border-0 text-white" onClick={saveDeal}>
              {editingDeal ? 'تحديث الفرصة' : 'إضافة الفرصة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}