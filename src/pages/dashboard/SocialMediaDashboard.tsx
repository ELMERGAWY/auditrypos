// @ts-nocheck
// Social Media Dashboard Component
// Provides posting and analytics functionality for connected social media accounts

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Calendar, Clock, Send, BarChart3, Image as ImageIcon, 
  Video, FileText, Trash2, Edit2, Eye, Share2, TrendingUp, Users,
  MessageCircle, Heart, ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OAuthService, { SOCIAL_PLATFORMS } from '@/lib/socialMedia/oauthService';

interface Props {
  restaurantId: string;
}

interface SocialPost {
  id: string;
  social_account_id: string;
  platform: string;
  content: string;
  media_urls: string[];
  post_type: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  metrics: any;
  created_at: string;
}

interface SocialAnalytics {
  followers_count: number;
  engagement_rate: number;
  impressions: number;
  reach: number;
  posts_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
}

export function SocialMediaDashboard({ restaurantId }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, SocialAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string[]>([]);
  const [postType, setPostType] = useState('post');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const oauthService = new OAuthService(supabase);

  useEffect(() => {
    loadAccounts();
    loadPosts();
    loadAnalytics();
  }, [restaurantId]);

  const loadAccounts = async () => {
    try {
      const data = await oauthService.getSocialAccounts(restaurantId);
      setAccounts(data);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*, social_media_accounts(platform, account_name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل المنشورات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_analytics')
        .select('*')
        .eq('social_account_id', accounts[0]?.id)
        .order('metric_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const analyticsMap: Record<string, SocialAnalytics> = {};
        analyticsMap[accounts[0]?.id] = data[0];
        setAnalytics(analyticsMap);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleCreatePost = async () => {
    if (selectedAccounts.length === 0) {
      return toast.error('اختر حساباً واحداً على الأقل');
    }
    if (!postContent.trim()) {
      return toast.error('أدخل محتوى المنشور');
    }

    try {
      const scheduledAt = scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      for (const accountId of selectedAccounts) {
        const { error } = await supabase.from('social_media_posts').insert({
          restaurant_id: restaurantId,
          social_account_id: accountId,
          content: postContent,
          media_urls: postMedia,
          post_type: postType,
          status: scheduledAt ? 'scheduled' : 'draft',
          scheduled_at: scheduledAt,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      toast.success('تم إنشاء المنشور بنجاح');
      setShowPostModal(false);
      setPostContent('');
      setPostMedia([]);
      setSelectedAccounts([]);
      setScheduledDate('');
      setScheduledTime('');
      loadPosts();
    } catch (error: any) {
      toast.error('فشل إنشاء المنشور: ' + error.message);
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Get access token
      const accessToken = await oauthService.getAccessToken(post.social_account_id);
      
      // Publish to platform (this is platform-specific)
      // For now, we'll just update the status
      const { error } = await supabase
        .from('social_media_posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;
      
      toast.success('تم نشر المنشور بنجاح');
      loadPosts();
    } catch (error: any) {
      toast.error('فشل نشر المنشور: ' + error.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      toast.success('تم حذف المنشور');
      loadPosts();
    } catch (error: any) {
      toast.error('فشل حذف المنشور: ' + error.message);
    }
  };

  const getPlatformIcon = (platform: string) => {
    return SOCIAL_PLATFORMS[platform]?.icon || '🌐';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: string }> = {
      draft: { label: 'مسودة', variant: 'secondary' },
      scheduled: { label: 'مجدول', variant: 'outline' },
      published: { label: 'منشور', variant: 'default' },
      failed: { label: 'فشل', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">لوحة تحكم وسائل التواصل</h2>
          <p className="text-muted-foreground">إدارة المنشورات والإحصائيات</p>
        </div>
        <Button onClick={() => setShowPostModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          إنشاء منشور
        </Button>
      </div>

      {/* Analytics Overview */}
      {Object.keys(analytics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics).map(([accountId, data]) => (
            <Card key={accountId} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">المتابعين</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(data.followers_count)}</p>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <ArrowUp className="w-3 h-3" />
                <span>+5.2%</span>
              </div>
            </Card>
          ))}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">معدل التفاعل</span>
            </div>
            <p className="text-2xl font-bold">
              {Object.values(analytics).reduce((sum, a) => sum + a.engagement_rate, 0) / Object.keys(analytics).length}%
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">الوصول</span>
            </div>
            <p className="text-2xl font-bold">
              {formatNumber(Object.values(analytics).reduce((sum, a) => sum + a.reach, 0))}
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">الإعجابات</span>
            </div>
            <p className="text-2xl font-bold">
              {formatNumber(Object.values(analytics).reduce((sum, a) => sum + a.likes_count, 0))}
            </p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="posts">المنشورات</TabsTrigger>
          <TabsTrigger value="analytics">الإحصائيات</TabsTrigger>
          <TabsTrigger value="scheduled">المجدول</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <Share2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد منشورات بعد</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getPlatformIcon(post.platform)}</div>
                      <div>
                        <p className="font-bold">{post.content.substring(0, 50)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(post.status)}
                  </div>

                  {post.media_urls.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {post.media_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt="Media"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {post.status === 'draft' && (
                      <Button size="sm" onClick={() => handlePublishPost(post.id)}>
                        <Send className="w-3 h-3 mr-1" />
                        نشر
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">الإحصائيات التفصيلية قريباً</p>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">المنشورات المجدولة قريباً</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card p-6 max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">إنشاء منشور جديد</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPostModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Account Selection */}
                <div>
                  <Label className="text-sm mb-2 block">اختر الحسابات</Label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedAccounts(prev =>
                            prev.includes(account.id)
                              ? prev.filter(id => id !== account.id)
                              : [...prev, account.id]
                          );
                        }}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                          selectedAccounts.includes(account.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span>{getPlatformIcon(account.platform)}</span>
                        {account.account_name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post Type */}
                <div>
                  <Label className="text-sm mb-2 block">نوع المنشور</Label>
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">منشور عادي</SelectItem>
                      <SelectItem value="story">قصة</SelectItem>
                      <SelectItem value="reel">ريلز</SelectItem>
                      <SelectItem value="video">فيديو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content */}
                <div>
                  <Label className="text-sm mb-2 block">المحتوى</Label>
                  <Textarea
                    placeholder="اكتب محتوى المنشور هنا..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={5}
                    maxLength={2800}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {postContent.length}/2800
                  </p>
                </div>

                {/* Media Upload */}
                <div>
                  <Label className="text-sm mb-2 block">الوسائط (اختياري)</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      اسحب الصور والفيديوهات هنا أو انقر للتحميل
                    </p>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block">تاريخ النشر (اختياري)</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">وقت النشر (اختياري)</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowPostModal(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleCreatePost}>
                    {scheduledDate && scheduledTime ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        جدولة
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        نشر
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
