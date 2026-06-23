// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * Find or create a customer by name and phone
 * This is used in service activities (MarketingQuotes, MarketingContracts, SalesOrders)
 * to ensure customers are registered in the customers table
 */
export async function findOrCreateCustomer(
  restaurantId: string,
  name: string,
  phone?: string
): Promise<string | null> {
  try {
    if (!name || name.trim() === '' || name === 'عميل نقدي') return null;

    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim();

    // 1. Try to find existing customer
    let query = supabase
      .from('customers')
      .select('id, name, phone')
      .eq('restaurant_id', restaurantId);
    
    if (trimmedPhone) {
      query = query.or(`phone.eq.${trimmedPhone},name.ilike.${trimmedName}`);
    } else {
      query = query.ilike('name', trimmedName);
    }

    const { data: existing, error: searchError } = await query.limit(1);

    if (searchError) {
      console.warn('[customerUtils] customer search error:', searchError);
    }

    if (existing && existing.length > 0) {
      const customer = existing[0];
      // If customer exists but phone was missing, update it
      if (trimmedPhone && !customer.phone) {
        await supabase
          .from('customers')
          .update({ phone: trimmedPhone })
          .eq('id', customer.id);
      }
      return customer.id;
    }

    // 2. Create new customer if not found
    console.log(`[customerUtils] Creating new customer: ${trimmedName}`);
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        name: trimmedName,
        phone: trimmedPhone || null,
        customer_type: 'regular',
        balance: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[customerUtils] Failed to create customer:', insertError);
      // If it's a unique constraint error on name+restaurant_id, try one last fetch
      if (insertError.code === '23505') {
         const { data: lastTry } = await supabase
           .from('customers')
           .select('id')
           .eq('restaurant_id', restaurantId)
           .ilike('name', trimmedName)
           .single();
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
