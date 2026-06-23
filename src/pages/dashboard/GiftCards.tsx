import { useState, useEffect } from 'react';
import { useDashboardData } from './useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Gift, DollarSign, Plus, Search, Trash2, 
  Edit2, Save, X, Check, QrCode, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GiftCard {
  id: string;
  code: string;
  initial_amount: number;
  balance: number;
  status: 'active' | 'redeemed' | 'expired';
  purchased_by?: string;
  gift_to?: string;
  purchased_at: string;
  expires_at: string;
  redeemed_at?: string;
}

interface CreateCardForm {
  amount: number;
  quantity: number;
  gift_to: string;
  purchaser: string;
}

export default function GiftCards() {
  const { restaurant, isOnline } = useDashboardData();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateCardForm>({
    amount: 100,
    quantity: 1,
    gift_to: '',
    purchaser: ''
  });

  useEffect(() => {
    if (restaurant?.id) loadCards();
  }, [restaurant?.id]);

  const loadCards = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setCards(data.map((c: any) => ({
        id: c.id,
        code: c.code,
        initial_amount: c.initial_amount,
        balance: c.balance,
        status: c.status,
        purchased_by: c.purchased_by,
        gift_to: c.gift_to,
        purchased_at: c.purchased_at,
        expires_at: c.expires_at,
        redeemed_at: c.redeemed_at
      })));
    }
    setLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GIFT-';
    for (let i = 0; i < 12; i++) {
      if (i === 4 || i === 8) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const createCards = async () => {
    if (!restaurant?.id || form.amount <= 0 || form.quantity <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح وكمية صحيحة');
      return;
    }

    setLoading(true);
    const newCards = [];
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < form.quantity; i++) {
      newCards.push({
        restaurant_id: restaurant.id,
        code: generateCode(),
        initial_amount: form.amount,
        balance: form.amount,
        status: 'active',
        purchased_by: form.purchaser || null,
        gift_to: form.gift_to || null,
        purchased_at: now.toISOString(),
        expires_at: expires.toISOString()
      });
    }

    const { error } = await supabase.from('gift_cards').insert(newCards);
    
    if (error) {
      toast.error('فشل في إنشاء البطاقات');
    } else {
      toast.success(`تم إنشاء ${form.quantity} بطاقة هدايا`);
      setShowCreate(false);
      setForm({ amount: 100, quantity: 1, gift_to: '', purchaser: '' });
      loadCards();
    }
    setLoading(false);
  };

  const redeemCard = async (code: string) => {
    if (!isOnline) {
      toast.error('لا يوجد اتص��ل بالإنترنت');
      return;
    }

    const card = cards.find(c => c.code === code);
    if (!card) return;

    if (card.status !== 'active') {
      toast.error('هذه البطاقة غير صالحة');
      return;
    }

    const { error } = await supabase.from('gift_cards')
      .update({ 
        status: 'redeemed', 
        redeemed_at: new Date().toISOString(),
        balance: 0 
      })
      .eq('id', card.id);

    if (error) {
      toast.error('فشل في استخدام البطاقة');
    } else {
      toast.success(`تم استخدام البطاقة بنجاح! ${card.initial_amount} ج.م`);
      loadCards();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
  };

  const filteredCards = cards.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.gift_to?.toLowerCase().includes(search.toLowerCase()) ||
      c.purchased_by?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: cards.length,
    active: cards.filter(c => c.status === 'active').length,
    totalValue: cards.reduce((s, c) => s + c.balance, 0),
    redeemed: cards.filter(c => c.status === 'redeemed').length
  };

  const STATUS_COLORS = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    redeemed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Gift className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">بطاقات الهدايا</h1>
            <p className="text-muted-foreground">إدارة بطاقات الهدايا</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gradient-bg">
          <Plus className="w-4 h-4 ml-2" />
          إنشاء بطاقات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gift className="w-4 h-4" />
            <span className="text-sm">إجمالي البطاقات</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Check className="w-4 h-4" />
            <span className="text-sm">نشطة</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">القيمة المتبقية</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{stats.totalValue} ج.م</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <X className="w-4 h-4" />
            <span className="text-sm">المستخدمة</span>
          </div>
          <p className="text-3xl font-bold text-slate-400">{stats.redeemed}</p>
        </div>
      </div>

      {showCreate && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">إنشاء بطاقات هدايا جديدة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ (ج.م)</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">العدد</label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">اسم المشتري</label>
              <Input
                value={form.purchaser}
                onChange={(e) => setForm(f => ({ ...f, purchaser: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">هدية إلى</label>
              <Input
                value={form.gift_to}
                onChange={(e) => setForm(f => ({ ...f, gift_to: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={createCards} disabled={loading}>
              إنشاء {form.quantity} بطاقة × {form.amount} ج.م
            </Button>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['all', 'active', 'redeemed', 'expired'] as const).map((s) => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(s)}
                className={filter === s ? 'gradient-bg' : ''}
              >
                {s === 'all' ? 'الكل' : s === 'active' ? 'نشطة' : s === 'redeemed' ? 'مستخدمة' : 'منتهية'}
              </Button>
            ))}
          </div>
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
                <th className="text-right p-3">الكود</th>
                <th className="text-right p-3">المبلغ</th>
                <th className="text-right p-3">الرصيد</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">مشتراه لـ</th>
                <th className="text-right p-3">صادرة في</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold">{card.code}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyCode(card.code)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{card.initial_amount} ج.م</td>
                  <td className="p-3 text-amber-400">{card.balance} ج.م</td>
                  <td className="p-3">
                    <Badge className={`border ${STATUS_COLORS[card.status]}`}>
                      {card.status === 'active' ? 'نشطة' : card.status === 'redeemed' ? 'مستخدمة' : 'منتهية'}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{card.gift_to || '-'}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(card.purchased_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="p-3">
                    {card.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-400"
                        onClick={() => redeemCard(card.code)}
                      >
                        استخدام
                      </Button>
                    )}
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