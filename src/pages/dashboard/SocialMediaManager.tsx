// @ts-nocheck
// Social Media Manager Component
// Manages OAuth-connected social media accounts and posting

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  Facebook, Instagram, Youtube, Linkedin, Music, Twitter, Pin, 
  Plus, X, CheckCircle, AlertCircle, RefreshCw, Calendar, BarChart3, 
  Settings, Trash2, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OAuthService, { SOCIAL_PLATFORMS, SocialAccount } from '@/lib/socialMedia/oauthService';
import { SocialMediaDashboard } from './SocialMediaDashboard';

interface Props {
  restaurantId: string;
}

interface DiscoveredAsset {
  id: string;
  platform: string;
  external_id: string;
  asset_type: string;
  asset_name: string;
  asset_handle?: string | null;
  parent_external_id?: string | null;
  scopes?: string[];
  status: string;
  metadata?: Record<string, unknown>;
  token_expires_at?: string | null;
}

export function SocialMediaManager({ restaurantId }: Props) {
  const location = useLocation();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<DiscoveredAsset[]>([]);
  const [connectingAssetId, setConnectingAssetId] = useState<string | null>(null);
  const [oauthService] = useState(() => new OAuthService(supabase));
  const [activeTab, setActiveTab] = useState('accounts');

  useEffect(() => {
    loadAccounts();
  }, [restaurantId]);

  // Handle OAuth callback results
  useEffect(() => {
    const oauthState = location.state as any;
    if (oauthState?.oauthSuccess) {
      toast.success(`تم ربط حساب ${oauthState.platform} بنجاح!`);
      void loadAccounts();
    } else if (oauthState?.oauthAssetsDiscovered) {
      setPendingAssets(Array.isArray(oauthState.assets) ? oauthState.assets : []);
      void loadPendingAssets();
    } else if (oauthState?.oauthError) {
      toast.error(`فشل ربط الحساب: ${oauthState.message}`);
      if (oauthState.details) {
        console.error('OAuth Error Details:', oauthState.details);
      }
    }
  }, [location.state]);

  const loadPendingAssets = async () => {
    const { data, error } = await supabase.functions.invoke('social-oauth', {
      body: { action: 'list_assets', restaurantId },
    });
    if (!error && Array.isArray(data?.assets)) setPendingAssets(data.assets as DiscoveredAsset[]);
  };

  const loadAccounts = async () => {
    try {
      const data = await oauthService.getSocialAccounts(restaurantId);
      setAccounts(data);
    } catch (error: any) {
      toast.error('فشل تحميل الحسابات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    const redirectUri = `${window.location.origin}/oauth/callback`;

    // Preferred path: server-side broker (keeps client_secret private and can
    // read the shared/global OAuth config that RLS hides from the browser).
    try {
      const { data, error } = await supabase.functions.invoke('social-oauth', {
        body: { action: 'start', platform, restaurantId, redirectUri },
      });
      if (!error && data?.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      const brokerMessage = data?.error || error?.message;
      if (brokerMessage) throw new Error(brokerMessage);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر بدء المصادقة';
      console.error('social-oauth start failed:', message);
      toast.error(message);
    }
    return;
  };


  const handleConnectAsset = async (assetId: string) => {
    setConnectingAssetId(assetId);
    try {
      const { data, error } = await supabase.functions.invoke('social-oauth', {
        body: { action: 'connect_asset', restaurantId, assetId },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'تعذر ربط الأصل');
      setPendingAssets((current) => current.filter((asset) => asset.id !== assetId));
      await loadAccounts();
      toast.success('تم ربط الأصل بنجاح');
    } catch (error: any) {
      toast.error(error?.message || 'تعذر ربط الأصل');
    } finally {
      setConnectingAssetId(null);
    }
  };

  const getAssetTypeLabel = (asset: DiscoveredAsset) => {
    if (asset.asset_type === 'facebook_page') return 'صفحة Facebook';
    if (asset.asset_type === 'instagram_professional') return 'حساب Instagram احترافي';
    if (asset.asset_type === 'meta_ad_account') return 'حساب إعلاني Meta';
    return 'أصل اجتماعي';
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('هل أنت متأكد من فصل هذا الحساب؟')) return;

    try {
      await oauthService.deleteSocialAccount(accountId, restaurantId);
      toast.success('تم فصل الحساب بنجاح');
      loadAccounts();
    } catch (error: any) {
      toast.error('فشل فصل الحساب: ' + error.message);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      facebook: Facebook,
      instagram: Instagram,
      google: Settings,
      youtube: Youtube,
      linkedin: Linkedin,
      tiktok: Music,
      twitter: Twitter,
      pinterest: Pin,
    };
    return icons[platform] || Settings;
  };

  const getPlatformColor = (platform: string) => {
    return SOCIAL_PLATFORMS[platform]?.color || '#666';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة وسائل التواصل الاجتماعي</h2>
          <p className="text-muted-foreground">ربط وإدارة حسابات التواصل الاجتماعي عبر OAuth</p>
        </div>
        {activeTab === 'accounts' && (
          <Button onClick={() => setShowConnectModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            ربط حساب
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          {pendingAssets.length > 0 && (
            <Card className="p-4 mb-6 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold">أصول Meta المكتشفة</h3>
                  <p className="text-sm text-muted-foreground">
                    اختر فقط الصفحات والحسابات الإعلانية التي تريد منح النظام صلاحية إدارتها. لا تظهر أي كلمات مرور أو توكنات.
                  </p>
                </div>
                <Badge variant="outline">{pendingAssets.length} أصل</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingAssets.map((asset) => (
                  <div key={asset.id} className="rounded-lg border bg-background p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{asset.asset_name}</p>
                      <p className="text-xs text-muted-foreground">{getAssetTypeLabel(asset)}</p>
                      {asset.asset_handle && <p className="text-xs text-muted-foreground truncate">{asset.asset_handle}</p>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConnectAsset(asset.id)}
                      disabled={connectingAssetId === asset.id}
                    >
                      {connectingAssetId === asset.id ? 'جارٍ الربط...' : 'ربط'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Connected Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const PlatformIcon = getPlatformIcon(account.platform);
              const platformConfig = SOCIAL_PLATFORMS[account.platform];
              
              return (
                <Card key={account.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: getPlatformColor(account.platform) + '20' }}
                      >
                        {platformConfig?.icon || '🌐'}
                      </div>
                      <div>
                        <p className="font-bold">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.account_handle && `@${account.account_handle}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={account.is_primary ? 'default' : 'outline'}>
                      {account.is_primary ? 'أساسي' : 'عادي'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>متصل</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      إحصائيات
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDisconnect(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}

            {accounts.length === 0 && (
              <Card className="p-8 col-span-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                    <Link2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold">لا توجد حسابات متصلة</p>
                    <p className="text-sm text-muted-foreground">
                      اطلب من مسؤول الربط اعتماد الحساب، ثم اربطه من خلال صفحة المنصة الرسمية
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <SocialMediaDashboard restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>

      {/* Secure OAuth Connect Modal: no client secrets or tokens are handled here. */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card p-6 max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">ربط حسابات التواصل</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ستتم المصادقة من خلال المنصة الرسمية دون إدخال كلمة المرور أو أي Access Token داخل النظام.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowConnectModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <Tabs defaultValue="facebook" className="w-full">
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-4">
                  {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {platform.icon}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => (
                  <TabsContent key={key} value={key} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{platform.icon}</div>
                      <div>
                        <p className="font-bold">{platform.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          اختر الحساب من صفحة التفويض الرسمية، وسيتم حفظ الصلاحيات الممنوحة فقط.
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleConnect(key)} className="w-full">
                      <Link2 className="w-4 h-4 mr-2" />
                      متابعة ربط {platform.displayName}
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="mt-5 p-3 bg-amber-500/10 rounded-lg text-xs text-amber-800">
                إعدادات تطبيق OAuth وClient Secret أصبحت مسؤولية مدير النظام فقط، ولن تظهر للموظفين داخل هذه الشاشة.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
