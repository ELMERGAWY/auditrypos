// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Shield, ArrowRight, User, Building2, KeyRound, Briefcase,
  Link2, Lock, Eye, EyeOff, ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { persistActor } from '@/lib/actor';
import { toast } from 'sonner';

const PENDING_KEY = 'auditry_staff_pending';

type PendingPayload = {
  mode: 'login' | 'register';
  email: string;
  staffName: string;
  companyCode: string;
  companyHint: string;
  requestedRole: string;
};

function savePending(p: PendingPayload) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch {}
}
function loadPending(): PendingPayload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearPending() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch {}
}

/**
 * Staff auth — two paths:
 * 1) Email + password (works without Supabase email template access — recommended)
 * 2) Email OTP / magic link (optional, needs Supabase template or link click)
 */
export default function StaffLogin() {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'password' | 'email'>('password');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [staffName, setStaffName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyHint, setCompanyHint] = useState('');
  const [requestedRole, setRequestedRole] = useState('cashier');
  const [loading, setLoading] = useState(false);
  const finishing = useRef(false);

  const finishAfterAuth = useCallback(async (user: any, forceRegister?: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    setLoading(true);

    const pending = loadPending();
    const useMode = forceRegister ? 'register' : (pending?.mode || mode);
    const displayName =
      (pending?.staffName || staffName).trim() ||
      user?.user_metadata?.full_name ||
      user?.email ||
      email.trim();
    const role = pending?.requestedRole || requestedRole;
    const join = (pending?.companyCode || companyCode).trim() || null;
    const hint = (pending?.companyHint || companyHint).trim() || null;
    const mail = (pending?.email || email || user?.email || '').trim();

    try {
      if (useMode === 'register') {
        const { data: reqId, error: reqErr } = await supabase.rpc('submit_staff_access_request', {
          p_full_name: displayName,
          p_requested_role: role,
          p_join_code: join,
          p_company_hint: hint,
        });
        if (reqErr) {
          toast.error('تم الدخول لكن فشل إرسال طلب الانضمام: ' + reqErr.message);
          return;
        }
        persistActor(displayName, mail);
        clearPending();
        if (reqId === null) {
          toast.success(`أهلاً ${displayName} — حسابك مفعّل مسبقاً`);
          navigate('/dashboard');
          return;
        }
        toast.success('تم إرسال طلب الانضمام. بانتظار موافقة أدمن الشركة (مرة واحدة فقط).');
        await supabase.auth.signOut();
        setMode('login');
        setStep('email');
        setOtp('');
        return;
      }

      const { data: access, error: accessErr } = await supabase.rpc('get_my_staff_access');
      if (accessErr) {
        toast.error(accessErr.message);
        return;
      }
      const row = Array.isArray(access) ? access[0] : access;
      const name = row?.full_name || displayName;
      persistActor(name, mail);
      clearPending();

      if (row?.has_access) {
        toast.success(`أهلاً ${name}`);
        navigate('/dashboard');
        return;
      }
      if (row?.pending_request) {
        toast.info('حسابك بانتظار موافقة الأدمن — سجّل الدخول مجدداً بعد التفعيل.');
        await supabase.auth.signOut();
        return;
      }
      toast.info('لا توجد عضوية نشطة. أكمل طلب الانضمام من تسجيل موظف جديد.');
      setMode('register');
      setStaffName(name);
      if (mail) setEmail(mail);
    } finally {
      setLoading(false);
      finishing.current = false;
    }
  }, [mode, staffName, email, requestedRole, companyCode, companyHint, navigate]);

  // Magic link return (optional path)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (session?.user && loadPending()) {
        toast.success('تم التحقق من الرابط');
        await finishAfterAuth(session.user);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.user && loadPending()) {
        finishAfterAuth(session.user);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [finishAfterAuth]);

  const registerFields = () => {
    if (mode !== 'register') return null;
    return (
      <>
        <div>
          <label className="text-xs font-bold flex items-center gap-1 mb-1"><User className="w-3 h-3" /> الاسم الكامل</label>
          <Input placeholder="مثلاً: محمد أحمد" value={staffName} onChange={e => setStaffName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-bold flex items-center gap-1 mb-1"><Briefcase className="w-3 h-3" /> الدور المطلوب</label>
          <Select value={requestedRole} onValueChange={setRequestedRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cashier">كاشير</SelectItem>
              <SelectItem value="accountant">محاسب</SelectItem>
              <SelectItem value="manager">إداري / مدير</SelectItem>
              <SelectItem value="admin">أدمن الشركة</SelectItem>
              <SelectItem value="viewer">مشاهدة فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-bold flex items-center gap-1 mb-1"><KeyRound className="w-3 h-3" /> كود انضمام الشركة</label>
          <Input dir="ltr" placeholder="ABCD1234" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} />
          <p className="text-[10px] text-muted-foreground mt-1">اطلب الكود من أدمن شركتك (تاب الموظفين ← موافقات الدخول).</p>
        </div>
        <div>
          <label className="text-xs font-bold flex items-center gap-1 mb-1"><Building2 className="w-3 h-3" /> اسم الشركة (اختياري)</label>
          <Input placeholder="للتسهيل على السوبر أدمن" value={companyHint} onChange={e => setCompanyHint(e.target.value)} />
        </div>
      </>
    );
  };

  const handlePasswordAuth = async () => {
    if (!email.trim()) return toast.error('اكتب البريد الإلكتروني');
    if (!password.trim() || password.length < 6) return toast.error('كلمة المرور 6 أحرف على الأقل');
    if (mode === 'register' && !staffName.trim()) return toast.error('اكتب اسمك الكامل');

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/staff-login`,
            data: {
              full_name: staffName.trim(),
              role: 'staff',
              pending_approval: true,
            },
          },
        });
        if (error) throw error;

        if (data.session?.user) {
          await finishAfterAuth(data.session.user, true);
          return;
        }
        // Email confirm may be required — try sign in
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });
        if (signInErr) {
          toast.success('تم إنشاء الحساب. إن طُلب تأكيد الإيميل، افتح الرابط ثم سجّل الدخول.');
          setMode('login');
          return;
        }
        if (signInData.user) await finishAfterAuth(signInData.user, true);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (error) throw error;
      if (data.user) await finishAfterAuth(data.user, false);
    } catch (e: any) {
      toast.error(e.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailLink = async () => {
    if (!email.trim()) return toast.error('اكتب البريد الإلكتروني');
    if (mode === 'register' && !staffName.trim()) return toast.error('اكتب اسمك الكامل');

    savePending({
      mode,
      email: email.trim().toLowerCase(),
      staffName: staffName.trim(),
      companyCode: companyCode.trim(),
      companyHint: companyHint.trim(),
      requestedRole,
    });

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/staff-login`,
        data: {
          full_name: staffName.trim() || undefined,
          role: 'staff',
          pending_approval: true,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'فشل إرسال رسالة التحقق');
      return;
    }
    toast.success('تم إرسال رسالة التحقق — افتح الرابط أو أدخل الرمز إن وُجد');
    setStep('otp');
  };

  const verifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      return toast.error('أدخل الرمز أو افتح رابط الإيميل');
    }
    setLoading(true);
    savePending({
      mode,
      email: email.trim().toLowerCase(),
      staffName: staffName.trim(),
      companyCode: companyCode.trim(),
      companyHint: companyHint.trim(),
      requestedRole,
    });

    let user = null;
    let lastErr = null;
    for (const type of ['email', 'magiclink'] as const) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type,
      });
      if (!error && data?.user) {
        user = data.user;
        break;
      }
      lastErr = error;
    }
    if (!user) {
      setLoading(false);
      toast.error(lastErr?.message || 'رمز غير صحيح — جرّب فتح رابط الإيميل');
      return;
    }
    await finishAfterAuth(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl gradient-bg mx-auto flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black">
              {mode === 'login' ? 'دخول الموظف' : 'تسجيل موظف جديد'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {authMethod === 'password'
                ? 'الطريقة الموصى بها: بريد + كلمة مرور (بدون إعدادات Supabase)'
                : 'تحقق عبر الإيميل — رمز أو رابط'}
            </p>
          </div>

          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
            <Button
              type="button"
              size="sm"
              variant={authMethod === 'password' ? 'default' : 'ghost'}
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => { setAuthMethod('password'); setStep('email'); }}
            >
              <Lock className="w-3 h-3" /> بريد وكلمة مرور
            </Button>
            <Button
              type="button"
              size="sm"
              variant={authMethod === 'email' ? 'default' : 'ghost'}
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => setAuthMethod('email')}
            >
              <Mail className="w-3 h-3" /> رابط / رمز إيميل
            </Button>
          </div>

          {authMethod === 'password' ? (
            <div className="space-y-3">
              {registerFields()}
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</label>
                <Input type="email" dir="ltr" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Lock className="w-3 h-3" /> كلمة المرور</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    placeholder="••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordAuth()}
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handlePasswordAuth} disabled={loading}>
                {loading ? 'جاري...' : mode === 'login'
                  ? <>دخول <ArrowRight className="w-4 h-4" /></>
                  : <>إنشاء الحساب <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          ) : step === 'email' ? (
            <div className="space-y-3">
              {registerFields()}
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</label>
                <Input type="email" dir="ltr" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button className="w-full gap-2" onClick={sendEmailLink} disabled={loading}>
                {loading ? 'جاري الإرسال...' : <>إرسال رسالة التحقق <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                إن وصلك رابط Lovable فقط — افتحه من نفس المتصفح. أو استخدم تبويب «بريد وكلمة مرور».
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> تحقق من بريدك</p>
                <p>• افتح <strong>رابط الإيميل</strong> في نفس المتصفح، أو</p>
                <p>• أدخل <strong>رمز 6 أرقام</strong> إن ظهر في الرسالة</p>
              </div>
              <Input
                dir="ltr"
                className="text-center text-2xl tracking-[0.4em] font-mono h-14"
                maxLength={8}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <Button className="w-full gap-2" onClick={verifyOtp} disabled={loading || otp.length < 6}>
                {loading ? 'جاري التحقق...' : <>تأكيد <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => { setStep('email'); setOtp(''); }}>
                إعادة الإرسال
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStep('email'); setOtp(''); }}
          >
            {mode === 'login' ? 'موظف جديد؟ سجّل واطلب الانضمام' : 'لديك حساب؟ تسجيل الدخول'}
          </Button>

          <div className="border-t pt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="w-4 h-4" />
              رجوع لدخول صاحب النشاط / الأدمن
            </Button>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              بعد التسجيل الأول، يوافق أدمن الشركة من تاب الموظفين ← موافقات الدخول.
              اسمك يظهر على الطلبات والفواتير والسندات.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
