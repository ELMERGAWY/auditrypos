import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', businessName: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.businessName || !selectedType) {
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
      // Store business info in localStorage temporarily for after email confirmation
      localStorage.setItem('pending_business', JSON.stringify({ name: form.businessName, type: selectedType }));
      toast.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <span className={`text-sm hidden sm:block ${step >= s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s === 1 ? 'نوع النشاط' : 'بيانات الحساب'}
              </span>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'gradient-bg' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Business Type */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl font-bold mb-2">اختر نوع نشاطك</h1>
                <p className="text-muted-foreground">SmartPOS يدعم كافة الأنشطة التجارية</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).map(([key, bt]) => (
                  <motion.button key={key} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedType(key)}
                    className={`glass-card p-4 text-center transition-all hover:border-primary/50 ${
                      selectedType === key ? 'border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30' : ''
                    }`}>
                    <span className="text-4xl block mb-2">{bt.icon}</span>
                    <p className="font-bold text-sm">{bt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{bt.description}</p>
                  </motion.button>
                ))}
              </div>
              {selectedType && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mt-4">
                  <p className="text-sm font-bold mb-2">مميزات {BUSINESS_TYPES[selectedType].label}:</p>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPES[selectedType].features.map(f => (
                      <span key={f} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary">{f}</span>
                    ))}
                  </div>
                </motion.div>
              )}
              <Button onClick={() => { if (!selectedType) { toast.error('اختر نوع النشاط'); return; } setStep(2); }}
                className="w-full mt-6 gradient-bg text-primary-foreground border-0 h-12" size="lg">
                التالي <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Account Info */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <div className="glass-card p-8 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <span className="text-4xl">{selectedType ? BUSINESS_TYPES[selectedType].icon : '🏢'}</span>
                  <h1 className="font-display text-2xl font-bold mt-2">إنشاء حساب جديد</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedType ? BUSINESS_TYPES[selectedType].label : ''} — أكمل بياناتك للبدء
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>اسم النشاط / المحل *</Label>
                    <Input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder={selectedType === 'restaurant' ? 'اسم المطعم' : selectedType === 'pharmacy' ? 'اسم الصيدلية' : 'اسم المحل'} />
                  </div>
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <span>بياناتك محمية ومشفرة بأعلى معايير الأمان</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowRight className="w-4 h-4 ml-1" /> رجوع
                    </Button>
                    <Button type="submit" className="flex-1 gradient-bg text-primary-foreground border-0" disabled={loading}>
                      {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                    </Button>
                  </div>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  لديك حساب بالفعل?{' '}
                  <button onClick={() => navigate('/login')} className="text-primary hover:underline">تسجيل الدخول</button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Register;
