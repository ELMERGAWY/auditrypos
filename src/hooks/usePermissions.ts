import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthContext';

export function usePermissions(companyId: string | undefined) {
  const { user, isSuperAdmin } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !companyId) {
      setPermissions({});
      setLoading(false);
      return;
    }

    if (isSuperAdmin) {
      setPermissions({ 'is_admin': true });
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const { data: roleData } = await supabase
          .from('company_users')
          .select('role')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();

        const role = roleData?.role;

        if (role === 'owner' || role === 'admin') {
          setPermissions({ 'is_admin': true });
          return;
        }

        if (!role) {
          setPermissions({});
          return;
        }

        const { data: perms } = await supabase
          .from('role_permissions')
          .select('permission_code, is_allowed')
          .eq('company_id', companyId)
          .eq('role', role);

        const permMap: Record<string, boolean> = {};
        if (perms) {
          perms.forEach(p => {
            permMap[p.permission_code] = p.is_allowed;
          });
        }
        
        // Fallbacks
        if (role === 'manager') {
           permMap['is_manager'] = true;
        } else if (role === 'cashier') {
           if (permMap['pos.access'] === undefined) permMap['pos.access'] = true;
           if (permMap['pos.checkout'] === undefined) permMap['pos.checkout'] = true;
           if (permMap['pos.delete_item'] === undefined) permMap['pos.delete_item'] = true;
        }

        setPermissions(permMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, companyId, isSuperAdmin]);

  const hasPermission = (code: string) => {
    if (permissions['is_admin']) return true;
    if (permissions['is_manager'] && permissions[code] === undefined) return true;
    return !!permissions[code];
  };

  return { permissions, hasPermission, loading };
}
