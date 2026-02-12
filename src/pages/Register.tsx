import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (form.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground mt-1">سجّل مطعمك وابدأ في دقائق</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الاسم الكامل *</Label>
            <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="أحمد محمد" />
          </div>
          <div>
            <Label>البريد الإلكتروني *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <Label>كلمة المرور *</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل" />
          </div>
          <Button type="submit" className="w-full gradient-bg text-primary-foreground border-0" disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          لديك حساب بالفعل?{' '}
          <button onClick={() => navigate('/login')} className="text-primary hover:underline">تسجيل الدخول</button>
        </p>
      </div>
    </div>
  );
};

export default Register;
