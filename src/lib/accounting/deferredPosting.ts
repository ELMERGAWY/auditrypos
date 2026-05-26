import { supabase } from '@/integrations/supabase/client';
import journalService from './journalService';
import type { BusinessType } from '@/lib/businessTypes';

type PostingWindow = {
  restaurantId: string;
  businessType: BusinessType | string;
  from?: string;
  to?: string;
  batchSize?: number;
  maxOrders?: number;
};

export type PostingSummary = {
  posted: number;
  skipped: number;
  failed: number;
  pending: number;
};

const DEFAULT_BATCH_SIZE = 12;
let isPosting = false;

const toNumber = (value: unknown) => Number(value || 0);

async function findExistingJournalEntryId(orderId: string): Promise<string | null> {
  const { data } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('reference_type', 'order')
    .eq('reference_id', orderId)
    .eq('source', 'pos')
    .maybeSingle();

  return data?.id || null;
}

async function loadOrderTaxes(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, number>();

  const { data } = await supabase
    .from('order_taxes')
    .select('order_id, tax_amount')
    .in('order_id', orderIds);

  return (data || []).reduce((map, row: any) => {
    map.set(row.order_id, (map.get(row.order_id) || 0) + toNumber(row.tax_amount));
    return map;
  }, new Map<string, number>());
}

export async function countUnpostedOrders(restaurantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .neq('status', 'cancelled')
    .is('journal_entry_id', null);

  if (error) throw error;
  return count || 0;
}

export async function postUnpostedOrders({
  restaurantId,
  businessType,
  from,
  to,
  batchSize = DEFAULT_BATCH_SIZE,
  maxOrders = batchSize,
}: PostingWindow): Promise<PostingSummary> {
  if (isPosting) return { posted: 0, skipped: 0, failed: 0, pending: 0 };
  isPosting = true;

  const summary: PostingSummary = { posted: 0, skipped: 0, failed: 0, pending: 0 };

  try {
    const limit = Math.max(1, Math.min(batchSize, maxOrders));
    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled')
      .is('journal_entry_id', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    const targetOrders = (orders || []) as any[];
    if (targetOrders.length === 0) return summary;

    const orderIds = targetOrders.map(order => order.id);
    const [{ data: items, error: itemsError }, taxByOrder] = await Promise.all([
      supabase.from('order_items').select('*').in('order_id', orderIds),
      loadOrderTaxes(orderIds),
    ]);

    if (itemsError) throw itemsError;

    const allItems = (items || []) as any[];

    for (const order of targetOrders) {
      try {
        const existingEntryId = await findExistingJournalEntryId(order.id);
        if (existingEntryId) {
          await supabase.from('orders').update({ journal_entry_id: existingEntryId }).eq('id', order.id);
          summary.skipped += 1;
          continue;
        }

        const orderItems = allItems.filter(item => item.order_id === order.id);
        const cogs = orderItems.reduce(
          (sum, item) => sum + toNumber(item.cost_price_snapshot) * toNumber(item.quantity),
          0
        );

        const entry = await journalService.createSaleJournalEntry(
          restaurantId,
          { ...order, items: orderItems },
          businessType,
          cogs,
          taxByOrder.get(order.id) || 0,
          (order as any).destination_account_id || null
        );

        if (!entry?.id) {
          summary.failed += 1;
          continue;
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({ journal_entry_id: entry.id })
          .eq('id', order.id);

        if (updateError) throw updateError;
        summary.posted += 1;
      } catch (error) {
        console.warn('[deferred-posting] order posting failed:', order.id, error);
        summary.failed += 1;
      }
    }

    summary.pending = await countUnpostedOrders(restaurantId).catch(() => 0);
    return summary;
  } finally {
    isPosting = false;
  }
}

