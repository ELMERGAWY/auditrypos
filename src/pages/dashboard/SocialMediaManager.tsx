// Social Media Manager Component
// Manages OAuth-connected social media accounts and posting

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Facebook, Instagram, Youtube, Linkedin, Music, Twitter, Pin, 
  Plus, X, CheckCircle, AlertCircle, RefreshCw, Calendar, BarChart3, 
  Settings, Trash2, Link2, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function SocialMediaManager({ restaurantId }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [oauthService] = useState(() => new OAuthService(supabase));
  const [showSecrets, setShowSecrets] = useState(false);
  const [platformSecrets, setPlatformSecrets] = useState<Record<string, { clientId: string; clientSecret: string }>>({});
  const [activeTab, setActiveTab] = useState('accounts');

  useEffect(() => {
    loadAccounts();
    loadPlatformSecrets();
  }, [restaurantId]);

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

  const loadPlatformSecrets = async () => {
    try {
      const { data } = await supabase
        .from('social_media_oauth_config')
        .select('platform, client_id, client_secret')
        .eq('restaurant_id', restaurantId);

      if (data) {
        const secrets: Record<string, { clientId: string; clientSecret: string }> = {};
        data.forEach((config: any) => {
          secrets[config.platform] = {
            clientId: config.client_id,
            clientSecret: config.client_secret,
          };
        });
        setPlatformSecrets(secrets);
      }
    } catch (error) {
      console.error('Failed to load platform secrets:', error);
    }
  };

  const handleConnect = async (platform: string) => {
    const secrets = platformSecrets[platform];
    if (!secrets || !secrets.clientId || !secrets.clientSecret) {
      toast.error('يجب إعداد بيانات OAuth لهذه المنصة أولاً');
      setSelectedPlatform(platform);
      setShowConnectModal(true);
      return;
    }

    oauthService.setPlatformConfig(platform, {
      clientId: secrets.clientId,
      clientSecret: secrets.clientSecret,
      redirectUri: `${window.location.origin}/oauth/callback`,
    });

    const state = Math.random().toString(36).substring(7);
    const authUrl = oauthService.generateAuthUrl(platform, state);
    
    // Debug: Log OAuth URL parameters
    console.log('OAuth Debug - Platform:', platform);
    console.log('OAuth Debug - Auth URL:', authUrl);
    console.log('OAuth Debug - Client ID:', secrets.clientId);
    console.log('OAuth Debug - Redirect URI:', `${window.location.origin}/oauth/callback`);
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_platform', platform);
    sessionStorage.setItem('oauth_restaurant_id', restaurantId);

    window.open(authUrl, '_blank', 'width=600,height=700');
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

  const handleSaveSecrets = async () => {
    try {
      for (const [platform, secrets] of Object.entries(platformSecrets)) {
        if (secrets.clientId && secrets.clientSecret) {
          await supabase.from('social_media_oauth_config').upsert({
            restaurant_id: restaurantId,
            platform: platform,
            client_id: secrets.clientId,
            client_secret: secrets.clientSecret,
            updated_at: new Date().toISOString(),
          });
        }
      }
      toast.success('تم حفظ إعدادات OAuth بنجاح');
      setShowConnectModal(false);
    } catch (error: any) {
      toast.error('فشل حفظ الإعدادات: ' + error.message);
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
            إعداد OAuth
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
                      قم بإعداد OAuth وربط حسابات التواصل الاجتماعي للبدء
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

      {/* OAuth Setup Modal */}
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">إعداد OAuth للمنصات</h3>
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
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-3xl">{platform.icon}</div>
                      <div>
                        <p className="font-bold">{platform.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          يتطلب {platform.requiresAppSecret ? 'Client ID و Client Secret' : 'Client ID فقط'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm mb-1 block">Client ID</Label>
                        <Input
                          placeholder="أدخل Client ID من {platform.displayName} Developer Portal"
                          value={platformSecrets[key]?.clientId || ''}
                          onChange={(e) =>
                            setPlatformSecrets((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], clientId: e.target.value },
                            }))
                          }
                        />
                      </div>

                      {platform.requiresAppSecret && (
                        <div>
                          <Label className="text-sm mb-1 block">Client Secret</Label>
                          <div className="relative">
                            <Input
                              type={showSecrets ? 'text' : 'password'}
                              placeholder="أدخل Client Secret"
                              value={platformSecrets[key]?.clientSecret || ''}
                              onChange={(e) =>
                                setPlatformSecrets((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], clientSecret: e.target.value },
                                }))
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => setShowSecrets(!showSecrets)}
                            >
                              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => handleConnect(key)}
                        className="w-full"
                        disabled={!platformSecrets[key]?.clientId || (platform.requiresAppSecret && !platformSecrets[key]?.clientSecret)}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        ربط حساب {platform.displayName}
                      </Button>
                    </div>

                    <div className="p-3 bg-blue-500/10 rounded-lg text-xs text-blue-700">
                      <p className="font-bold mb-1">كيفية الحصول على بيانات OAuth:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>اذهب إلى {platform.displayName} Developer Portal</li>
                        <li>أنشئ تطبيق جديد</li>
                        <li>أضف Redirect URI: {window.location.origin}/oauth/callback</li>
                        <li>انسخ Client ID و Client Secret</li>
                      </ol>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowConnectModal(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveSecrets}>
                  حفظ الإعدادات
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
