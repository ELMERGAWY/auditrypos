import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, ShieldAlert, ShieldCheck, Check, X, AlertCircle, 
  UserCheck, Eye, Warehouse, Building, Plus, Trash2, Edit2,
  Lock, Settings, ShoppingCart, Package, DollarSign, Users, PieChart,
  RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface CustomRole {
  id: string;
  name_ar: string;
  description: string;
}

const MODULE_ICONS: Record<string, any> = {
  sales: ShoppingCart,
  inventory: Package,
  finance: DollarSign,
  hr: Users,
  crm: PieChart,
  settings: Settings,
};

const MODULE_LABELS: Record<string, string> = {
  sales: 'المبيعات ونقاط البيع',
  inventory: 'المخزون والمستودعات',
  finance: 'المحاسبة والمالية',
  hr: 'الموارد البشرية والموظفين',
  crm: 'العملاء والتسويق',
  settings: 'إعدادات النظام',
};

const STANDARD_ROLES = [
  { id: 'manager', name: 'مدير عام', icon: ShieldCheck },
  { id: 'branch_manager', name: 'مدير فرع', icon: Building },
  { id: 'accountant', name: 'محاسب', icon: UserCheck },
  { id: 'auditor', name: 'مراجع مالي', icon: Eye },
  { id: 'store_manager', name: 'مدير مخزن', icon: Warehouse },
  { id: 'cashier', name: 'كاشير', icon: Shield },
];

export function RoleManager({ companyId }: { companyId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('manager');
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', desc: '' });

  const allRoles = useMemo(() => [
    ...STANDARD_ROLES, 
    ...customRoles.map(r => ({ id: r.name_ar, name: r.name_ar, icon: UserCheck }))
  ], [customRoles]);

  const modules = useMemo(() => 
    Array.from(new Set(permissions.map(p => p.module))).filter(Boolean)
  , [permissions]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get company_id from restaurant if needed, but for now we assume companyId passed is the right identifier
      // We try both restaurant_id and company_id queries to be safe if schema differs
      const [permRes, rolePermRes, customRolesRes] = await Promise.all([
        supabase.from('permissions').select('*'),
        supabase.from('role_permissions').select('*').or(`company_id.eq.${companyId},restaurant_id.eq.${companyId}`),
        supabase.from('restaurant_custom_roles').select('*').eq('restaurant_id', companyId)
      ]);

      if (permRes.error) console.error('Permissions Load Error:', permRes.error);
      if (rolePermRes.error) console.error('Role Permissions Load Error:', rolePermRes.error);
      if (customRolesRes.error) console.error('Custom Roles Load Error:', customRolesRes.error);
      
      setPermissions(permRes.data || []);
      setRolePermissions(rolePermRes.data || []);
      setCustomRoles(customRolesRes.data || []);
    } catch (error: any) {
      console.error('Fatal Load Error:', error);
      toast.error('خطأ في تحميل الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const getPermissionStatus = (role: string, permissionCode: string) => {
    const rp = rolePermissions.find(p => p.role === role && p.permission_code === permissionCode);
    if (rp) return rp.is_allowed;
    
    // Default Fallbacks for standard roles
    if (role === 'manager' || role === 'branch_manager') return true;
    if (role === 'auditor' && (permissionCode.startsWith('finance.') || permissionCode.startsWith('inventory.'))) return true;
    if (role === 'cashier' && permissionCode.startsWith('pos.')) return true;
    if (role === 'accountant' && (permissionCode.startsWith('finance.') || permissionCode.startsWith('inventory.'))) return true;
    
    return false;
  };

  const handleAddRole = async () => {
    if (!newRoleForm.name) return toast.error('أدخل اسم الدور');
    try {
      const { data, error } = await supabase
        .from('restaurant_custom_roles')
        .insert({
          restaurant_id: companyId,
          name_ar: newRoleForm.name,
          description: newRoleForm.desc
        })
        .select()
        .single();
      
      if (error) throw error;
      setCustomRoles([...customRoles, data]);
      setShowAddRole(false);
      setNewRoleForm({ name: '', desc: '' });
      setSelectedRole(data.name_ar);
      toast.success('تم إضافة الدور الجديد');
    } catch (error: any) {
      toast.error('خطأ: ' + error.message);
    }
  };

  const togglePermission = async (role: string, permissionCode: string, currentAllowed: boolean) => {
    try {
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
            restaurant_id: companyId, // Adding restaurant_id for compatibility
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
      console.error('Permission toggle error:', error);
      toast.error('فشل تحديث الصلاحية: ' + (error?.message || 'خطأ غير معروف'));
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <RefreshCcw className="w-10 h-10 animate-spin text-primary opacity-50" />
      <p className="text-muted-foreground text-sm font-bold">جاري تحميل مصفوفة الصلاحيات...</p>
    </div>
  );

  const selectedRoleInfo = allRoles.find(r => r.id === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black">إدارة الصلاحيات والأمان</h2>
            <p className="text-sm text-muted-foreground">تحكم بدقة في ما يمكن لكل موظف القيام به داخل النظام</p>
          </div>
        </div>
        <Button onClick={() => setShowAddRole(true)} variant="outline" className="rounded-xl gap-2 border-primary/20 hover:bg-primary/5">
          <Plus className="w-4 h-4" /> إضافة دور وظيفي مخصص
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Roles Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground px-2 mb-3 uppercase tracking-widest">الأدوار الوظيفية</p>
          {allRoles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-right ${selectedRole === role.id ? 'gradient-bg text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary/50 hover:bg-secondary border border-transparent'}`}
            >
              <role.icon className={`w-5 h-5 ${selectedRole === role.id ? 'text-primary-foreground' : 'text-primary'}`} />
              <div className="flex-1">
                <p className="font-bold text-sm">{role.name}</p>
                {STANDARD_ROLES.find(sr => sr.id === role.id) ? (
                  <p className={`text-[10px] ${selectedRole === role.id ? 'opacity-80' : 'text-muted-foreground'}`}>دور نظامي</p>
                ) : (
                  <p className={`text-[10px] ${selectedRole === role.id ? 'opacity-80' : 'text-primary font-bold'}`}>دور مخصص</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-9 space-y-6">
          <div className="glass-card p-6 rounded-3xl border-primary/10">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                {selectedRoleInfo && <selectedRoleInfo.icon className="w-6 h-6 text-primary" />}
                <h3 className="font-display font-bold text-lg">صلاحيات {selectedRoleInfo?.name}</h3>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 px-3 py-1">
                {permissions.filter(p => getPermissionStatus(selectedRole, p.code)).length} / {permissions.length} صلاحية مفعلة
              </Badge>
            </div>

            <div className="grid gap-8">
              {modules.map(mod => (
                <div key={mod} className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    {React.createElement(MODULE_ICONS[mod] || Shield, { className: "w-5 h-5" })}
                    <h4 className="font-bold text-sm">{MODULE_LABELS[mod] || mod}</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.filter(p => p.module === mod).map(perm => {
                      const isAllowed = getPermissionStatus(selectedRole, perm.code);
                      return (
                        <div key={perm.code} 
                          onClick={() => togglePermission(selectedRole, perm.code, isAllowed)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${isAllowed ? 'bg-success/5 border-success/20 hover:bg-success/10' : 'bg-secondary/30 border-transparent hover:border-border'}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm mb-0.5 ${isAllowed ? 'text-success' : ''}`}>{perm.name_ar}</p>
                            <p className="text-[10px] text-muted-foreground font-mono opacity-50">{perm.code}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isAllowed ? 'bg-success text-white scale-110 shadow-lg shadow-success/20' : 'bg-secondary text-muted-foreground group-hover:bg-border'}`}>
                            {isAllowed ? <Check className="w-4 h-4" /> : <X className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {modules.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <RefreshCcw className="w-10 h-10 mx-auto mb-3" />
                  <p>لم يتم العثور على صلاحيات مسجلة في قاعدة البيانات</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>إعادة المحاولة</Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-medium">ملاحظة هامة: صلاحيات المالك (Owner) والمدير العام (Super Admin) ثابتة ولا يمكن تقييدها لضمان إمكانية الوصول الكامل للنظام دائماً.</p>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      <AnimatePresence>
        {showAddRole && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 max-w-md w-full space-y-4 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  إضافة دور وظيفي مخصص
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddRole(false)} className="rounded-full"><X className="w-5 h-5" /></Button>
              </div>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>اسم الدور الوظيفي (مثلاً: مسؤول مشتريات)</Label>
                  <Input 
                    placeholder="أدخل اسم الدور..." 
                    value={newRoleForm.name} 
                    onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>وصف الصلاحيات</Label>
                  <Input 
                    placeholder="وصف مختصر لمسؤوليات هذا الدور..." 
                    value={newRoleForm.desc} 
                    onChange={e => setNewRoleForm({...newRoleForm, desc: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddRole} className="flex-1 h-11 gradient-bg text-primary-foreground border-0 rounded-xl font-bold shadow-lg shadow-primary/20">حفظ الدور</Button>
                <Button onClick={() => setShowAddRole(false)} variant="outline" className="flex-1 h-11 rounded-xl font-bold">إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
