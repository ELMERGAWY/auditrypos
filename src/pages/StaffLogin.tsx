// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowRight, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Staff email OTP login (free — no SMS provider required).
 * Uses Supabase magic OTP: sends 6-digit code to email, verifies it in-app.
 * SMS/phone OTP requires configuring an SMS provider (Twilio) at the project level.
 */
export default function StaffLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim() || !staffName.trim()) { toast.error('اكتب اسمك وبريدك'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, data: { full_name: staffName.trim() } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم إرسال كود التحقق إلى بريدك');
    setStep('code');
  };

  const verify = async () => {
    if (!code.trim()) { toast.error('اكتب كود التحقق'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    // Record actor for audit trail
    try {
      localStorage.setItem('active_staff_name', staffName.trim());
      localStorage.setItem('active_staff_email', email.trim());
    } catch {}
    toast.success(`أهلاً ${staffName}`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-8 w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl gradient-bg mx-auto flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black">تسجيل دخول الموظف</h1>
            <p className="text-xs text-muted-foreground">تحقق بكود يُرسل إلى بريدك الإلكتروني</p>
          </div>

          {step === 'email' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Shield className="w-3 h-3" /> اسمك الكامل</label>
                <Input placeholder="مثلاً: محمد أحمد" value={staffName} onChange={e => setStaffName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</label>
                <Input type="email" dir="ltr" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button className="w-full gap-2" onClick={sendCode} disabled={loading}>
                {loading ? 'جاري الإرسال...' : <>إرسال كود التحقق <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                اسمك سيظهر بجانب كل عملية تنشئها أو تعدّلها (فواتير، سندات، طلبات).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-center text-muted-foreground">تم إرسال كود إلى <span className="font-bold text-foreground" dir="ltr">{email}</span></div>
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><KeyRound className="w-3 h-3" /> كود التحقق (6 أرقام)</label>
                <Input dir="ltr" placeholder="000000" maxLength={6} className="text-center text-2xl tracking-widest font-mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <Button className="w-full gap-2" onClick={verify} disabled={loading || code.length < 6}>
                {loading ? 'جاري التحقق...' : 'دخول'}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setStep('email')}>تغيير البريد</Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
