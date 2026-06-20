import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Facebook, Globe, Music, Twitter, Linkedin, Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackingPixel {
  id: string;
  platform: string;
  pixel_id: string;
  pixel_name: string;
  is_active: boolean;
  placement: string;
}

const TrackingPixelsSettings = ({ restaurantId }: { restaurantId: string }) => {
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPixel, setEditingPixel] = useState<TrackingPixel | null>(null);
  const [formData, setFormData] = useState({
    platform: 'facebook',
    pixel_id: '',
    pixel_name: '',
    placement: 'storefront',
    is_active: true,
  });

  const platforms = [
    { value: 'facebook', label: 'Facebook Pixel', icon: Facebook },
    { value: 'google_analytics', label: 'Google Analytics', icon: Globe },
    { value: 'tiktok', label: 'TikTok Pixel', icon: Music },
    { value: 'twitter', label: 'Twitter/X Pixel', icon: Twitter },
    { value: 'linkedin', label: 'LinkedIn Insight Tag', icon: Linkedin },
    { value: 'snapchat', label: 'Snapchat Pixel', icon: Camera },
    { value: 'pinterest', label: 'Pinterest Tag', icon: Image },
    { value: 'custom', label: 'Custom Pixel', icon: Globe },
  ];

  const placements = [
    { value: 'storefront', label: 'المتجر الإلكتروني' },
    { value: 'landing_page', label: 'صفحة الهبوط' },
    { value: 'both', label: 'كلاهما' },
  ];

  useEffect(() => {
    loadPixels();
  }, [restaurantId]);

  const loadPixels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPixels(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل البيكسل');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPixel) {
        const { error } = await supabase
          .from('tracking_pixels')
          .update({
            platform: formData.platform,
            pixel_id: formData.pixel_id,
            pixel_name: formData.pixel_name,
            placement: formData.placement,
            is_active: formData.is_active,
          })
          .eq('id', editingPixel.id);

        if (error) throw error;
        toast.success('تم تحديث البيكسل بنجاح');
      } else {
        const { error } = await supabase
          .from('tracking_pixels')
          .insert({
            restaurant_id: restaurantId,
            platform: formData.platform,
            pixel_id: formData.pixel_id,
            pixel_name: formData.pixel_name,
            placement: formData.placement,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('تم إضافة البيكسل بنجاح');
      }

      setShowDialog(false);
      setEditingPixel(null);
      setFormData({
        platform: 'facebook',
        pixel_id: '',
        pixel_name: '',
        placement: 'storefront',
        is_active: true,
      });
      loadPixels();
    } catch (error: any) {
      toast.error('فشل حفظ البيكسل');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tracking_pixels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('تم حذف البيكسل بنجاح');
      loadPixels();
    } catch (error: any) {
      toast.error('فشل حذف البيكسل');
      console.error(error);
    }
  };

  const handleEdit = (pixel: TrackingPixel) => {
    setEditingPixel(pixel);
    setFormData({
      platform: pixel.platform,
      pixel_id: pixel.pixel_id,
      pixel_name: pixel.pixel_name,
      placement: pixel.placement,
      is_active: pixel.is_active,
    });
    setShowDialog(true);
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = platforms.find(p => p.value === platform);
    const Icon = platformConfig?.icon || Globe;
    return <Icon className="w-5 h-5" />;
  };

  const getPlatformLabel = (platform: string) => {
    const platformConfig = platforms.find(p => p.value === platform);
    return platformConfig?.label || platform;
  };

  const getPlacementLabel = (placement: string) => {
    const placementConfig = placements.find(p => p.value === placement);
    return placementConfig?.label || placement;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          إعدادات التتبع (Tracking Pixels)
        </CardTitle>
        <CardDescription>
          أضف أكواد التتبع من منصات التواصل الاجتماعي لمراقبة أداء متجرك الإلكتروني
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPixel(null);
                setFormData({
                  platform: 'facebook',
                  pixel_id: '',
                  pixel_name: '',
                  placement: 'storefront',
                  is_active: true,
                });
              }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة بيكسل جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPixel ? 'تعديل البيكسل' : 'إضافة بيكسل جديد'}</DialogTitle>
                <DialogDescription>
                  أضف كود التتبع من منصة التواصل الاجتماعي لمراقبة أداء متجرك
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>المنصة</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          <div className="flex items-center gap-2">
                            <platform.icon className="w-4 h-4" />
                            {platform.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>معرف البيكسل (Pixel ID)</Label>
                  <Input
                    value={formData.pixel_id}
                    onChange={(e) => setFormData({ ...formData, pixel_id: e.target.value })}
                    placeholder="مثال: 1234567890"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>اسم البيكسل (اختياري)</Label>
                  <Input
                    value={formData.pixel_name}
                    onChange={(e) => setFormData({ ...formData, pixel_name: e.target.value })}
                    placeholder="مثال: Facebook Pixel الرئيسي"
                  />
                </div>

                <div className="space-y-2">
                  <Label>مكان التفعيل</Label>
                  <Select
                    value={formData.placement}
                    onValueChange={(value) => setFormData({ ...formData, placement: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {placements.map((placement) => (
                        <SelectItem key={placement.value} value={placement.value}>
                          {placement.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>تفعيل البيكسل</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPixel ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
        ) : pixels.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد بيكسلات مضافة. أضف بيكسل جديد للبدء.
          </p>
        ) : (
          <div className="space-y-3">
            {pixels.map((pixel) => (
              <div
                key={pixel.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getPlatformIcon(pixel.platform)}
                  </div>
                  <div>
                    <p className="font-medium">{pixel.pixel_name || getPlatformLabel(pixel.platform)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getPlatformLabel(pixel.platform)} • {getPlacementLabel(pixel.placement)}
                    </p>
                    <p className="text-xs text-muted-foreground">ID: {pixel.pixel_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pixel.is_active}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error } = await supabase
                          .from('tracking_pixels')
                          .update({ is_active: checked })
                          .eq('id', pixel.id);
                        if (error) throw error;
                        loadPixels();
                        toast.success(checked ? 'تم تفعيل البيكسل' : 'تم إيقاف البيكسل');
                      } catch (error: any) {
                        toast.error('فشل تحديث حالة البيكسل');
                        console.error(error);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(pixel)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(pixel.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackingPixelsSettings;
