import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, TrendingUp, Home, Zap, Users, FileText, Calculator } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface DailyOverhead {
  id?: string;
  date: string;
  rent_amount: number;
  electricity_amount: number;
  salaries_amount: number;
  other_amount: number;
  total_amount: number;
  notes: string;
  is_distributed: boolean;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function OverheadManager({ restaurantId, currency }: Props) {
  const [overheads, setOverheads] = useState<DailyOverhead[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentOverhead, setCurrentOverhead] = useState<DailyOverhead>({
    date: selectedDate,
    rent_amount: 0,
    electricity_amount: 0,
    salaries_amount: 0,
    other_amount: 0,
    total_amount: 0,
    notes: '',
    is_distributed: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOverheads();
  }, [restaurantId]);

  useEffect(() => {
    const overhead = overheads.find(o => o.date === selectedDate);
    if (overhead) {
      setCurrentOverhead(overhead);
    } else {
      setCurrentOverhead({
        date: selectedDate,
        rent_amount: 0,
        electricity_amount: 0,
        salaries_amount: 0,
        other_amount: 0,
        total_amount: 0,
        notes: '',
        is_distributed: false
      });
    }
  }, [selectedDate, overheads]);

  const loadOverheads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_overheads')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setOverheads(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل المصروفات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (overhead: DailyOverhead) => {
    return overhead.rent_amount + overhead.electricity_amount + overhead.salaries_amount + overhead.other_amount;
  };

  const updateField = (field: keyof DailyOverhead, value: any) => {
    setCurrentOverhead(prev => {
      const updated = { ...prev, [field]: value };
      if (field !== 'total_amount') {
        updated.total_amount = calculateTotal(updated);
      }
      return updated;
    });
  };

  const saveOverhead = async () => {
    try {
      setSaving(true);

      const overheadData = {
        restaurant_id: restaurantId,
        date: currentOverhead.date,
        rent_amount: currentOverhead.rent_amount,
        electricity_amount: currentOverhead.electricity_amount,
        salaries_amount: currentOverhead.salaries_amount,
        other_amount: currentOverhead.other_amount,
        total_amount: currentOverhead.total_amount,
        notes: currentOverhead.notes,
        is_distributed: false
      };

      const { error } = await supabase
        .from('daily_overheads')
        .upsert(overheadData, { onConflict: 'restaurant_id,date' });

      if (error) throw error;

      toast.success('✅ تم حفظ المصروفات اليومية');
      loadOverheads();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const calculateMonthlyAverage = () => {
    if (overheads.length === 0) return 0;
    const total = overheads.reduce((sum, o) => sum + o.total_amount, 0);
    return total / overheads.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold">المصروفات غير المباشرة</h3>
            <p className="text-sm text-muted-foreground">إيجار + كهرباء + أجور + مصاريف أخرى</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <Home className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">متوسط الإيجار</p>
            <p className="font-bold">{calculateMonthlyAverage().toFixed(0)} {currency}</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-xs text-muted-foreground">متوسط الكهرباء</p>
            <p className="font-bold">{calculateMonthlyAverage().toFixed(0)} {currency}</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-xs text-muted-foreground">متوسط الأجور</p>
            <p className="font-bold">{calculateMonthlyAverage().toFixed(0)} {currency}</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <p className="text-xs text-muted-foreground">أيام مسجلة</p>
            <p className="font-bold">{overheads.length} يوم</p>
          </div>
        </div>
      </div>

      {/* Daily Entry Form */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            تسجيل مصروفات يوم
          </h4>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              الإيجار اليومي
            </Label>
            <Input
              type="number"
              value={currentOverhead.rent_amount}
              onChange={(e) => updateField('rent_amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              مثال: 10,000 شهرياً ÷ 30 = 333 يومياً
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              الكهرباء والمياه
            </Label>
            <Input
              type="number"
              value={currentOverhead.electricity_amount}
              onChange={(e) => updateField('electricity_amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              الأجور والمرتبات
            </Label>
            <Input
              type="number"
              value={currentOverhead.salaries_amount}
              onChange={(e) => updateField('salaries_amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              مصاريف أخرى
            </Label>
            <Input
              type="number"
              value={currentOverhead.other_amount}
              onChange={(e) => updateField('other_amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mb-4">
          <Label>ملاحظات</Label>
          <Input
            value={currentOverhead.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="أي ملاحظات إضافية..."
            className="mt-1"
          />
        </div>

        {/* Total Display */}
        <div className="bg-primary/10 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">إجمالي المصروفات اليومية</p>
            <p className="text-2xl font-bold text-primary">{currentOverhead.total_amount.toFixed(2)} {currency}</p>
          </div>
          <Button 
            onClick={saveOverhead} 
            disabled={saving}
            className="gradient-bg"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                حفظ المصروفات
              </>
            )}
          </Button>
        </div>

        {currentOverhead.is_distributed && (
          <Badge className="bg-green-500">
            ✅ تم توزيع المصروفات على المنتجات المباعة
          </Badge>
        )}
      </div>

      {/* Recent Entries */}
      <div className="glass-card p-4">
        <h4 className="font-medium mb-3">آخر 7 أيام مسجلة</h4>
        <div className="space-y-2">
          {overheads.slice(0, 7).map((overhead) => (
            <div key={overhead.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{overhead.date}</span>
                {overhead.is_distributed && (
                  <Badge className="bg-green-500 text-xs">موزعة</Badge>
                )}
              </div>
              <span className="font-bold">{overhead.total_amount.toFixed(2)} {currency}</span>
            </div>
          ))}
          {overheads.length === 0 && (
            <p className="text-center text-muted-foreground py-4">لا توجد بيانات مسجلة</p>
          )}
        </div>
      </div>
    </div>
  );
}
