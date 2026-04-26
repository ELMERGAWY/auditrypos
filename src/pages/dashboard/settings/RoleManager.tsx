import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Permission {
  code: string;
  name_ar: string;
  module: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_code: string;
  is_allowed: boolean;
}

export function RoleManager({ companyId }: { companyId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const roles = [
    { id: 'manager', name: 'مدير (Manager)' },
    { id: 'accountant', name: 'محاسب (Accountant)' },
    { id: 'cashier', name: 'كاشير (Cashier)' },
    { id: 'waiter', name: 'ويتر (Waiter)' }
  ];

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permRes, rolePermRes] = await Promise.all([
        supabase.from('permissions').select('*'),
        supabase.from('role_permissions').select('*').eq('company_id', companyId)
      ]);

      if (permRes.error) throw permRes.error;
      
      setPermissions(permRes.data || []);
      setRolePermissions(rolePermRes.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error('خطأ في تحميل الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (role: string, permissionCode: string, currentAllowed: boolean) => {
    try {
      // Find existing
      const existing = rolePermissions.find(rp => rp.role === role && rp.permission_code === permissionCode);
      
      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ is_allowed: !currentAllowed })
          .eq('id', existing.id);
          
        if (error) throw error;
        
        setRolePermissions(prev => prev.map(rp => 
          rp.id === existing.id ? { ...rp, is_allowed: !currentAllowed } : rp
        ));
      } else {
        const { data, error } = await supabase
          .from('role_permissions')
          .insert({
            company_id: companyId,
            role,
            permission_code: permissionCode,
            is_allowed: !currentAllowed
          })
          .select()
          .single();
          
        if (error) throw error;
        setRolePermissions(prev => [...prev, data]);
      }
      toast.success('تم تحديث الصلاحية');
    } catch (error: any) {
      console.error(error);
      toast.error('فشل تحديث الصلاحية');
    }
  };

  const getPermissionStatus = (role: string, permissionCode: string) => {
    const rp = rolePermissions.find(p => p.role === role && p.permission_code === permissionCode);
    if (rp) return rp.is_allowed;
    
    // Default Fallbacks
    if (role === 'manager') return true;
    if (role === 'cashier' && ['pos.access', 'pos.checkout', 'pos.delete_item'].includes(permissionCode)) return true;
    if (role === 'accountant' && (permissionCode.startsWith('finance.') || permissionCode.startsWith('inventory.'))) return true;
    
    return false;
  };

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  const modules = Array.from(new Set(permissions.map(p => p.module)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="font-display text-xl font-bold">مصفوفة الصلاحيات المتقدمة</h2>
      </div>

      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="p-3 font-bold">الصلاحية</th>
              {roles.map(r => (
                <th key={r.id} className="p-3 font-bold text-center">{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <React.Fragment key={mod}>
                <tr className="bg-secondary/20">
                  <td colSpan={roles.length + 1} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {mod}
                  </td>
                </tr>
                {permissions.filter(p => p.module === mod).map(perm => (
                  <tr key={perm.code} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{perm.name_ar}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{perm.code}</div>
                    </td>
                    {roles.map(role => {
                      const isAllowed = getPermissionStatus(role.id, perm.code);
                      return (
                        <td key={`${role.id}-${perm.code}`} className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(role.id, perm.code, isAllowed)}
                            className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto transition-colors ${isAllowed ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}
                          >
                            {isAllowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 text-primary text-sm">
        <AlertCircle className="w-5 h-5" />
        <p>ملاحظة: المالك (Owner) والمدير المتميز (Admin) يمتلكون كافة الصلاحيات بشكل افتراضي ولا يمكن تقييدهم من هذه الشاشة.</p>
      </div>
    </div>
  );
}
