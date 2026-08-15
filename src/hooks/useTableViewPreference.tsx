import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TableViewMode = 'table' | 'cards' | 'compact';

type TableViewPreferenceOptions = {
  restaurantId?: string;
  tableKey: string;
  defaultView?: TableViewMode;
};

export function useTableViewPreference({ restaurantId, tableKey, defaultView = 'table' }: TableViewPreferenceOptions) {
  const [view, setView] = useState<TableViewMode>(defaultView);

  useEffect(() => {
    let active = true;
    if (!restaurantId) return () => { active = false; };

    const loadPreference = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('layout_config')
        .eq('id', restaurantId)
        .maybeSingle();
      if (!active) return;
      const saved = (data?.layout_config as any)?.table_views?.[tableKey];
      if (saved === 'table' || saved === 'cards' || saved === 'compact') setView(saved);
    };

    loadPreference();
    return () => { active = false; };
  }, [restaurantId, tableKey]);

  const updateView = async (next: TableViewMode) => {
    setView(next);
    if (!restaurantId) return;

    const { data } = await supabase
      .from('restaurants')
      .select('layout_config')
      .eq('id', restaurantId)
      .maybeSingle();
    const currentLayout = (data?.layout_config as any) || {};
    await supabase
      .from('restaurants')
      .update({
        layout_config: {
          ...currentLayout,
          table_views: { ...(currentLayout.table_views || {}), [tableKey]: next },
        },
      } as any)
      .eq('id', restaurantId);
  };

  return [view, updateView] as const;
}
