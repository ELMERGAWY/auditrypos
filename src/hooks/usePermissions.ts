
import { useAuth } from '@/lib/AuthContext';
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePermissions() {
  const { user } = useAuth();

  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Map DB roles to our Edara UserRole
      const dbRole = data?.role;
      if (dbRole === 'super_admin' || dbRole === 'restaurant_owner') return 'admin' as UserRole;
      if (dbRole === 'finance_manager' || dbRole === 'accountant') return 'manager' as UserRole;
      return 'cashier' as UserRole;
    },
    enabled: !!user,
  });

  const hasPermission = (permission: Permission): boolean => {
    if (!userRole) return false;
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions.includes(permission);
  };

  const isRole = (role: UserRole): boolean => userRole === role;

  return {
    role: userRole,
    isLoading,
    hasPermission,
    isRole,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isCashier: userRole === 'cashier',
  };
}
