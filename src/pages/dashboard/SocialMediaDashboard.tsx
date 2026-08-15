// @ts-nocheck
// Social Media Dashboard Component
// Provides posting and analytics functionality for connected social media accounts

import { useState, useEffect, type ChangeEvent } from 'react';
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
  content: string;
  media_urls: string[];
  post_type: string;
  status: string;
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  scheduled_at: string | null;
  published_at: string | null;
  error_message?: string | null;
  metrics: any;
  created_at: string;
  social_media_accounts?: { platform?: string; account_name?: string };
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postType, setPostType] = useState('post');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const oauthService = new OAuthService(supabase);

  useEffect(() => {
    void loadAccounts();
    void loadPosts();
  }, [restaurantId]);

  useEffect(() => {
    if (accounts.length > 0) void loadAnalytics(accounts);
    else setAnalytics({});
  }, [accounts]);

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

  const loadAnalytics = async (connectedAccounts: any[]) => {
    try {
      const accountIds = connectedAccounts.map((account) => account.id).filter(Boolean);
      if (accountIds.length === 0) return;
      const { data, error } = await supabase
        .from('social_media_analytics')
        .select('*')
        .in('social_account_id', accountIds)
        .order('metric_date', { ascending: false })
        .limit(Math.max(accountIds.length * 3, 10));
      if (error) throw error;

      const analyticsMap: Record<string, SocialAnalytics> = {};
      for (const row of data || []) {
        if (!analyticsMap[row.social_account_id]) analyticsMap[row.social_account_id] = row;
      }
      setAnalytics(analyticsMap);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploadingMedia(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          throw new Error('يسمح برفع الصور والفيديو فقط');
        }
        if (file.size > 100 * 1024 * 1024) {
          throw new Error('حجم الملف يجب ألا يتجاوز 100 ميجابايت');
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `marketing/${restaurantId}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
        if (data.publicUrl) uploadedUrls.push(data.publicUrl);
      }
      setPostMedia((current) => [...current, ...uploadedUrls]);
      toast.success(`تم رفع ${uploadedUrls.length} ملف`);
    } catch (error: any) {
      toast.error(error?.message || 'فشل رفع الوسائط');
    } finally {
      setUploadingMedia(false);
      event.target.value = '';
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
          status: 'draft',
          approval_status: 'draft',
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

  const runPublishingAction = async (postId: string, action: 'submit' | 'approve' | 'reject' | 'publish' | 'retry', note?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('social-publish', {
        body: { action, postId, note },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'تعذر تنفيذ العملية');
      const messages: Record<string, string> = {
        submit: 'تم إرسال المنشور للمراجعة',
        approve: 'تم اعتماد المنشور وإضافته إلى طابور النشر',
        reject: 'تم رفض المنشور وإعادته للمسودة',
        publish: 'تم نشر المنشور بنجاح',
        retry: 'تمت إعادة محاولة النشر',
      };
      toast.success(messages[action]);
      await loadPosts();
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تنفيذ العملية');
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
      scheduled: { label: 'في الطابور', variant: 'outline' },
      published: { label: 'منشور', variant: 'default' },
      failed: { label: 'فشل النشر', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getApprovalBadge = (status: SocialPost['approval_status']) => {
    const config: Record<SocialPost['approval_status'], { label: string; variant: string }> = {
      draft: { label: 'مسودة', variant: 'secondary' },
      pending_review: { label: 'بانتظار الاعتماد', variant: 'outline' },
      approved: { label: 'معتمد', variant: 'default' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
    };
    return <Badge variant={config[status].variant as any}>{config[status].label}</Badge>;
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
                      <div className="text-2xl">{getPlatformIcon(post.social_media_accounts?.platform || 'facebook')}</div>
                      <div>
                        <p className="font-bold">{post.content.substring(0, 50)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status)}
                      {getApprovalBadge(post.approval_status)}
                    </div>
                  </div>

                  {(post.media_urls || []).length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {(post.media_urls || []).map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt="Media"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {post.approval_status === 'draft' && (
                      <Button size="sm" onClick={() => runPublishingAction(post.id, 'submit')}>
                        <Send className="w-3 h-3 mr-1" />
                        إرسال للمراجعة
                      </Button>
                    )}
                    {post.approval_status === 'pending_review' && (
                      <>
                        <Button size="sm" onClick={() => runPublishingAction(post.id, 'approve')}>
                          اعتماد وإضافة للطابور
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => runPublishingAction(post.id, 'reject', 'يحتاج إلى تعديل قبل النشر')}>
                          رفض
                        </Button>
                      </>
                    )}
                    {post.approval_status === 'approved' && post.status !== 'published' && (
                      <Button size="sm" onClick={() => runPublishingAction(post.id, 'publish')}>
                        <Send className="w-3 h-3 mr-1" />
                        نشر الآن
                      </Button>
                    )}
                    {post.status === 'failed' && post.approval_status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => runPublishingAction(post.id, 'retry')}>
                        إعادة المحاولة
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
                  {post.error_message && (
                    <p className="mt-3 text-xs text-destructive">{post.error_message}</p>
                  )}
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

        <TabsContent value="scheduled" className="space-y-4">
          {posts.filter((post) => post.scheduled_at && post.approval_status === 'approved' && post.status !== 'published').length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد منشورات معتمدة مجدولة حالياً</p>
            </Card>
          ) : (
            posts.filter((post) => post.scheduled_at && post.approval_status === 'approved' && post.status !== 'published').map((post) => (
              <Card key={post.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{post.content.substring(0, 80)}{post.content.length > 80 ? '...' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('ar-EG') : ''}
                  </p>
                </div>
                <Button size="sm" onClick={() => runPublishingAction(post.id, 'publish')}>
                  <Send className="w-3 h-3 mr-1" />
                  نشر الآن
                </Button>
              </Card>
            ))
          )}
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
                  <div className="border-2 border-dashed rounded-lg p-5 text-center space-y-3">
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      disabled={uploadingMedia}
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploadingMedia ? 'جارٍ رفع الملفات...' : `${postMedia.length} ملف مرفوع. الحد الأقصى للملف 100 ميجابايت.`}
                    </p>
                    {postMedia.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {postMedia.map((url, index) => (
                          <button key={url} type="button" className="underline" onClick={() => setPostMedia((current) => current.filter((_, i) => i !== index))}>
                            حذف ملف {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
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
