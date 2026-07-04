import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

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
      toast.error('يرجى إدخال البريد وكلمة المرور');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('مرحباً بك!');
      // Navigation is handled by useEffect when user state updates
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted-foreground mt-1">ادخل بياناتك للمتابعة</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" />
          </div>
          <Button type="submit" className="w-full gradient-bg text-primary-foreground border-0" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          ليس لديك حساب?{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline">سجّل الآن</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
