import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { journalService } from '@/lib/accounting/journalService';

interface Props {
  restaurantId: string;
  currency: string;
}

export function ManualJournalTab({ restaurantId, currency }: Props) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([
    { account_id: '', debit: '', credit: '', description: '' },
    { account_id: '', debit: '', credit: '', description: '' }
  ]);

  useEffect(() => {
    loadAccounts();
  }, [restaurantId]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('code');
    setAccounts(data || []);
  };

  const addLine = () => {
    setLines([...lines, { account_id: '', debit: '', credit: '', description: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

  const handleSave = async () => {
    if (!description || lines.some(l => !l.account_id || (!l.debit && !l.credit))) {
      toast.error('يرجى إكمال جميع الحقول المطلوبة');
      return;
    }

    if (totalDebit !== totalCredit) {
      toast.error('يجب أن يتساوى إجمالي المدين مع إجمالي الدائن');
      return;
    }

    if (totalDebit === 0) {
      toast.error('يجب أن تكون قيمة القيد أكبر من صفر');
      return;
    }

    const entryLines = lines.map(l => ({
      account_id: l.account_id,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description || description
    }));

    try {
      const result = await journalService.createJournalEntry(restaurantId, {
        entry_date: new Date(date),
        description,
        source: 'manual',
        is_posted: true,
        lines: entryLines
      });

      if (result) {
        toast.success('تم إنشاء القيد المحاسبي بنجاح ✅');
        setDescription('');
        setLines([
          { account_id: '', debit: '', credit: '', description: '' },
          { account_id: '', debit: '', credit: '', description: '' }
        ]);
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل إنشاء القيد المحاسبي');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            قيود اليومية اليدوية
          </h2>
          <p className="text-muted-foreground text-sm">إنشاء قيد محاسبي مزدوج (من حـ / إلى حـ)</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          حفظ القيد
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <Label>تاريخ القيد</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>البيان / الوصف</Label>
            <Input placeholder="شرح القيد المحاسبي..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 font-bold text-sm text-muted-foreground pb-2 border-b">
            <div className="col-span-4">الحساب</div>
            <div className="col-span-3">البيان (اختياري)</div>
            <div className="col-span-2 text-left">مدين ({currency})</div>
            <div className="col-span-2 text-left">دائن ({currency})</div>
            <div className="col-span-1"></div>
          </div>

          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4">
                <Select value={line.account_id} onValueChange={(val) => updateLine(index, 'account_id', val)}>
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder="اختر الحساب..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {accounts.map(acc => (
                      <SelectItem key={acc.code} value={acc.code}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input placeholder="شرح السطر..." value={line.description} onChange={e => updateLine(index, 'description', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Input type="number" dir="ltr" className="text-left" placeholder="0.00" value={line.debit} onChange={e => { updateLine(index, 'debit', e.target.value); updateLine(index, 'credit', ''); }} />
              </div>
              <div className="col-span-2">
                <Input type="number" dir="ltr" className="text-left" placeholder="0.00" value={line.credit} onChange={e => { updateLine(index, 'credit', e.target.value); updateLine(index, 'debit', ''); }} />
              </div>
              <div className="col-span-1 text-center">
                {lines.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeLine(index)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pb-6 border-b">
          <Button variant="outline" onClick={addLine} className="gap-2 border-dashed">
            <Plus className="w-4 h-4" />
            إضافة طرف جديد
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="bg-secondary/30 rounded-xl p-4 min-w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-muted-foreground">إجمالي المدين:</span>
              <span className="font-black text-primary text-lg">{totalDebit.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-muted-foreground">إجمالي الدائن:</span>
              <span className="font-black text-primary text-lg">{totalCredit.toFixed(2)} {currency}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t font-bold ${totalDebit === totalCredit ? 'text-green-500' : 'text-red-500'}`}>
              <span>الفارق:</span>
              <span>{Math.abs(totalDebit - totalCredit).toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
