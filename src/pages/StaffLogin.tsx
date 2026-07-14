// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowRight, User, Building2, KeyRound, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { persistActor } from '@/lib/actor';
import { toast } from 'sonner';

/**
 * Staff auth via Email OTP (free — no SMS).
 * First-time registration creates a pending access request;
 * company admin or super admin must approve once.
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

  const sendOtp = async () => {
    if (!email.trim()) return toast.error('اكتب البريد الإلكتروني');
    if (mode === 'register' && !staffName.trim()) return toast.error('اكتب اسمك الكامل');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          full_name: staffName.trim() || undefined,
          role: 'staff',
          pending_approval: true,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'فشل إرسال الرمز');
      return;
    }
    toast.success('تم إرسال رمز التحقق إلى بريدك');
    setStep('otp');
  };

  const verifyAndContinue = async () => {
    if (!otp.trim() || otp.trim().length < 6) return toast.error('أدخل رمز التحقق (6 أرقام)');
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    });
    if (error) {
      setLoading(false);
      toast.error(error.message || 'رمز غير صحيح');
      return;
    }

    const user = data.user;
    const displayName =
      staffName.trim() ||
      user?.user_metadata?.full_name ||
      email.trim();

    if (mode === 'register') {
      const { data: reqId, error: reqErr } = await supabase.rpc('submit_staff_access_request', {
        p_full_name: displayName,
        p_requested_role: requestedRole,
        p_join_code: companyCode.trim() || null,
        p_company_hint: companyHint.trim() || null,
      });
      if (reqErr) {
        setLoading(false);
        toast.error('تم الدخول لكن فشل إرسال طلب الانضمام: ' + reqErr.message);
        return;
      }
      persistActor(displayName, email.trim());
      setLoading(false);
      if (reqId === null) {
        toast.success(`أهلاً ${displayName} — حسابك مفعّل مسبقاً`);
        navigate('/dashboard');
        return;
      }
      toast.success('تم إرسال طلب الانضمام. بانتظار موافقة أدمن الشركة (مرة واحدة فقط).');
      setStep('email');
      setMode('login');
      setOtp('');
      return;
    }

    // Login mode — check access
    const { data: access, error: accessErr } = await supabase.rpc('get_my_staff_access');
    setLoading(false);
    if (accessErr) {
      toast.error(accessErr.message);
      return;
    }
    const row = Array.isArray(access) ? access[0] : access;
    const name = row?.full_name || displayName;
    persistActor(name, email.trim());

    if (row?.has_access) {
      toast.success(`أهلاً ${name}`);
      navigate('/dashboard');
      return;
    }
    if (row?.pending_request) {
      toast.info('حسابك بانتظار موافقة الأدمن — يمكنك الانتظار ثم الدخول مجدداً بعد التفعيل.');
      await supabase.auth.signOut();
      return;
    }
    // No request yet — create one lightly
    toast.info('لا توجد عضوية نشطة. سجّل طلب انضمام أولاً.');
    setMode('register');
    setStep('email');
    setStaffName(name);
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
              دخول مجاني برمز يُرسل إلى الإيميل (OTP) — بدون رسائل SMS
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
                    <p className="text-[10px] text-muted-foreground mt-1">اطلب الكود من أدمن شركتك (يظهر في تاب الموظفين).</p>
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
                {loading ? 'جاري الإرسال...' : <>إرسال رمز التحقق <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                أدخل الرمز المرسل إلى <span className="font-bold text-foreground" dir="ltr">{email}</span>
              </p>
              <Input
                dir="ltr"
                className="text-center text-2xl tracking-[0.4em] font-mono h-14"
                maxLength={8}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <Button className="w-full gap-2" onClick={verifyAndContinue} disabled={loading}>
                {loading ? 'جاري التحقق...' : <>تأكيد والدخول <ArrowRight className="w-4 h-4" /></>}
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
            اسمك يظهر على الطلبات والفواتير والسندات والأذون وأي تعديل تقوم به بعد موافقة الأدمن.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
