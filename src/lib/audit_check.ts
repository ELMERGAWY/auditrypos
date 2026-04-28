import { supabase } from "@/integrations/supabase/client";

export interface UnlinkedTable {
  table_name: string;
  issue_type: string;
}

/**
 * Queries the sys_unlinked_tables view to find tables that lack a restaurant_id column.
 * This is crucial for multi-tenant data isolation.
 */
export async function getUnlinkedTables(): Promise<UnlinkedTable[]> {
  try {
    const { data, error } = await supabase
      .from('sys_unlinked_tables')
      .select('*');

    if (error) {
      console.error('Audit query failed:', error);
      // If the view doesn't exist, we might be on an older migration state
      if (error.code === 'P0001' || error.message.includes('does not exist')) {
        throw new Error('Audit view not found. Please ensure all migrations are applied.');
      }
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Database audit error:', err);
    throw err;
  }
}

/**
 * High-level audit status
 */
export async function performDatabaseHealthCheck() {
  const issues = await getUnlinkedTables();
  return {
    isHealthy: issues.length === 0,
    issueCount: issues.length,
    issues
  };
}
