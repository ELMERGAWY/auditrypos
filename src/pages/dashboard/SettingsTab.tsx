import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store, Shield, Percent, Lock, Building2, BookOpen, Share2, Printer, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';
import { RoleManager } from './settings/RoleManager';
import { TaxManager } from './settings/TaxManager';
import { AccountingSettings } from './settings/AccountingSettings';
import { MarketingSettings } from './settings/MarketingSettings';
import { DatabaseAuditTool } from '@/components/DatabaseAuditTool';
import { PrintSettingsManager } from './settings/PrintSettingsManager';
import { AppearanceSettings } from './settings/AppearanceSettings';

interface SettingsTabProps {
  restaurant: any;
  businessType: BusinessType;
  profileName: string;
  user: any;
  agents: any[];
  isSuspended: boolean;
  isSuperAdmin: boolean;
  workspaceId?: string | null;
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
  workspaceId,
  loadData
}: SettingsTabProps) {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'roles' | 'taxes' | 'accounting' | 'marketing' | 'storefront' | 'appearance' | 'audit' | 'print'>('profile');
  const [storefrontSaving, setStorefrontSaving] = useState(false);
  const [storefrontConfig, setStorefrontConfig] = useState<any>({});
  const [managerSyncing, setManagerSyncing] = useState(false);
  const [managerSyncSummary, setManagerSyncSummary] = useState<{ claimed?: number; posted?: number; failed?: number; dry_run?: number; requeued?: number; queued?: number } | null>(null);
  const [managerReconciling, setManagerReconciling] = useState(false);
  const [managerReconcileSummary, setManagerReconcileSummary] = useState<{ conflicts?: number; unmapped_manager_records?: number } | null>(null);

  useEffect(() => {
    setStorefrontConfig(restaurant?.storefront_config || {});
  }, [restaurant?.storefront_config]);


  const handleSaveStorefront = async () => {
    if (!restaurant?.id) return;
    setStorefrontSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('update_storefront_config', {
        p_restaurant_id: restaurant.id,
        p_config: storefrontConfig,
      });
      if (error) throw error;
      setStorefrontConfig(data || storefrontConfig);
      toast.success('تم حفظ تخصيص المتجر والصفحة العامة');
      loadData();
    } catch (error: any) {
      toast.error('تعذر حفظ إعدادات المتجر: ' + (error?.message || 'تحقق من migration المتجر'));
    } finally {
      setStorefrontSaving(false);
    }
  };

  const handleManagerSync = async () => {
    if (!restaurant?.id || managerSyncing) return;
    setManagerSyncing(true);
    setManagerSyncSummary(null);
    try {
      const { data: requestData, error: requestError } = await (supabase as any).rpc('request_manager_sync', {
        p_restaurant_id: restaurant.id,
        p_workspace_id: workspaceId || null,
      });
      if (requestError) throw requestError;

      const query = new URLSearchParams({
        mode: 'manual',
        limit: '50',
        restaurant_id: restaurant.id,
      });
      if (workspaceId) query.set('workspace_id', workspaceId);
      const { data: workerData, error: workerError } = await supabase.functions.invoke(`manager-sync?${query.toString()}`, { body: {} });
      if (workerError) throw workerError;

      setManagerSyncSummary({
        ...(requestData || {}),
        ...(workerData || {}),
      });
      toast.success('تم تشغيل المزامنة المؤجلة؛ ستتم إعادة المحاولة تلقائياً عند فشل الاتصال');
    } catch (error: any) {
      console.error('[settings] Manager sync request failed:', error);
      toast.error('تعذر تشغيل المزامنة: ' + (error?.message || 'تحقق من إعداد التكامل والـ migration'));
    } finally {
      setManagerSyncing(false);
    }
  };

  const handleManagerReconcile = async () => {
    if (!restaurant?.id || managerReconciling) return;
    setManagerReconciling(true);
    setManagerReconcileSummary(null);
    try {
      const query = new URLSearchParams({
        mode: 'reconcile',
        restaurant_id: restaurant.id,
      });
      if (workspaceId) query.set('workspace_id', workspaceId);
      const { data, error } = await supabase.functions.invoke(`manager-sync?${query.toString()}`, { body: {} });
      if (error) throw error;
      setManagerReconcileSummary(data || {});
      toast.success('اكتملت مراجعة Manager؛ لم يتم تعديل الأرصدة أو الطلبات تلقائياً');
    } catch (error: any) {
      console.error('[settings] Manager reconcile failed:', error);
      toast.error('تعذر مراجعة Manager: ' + (error?.message || 'تحقق من الإعدادات'));
    } finally {
      setManagerReconciling(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant?.id) return;
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
        <button
          onClick={() => setActiveSubTab('accounting')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'accounting' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <BookOpen className="w-4 h-4" />
          {isSuperAdmin ? 'الموديول والمحاسبة' : 'إعدادات المحاسبة'}
        </button>
        <button
          onClick={() => setActiveSubTab('marketing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'marketing' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Share2 className="w-4 h-4" /> التسويق والبيكسل
        </button>
        <button
          onClick={() => setActiveSubTab('storefront')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'storefront' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Store className="w-4 h-4" /> المتجر والصفحة العامة
        </button>
        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'appearance' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Palette className="w-4 h-4" /> المظهر وطرق العرض
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'audit' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Shield className="w-4 h-4" /> صحة النظام والتدقيق
        </button>
        <button
          onClick={() => setActiveSubTab('print')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${activeSubTab === 'print' ? 'gradient-bg text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <Printer className="w-4 h-4" /> إعدادات الطباعة
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
              {restaurant?.id && (
                <div className="pt-4 border-t border-border mt-2">
                  <p className="text-sm text-muted-foreground mb-2">رابط المتجر الإلكتروني (لعملائك)</p>
                  <div className="flex gap-2">
                    <code className="text-xs bg-secondary px-3 py-2 rounded-lg flex-1 truncate">{window.location.origin}/store/{restaurant.id}</code>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${restaurant.id}`).then(() => toast.success('تم نسخ الرابط'))}>
                      نسخ
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">مزامنة Manager</p>
                    <p className="text-xs text-muted-foreground">مزامنة مؤجلة عبر الطابور؛ لا تعطل البيع أو التشغيل أوفلاين.</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleManagerReconcile} disabled={managerReconciling} className="gap-2 shrink-0">
                      <RefreshCw className={`w-4 h-4 ${managerReconciling ? 'animate-spin' : ''}`} />
                      {managerReconciling ? 'جاري الفحص...' : 'فحص Manager'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleManagerSync} disabled={managerSyncing} className="gap-2 shrink-0">
                      <RefreshCw className={`w-4 h-4 ${managerSyncing ? 'animate-spin' : ''}`} />
                      {managerSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
                    </Button>
                  </div>
                </div>
                {managerSyncSummary && (
                  <p className="text-xs text-muted-foreground">
                    الطابور: {managerSyncSummary.queued ?? 0} | تمت المعالجة: {managerSyncSummary.claimed ?? 0} | نجحت: {managerSyncSummary.posted ?? 0} | فشلت: {managerSyncSummary.failed ?? 0} | تجريبي: {managerSyncSummary.dry_run ?? 0}
                  </p>
                )}
                {managerReconcileSummary && (
                  <p className="text-xs text-muted-foreground">
                    نتيجة الفحص: تعارضات {managerReconcileSummary.conflicts ?? 0} | سجلات Manager غير مربوطة {managerReconcileSummary.unmapped_manager_records ?? 0}
                  </p>
                )}
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

        {activeSubTab === 'roles' && restaurant?.id && (
          <div className="max-w-4xl">
            <RoleManager companyId={restaurant.id} />
          </div>
        )}

        {activeSubTab === 'taxes' && restaurant?.id && (
          <div className="max-w-3xl">
            <TaxManager companyId={restaurant.id} />
          </div>
        )}
        {activeSubTab === 'accounting' && (
          <div className="max-w-4xl">
            <AccountingSettings restaurant={restaurant} loadData={loadData} isSuperAdmin={isSuperAdmin} />
          </div>
        )}
        {activeSubTab === 'marketing' && (
          <div className="max-w-4xl">
            <MarketingSettings restaurant={restaurant} />
          </div>
        )}
        {activeSubTab === 'storefront' && restaurant?.id && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold">تخصيص المتجر والـLanding Page</h2>
              <p className="text-sm text-muted-foreground mt-1">تحكم في الواجهة العامة والرابط الحالي للمتجر. لا يتم حفظ HTML أو JavaScript خام من الموظفين.</p>
            </div>
            <div className="glass-card p-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><Label>العنوان الرئيسي</Label><Input value={storefrontConfig.hero_title || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, hero_title: e.target.value })} placeholder="مثال: اختياراتك اليومية في مكان واحد" /></div>
              <div className="space-y-2 md:col-span-2"><Label>الوصف المختصر</Label><Input value={storefrontConfig.hero_subtitle || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, hero_subtitle: e.target.value })} placeholder="رسالة واضحة للعميل قبل تصفح المنتجات" /></div>
              <div className="space-y-2"><Label>رابط صورة الـHero</Label><Input value={storefrontConfig.hero_image_url || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, hero_image_url: e.target.value })} placeholder="رابط صورة من Storage" /></div>
              <div className="space-y-2"><Label>نص زر الدعوة</Label><Input value={storefrontConfig.cta_text || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, cta_text: e.target.value })} placeholder="اطلب الآن" /></div>
              <div className="space-y-2"><Label>عنوان الصفحة لمحركات البحث</Label><Input value={storefrontConfig.meta_title || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, meta_title: e.target.value })} /></div>
              <div className="space-y-2"><Label>وصف الصفحة لمحركات البحث</Label><Input value={storefrontConfig.meta_description || ''} onChange={(e) => setStorefrontConfig({ ...storefrontConfig, meta_description: e.target.value })} /></div>
              <div className="md:col-span-2 flex flex-wrap gap-2 text-sm">
                <Button type="button" variant={storefrontConfig.show_search !== false ? 'default' : 'outline'} onClick={() => setStorefrontConfig({ ...storefrontConfig, show_search: storefrontConfig.show_search === false })}>البحث {storefrontConfig.show_search !== false ? 'مفعل' : 'مغلق'}</Button>
                <Button type="button" variant={storefrontConfig.show_categories !== false ? 'default' : 'outline'} onClick={() => setStorefrontConfig({ ...storefrontConfig, show_categories: storefrontConfig.show_categories === false })}>التصنيفات {storefrontConfig.show_categories !== false ? 'مفعلة' : 'مغلقة'}</Button>
                <Button type="button" onClick={handleSaveStorefront} disabled={storefrontSaving}>{storefrontSaving ? 'جاري الحفظ...' : 'حفظ تخصيص المتجر'}</Button>
              </div>
            </div>
            <div className="glass-card p-4 space-y-2">
              <p className="font-semibold">الرابط الحالي</p>
              <code className="block bg-secondary/50 rounded-lg p-3 text-xs break-all">{window.location.origin}/store/{restaurant.id}</code>
              <p className="text-xs text-muted-foreground">بعد حفظ الإعدادات، تظهر الصفحة العامة مباشرة على نفس الرابط، وتستمر إعدادات Pixels في تبويب التسويق والبيكسل.</p>
            </div>
          </div>
        )}
        {activeSubTab === 'appearance' && restaurant?.id && (
          <AppearanceSettings restaurant={restaurant} loadData={loadData} />
        )}
        {activeSubTab === 'audit' && (
          <div className="max-w-4xl">
            <DatabaseAuditTool />
          </div>
        )}
        {activeSubTab === 'print' && restaurant?.id && (
          <div className="max-w-4xl">
            <PrintSettingsManager restaurantId={restaurant.id} />
          </div>
        )}
      </div>
    </div>
  );
}
