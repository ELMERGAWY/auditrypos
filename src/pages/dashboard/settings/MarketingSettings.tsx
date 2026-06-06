import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share2, Facebook, Chrome, Music2, CheckCircle2, Save, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  restaurant: any;
}

const PLATFORMS = [
  { id: 'meta', label: 'Facebook / Meta Pixel', icon: Facebook, description: 'تتبع حملات فيسبوك وإنستجرام' },
  { id: 'google', label: 'Google Analytics / Ads', icon: Chrome, description: 'تتبع جوجل وتحليلات الموقع' },
  { id: 'tiktok', label: 'TikTok Pixel', icon: Music2, description: 'تتبع حملات تيك توك' },
  { id: 'snapchat', label: 'Snapchat Pixel', icon: Globe, description: 'تتبع حملات سناب شات' },
];

export function MarketingSettings({ restaurant }: Props) {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [activePlatform, setActivePlatform] = useState('meta');

  const loadConfigs = async () => {
    const { data } = await supabase
      .from('crm_platform_configs')
      .select('*')
      .eq('restaurant_id', restaurant.id);
    if (data) setConfigs(data);
  };

  useEffect(() => {
    loadConfigs();
  }, [restaurant.id]);

  const currentConfig = configs.find(c => c.platform === activePlatform) || {
    platform: activePlatform,
    pixel_id: '',
    api_key: '',
    is_active: true
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('crm_platform_configs')
      .upsert({
        restaurant_id: restaurant.id,
        platform: activePlatform,
        pixel_id: currentConfig.pixel_id,
        api_key: currentConfig.api_key,
        is_active: currentConfig.is_active,
        updated_at: new Date().toISOString()
      }, { onConflict: 'restaurant_id,platform' });

    if (error) {
      toast.error('فشل حفظ الإعدادات');
    } else {
      toast.success('تم حفظ إعدادات المنصة بنجاح');
      loadConfigs();
    }
    setLoading(false);
  };

  const updateField = (field: string, value: any) => {
    setConfigs(prev => {
      const existing = prev.find(c => c.platform === activePlatform);
      if (existing) {
        return prev.map(c => c.platform === activePlatform ? { ...c, [field]: value } : c);
      }
      return [...prev, { platform: activePlatform, [field]: value }];
    });
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">الربط مع منصات التسويق</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Platforms List */}
        <div className="lg:col-span-1 space-y-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-4 ${
                activePlatform === p.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/20'
              }`}
            >
              <div className={`p-2 rounded-xl ${activePlatform === p.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.description}</p>
              </div>
              {configs.find(c => c.platform === p.id && c.is_active && c.pixel_id) && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* Platform Config Form */}
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b">
            {(() => {
              const P = PLATFORMS.find(p => p.id === activePlatform)?.icon || Share2;
              return <P className="w-6 h-6 text-primary" />;
            })()}
            <h4 className="font-bold">{PLATFORMS.find(p => p.id === activePlatform)?.label}</h4>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground mr-1">Pixel ID / Tracking ID</label>
              <Input
                placeholder="مثال: 123456789012345"
                value={currentConfig.pixel_id || ''}
                onChange={e => updateField('pixel_id', e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground mr-1">API Key / Access Token (اختياري)</label>
              <Input
                type="password"
                placeholder="لإرسال الأحداث عبر السيرفر (Conversions API)"
                value={currentConfig.api_key || ''}
                onChange={e => updateField('api_key', e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={currentConfig.is_active}
                onChange={e => updateField('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium">تفعيل التتبع لهذه المنصة</label>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full h-11 rounded-xl gradient-bg border-0 text-white font-bold"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الربط'}
              <Save className="w-4 h-4 mr-2" />
            </Button>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex gap-3">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-primary">لماذا تربط بيكسل؟</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  يساعدك الربط في تتبع زوار موقعك وعمليات الشراء التي تتم عبر متجرك الإلكتروني، مما يسمح لك بتحسين حملاتك الإعلانية وزيادة مبيعاتك من خلال معرفة أي الإعلانات تحقق نتائج حقيقية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
