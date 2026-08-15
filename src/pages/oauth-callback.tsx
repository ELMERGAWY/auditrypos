import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const providerError = params.get('error');
      if (providerError || !code || !state) {
        if (!cancelled) {
          setStatus('error');
          setMessage(providerError ? 'تم رفض المصادقة من المنصة.' : 'سياق المصادقة غير مكتمل.');
        }
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('social-oauth', {
          body: {
            action: 'exchange',
            redirectUri: `${window.location.origin}/oauth/callback`,
            code,
            state,
          },
        });

        if (error || !data?.success) {
          throw new Error('OAuth broker exchange failed');
        }

        if (cancelled) return;
        setStatus('success');
        const assetsDiscovered = Boolean(data.requiresAssetSelection);
        setMessage(assetsDiscovered
          ? 'تم اكتشاف أصول Meta. اختر الصفحات والحسابات التي تريد إدارتها من مركز التسويق.'
          : `تم ربط حساب ${data.platform || 'التواصل الاجتماعي'} بنجاح.`);
        window.setTimeout(() => {
          if (!cancelled) {
            navigate('/dashboard', {
              state: {
                oauthSuccess: !assetsDiscovered,
                oauthAssetsDiscovered: assetsDiscovered,
                platform: data.platform,
                assets: assetsDiscovered ? data.assets : undefined,
                accountName: data.account?.account_name,
              },
            });
          }
        }, assetsDiscovered ? 1600 : 1200);
      } catch (error) {
        console.error('OAuth callback failed:', error);
        if (!cancelled) {
          setStatus('error');
          setMessage('تعذر إكمال المصادقة. راجع إعدادات الربط أو أعد المحاولة.');
        }
      }
    };

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full p-6 space-y-4" dir="rtl">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">جاري إكمال المصادقة بأمان...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-green-600">نجاح الربط</h3>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">جاري العودة إلى مركز التسويق...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-red-600">فشل الربط</h3>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              العودة إلى لوحة التحكم
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
