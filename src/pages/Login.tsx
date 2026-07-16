import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/global/LanguageSwitcher';
import { getLanguageDir } from '@/lib/i18n';

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = safeNext(params.get('next'));
  const { signIn, user } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = getLanguageDir(i18n.language);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(nextPath ?? '/dashboard');
    }
  }, [user, navigate, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('loginPage.fillCredentials'));
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('loginPage.welcome'));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir={dir}>
      <div className="glass-card p-8 w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher variant="outline" />
        </div>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">{t('loginPage.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('loginPage.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('loginPage.email')}</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <Label>{t('loginPage.password')}</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full gradient-bg text-primary-foreground border-0" disabled={loading}>
            {loading ? t('loginPage.submitting') : t('loginPage.submit')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('loginPage.noAccount')}{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline">{t('loginPage.registerNow')}</button>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {t('loginPage.staffLogin')}{' '}
          <button onClick={() => navigate('/staff-login')} className="text-primary hover:underline">{t('loginPage.staffLoginLink')}</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
