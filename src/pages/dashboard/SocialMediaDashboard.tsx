// @ts-nocheck
// Social Media Dashboard Component
// Provides posting and analytics functionality for connected social media accounts

import { useState, useEffect, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Calendar, Clock, Send, BarChart3, Image as ImageIcon, 
  Video, FileText, Trash2, Edit2, Eye, Share2, TrendingUp, Users,
  MessageCircle, Heart, ArrowUp, ArrowDown, Inbox
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

interface InboxMessage {
  id: string;
  sender_name?: string | null;
  sender_external_id?: string | null;
  message_content?: string | null;
  platform?: string | null;
  status?: string | null;
  message_type?: string | null;
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
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, SocialAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [postType, setPostType] = useState('post');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('posts');
  const oauthService = new OAuthService(supabase);

  const resetPostEditor = () => {
    setEditingPostId(null);
    setPostContent('');
    setPostMedia([]);
    setSelectedAccounts([]);
    setPostType('post');
    setScheduledDate('');
    setScheduledTime('');
  };

  const closePostModal = () => {
    resetPostEditor();
    setShowPostModal(false);
  };

  const openPostEditor = (post?: SocialPost) => {
    if (!post) {
      resetPostEditor();
      setShowPostModal(true);
      return;
    }
    if (!['draft', 'rejected'].includes(post.approval_status)) {
      toast.error('لا يمكن تعديل منشور تم إرساله للمراجعة أو اعتماده');
      return;
    }
    const scheduled = post.scheduled_at ? new Date(post.scheduled_at) : null;
    setEditingPostId(post.id);
    setSelectedAccounts([post.social_account_id]);
    setPostContent(post.content || '');
    setPostMedia(Array.isArray(post.media_urls) ? post.media_urls : []);
    setPostType(post.post_type || 'post');
    setScheduledDate(scheduled && !Number.isNaN(scheduled.getTime()) ? `${scheduled.getFullYear()}-${String(scheduled.getMonth() + 1).padStart(2, '0')}-${String(scheduled.getDate()).padStart(2, '0')}` : '');
    setScheduledTime(scheduled && !Number.isNaN(scheduled.getTime()) ? `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}` : '');
    setShowPostModal(true);
  };

  useEffect(() => {
    void loadAccounts();
    void loadPosts();
    void loadInbox();
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

  const loadInbox = async () => {
    const { data, error } = await supabase
      .from('crm_social_messages')
      .select('id, sender_name, sender_external_id, message_content, platform, status, message_type, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setInboxMessages((data || []) as InboxMessage[]);
  };

  const markInboxRead = async (messageId: string) => {
    const { error } = await supabase.from('crm_social_messages').update({ status: 'read' }).eq('id', messageId).eq('restaurant_id', restaurantId);
    if (!error) setInboxMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: 'read' } : message));
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
    if (selectedAccounts.length === 0) return toast.error('اختر حساباً واحداً على الأقل');
    if (!postContent.trim()) return toast.error('أدخل محتوى المنشور');
    if (editingPostId && selectedAccounts.length !== 1) return toast.error('اختر حساباً واحداً عند تعديل المنشور');

    try {
      const scheduledDateTime = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null;
      if (scheduledDateTime && Number.isNaN(scheduledDateTime.getTime())) return toast.error('تاريخ أو وقت الجدولة غير صالح');
      if (scheduledDateTime && scheduledDateTime.getTime() <= Date.now()) return toast.error('يجب أن يكون موعد الجدولة في المستقبل');
      const scheduledAt = scheduledDateTime ? scheduledDateTime.toISOString() : null;
      const payload = {
        social_account_id: selectedAccounts[0],
        content: postContent.trim(),
        media_urls: postMedia,
        post_type: postType,
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      };

      if (editingPostId) {
        const existing = posts.find((post) => post.id === editingPostId);
        if (!existing || !['draft', 'rejected'].includes(existing.approval_status)) {
          throw new Error('لا يمكن تعديل هذا المنشور في حالته الحالية');
        }
        const { error } = await supabase.from('social_media_posts').update({
          ...payload,
          status: 'draft',
          approval_status: 'draft',
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
        }).eq('id', editingPostId).eq('restaurant_id', restaurantId);
        if (error) throw error;
        toast.success('تم حفظ تعديلات المسودة');
      } else {
        for (const accountId of selectedAccounts) {
          const { error } = await supabase.from('social_media_posts').insert({
            restaurant_id: restaurantId,
            ...payload,
            social_account_id: accountId,
            status: 'draft',
            approval_status: 'draft',
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        toast.success('تم إنشاء المنشور بنجاح');
      }

      closePostModal();
      await loadPosts();
    } catch (error: any) {
      toast.error((editingPostId ? 'فشل حفظ التعديل: ' : 'فشل إنشاء المنشور: ') + (error?.message || 'خطأ غير معروف'));
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
        .eq('id', postId)
        .eq('restaurant_id', restaurantId);

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
        <Button onClick={() => openPostEditor()}>
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
                      <div className="text-xs text-muted-foreground mt-1">آخر قراءة متاحة</div>
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
          <TabsTrigger value="inbox">Inbox ({inboxMessages.filter((message) => message.status !== 'read').length})</TabsTrigger>
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
                    {['draft', 'rejected'].includes(post.approval_status) && (
                      <Button size="sm" variant="ghost" onClick={() => openPostEditor(post)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
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

        <TabsContent value="inbox" className="space-y-4">
          {inboxMessages.length === 0 ? (
            <Card className="p-8 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد رسائل أو تعليقات واردة</p>
            </Card>
          ) : (
            inboxMessages.map((message) => (
              <Card key={message.id} className={`p-4 ${message.status !== 'read' ? 'border-primary/50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      <p className="font-semibold">{message.sender_name || 'Meta user'}</p>
                      <Badge variant="outline">{message.message_type === 'comment' ? 'تعليق' : 'رسالة'}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{message.message_content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                  {message.status !== 'read' && (
                    <Button size="sm" variant="outline" onClick={() => markInboxRead(message.id)}>
                      تمّت القراءة
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {Object.keys(analytics).length === 0 ? (
            <Card className="p-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد بيانات تحليلات متزامنة بعد</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(analytics).map(([accountId, data]) => {
                const account = accounts.find((candidate) => candidate.id === accountId);
                return (
                  <Card key={accountId} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{account?.account_name || 'حساب اجتماعي'}</h3>
                      <Badge variant="outline">{account?.platform || 'meta'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">المتابعون</span><p className="font-semibold">{formatNumber(data.followers_count)}</p></div>
                      <div><span className="text-muted-foreground">معدل التفاعل</span><p className="font-semibold">{data.engagement_rate.toFixed(2)}%</p></div>
                      <div><span className="text-muted-foreground">الظهور</span><p className="font-semibold">{formatNumber(data.impressions)}</p></div>
                      <div><span className="text-muted-foreground">الوصول</span><p className="font-semibold">{formatNumber(data.reach)}</p></div>
                      <div><span className="text-muted-foreground">الإعجابات</span><p className="font-semibold">{formatNumber(data.likes_count)}</p></div>
                      <div><span className="text-muted-foreground">التعليقات</span><p className="font-semibold">{formatNumber(data.comments_count)}</p></div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
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
            onClick={closePostModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card p-6 max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingPostId ? 'تعديل مسودة المنشور' : 'إنشاء منشور جديد'}</h3>
                <Button variant="ghost" size="sm" onClick={closePostModal}>
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
                  <Button variant="outline" onClick={closePostModal}>
                    إلغاء
                  </Button>
                  <Button onClick={handleCreatePost}>
                    {editingPostId ? (
                      'حفظ المسودة'
                    ) : scheduledDate && scheduledTime ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        جدولة
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        إنشاء مسودة
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
