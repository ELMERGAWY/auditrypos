import { LayoutGrid, Rows3, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TableViewMode } from '@/hooks/useTableViewPreference';

export function TableViewToolbar({ value, onChange }: { value: TableViewMode; onChange: (value: TableViewMode) => void }) {
  const options: Array<{ value: TableViewMode; label: string; icon: typeof Table2 }> = [
    { value: 'table', label: 'جدول', icon: Table2 },
    { value: 'cards', label: 'بطاقات', icon: LayoutGrid },
    { value: 'compact', label: 'مضغوط', icon: Rows3 },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1" aria-label="طريقة عرض البيانات">
      {options.map(option => {
        const Icon = option.icon;
        return <Button key={option.value} type="button" variant={value === option.value ? 'default' : 'ghost'} size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onChange(option.value)} aria-label={`عرض ${option.label}`}><Icon className="h-3.5 w-3.5" />{option.label}</Button>;
      })}
    </div>
  );
}
