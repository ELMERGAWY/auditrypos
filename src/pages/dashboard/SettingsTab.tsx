import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store, Shield, Percent, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';
import { RoleManager } from './settings/RoleManager';
import { TaxManager } from './settings/TaxManager';

interface SettingsTabProps {
  restaurant: any;
  businessType: BusinessType;
  profileName: string;
  user: any;
  agents: any[];
  isSuspended: boolean;
  isSuperAdmin: boolean;
  loadData: () => void;
}

export function SettingsTab({
  restaurant,
  businessType,
  profileName,
  user,
  agents,
  isSuspended,
  isSuperAdmin,
  loadData
}: SettingsTabProps) {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'roles' | 'taxes'>('profile');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `logos/${restaurant.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: true });
    if (upErr) { toast.error('خطأ في رفع الشعار'); return; }
    const { data: urlData } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
    await supabase.from('restaurants').update({ logo_url: urlData.publicUrl }).eq('id', restaurant.id);
    toast.success('تم تحديث الشعار');
    loadData();
  };

  return (
    <div className="p-4 flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="flex gap-2 overflow-x-auto pb-4 border-b border-border mb-6 shrink-0">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'profile' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Building2 className="w-4 h-4" /> بيانات النشاط
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'roles' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Shield className="w-4 h-4" /> إدارة الصلاحيات
        </button>
        <button
          onClick={() => setActiveSubTab('taxes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'taxes' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Percent className="w-4 h-4" /> الضرائب والرسوم
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {activeSubTab === 'profile' && (
          <div className="max-w-xl space-y-4">
            <h2 className="font-display text-xl font-bold">إعدادات النشاط التجاري</h2>
            <div className="glass-card p-4 space-y-4">
              {/* Logo Upload */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt="logo" className="w-20 h-20 object-contain rounded-xl border border-border" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-3xl">
                    {BUSINESS_TYPES[businessType]?.icon || '🏢'}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold mb-1">{restaurant.name}</p>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      {restaurant.logo_url ? 'تغيير الشعار' : 'رفع شعار'}
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="grid gap-3">
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">نوع النشاط</span>
                  <span className="font-medium">{BUSINESS_TYPES[businessType]?.icon} {BUSINESS_TYPES[businessType]?.label}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">اسم النشاط</span>
                  <span className="font-medium">{restaurant.name}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">المالك</span>
                  <span className="font-medium">{profileName}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">العملة</span>
                  <span className="font-medium">{restaurant.currency || 'ج.م'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">حالة الاشتراك</span>
                  <Badge className={isSuspended ? 'status-suspended' : 'status-active'}>{isSuspended ? 'موقوف' : 'نشط'}</Badge>
                </div>
                {restaurant.subscription_end && (
                  <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm text-muted-foreground">تاريخ الانتهاء</span>
                    <span className="font-medium">{new Date(restaurant.subscription_end).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-sm text-muted-foreground">عدد المناديب</span>
                  <span className="font-medium">{agents.length} مندوب</span>
                </div>
              </div>

              {/* Store Link */}
              <div className="pt-4 border-t border-border mt-2">
                <p className="text-sm text-muted-foreground mb-2">رابط المتجر الإلكتروني (لعملائك)</p>
                <div className="flex gap-2">
                  <code className="text-xs bg-secondary px-3 py-2 rounded-lg flex-1 truncate">{window.location.origin}/store/{restaurant.id}</code>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${restaurant.id}`).then(() => toast.success('تم نسخ الرابط'))}>
                    نسخ
                  </Button>
                </div>
              </div>

              {/* Super Admin Portal Link */}
              {isSuperAdmin && (
                <div className="pt-4 border-t border-border mt-2">
                  <Button onClick={() => navigate('/super-admin-portal')} className="w-full gradient-bg text-primary-foreground border-0 gap-2 h-10">
                    <Lock className="w-4 h-4" />
                    الدخول إلى لوحة تحكم السوبر أدمن
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">بصلاحياتك كمدير عام، يمكنك إدارة كافة المشتركين.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'roles' && (
          <div className="max-w-4xl">
            <RoleManager companyId={restaurant.id} />
          </div>
        )}

        {activeSubTab === 'taxes' && (
          <div className="max-w-3xl">
            <TaxManager companyId={restaurant.id} />
          </div>
        )}
      </div>
    </div>
  );
}
