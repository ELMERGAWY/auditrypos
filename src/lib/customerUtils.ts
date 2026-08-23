// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

const CASH_CUSTOMER_NAMES = new Set(['عميل نقدي', 'cash customer', 'walk-in customer']);

export function isCashCustomerName(name?: string | null): boolean {
  return CASH_CUSTOMER_NAMES.has((name || '').trim().toLowerCase());
}

/**
 * Returns the single deterministic walk-in customer for a restaurant.
 * The database RPC serializes concurrent calls and assigns a stable customer_ref
 * so cash invoices always have a customer_id before accounting/Manager sync.
 */
export async function getOrCreateCashCustomer(
  restaurantId: string,
  workspaceId?: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_cash_customer', {
    p_restaurant_id: restaurantId,
    p_workspace_id: workspaceId || null,
  });

  if (error || !data) {
    throw error || new Error('تعذر إنشاء أو استرجاع العميل النقدي');
  }

  return data as string;
}

/**
 * Find or create a customer by name and phone.
 * Used by service and sales-order modules; all lookups remain restaurant scoped.
 * Cash names are routed through the deterministic walk-in customer policy.
 */
export async function findOrCreateCustomer(
  restaurantId: string,
  name: string,
  phone?: string,
  workspaceId?: string | null,
): Promise<string | null> {
  try {
    if (!name || name.trim() === '') {
      return null;
    }

    if (isCashCustomerName(name)) {
      return await getOrCreateCashCustomer(restaurantId, workspaceId);
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim();

    let query = supabase
      .from('customers')
      .select('id, name, phone, customer_ref, workspace_id')
      .eq('restaurant_id', restaurantId);

    if (workspaceId) {
      // Normal customers belong to the active workspace. The restaurant-level
      // exception is reserved for the deterministic cash customer.
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.is('workspace_id', null);
    }

    if (trimmedPhone) {
      query = query.or(`phone.eq.${trimmedPhone},and(name.ilike.${trimmedName},phone.is.null)`);
    } else {
      query = query.ilike('name', trimmedName);
    }

    const { data: existing, error: searchError } = await query.limit(1);

    if (searchError) {
      console.warn('[customerUtils] customer search error:', searchError);
    }

    if (existing && existing.length > 0) {
      const customer = existing[0];
      if (trimmedPhone && !customer.phone) {
        await supabase
          .from('customers')
          .update({ phone: trimmedPhone })
          .eq('id', customer.id)
          .eq('restaurant_id', restaurantId);
      }
      return customer.id;
    }

    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        workspace_id: workspaceId || null,
        name: trimmedName,
        phone: trimmedPhone || null,
        customer_type: 'regular',
        balance: 0,
        current_balance: 0,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[customerUtils] Failed to create customer:', insertError);
      if (insertError.code === '23505') {
        let fallbackQuery = supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurantId);
        if (workspaceId) {
          fallbackQuery = fallbackQuery.eq('workspace_id', workspaceId);
        } else {
          fallbackQuery = fallbackQuery.is('workspace_id', null);
        }
        if (trimmedPhone) {
          fallbackQuery = fallbackQuery.eq('phone', trimmedPhone);
        } else {
          fallbackQuery = fallbackQuery.ilike('name', trimmedName);
        }
        const { data: lastTry } = await fallbackQuery.limit(1).maybeSingle();
        return lastTry?.id || null;
      }
      return null;
    }

    return newCustomer?.id || null;
  } catch (error) {
    console.error('[customerUtils] Customer lookup/creation failed:', error);
    return null;
  }
}
