// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowRight, KeyRound, User, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Staff auth: email + password.
 * - Register: creates an account marked pending; admin must approve & assign to a company.
 * - Login: email + password; if not approved, shows a friendly wait screen.
 * Staff name is recorded locally so it appears next to every action they perform.
 */
export default function StaffLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);

  const persistActor = (name: string, mail: string) => {
    try {
      localStorage.setItem('active_staff_name', name.trim());
      localStorage.setItem('active_staff_email', mail.trim());
    } catch {}
  };

  const register = async () => {
    if (!email.trim() || !password.trim() || !staffName.trim()) {
      toast.error('اكتب الاسم والبريد وكلمة المرور');
      return;
    }
    if (password.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: staffName.trim(),
          role: 'staff',
          company_code: companyCode.trim() || null,
          pending_approval: true,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم إنشاء الحساب. بانتظار موافقة الأدمن.');
    setMode('login');
  };

  const login = async () => {
    if (!email.trim() || !password.trim()) { toast.error('اكتب البريد وكلمة المرور'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const meta: any = data.user?.user_metadata || {};
    const displayName = meta.full_name || staffName.trim() || email.trim();
    persistActor(displayName, email.trim());
    const approved = meta.pending_approval === false || meta.approved_company_id;
    if (!approved) {
      toast.info('حسابك لم يُفعّل بعد — بانتظار موافقة الأدمن.');
      return;
    }
    toast.success(`أهلاً ${displayName}`);
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
            <h1 className="text-2xl font-black">
              {mode === 'login' ? 'دخول الموظف' : 'تسجيل حساب موظف'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === 'login'
                ? 'ادخل ببريدك وكلمة المرور — يجب أن يوافق الأدمن على حسابك أولاً'
                : 'أنشئ حساباً، وسيقوم الأدمن بتفعيله وربطه بالشركة'}
            </p>
          </div>

          <div className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><User className="w-3 h-3" /> الاسم الكامل</label>
                <Input placeholder="مثلاً: محمد أحمد" value={staffName} onChange={e => setStaffName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-xs font-bold flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</label>
              <Input type="email" dir="ltr" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold flex items-center gap-1 mb-1"><KeyRound className="w-3 h-3" /> كلمة المرور</label>
              <Input type="password" dir="ltr" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> كود/اسم الشركة (اختياري)</label>
                <Input placeholder="اسم أو كود الشركة التي ستنضم إليها" value={companyCode} onChange={e => setCompanyCode(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">سيستخدمه الأدمن لربطك بالشركة الصحيحة.</p>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={mode === 'login' ? login : register}
              disabled={loading}
            >
              {loading
                ? 'جاري المعالجة...'
                : mode === 'login'
                  ? <>دخول <ArrowRight className="w-4 h-4" /></>
                  : <>إنشاء الحساب <ArrowRight className="w-4 h-4" /></>}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'ليس لديك حساب؟ سجّل الآن' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              اسمك سيظهر بجانب كل عملية تنشئها أو تعدّلها (فواتير، سندات، طلبات).
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
