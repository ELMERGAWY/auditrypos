import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, TrendingUp, Receipt, AlertCircle, CheckCircle, Users } from 'lucide-react';
import type { Shift, Restaurant } from './types';
import { journalService } from '@/lib/accounting/journalService';
import { postUnpostedOrders } from '@/lib/accounting/deferredPosting';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface Props {
  restaurant: Restaurant;
  currentShift: Shift | null;
  setCurrentShift: (s: Shift | null) => void;
  profileName: string;
  userId: string;
  todayRevenue: number;
  todayOrdersCount: number;
}

export function ShiftsTab({ restaurant, currentShift, setCurrentShift, profileName, userId, todayRevenue, todayOrdersCount }: Props) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [pastShifts, setPastShifts] = useState<Shift[]>([]);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [postingSummary, setPostingSummary] = useState<{ posted: number; skipped: number } | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedCashier, setSelectedCashier] = useState('');

  useEffect(() => {
    (supabase.from as any)('restaurant_staff')
      .select('id, name, role, is_active')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .then(({ data }: any) => setStaff((data || []) as StaffMember[]));
  }, [restaurant.id]);

  const loadHistory = async () => {
    if (loadedHistory) return;
    const { data } = await supabase.from('shifts').select('*')
      .eq('restaurant_id', restaurant.id)
      .order('opened_at', { ascending: false })
      .limit(20);
    setPastShifts((data || []) as unknown as Shift[]);
    setLoadedHistory(true);
  };

  const handleOpenShift = async () => {
    if (currentShift) { toast.error('يوجد شفت مفتوح بالفعل'); return; }
    const cashierName = selectedCashier
      ? staff.find(s => s.id === selectedCashier)?.name || profileName
      : profileName;
    const cashierId = selectedCashier || userId;
    setIsOpening(true);
    const { data, error } = await supabase.from('shifts').insert({
      restaurant_id: restaurant.id,
      cashier_id: cashierId,
      cashier_name: cashierName,
      opening_balance: Number(openingBalance) || 0,
      status: 'open',
    }).select().single();
    setIsOpening(false);
    if (error) { toast.error('خطأ في فتح الشفت'); return; }
    setCurrentShift(data as unknown as Shift);
    setOpeningBalance('');
    setSelectedCashier('');
    toast.success(`تم فتح الشفت بنجاح — الكاشير: ${cashierName} ✅`);
  };

  const postShiftOrders = async () => {
    if (!currentShift) return { posted: 0, skipped: 0 };

    const closeTime = new Date().toISOString();
    const { data: shiftOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', currentShift.opened_at)
      .lte('created_at', closeTime)
      .neq('status', 'cancelled');

    if (ordersError) throw ordersError;
    const ordersToCheck = (shiftOrders || []) as any[];
    const unpostedOrders = ordersToCheck.filter(o => !o.journal_entry_id);
    if (unpostedOrders.length === 0) return { posted: 0, skipped: ordersToCheck.length };

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', unpostedOrders.map(o => o.id));

    if (itemsError) throw itemsError;
    const allItems = items || [];
    let posted = 0;

    for (const order of unpostedOrders) {
      const orderItems = allItems.filter((item: any) => item.order_id === order.id);
      const entry = await journalService.createSaleJournalEntry(
        restaurant.id,
        { ...order, items: orderItems },
        restaurant.business_type || 'restaurant',
        0,
        0
      );

      if (!entry?.id) throw new Error(`فشل ترحيل الفاتورة ${order.order_number}`);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ journal_entry_id: entry.id })
        .eq('id', order.id);

      if (updateError) throw updateError;
      posted += 1;
    }

    return { posted, skipped: ordersToCheck.length - posted };
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    const { error } = await supabase.from('shifts').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_balance: Number(closingBalance) || 0,
      total_sales: todayRevenue,
      total_orders: todayOrdersCount,
      notes: shiftNotes,
    }).eq('id', currentShift.id);
    if (error) { toast.error('خطأ في إغلاق الشفت'); return; }
    setCurrentShift(null);
    setClosingBalance('');
    setShiftNotes('');
    setLoadedHistory(false);
    toast.success('تم إغلاق الشفت وحفظ التقرير ✅');
  };

  const handleCloseShiftWithPosting = async () => {
    if (!currentShift) return;
    setIsClosing(true);
    const shiftToClose = currentShift;
    const closeTime = new Date().toISOString();
    try {

      const { error } = await supabase.from('shifts').update({
        status: 'closed',
        closed_at: closeTime,
        closing_balance: Number(closingBalance) || 0,
        total_sales: todayRevenue,
        total_orders: todayOrdersCount,
        notes: shiftNotes,
      }).eq('id', shiftToClose.id);

      if (error) throw error;
      setCurrentShift(null);
      setClosingBalance('');
      setShiftNotes('');
      setLoadedHistory(false);
      toast.success('تم إغلاق الشيفت وحفظ التقرير. الترحيل المحاسبي سيكتمل في الخلفية.');

      void postUnpostedOrders({
        restaurantId: restaurant.id,
        businessType: restaurant.business_type || 'restaurant',
        from: shiftToClose.opened_at,
        to: closeTime,
        batchSize: 25,
        maxOrders: 25,
      })
        .then(summary => {
          setPostingSummary(summary);
          if (summary.posted > 0) toast.success(`تم ترحيل ${summary.posted} فاتورة محاسبياً`);
          if (summary.failed > 0) toast.warning(`تبقى ${summary.failed} فاتورة تحتاج إعادة محاولة ترحيل`);
        })
        .catch(error => {
          console.warn('[shift] background posting failed:', error);
          toast.error('تعذر إكمال الترحيل المحاسبي في الخلفية');
        });
    } catch (error: any) {
      toast.error(error?.message || 'فشل إغلاق الشيفت أو ترحيل الفواتير محاسبيا');
    } finally {
      setIsClosing(false);
    }
  };

  const shiftDuration = currentShift
    ? Math.round((Date.now() - new Date(currentShift.opened_at).getTime()) / 60000)
    : 0;

  const currency = restaurant.currency || 'ج.م';
  const cashiers = staff.filter(s => s.role === 'cashier' || s.role === 'branch_manager');

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">⏰ إدارة الشفتات والخزينة</h2>

      {currentShift ? (
        <div className="glass-card p-6 border-success/30 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">شفت مفتوح</p>
              <p className="text-sm text-muted-foreground">منذ {shiftDuration} دقيقة</p>
            </div>
            <Badge className="status-active mr-auto">نشط</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">الكاشير</p>
              <p className="font-bold text-sm">{currentShift.cashier_name}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">رصيد الافتتاح</p>
              <p className="font-bold text-sm text-primary">{Number(currentShift.opening_balance).toFixed(2)} {currency}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">مبيعات اليوم</p>
              <p className="font-bold text-sm text-success">{Number(todayRevenue).toFixed(2)} {currency}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
              <p className="font-bold text-sm">{todayOrdersCount}</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="font-bold">إغلاق الشفت</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رصيد الإغلاق ({currency})</Label>
                <Input type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>الرصيد المتوقع</Label>
                <div className="h-10 bg-secondary/50 rounded-md flex items-center px-3 font-bold text-primary">
                  {(currentShift.opening_balance + todayRevenue).toFixed(2)} {currency}
                </div>
              </div>
            </div>
            <div>
              <Label>ملاحظات التسليم</Label>
              <Input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="أي ملاحظات للشفت القادم..." />
            </div>
            {closingBalance && (
              <div className={`p-3 rounded-lg text-sm ${Number(closingBalance) >= (currentShift.opening_balance + todayRevenue) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {Number(closingBalance) >= (currentShift.opening_balance + todayRevenue)
                  ? `✅ زيادة: +${(Number(closingBalance) - currentShift.opening_balance - todayRevenue).toFixed(2)} ${currency}`
                  : `⚠️ عجز: ${(Number(closingBalance) - currentShift.opening_balance - todayRevenue).toFixed(2)} ${currency}`}
              </div>
            )}
            <Button onClick={handleCloseShiftWithPosting} variant="destructive" className="w-full" disabled={isClosing}>
              إغلاق الشفت وحفظ التقرير
            </Button>
            {postingSummary && (
              <p className="text-xs text-muted-foreground text-center">
                تم ترحيل {postingSummary.posted} فاتورة، وتخطي {postingSummary.skipped} فاتورة مرحلة مسبقا.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">لا يوجد شفت مفتوح</p>
              <p className="text-sm text-muted-foreground">افتح شفت جديد لبدء العمل</p>
            </div>
          </div>
          <div className="space-y-3">
            {/* Cashier Selection */}
            <div>
              <Label className="flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> اختيار الكاشير</Label>
              <select
                value={selectedCashier}
                onChange={e => setSelectedCashier(e.target.value)}
                className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm"
              >
                <option value="">👤 المالك ({profileName})</option>
                {cashiers.map(s => (
                  <option key={s.id} value={s.id}>💰 {s.name} ({s.role === 'branch_manager' ? 'مدير فرع' : 'كاشير'})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>رصيد الافتتاح ({currency})</Label>
              <Input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="المبلغ الموجود في الخزينة" />
            </div>
            <Button onClick={handleOpenShift} className="w-full gradient-bg text-primary-foreground border-0" disabled={isOpening}>
              {isOpening ? 'جاري الفتح...' : 'فتح شفت جديد'}
            </Button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold">سجل الشفتات</p>
          <Button size="sm" variant="outline" onClick={loadHistory}>عرض السجل</Button>
        </div>
        {loadedHistory && (
          <div className="space-y-3">
            {pastShifts.filter(s => s.status === 'closed').slice(0, 10).map(shift => (
              <div key={shift.id} className="bg-secondary/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">{shift.cashier_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(shift.opened_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">افتتاح: </span><span className="font-bold">{Number(shift.opening_balance).toFixed(2)} {currency}</span></div>
                  <div><span className="text-muted-foreground">مبيعات: </span><span className="font-bold text-success">{Number(shift.total_sales).toFixed(2)} {currency}</span></div>
                  <div><span className="text-muted-foreground">إغلاق: </span><span className="font-bold">{Number(shift.closing_balance).toFixed(2)} {currency}</span></div>
                </div>
                {shift.notes && <p className="text-xs text-muted-foreground mt-1">📝 {shift.notes}</p>}
                {shift.closed_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⏱ {Math.round((new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()) / 60000)} دقيقة
                  </p>
                )}
              </div>
            ))}
            {pastShifts.filter(s => s.status === 'closed').length === 0 && (
              <p className="text-muted-foreground text-center py-4">لا توجد شفتات مغلقة</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
