// @ts-nocheck
/**
 * Actor / audit trail helpers — name of staff or owner on every create/update.
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
    const meta = data?.user?.user_metadata || {};
    return meta.full_name || data?.user?.email || '';
  } catch {
    return '';
  }
}

export async function getActorIdAsync(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/** Fields to merge into insert payloads */
export async function actorCreateFields(): Promise<{
  created_by_name: string;
  updated_by_name: string;
  created_by?: string;
  updated_by?: string;
}> {
  const [name, id] = await Promise.all([getActorNameAsync(), getActorIdAsync()]);
  const fields: any = {
    created_by_name: name || 'مستخدم',
    updated_by_name: name || 'مستخدم',
  };
  if (id) {
    fields.created_by = id;
    fields.updated_by = id;
  }
  return fields;
}

/** Fields to merge into update payloads */
export async function actorUpdateFields(): Promise<{
  updated_by_name: string;
  updated_by?: string;
}> {
  const [name, id] = await Promise.all([getActorNameAsync(), getActorIdAsync()]);
  const fields: any = { updated_by_name: name || 'مستخدم' };
  if (id) fields.updated_by = id;
  return fields;
}

export function persistActor(name: string, mail?: string) {
  try {
    if (name) localStorage.setItem('active_staff_name', name.trim());
    if (mail) localStorage.setItem('active_staff_email', mail.trim());
  } catch {}
}

export function clearActor() {
  try {
    localStorage.removeItem('active_staff_name');
    localStorage.removeItem('active_staff_email');
  } catch {}
}

/** Display "أنشأه / عدّله" labels */
export function formatActorLabel(row: {
  created_by_name?: string | null;
  updated_by_name?: string | null;
}): string | null {
  if (row.updated_by_name && row.created_by_name && row.updated_by_name !== row.created_by_name) {
    return `أنشأه: ${row.created_by_name} · عدّله: ${row.updated_by_name}`;
  }
  if (row.updated_by_name) return `بواسطة: ${row.updated_by_name}`;
  if (row.created_by_name) return `بواسطة: ${row.created_by_name}`;
  return null;
}
