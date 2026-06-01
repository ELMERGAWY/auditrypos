import { useAuth } from '@/lib/AuthContext';
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Advanced permissions hook.
 *
 * Two tiers of permission resolution:
 * 1. Coarse role (admin/manager/cashier) from user_roles → drives ROLE_PERMISSIONS fallbacks.
 * 2. Fine-grained permission codes (e.g. "inventory.edit", "pos.discount") from
 *    role_permissions joined with the active business's company_id.
 *    Owners + Super Admins bypass all restrictions.
 */
export function usePermissions() {
  const { user, isSuperAdmin } = useAuth() as any;

  const { data: ctx, isLoading } = useQuery({
    queryKey: ['user-perm-ctx', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60, // refresh once per minute
    queryFn: async () => {
      if (!user) return null;

      // Fetch base role + company link in parallel
      const [{ data: roleRow }, { data: company }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('company_users')
          .select('company_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      const dbRole = roleRow?.role || company?.role || 'cashier';
      let coarse: UserRole = 'cashier';
      if (dbRole === 'super_admin' || dbRole === 'restaurant_owner' || dbRole === 'owner' || dbRole === 'manager') coarse = 'admin';
      else if (dbRole === 'finance_manager' || dbRole === 'accountant' || dbRole === 'branch_manager') coarse = 'manager';

      // Pull granular allowed codes for this role within the company
      const allowedCodes = new Set<string>();
      if (company?.company_id) {
        const { data: granular } = await supabase
          .from('role_permissions')
          .select('permission_code, is_allowed, role')
          .eq('company_id', company.company_id)
          .eq('role', dbRole)
          .eq('is_allowed', true);
        (granular || []).forEach((r: any) => allowedCodes.add(r.permission_code));
      }

      return { coarse, dbRole, allowedCodes, isOwner: dbRole === 'super_admin' || dbRole === 'restaurant_owner' || dbRole === 'owner' };
    },
  });

  const coarse = ctx?.coarse;

  /** Check a coarse permission from ROLE_PERMISSIONS map. */
  const hasPermission = (permission: Permission): boolean => {
    if (ctx?.isOwner || isSuperAdmin) return true;
    if (!coarse) return false;
    return ROLE_PERMISSIONS[coarse].includes(permission);
  };

  /** Check a fine-grained permission code (e.g. "inventory.edit", "pos.discount"). */
  const can = (code: string): boolean => {
    if (ctx?.isOwner || isSuperAdmin) return true;
    // Granular allow-list takes priority
    if (ctx?.allowedCodes.has(code)) return true;
    // Fallback to coarse-role defaults so the app still works before granular setup
    if (coarse === 'admin') return true;
    if (coarse === 'manager') return !code.startsWith('settings.') && !code.startsWith('staff.delete');
    if (coarse === 'cashier') return code.startsWith('pos.') || code === 'sales.create';
    return false;
  };

  const isRole = (role: UserRole): boolean => coarse === role;

  return {
    role: coarse,
    dbRole: ctx?.dbRole,
    isLoading,
    hasPermission,
    can,
    isRole,
    isOwner: !!ctx?.isOwner || !!isSuperAdmin,
    isAdmin: coarse === 'admin',
    isManager: coarse === 'manager',
    isCashier: coarse === 'cashier',
  };
}
