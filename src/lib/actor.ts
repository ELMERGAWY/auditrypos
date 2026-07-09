// @ts-nocheck
/**
 * Returns the display name of the currently active actor (staff member or account owner)
 * for audit trail fields (`created_by_name`, `updated_by_name`).
 * Falls back to the authenticated user's email if no staff session is set.
 */
import { supabase } from '@/integrations/supabase/client';

export function getActorName(): string {
  try {
    const staff = localStorage.getItem('active_staff_name');
    if (staff) return staff;
  } catch {}
  return '';
}

export async function getActorNameAsync(): Promise<string> {
  const local = getActorName();
  if (local) return local;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.user_metadata?.full_name || data?.user?.email || '';
  } catch {
    return '';
  }
}

export function clearActor() {
  try {
    localStorage.removeItem('active_staff_name');
    localStorage.removeItem('active_staff_email');
  } catch {}
}
