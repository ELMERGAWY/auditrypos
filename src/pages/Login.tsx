import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRestaurants, setCurrentRestaurantId } from '@/lib/store';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const restaurant = getRestaurants().find(r => r.email === email);
    if (!restaurant) {
      toast.error('لم يتم العثور على حساب بهذا البريد');
      return;
    }
    setCurrentRestaurantId(restaurant.id);
    toast.success(`مرحباً ${restaurant.ownerName}!`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted-foreground mt-1">ادخل بريدك الإلكتروني للمتابعة</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <Button type="submit" className="w-full gradient-bg text-primary-foreground border-0">دخول</Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>للتجربة: <button onClick={() => { setEmail('demo@smartresto.com'); }} className="text-primary hover:underline">استخدم الحساب التجريبي</button></p>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          ليس لديك حساب?{' '}
          <button onClick={() => navigate('/register')} className="text-primary hover:underline">سجّل الآن</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
