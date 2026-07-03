// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, Save, Tags } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export type ServiceVariable = { label: string; value: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemName?: string;
  template?: ServiceVariable[]; // pre-defined variable labels (values may be empty)
  value: ServiceVariable[];
  onSave: (vars: ServiceVariable[]) => void;
  restaurantId?: string;
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

const LS_KEY = 'service_variables_history_v1';

function loadHistory(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveHistory(hist: Record<string, string[]>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(hist)); } catch {}
}

export function ServiceVariablesDialog({ open, onOpenChange, itemName, template, value, onSave, restaurantId }: Props) {
  const [rows, setRows] = useState<ServiceVariable[]>([]);
  const [history, setHistory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) {
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
      setHistory(loadHistory());

      // Fetch recent variable values from DB to enrich suggestions
      if (restaurantId) {
        (async () => {
          try {
            const local = loadHistory();

            // 1) Central presets table (shared across devices)
            const { data: presets } = await supabase
              .from('service_variable_presets')
              .select('label, value, usage_count')
              .eq('restaurant_id', restaurantId)
              .order('usage_count', { ascending: false })
              .limit(1000);
            (presets || []).forEach((p: any) => {
              if (!p?.label || !p?.value) return;
              const list = local[p.label] || [];
              if (!list.includes(p.value)) list.push(p.value);
              local[p.label] = list.slice(0, 50);
            });

            // 2) Backfill from existing order_items (in case presets table is fresh)
            const { data } = await supabase
              .from('order_items')
              .select('variables, orders!inner(restaurant_id)')
              .eq('orders.restaurant_id', restaurantId)
              .not('variables', 'is', null)
              .order('created_at', { ascending: false })
              .limit(300);
            (data || []).forEach((row: any) => {
              const vars = Array.isArray(row.variables) ? row.variables : [];
              vars.forEach((v: any) => {
                if (!v?.label || !v?.value) return;
                const list = local[v.label] || [];
                if (!list.includes(v.value)) list.unshift(v.value);
                local[v.label] = list.slice(0, 50);
              });
            });
            saveHistory(local);
            setHistory(local);
          } catch {}
        })();
      }
    }
  }, [open, restaurantId]);

  const addRow = (label = '') => setRows(r => [...r, { label, value: '' }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<ServiceVariable>) =>
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const labelSuggestions = useMemo(() => {
    const fromHistory = Object.keys(history);
    return Array.from(new Set([...SUGGESTIONS, ...fromHistory]));
  }, [history]);

  const save = async () => {
    const cleaned = rows.filter(r => r.label.trim() && r.value.trim());
    // Persist to local history for next-time suggestions
    const hist = { ...history };
    cleaned.forEach(r => {
      const list = hist[r.label] || [];
      if (!list.includes(r.value)) list.unshift(r.value);
      hist[r.label] = list.slice(0, 50);
    });
    saveHistory(hist);
    // Persist to shared DB presets (best-effort)
    if (restaurantId && cleaned.length) {
      try {
        for (const r of cleaned) {
          const label = r.label.trim();
          const value = r.value.trim();
          const { data: existing } = await supabase
            .from('service_variable_presets')
            .select('id, usage_count')
            .eq('restaurant_id', restaurantId)
            .eq('label', label)
            .eq('value', value)
            .maybeSingle();
          if (existing?.id) {
            await supabase
              .from('service_variable_presets')
              .update({ usage_count: (existing.usage_count || 0) + 1, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('service_variable_presets')
              .insert({ restaurant_id: restaurantId, label, value, usage_count: 1 });
          }
        }
      } catch {}
    }
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

        <datalist id="svc-var-labels">
          {labelSuggestions.map(s => <option key={s} value={s} />)}
        </datalist>

        <div className="space-y-3 max-h-[60vh] overflow-auto pl-1">
          {rows.map((row, i) => {
            const valueOptions = history[row.label] || [];
            const listId = `svc-var-val-${i}`;
            return (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="اسم المتغير (مثال: اللون قبل)"
                  value={row.label}
                  list="svc-var-labels"
                  onChange={e => updateRow(i, { label: e.target.value })}
                  className="h-9 text-xs flex-1"
                />
                <Input
                  placeholder="القيمة (مثال: أبيض)"
                  value={row.value}
                  list={listId}
                  onChange={e => updateRow(i, { value: e.target.value })}
                  className="h-9 text-xs flex-1"
                />
                {valueOptions.length > 0 && (
                  <datalist id={listId}>
                    {valueOptions.map(v => <option key={v} value={v} />)}
                  </datalist>
                )}
                <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive h-8 w-8 p-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => addRow()} className="w-full">
            <Plus className="w-4 h-4 ml-1" /> إضافة متغير جديد
          </Button>

          <div className="pt-2">
            <p className="text-[10px] font-bold text-muted-foreground mb-2">اقتراحات سريعة:</p>
            <div className="flex flex-wrap gap-1">
              {labelSuggestions.map(s => (
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
