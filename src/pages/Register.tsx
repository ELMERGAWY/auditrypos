import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addRestaurant, setCurrentRestaurantId, type Restaurant } from '@/lib/store';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', ownerName: '', email: '', phone: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ownerName || !form.email) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const id = `rest-${Date.now()}`;
    const restaurant: Restaurant = {
      id,
      ...form,
      status: 'pending',
      subscriptionEnd: '',
      createdAt: new Date().toISOString(),
      menuItems: [],
      categories: ['Main Course', 'Drinks', 'Desserts'],
      orders: [],
      paymentReceipts: [],
    };
    addRestaurant(restaurant);
    setCurrentRestaurantId(id);
    toast.success('تم تسجيل المطعم بنجاح!');
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">تسجيل مطعم جديد</h1>
          <p className="text-muted-foreground mt-1">أنشئ حسابك وابدأ في دقائق</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>اسم المطعم *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مطعم النجمة" />
          </div>
          <div>
            <Label>اسم المالك *</Label>
            <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="الاسم الكامل" />
          </div>
          <div>
            <Label>البريد الإلكتروني *</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
          </div>
          <Button type="submit" className="w-full gradient-bg text-primary-foreground border-0">تسجيل المطعم</Button>
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
