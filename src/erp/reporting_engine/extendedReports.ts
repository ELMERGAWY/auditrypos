import { supabase } from '@/integrations/supabase/client';

export async function generateTaxSummary(restaurantId: string, startDate: string, endDate: string) {
  // Get all posted journal entries with tax account
  const { data: taxLines } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit, credit,
      journal_entries!inner(entry_date, is_posted, description)
    `)
    .eq('journal_entries.restaurant_id', restaurantId)
    .eq('journal_entries.is_posted', true)
    .like('chart_of_accounts.code', '2.03%') // Standard tax code prefix
    .gte('journal_entries.entry_date', startDate)
    .lte('journal_entries.entry_date', endDate);

  const outputTax = taxLines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;
  const inputTax = taxLines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;

  return {
    outputTax,
    inputTax,
    netTax: outputTax - inputTax
  };
}

export async function generateReceiptsPayments(restaurantId: string, startDate: string, endDate: string) {
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit, credit,
      journal_entries!inner(entry_date, is_posted)
    `)
    .eq('journal_entries.restaurant_id', restaurantId)
    .eq('journal_entries.is_posted', true)
    .like('chart_of_accounts.code', '1.01%') // Cash/Bank prefix
    .gte('journal_entries.entry_date', startDate)
    .lte('journal_entries.entry_date', endDate);

  const receipts = lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;
  const payments = lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;

  return { receipts, payments, net: receipts - payments };
}

export async function generateSalesByItem(restaurantId: string, startDate: string, endDate: string) {
  const { data: items } = await supabase
    .from('order_items')
    .select(`
      menu_item_name,
      quantity,
      price,
      orders!inner(created_at, status)
    `)
    .eq('orders.restaurant_id', restaurantId)
    .neq('orders.status', 'cancelled')
    .gte('orders.created_at', startDate)
    .lte('orders.created_at', endDate);

  const summary: Record<string, { name: string, qty: number, total: number }> = {};
  items?.forEach(i => {
    if (!summary[i.menu_item_name]) summary[i.menu_item_name] = { name: i.menu_item_name, qty: 0, total: 0 };
    summary[i.menu_item_name].qty += i.quantity;
    summary[i.menu_item_name].total += i.quantity * i.price;
  });

  return Object.values(summary).sort((a, b) => b.total - a.total);
}
