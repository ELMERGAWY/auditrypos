// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Save, Tags } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export type ServiceVariable = { label: string; value: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemName?: string;
  template?: ServiceVariable[]; // pre-defined variable labels (values may be empty)
  value: ServiceVariable[];
  onSave: (vars: ServiceVariable[]) => void;
}

const SUGGESTIONS = [
  'اللون قبل الصباغة',
  'اللون المطلوب',
  'وصف القطعة',
  'نوع القماش',
  'ملاحظات خاصة',
  'العلامة التجارية',
  'المقاس',
  'موعد الاستلام',
];

export function ServiceVariablesDialog({ open, onOpenChange, itemName, template, value, onSave }: Props) {
  const [rows, setRows] = useState<ServiceVariable[]>([]);

  useEffect(() => {
    if (open) {
      // Merge template labels with existing values (dedupe by label)
      const merged: ServiceVariable[] = [];
      const seen = new Set<string>();
      (template || []).forEach(t => {
        const existing = value.find(v => v.label === t.label);
        merged.push({ label: t.label, value: existing?.value || '' });
        seen.add(t.label);
      });
      value.forEach(v => {
        if (!seen.has(v.label)) merged.push({ ...v });
      });
      setRows(merged.length ? merged : [{ label: '', value: '' }]);
    }
  }, [open]);

  const addRow = (label = '') => setRows(r => [...r, { label, value: '' }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<ServiceVariable>) =>
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const save = () => {
    const cleaned = rows.filter(r => r.label.trim() && r.value.trim());
    onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            متغيرات الخدمة
            {itemName && <span className="text-muted-foreground text-sm font-normal">— {itemName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-auto pl-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="اسم المتغير (مثال: اللون قبل)"
                value={row.label}
                onChange={e => updateRow(i, { label: e.target.value })}
                className="h-9 text-xs flex-1"
              />
              <Input
                placeholder="القيمة (مثال: أبيض)"
                value={row.value}
                onChange={e => updateRow(i, { value: e.target.value })}
                className="h-9 text-xs flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive h-8 w-8 p-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addRow()} className="w-full">
            <Plus className="w-4 h-4 ml-1" /> إضافة متغير جديد
          </Button>

          <div className="pt-2">
            <p className="text-[10px] font-bold text-muted-foreground mb-2">اقتراحات سريعة:</p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map(s => (
                <Badge
                  key={s}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:bg-primary hover:text-primary-foreground"
                  onClick={() => addRow(s)}
                >
                  + {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 ml-1" /> إلغاء
          </Button>
          <Button onClick={save} className="gradient-bg text-white border-0">
            <Save className="w-4 h-4 ml-1" /> حفظ المتغيرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
