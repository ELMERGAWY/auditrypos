// @ts-nocheck
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

export async function generateGLTransactions(restaurantId: string, startDate: string, endDate: string, accountId?: string) {
  let query = supabase
    .from('journal_entry_lines')
    .select(`
      debit, credit, description,
      journal_entries!inner(entry_date, entry_number, description),
      chart_of_accounts!inner(name, code)
    `)
    .eq('journal_entries.restaurant_id', restaurantId)
    .eq('journal_entries.is_posted', true)
    .gte('journal_entries.entry_date', startDate)
    .lte('journal_entries.entry_date', endDate);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data } = await query.order('journal_entries(entry_date)', { ascending: true });
  return data || [];
}

export async function generateCustomerStatement(restaurantId: string, customerName: string, startDate: string, endDate: string) {
  // Customers are linked via order.customer_name and journal_entries link to orders via reference_id
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('customer_name', customerName)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return orders || [];
}

export async function generateSupplierStatement(restaurantId: string, supplierName: string, startDate: string, endDate: string) {
  const { data: invoices } = await supabase
    .from('purchase_invoices')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('supplier_name', supplierName)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return invoices || [];
}

export async function generateInventoryMargin(restaurantId: string, startDate: string, endDate: string) {
  const { data: items } = await supabase
    .from('order_items')
    .select(`
      menu_item_name,
      quantity,
      price,
      orders!inner(created_at, status, total_cost)
    `)
    .eq('orders.restaurant_id', restaurantId)
    .neq('orders.status', 'cancelled')
    .gte('orders.created_at', startDate)
    .lte('orders.created_at', endDate);

  const summary: Record<string, { name: string, qty: number, revenue: number, cost: number, margin: number }> = {};
  items?.forEach(i => {
    if (!summary[i.menu_item_name]) summary[i.menu_item_name] = { name: i.menu_item_name, qty: 0, revenue: 0, cost: 0, margin: 0 };
    summary[i.menu_item_name].qty += i.quantity;
    summary[i.menu_item_name].revenue += i.quantity * i.price;
    // Estimated cost if total_cost is available on order
    const itemCost = (i.orders.total_cost || 0) / (i.orders.total || 1) * (i.quantity * i.price);
    summary[i.menu_item_name].cost += itemCost;
  });

  return Object.values(summary).map(s => ({
    ...s,
    margin: s.revenue > 0 ? (s.revenue - s.cost) / s.revenue : 0
  })).sort((a, b) => b.margin - a.margin);
}
