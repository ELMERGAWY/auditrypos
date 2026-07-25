import { supabase } from '@/integrations/supabase/client';

export type VoucherAllocationLine = { order_id: string; amount: number };

/**
 * DISABLED: FIFO auto-allocation of payment to unpaid orders.
 * This function no longer auto-updates orders.paid_amount to prevent
 * incorrect payment calculations. paid_amount should only be set manually
 * by the user during invoice creation or explicit voucher allocation.
 *
 * Returns empty array to indicate no automatic allocation occurred.
 */
export async function allocatePaymentToUnpaidOrders(params: {
  restaurantId: string;
  customerId: string;
  amount: number;
  voucherId?: string | null;
  /** If provided, use these instead of auto FIFO */
  allocations?: VoucherAllocationLine[];
}): Promise<VoucherAllocationLine[]> {
  // DISABLED: Auto-allocation logic removed to prevent incorrect paid_amount updates
  // paid_amount should remain as the direct payment entered by user only
  console.log('[DISABLED] allocatePaymentToUnpaidOrders - Auto-allocation disabled to prevent payment calculation errors');
  return [];
}

/** DISABLED: Display paid = paid_amount + remaining unallocated voucher credits (FIFO).
 * This function no longer adds voucher amounts to display_paid_amount to prevent
 * incorrect payment calculations. display_paid_amount should equal paid_amount only.
 */
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
  // DISABLED: Auto-enrichment logic removed to prevent incorrect payment display
  // display_paid_amount should equal paid_amount (direct payment only)
  console.log('[DISABLED] enrichOrdersDisplayPaid - Auto-enrichment disabled to prevent payment calculation errors');

  return orders.map((o) => ({
    ...o,
    display_paid_amount: Number(o.paid_amount || 0),
  }));
}
