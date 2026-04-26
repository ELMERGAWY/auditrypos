import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Trash2, TrendingDown, Calendar, Calculator, ArrowRightLeft, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { journalService } from '@/lib/accounting/journalService';
import { toast } from 'sonner';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  distribution_days?: number;
  distribution_type?: 'daily' | 'custom' | 'monthly';
  daily_cost?: number;
}

interface DailyOverhead {
  id: string;
  category?: string;
  amount?: number;
  overhead_date?: string;
  date?: string;
  is_distributed: boolean;
  parent_expense_id?: string;
  // Original fields from daily_overheads table
  rent_amount?: number;
  electricity_amount?: number;
  salaries_amount?: number;
  other_amount?: number;
  total_amount?: number;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const EXPENSE_CATEGORIES = ['إيجار', 'رواتب', 'كهرباء ومياه', 'مشتريات', 'صيانة', 'نقل', 'إعلانات', 'أخرى'];

// Distribution types
type DistributionType = 'daily' | 'custom' | 'monthly';

interface DistributionConfig {
  type: DistributionType;
  days: number;
  workingDays: number[]; // 0=Sunday, 6=Saturday
}

export function ExpensesTab({ restaurantId, currency }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [overheads, setOverheads] = useState<DailyOverhead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ 
    category: 'أخرى', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0],
    distributionType: 'monthly' as DistributionType,
    distributionDays: 30,
    workingDays: [0, 1, 2, 3, 4, 5, 6] as number[] // Default all days
  });
  const [activeView, setActiveView] = useState<'expenses' | 'overheads' | 'calculator'>('expenses');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  const load = async () => {
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: false });
    setExpenses((expensesData || []) as Expense[]);

    // Load daily overheads for the selected period
    const dateFrom = getPeriodStartDate(selectedPeriod);
    const { data: overheadsData } = await supabase
      .from('daily_overheads')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('overhead_date', dateFrom)
      .order('overhead_date', { ascending: false });
    setOverheads((overheadsData || []) as DailyOverhead[]);
  };

  useEffect(() => { load(); }, [restaurantId, selectedPeriod]);

  // Helper functions
  const getPeriodStartDate = (period: 'today' | 'week' | 'month'): string => {
    const now = new Date();
    if (period === 'today') return now.toISOString().split('T')[0];
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo.toISOString().split('T')[0];
    }
    // month - first day of current month
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  const getWorkingDaysInMonth = (year: number, month: number, workingDays: number[]): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (workingDays.includes(date.getDay())) count++;
    }
    return count;
  };

  const calculateDistributionDays = (type?: DistributionType): number => {
    const now = new Date();
    const distType = type || form.distributionType;
    switch (distType) {
      case 'daily':
        return 1;
      case 'custom':
        return form.distributionDays;
      case 'monthly':
      default:
        return getWorkingDaysInMonth(now.getFullYear(), now.getMonth(), form.workingDays);
    }
  };

  const calculateDailyCost = (amount: number, days: number): number => {
    const validAmount = Number(amount) || 0;
    const validDays = Number(days) || 1;
    return validDays > 0 ? validAmount / validDays : validAmount;
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  // Calculate distributed daily costs
  const todayDistributedCost = overheads
    .filter(o => new Date(o.overhead_date).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.amount, 0);
  
  const monthDistributedCost = overheads.reduce((s, o) => s + o.amount, 0);

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const handleSave = async () => {
    if (!form.amount) { toast.error('أدخل المبلغ'); return; }
    
    const amount = Number(form.amount);
    const distributionDays = calculateDistributionDays();
    const dailyCost = calculateDailyCost(amount, distributionDays);
    
    // 1. Save the main expense
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        restaurant_id: restaurantId,
        category: form.category, 
        amount: amount,
        description: form.description, 
        date: form.date,
      })
      .select()
      .single();

    if (expenseError || !expenseData) {
      toast.error('فشل تسجيل المصروف');
      return;
    }

    // 1.1 Create Journal Entry for Accounting Link
    await journalService.createExpenseJournalEntry(restaurantId, {
      amount: amount,
      description: form.description || `مصروف ${form.category}`,
      category: form.category === 'إيجار' ? 'rent' : 
                form.category === 'رواتب' ? 'salaries' :
                form.category === 'كهرباء ومياه' ? 'utilities' :
                form.category === 'إعلانات' ? 'marketing' : 'general',
      payment_method: 'cash', // Defaulting to cash for now
      date: new Date(form.date)
    });

    // 2. Create daily overheads distributed over working days
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let distributedCount = 0;
    const overheadsToInsert = [];

    for (let day = 1; day <= daysInMonth && distributedCount < distributionDays; day++) {
      const date = new Date(year, month, day);
      if (form.workingDays.includes(date.getDay())) {
        overheadsToInsert.push({
          restaurant_id: restaurantId,
          category: form.category,
          amount: dailyCost,
          overhead_date: date.toISOString().split('T')[0],
          is_distributed: true,
          parent_expense_id: expenseData.id
        });
        distributedCount++;
      }
    }

    if (overheadsToInsert.length > 0) {
      const { error: overheadsError } = await supabase
        .from('daily_overheads')
        .insert(overheadsToInsert);
      
      if (overheadsError) {
        console.error('Failed to create overheads:', overheadsError);
      }
    }

    toast.success(`تم تسجيل المصروف وتوزيعه على ${distributionDays} أيام عمل (نصيب اليوم: ${dailyCost.toFixed(2)} ${currency})`);
    setShowForm(false);
    setForm({ 
      category: 'أخرى', 
      amount: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0],
      distributionType: 'monthly',
      distributionDays: 30,
      workingDays: [0, 1, 2, 3, 4, 5, 6]
    });
    load();
  };

  const handleDelete = async (id: string) => {
    // Also delete related daily overheads
    await supabase.from('daily_overheads').delete().eq('parent_expense_id', id);
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('تم الحذف'); load();
  };

  const toggleWorkingDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort()
    }));
  };

  const workingDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="p-4 space-y-4">
      {/* View Switcher */}
      <div className="flex gap-2">
        <Button 
          variant={activeView === 'expenses' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('expenses')}
          className={activeView === 'expenses' ? 'gradient-bg' : ''}
        >
          <Wallet className="w-4 h-4 ml-1" /> المصروفات
        </Button>
        <Button 
          variant={activeView === 'overheads' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('overheads')}
          className={activeView === 'overheads' ? 'gradient-bg' : ''}
        >
          <Calendar className="w-4 h-4 ml-1" /> التكاليف اليومية
        </Button>
        <Button 
          variant={activeView === 'calculator' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setActiveView('calculator')}
          className={activeView === 'calculator' ? 'gradient-bg' : ''}
        >
          <Calculator className="w-4 h-4 ml-1" /> حاسبة التكلفة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-[10px] text-muted-foreground">مصروفات اليوم</p><p className="font-display font-bold text-sm text-destructive">{todayExpenses.toLocaleString()} {currency}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-warning" /></div>
          <div><p className="text-[10px] text-muted-foreground">مصروفات الشهر</p><p className="font-display font-bold text-sm text-warning">{monthExpenses.toLocaleString()} {currency}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground">التكلفة اليومية</p><p className="font-display font-bold text-sm text-primary">{todayDistributedCost.toFixed(2)} {currency}</p></div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Package className="w-5 h-5 text-success" /></div>
          <div><p className="text-[10px] text-muted-foreground">إجمالي التكاليف الموزعة</p><p className="font-display font-bold text-sm text-success">{monthDistributedCost.toFixed(2)} {currency}</p></div>
        </div>
      </div>

      {/* By Category - Only show in expenses view */}
      {activeView === 'expenses' && byCategory.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-bold mb-3">التوزيع حسب الفئة</h3>
          <div className="space-y-2">
            {byCategory.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <span className="text-xs w-20 text-muted-foreground">{c.cat}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full gradient-bg rounded-full" style={{ width: `${(c.total / byCategory[0].total) * 100}%` }} />
                </div>
                <span className="text-xs font-bold w-24 text-left">{c.total.toLocaleString()} {currency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period Filter for Overheads View */}
      {activeView === 'overheads' && (
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === 'today' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('today')}
          >
            اليوم
          </Button>
          <Button 
            variant={selectedPeriod === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('week')}
          >
            الأسبوع
          </Button>
          <Button 
            variant={selectedPeriod === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('month')}
          >
            الشهر
          </Button>
        </div>
      )}

      {/* Add Button */}
      {activeView === 'expenses' && (
        <Button onClick={() => setShowForm(true)} className="gradient-bg text-primary-foreground border-0" size="sm">
          <Plus className="w-4 h-4 ml-1" /> تسجيل مصروف
        </Button>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg">تسجيل مصروف جديد</h3>
              
              {/* Basic Info */}
              <div className="space-y-3">
                <Label className="text-xs">الفئة</Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border text-sm">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <Label className="text-xs">المبلغ *</Label>
                <Input placeholder="0.00" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                
                <Label className="text-xs">الوصف (اختياري)</Label>
                <Input placeholder="وصف المصروف" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                
                <Label className="text-xs">التاريخ</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              {/* Distribution Settings */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> 
                  توزيع التكلفة
                </h4>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={form.distributionType === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(f => ({ ...f, distributionType: 'daily' }))}
                    className={form.distributionType === 'daily' ? 'gradient-bg' : ''}
                  >
                    يوم واحد
                  </Button>
                  <Button
                    type="button"
                    variant={form.distributionType === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(f => ({ ...f, distributionType: 'custom' }))}
                    className={form.distributionType === 'custom' ? 'gradient-bg' : ''}
                  >
                    أيام محددة
                  </Button>
                  <Button
                    type="button"
                    variant={form.distributionType === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm(f => ({ ...f, distributionType: 'monthly' }))}
                    className={form.distributionType === 'monthly' ? 'gradient-bg' : ''}
                  >
                    الشهر كامل
                  </Button>
                </div>

                {form.distributionType === 'custom' && (
                  <div>
                    <Label className="text-xs">عدد الأيام</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="31"
                      value={form.distributionDays} 
                      onChange={e => setForm(f => ({ ...f, distributionDays: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                )}

                {/* Working Days Selection */}
                <div>
                  <Label className="text-xs mb-2 block">أيام العمل</Label>
                  <div className="flex flex-wrap gap-1">
                    {workingDayNames.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleWorkingDay(idx)}
                        className={`px-2 py-1 text-xs rounded ${
                          form.workingDays.includes(idx) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {form.amount && (
                  <Card className="p-3 bg-primary/5 border-primary/20">
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">معاينة التوزيع:</p>
                      <p className="font-bold">
                        {Number(form.amount).toLocaleString()} {currency} ÷ {calculateDistributionDays()} أيام = 
                        <span className="text-primary"> {calculateDailyCost(Number(form.amount), calculateDistributionDays()).toFixed(2)} {currency}/يوم</span>
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              <Button onClick={handleSave} className="w-full gradient-bg text-primary-foreground border-0 h-11">
                حفظ المصروف وتوزيعه
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expenses List */}
      {activeView === 'expenses' && (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="glass-card p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                  <span className="font-bold text-sm text-destructive">{e.amount.toLocaleString()} {currency}</span>
                </div>
                {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString('ar-EG')}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد مصروفات</p>}
        </div>
      )}

      {/* Daily Overheads List */}
      {activeView === 'overheads' && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm mb-2">التكاليف اليومية الموزعة</h3>
          {overheads.length > 0 ? (
            overheads.map(o => (
              <div key={o.id} className="glass-card p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{o.category}</Badge>
                    <span className="font-bold text-sm text-primary">{o.amount.toFixed(2)} {currency}</span>
                    {o.is_distributed && <Badge className="text-[8px] bg-success/20 text-success">موزع</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(o.overhead_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-12">لا توجد تكاليف يومية للفترة المحددة</p>
          )}
        </div>
      )}

      {/* Cost Calculator */}
      {activeView === 'calculator' && (
        <div className="space-y-4">
          <h3 className="font-bold">حاسبة التكلفة اليومية</h3>
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">المبلغ</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">عدد الأيام</Label>
                <Input 
                  type="number" 
                  value={calculateDistributionDays()}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            
            {/* Quick mode buttons for calculator */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.distributionType === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(f => ({ ...f, distributionType: 'daily' }))}
                className="text-xs"
              >
                يوم واحد
              </Button>
              <Button
                type="button"
                variant={form.distributionType === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(f => ({ ...f, distributionType: 'monthly' }))}
                className="text-xs"
              >
                الشهر كامل ({getWorkingDaysInMonth(new Date().getFullYear(), new Date().getMonth(), form.workingDays)} يوم)
              </Button>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">نتيجة الحساب:</p>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {calculateDailyCost(Number(form.amount || 0), calculateDistributionDays()).toFixed(2)} {currency}
                </p>
                <p className="text-xs text-muted-foreground">تكلفة يومية</p>
                {form.amount && Number(form.amount) > 0 && (
                  <p className="text-xs text-success mt-1">
                    {Number(form.amount).toLocaleString()} ÷ {calculateDistributionDays()} = {calculateDailyCost(Number(form.amount), calculateDistributionDays()).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="glass-card p-4">
            <h4 className="font-bold text-sm mb-2">أيام العمل في الشهر الحالي</h4>
            <div className="flex flex-wrap gap-1 mb-3">
              {workingDayNames.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWorkingDay(idx)}
                  className={`px-2 py-1 text-xs rounded ${
                    form.workingDays.includes(idx) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي أيام العمل: <span className="font-bold text-primary">{calculateDistributionDays()} يوم</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
