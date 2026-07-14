import { supabase } from '@/integrations/supabase/client';

export type VoucherAllocationLine = { order_id: string; amount: number };

/**
 * FIFO: apply payment amount to customer's unpaid orders (oldest first).
 * Updates orders.paid_amount and returns the lines applied.
 */
export async function allocatePaymentToUnpaidOrders(params: {
  restaurantId: string;
  customerId: string;
  amount: number;
  voucherId?: string | null;
  /** If provided, use these instead of auto FIFO */
  allocations?: VoucherAllocationLine[];
}): Promise<VoucherAllocationLine[]> {
  const amount = Number(params.amount) || 0;
  if (amount <= 0 || !params.customerId) return [];

  let lines: VoucherAllocationLine[] =
    (params.allocations || []).filter((a) => a.order_id && Number(a.amount) > 0);

  if (lines.length === 0) {
    const { data: unpaidOrders, error } = await supabase
      .from('orders')
      .select('id, total, paid_amount, created_at')
      .eq('restaurant_id', params.restaurantId)
      .eq('customer_id', params.customerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) throw error;

    let remaining = amount;
    lines = [];
    for (const order of unpaidOrders || []) {
      if (remaining <= 0.009) break;
      const total = Number(order.total) || 0;
      const paid = Number(order.paid_amount) || 0;
      const owed = Math.max(0, total - paid);
      if (owed <= 0.009) continue;
      const apply = Math.min(owed, remaining);
      if (apply > 0.009) {
        lines.push({ order_id: order.id, amount: apply });
        remaining -= apply;
      }
    }
  }

  for (const a of lines) {
    const { data: order } = await supabase
      .from('orders')
      .select('paid_amount, total, receipt_voucher_ids')
      .eq('id', a.order_id)
      .maybeSingle();

    if (!order) continue;

    const newPaid = Number(order.paid_amount || 0) + Number(a.amount || 0);
    const fullyPaid = newPaid >= Number(order.total || 0) - 0.01;
    const voucherIds = Array.isArray((order as any).receipt_voucher_ids)
      ? [...(order as any).receipt_voucher_ids]
      : [];
    if (params.voucherId && !voucherIds.includes(params.voucherId)) {
      voucherIds.push(params.voucherId);
    }

    await supabase
      .from('orders')
      .update({
        paid_amount: newPaid,
        payment_status: fullyPaid ? 'paid' : 'partial',
        ...(params.voucherId ? { receipt_voucher_ids: voucherIds } : {}),
      } as any)
      .eq('id', a.order_id);

    // Best-effort allocation row (ignore if table/columns differ)
    if (params.voucherId) {
      try {
        await supabase.from('receipt_voucher_allocations').insert({
          restaurant_id: params.restaurantId,
          receipt_voucher_id: params.voucherId,
          order_id: a.order_id,
          allocated_amount: a.amount,
        } as any);
      } catch {
        /* optional table */
      }
    }
  }

  return lines;
}

/** Display paid = paid_amount + remaining unallocated voucher credits (FIFO). */
export function enrichOrdersDisplayPaid<
  T extends {
    id: string;
    customer_id?: string | null;
    total?: number;
    paid_amount?: number;
    direct_paid_amount?: number | null;
    status?: string;
    created_at?: string;
  }
>(
  orders: T[],
  vouchers: Array<{ customer_id: string; amount: number; notes?: string | null }>
): Array<T & { display_paid_amount: number }> {
  const vouchersByCustomer = new Map<string, number>();
  for (const v of vouchers || []) {
    if (!v?.customer_id) continue;
    // Ignore obsolete auto vouchers created at checkout (same money as paid_amount)
    const notes = String(v.notes || '');
    if (notes.includes('سداد تلقائي')) continue;
    vouchersByCustomer.set(
      v.customer_id,
      (vouchersByCustomer.get(v.customer_id) || 0) + Number(v.amount || 0)
    );
  }

  const result = orders.map((o) => ({
    ...o,
    display_paid_amount: Number(o.paid_amount || 0),
  }));

  const customerIds = [...new Set(result.map((o) => o.customer_id).filter(Boolean))] as string[];

  for (const cid of customerIds) {
    let pool = vouchersByCustomer.get(cid) || 0;
    const custOrders = result
      .filter((o) => o.customer_id === cid && o.status !== 'cancelled')
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );

    // Amounts already folded into paid_amount beyond checkout direct paid
    for (const o of custOrders) {
      const paid = Number(o.paid_amount || 0);
      const hasDirect = o.direct_paid_amount != null && o.direct_paid_amount !== undefined;
      if (!hasDirect) continue;
      const alreadyFromVoucher = Math.max(0, paid - Number(o.direct_paid_amount));
      pool = Math.max(0, pool - alreadyFromVoucher);
    }

    for (const o of custOrders) {
      const paid = Number(o.paid_amount || 0);
      const owed = Math.max(0, Number(o.total || 0) - paid);
      const apply = Math.min(owed, pool);
      o.display_paid_amount = paid + apply;
      pool -= apply;
    }
  }

  return result;
}
