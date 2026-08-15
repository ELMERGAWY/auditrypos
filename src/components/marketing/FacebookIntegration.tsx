import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Facebook, Plus, Search, Link, Unlink, CheckCircle, AlertTriangle,
  Settings, RefreshCw, BarChart3, TrendingUp, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FacebookAccount {
  id: string;
  business_id?: string;
  account_name?: string;
  is_active: boolean;
  is_connected: boolean;
  permissions?: string[];
}

interface FacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  page_category?: string;
  page_url?: string;
  ad_account_id?: string;
  ad_account_name?: string;
  is_active: boolean;
  is_managed: boolean;
  client_id?: string;
  client_name?: string;
  project_id?: string;
  project_name?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

export function FacebookIntegration({ restaurantId, currency }: Props) {
  const [facebookAccounts, setFacebookAccounts] = useState<FacebookAccount[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showPageForm, setShowPageForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FacebookAccount | null>(null);

  const [pageForm, setPageForm] = useState({
    page_id: '',
    page_name: '',
    page_category: '',
    page_url: '',
    ad_account_id: '',
    ad_account_name: '',
    client_id: '',
    project_id: '',
  });

  const loadFacebookAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_facebook_accounts')
        .select('id, business_id, account_name, token_expires_at, is_active, is_connected, permissions, metadata, created_at, updated_at, created_by')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFacebookAccounts(data || []);
    } catch (error: any) {
      toast.error('فشل تحميل حسابات فيسبوك: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFacebookPages = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_facebook_pages')
        .select(`
          *,
          customers(name),
          marketing_projects(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedPages = (data || []).map((p: any) => ({
        ...p,
        client_name: p.customers?.name,
        project_name: p.marketing_projects?.name
      }));

      setFacebookPages(mappedPages);
    } catch (error: any) {
      toast.error('فشل تحميل صفحات فيسبوك: ' + error.message);
    }
  };

  useEffect(() => {
    loadFacebookAccounts();
    loadFacebookPages();
  }, [restaurantId]);

  const handleConnectFacebook = async () => {
    // This would typically redirect to Facebook OAuth
    // For now, we'll simulate the connection
    toast.info('سيتم توجيهك إلى فيسبوك للمصادقة...');
    // In production: window.location.href = facebookOAuthUrl;
  };

  const handleSavePage = async () => {
    if (!pageForm.page_id || !pageForm.page_name) {
      toast.error('أدخل معرف الصفحة واسمها');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        restaurant_id: restaurantId,
        facebook_account_id: selectedAccount?.id || null,
        page_id: pageForm.page_id,
        page_name: pageForm.page_name,
        page_category: pageForm.page_category || null,
        page_url: pageForm.page_url || null,
        ad_account_id: pageForm.ad_account_id || null,
        ad_account_name: pageForm.ad_account_name || null,
        client_id: pageForm.client_id || null,
        project_id: pageForm.project_id || null,
        created_by: user?.id
      };

      const { error } = await supabase.from('marketing_facebook_pages').insert(payload);
      if (error) throw error;

      toast.success('تم إضافة الصفحة بنجاح');
      setShowPageForm(false);
      resetPageForm();
      loadFacebookPages();
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('هل أنت متأكد من فصل حساب فيسبوك؟')) return;

    try {
      const { error } = await supabase
        .from('marketing_facebook_accounts')
        .update({ is_connected: false, is_active: false })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('تم فصل الحساب بنجاح');
      loadFacebookAccounts();
    } catch (error: any) {
      toast.error('فشل الفصل: ' + error.message);
    }
  };

  const resetPageForm = () => {
    setPageForm({
      page_id: '',
      page_name: '',
      page_category: '',
      page_url: '',
      ad_account_id: '',
      ad_account_name: '',
      client_id: '',
      project_id: '',
    });
  };

  const stats = {
    totalAccounts: facebookAccounts.length,
    connectedAccounts: facebookAccounts.filter(a => a.is_connected).length,
    totalPages: facebookPages.length,
    activePages: facebookPages.filter(p => p.is_active).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Facebook className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ربط فيسبوك</h1>
            <p className="text-muted-foreground">إدارة حسابات وصفحات فيسبوك المتعددة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleConnectFacebook}>
            <Link className="w-4 h-4 ml-2" />
            ربط حساب جديد
          </Button>
          <Button onClick={() => setShowPageForm(true)} className="gradient-bg">
            <Plus className="w-4 h-4 ml-2" />
            إضافة صفحة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <Facebook className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">حسابات فيسبوك</p>
              <p className="text-xl font-bold">{stats.totalAccounts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">متصلة</p>
              <p className="text-xl font-bold">{stats.connectedAccounts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الصفحات</p>
              <p className="text-xl font-bold">{stats.totalPages}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">نشطة</p>
              <p className="text-xl font-bold">{stats.activePages}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Facebook Accounts */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">حسابات فيسبوك للأعمال</h3>
        <div className="space-y-2">
          {facebookAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${account.is_connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {account.is_connected ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold">{account.account_name || 'حساب بدون اسم'}</p>
                  <p className="text-xs text-muted-foreground">{account.business_id || 'بدون Business ID'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={account.is_connected ? 'default' : 'secondary'}>
                  {account.is_connected ? 'متصل' : 'غير متصل'}
                </Badge>
                {account.is_connected && (
                  <Button size="icon" variant="ghost" onClick={() => handleDisconnectAccount(account.id)}>
                    <Unlink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {facebookAccounts.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد حسابات فيسبوك مربوطة
            </div>
          )}
        </div>
      </Card>

      {/* Facebook Pages */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">الصفحات المربوطة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facebookPages.map((page) => (
            <Card key={page.id} className="p-4 bg-white/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${page.is_active ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">{page.page_name}</p>
                    <p className="text-xs text-muted-foreground">{page.page_id}</p>
                  </div>
                </div>
                <Badge variant={page.is_active ? 'default' : 'secondary'}>
                  {page.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                {page.page_category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفئة:</span>
                    <span className="font-medium">{page.page_category}</span>
                  </div>
                )}
                {page.ad_account_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">حساب الإعلان:</span>
                    <span className="font-medium">{page.ad_account_name}</span>
                  </div>
                )}
                {page.client_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العميل:</span>
                    <span className="font-medium">{page.client_name}</span>
                  </div>
                )}
                {page.project_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المشروع:</span>
                    <span className="font-medium">{page.project_name}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                {page.page_url && (
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={page.page_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4 ml-1" />
                      عرض
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {facebookPages.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              لا توجد صفحات مربوطة
            </div>
          )}
        </div>
      </Card>

      {/* Page Form Modal */}
      <Dialog open={showPageForm} onOpenChange={setShowPageForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة صفحة فيسبوك</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>معرف الصفحة *</Label>
                <Input
                  value={pageForm.page_id}
                  onChange={(e) => setPageForm({ ...pageForm, page_id: e.target.value })}
                  placeholder="معرف الصفحة من فيسبوك"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم الصفحة *</Label>
                <Input
                  value={pageForm.page_name}
                  onChange={(e) => setPageForm({ ...pageForm, page_name: e.target.value })}
                  placeholder="اسم الصفحة"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Input
                  value={pageForm.page_category}
                  onChange={(e) => setPageForm({ ...pageForm, page_category: e.target.value })}
                  placeholder="فئة الصفحة"
                />
              </div>
              <div className="space-y-2">
                <Label>رابط الصفحة</Label>
                <Input
                  value={pageForm.page_url}
                  onChange={(e) => setPageForm({ ...pageForm, page_url: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>معرف حساب الإعلان</Label>
                <Input
                  value={pageForm.ad_account_id}
                  onChange={(e) => setPageForm({ ...pageForm, ad_account_id: e.target.value })}
                  placeholder="معرف حساب الإعلان"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم حساب الإعلان</Label>
                <Input
                  value={pageForm.ad_account_name}
                  onChange={(e) => setPageForm({ ...pageForm, ad_account_name: e.target.value })}
                  placeholder="اسم حساب الإعلان"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Input
                  value={pageForm.client_id}
                  onChange={(e) => setPageForm({ ...pageForm, client_id: e.target.value })}
                  placeholder="معرف العميل"
                />
              </div>
              <div className="space-y-2">
                <Label>المشروع</Label>
                <Input
                  value={pageForm.project_id}
                  onChange={(e) => setPageForm({ ...pageForm, project_id: e.target.value })}
                  placeholder="معرف المشروع"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPageForm(false)}>إلغاء</Button>
              <Button onClick={handleSavePage} disabled={loading} className="flex-1">
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
