import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Phone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDarkMode } from '@/lib/useDarkMode';

export default function DriverLogin() {
  useDarkMode();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) { toast.error('أدخل رقم الموبايل'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('driver-api', {
        body: { action: 'login', phone: phone.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'خطأ في تسجيل الدخول');
        setLoading(false);
        return;
      }
      localStorage.setItem('driver_session', JSON.stringify(data.agent));
      toast.success(`مرحباً ${data.agent.name}!`);
      navigate('/driver');
    } catch {
      toast.error('خطأ في الاتصال');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">دخول المندوب</h1>
          <p className="text-muted-foreground text-sm mt-1">سجّل دخولك برقم موبايلك المسجل عند المطعم</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="relative">
            <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="pr-10 text-center text-lg tracking-wider font-mono"
              type="tel"
              dir="ltr"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <Button onClick={handleLogin} disabled={loading} className="w-full gradient-bg text-primary-foreground border-0 h-12">
            {loading ? 'جاري الدخول...' : <><ArrowRight className="w-4 h-4 ml-2" /> دخول</>}
          </Button>
        </div>

        <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/')}>
          العودة للرئيسية
        </Button>
      </motion.div>
    </div>
  );
}
