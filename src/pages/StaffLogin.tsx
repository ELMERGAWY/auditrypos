// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowRight, User, Building2, KeyRound, Briefcase, Link2 } from 'lucide-react';
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
 * Staff auth: Email OTP when template shows {{ .Token }},
 * or Magic Link click (Lovable default) — both supported.
 */
export default function StaffLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [staffName, setStaffName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyHint, setCompanyHint] = useState('');
  const [requestedRole, setRequestedRole] = useState('cashier');
  const [loading, setLoading] = useState(false);
  const finishing = useRef(false);

  const finishAfterAuth = useCallback(async (user: any) => {
    if (finishing.current) return;
    finishing.current = true;
    setLoading(true);

    const pending = loadPending();
    const useMode = pending?.mode || mode;
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
        setStep('email');
        setMode('login');
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
      toast.info('لا توجد عضوية نشطة. أكمل طلب الانضمام.');
      setMode('register');
      setStep('email');
      setStaffName(name);
      if (mail) setEmail(mail);
    } finally {
      setLoading(false);
      finishing.current = false;
    }
  }, [mode, staffName, email, requestedRole, companyCode, companyHint, navigate]);

  // Magic link / recovery: session restored after clicking Lovable email link
  useEffect(() => {
    let alive = true;
    (async () => {
      // Parse hash tokens if present (supabase-js usually does this automatically)
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

  const sendOtp = async () => {
    if (!email.trim()) return toast.error('اكتب البريد الإلكتروني');
    if (mode === 'register' && !staffName.trim()) return toast.error('اكتب اسمك الكامل');

    const pending: PendingPayload = {
      mode,
      email: email.trim().toLowerCase(),
      staffName: staffName.trim(),
      companyCode: companyCode.trim(),
      companyHint: companyHint.trim(),
      requestedRole,
    };
    savePending(pending);

    setLoading(true);
    const redirectTo = `${window.location.origin}/staff-login`;
    const { error } = await supabase.auth.signInWithOtp({
      email: pending.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data: {
          full_name: pending.staffName || undefined,
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
    toast.success('تم إرسال رسالة التحقق إلى بريدك');
    setStep('otp');
  };

  const verifyAndContinue = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      return toast.error('أدخل الرمز إن ظهر في الإيميل، أو افتح رابط التحقق من الرسالة');
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

    // Try email OTP token first, then magiclink token type
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
      toast.error(lastErr?.message || 'رمز غير صحيح — جرّب فتح رابط الإيميل مباشرة');
      return;
    }
    await finishAfterAuth(user);
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
              {mode === 'login' ? 'دخول الموظف' : 'تسجيل موظف جديد'}
            </h1>
            <p className="text-xs text-muted-foreground">
              تحقق عبر الإيميل مجاناً — رمز رقمي أو رابط دخول
            </p>
          </div>

          {step === 'email' ? (
            <div className="space-y-3">
              {mode === 'register' && (
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
                    <Input placeholder="للتسهيل على السوبر أدمن إن لم يتوفر الكود" value={companyHint} onChange={e => setCompanyHint(e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-bold flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</label>
                <Input type="email" dir="ltr" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button className="w-full gap-2" onClick={sendOtp} disabled={loading}>
                {loading ? 'جاري الإرسال...' : <>إرسال رسالة التحقق <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-900 dark:text-amber-100 space-y-1.5">
                <p className="font-bold flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> تحقق من بريدك</p>
                <p>1) إن وُجد <strong>رمز من 6 أرقام</strong> — أدخله بالأسفل.</p>
                <p>2) إن وصل <strong>رابط دخول (Lovable)</strong> — افتحه في نفس المتصفح، وسيكتمل التسجيل تلقائياً.</p>
              </div>
              <p className="text-xs text-muted-foreground text-center" dir="ltr">{email}</p>
              <Input
                dir="ltr"
                className="text-center text-2xl tracking-[0.4em] font-mono h-14"
                maxLength={8}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <Button className="w-full gap-2" onClick={verifyAndContinue} disabled={loading || otp.length < 6}>
                {loading ? 'جاري التحقق...' : <>تأكيد بالرمز <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => { setStep('email'); setOtp(''); }}>
                تغيير البريد / إعادة الإرسال
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStep('email'); setOtp(''); }}
          >
            {mode === 'login' ? 'موظف جديد؟ سجّل واطلب الانضمام' : 'لديك حساب مفعّل؟ دخول'}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            اسمك يظهر على الطلبات والفواتير والسندات بعد موافقة الأدمن.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
