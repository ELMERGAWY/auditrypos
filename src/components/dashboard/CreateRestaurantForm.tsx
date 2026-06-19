import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, ArrowRight, Sparkles, Building2 } from 'lucide-react';

interface Props {
  userId: string;
  onCreated: () => void;
}

export function CreateRestaurantForm({ userId, onCreated }: Props) {
  const [name, setName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('restaurant');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Check localStorage for pending business from registration
  useEffect(() => {
    const pending = localStorage.getItem('pending_business');
    if (pending) {
      try {
        const { name: bName, type } = JSON.parse(pending);
        if (bName) setName(bName);
        if (type) setBizType(type as BusinessType);
        localStorage.removeItem('pending_business');
      } catch {}
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('يرجى إدخال اسم النشاط'); return; }
    setLoading(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      const { error } = await supabase.from('restaurants').insert({
        owner_id: userId,
        name,
        status: 'active',
        subscription_end: trialEnd.toISOString(),
        business_type: bizType,
        business_type_locked: true, // Lock business type after creation
      });
      
      if (error) {
        toast.error('حدث خطأ أثناء الإنشاء: ' + error.message);
        console.error('Create restaurant error:', error);
        return;
      }
      
      onCreated();
    } catch (err: any) {
      toast.error('خطأ غير متوقع: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedBT = BUSINESS_TYPES[bizType];
  const bizEntries = Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg text-white shadow-xl shadow-primary/20 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black mb-2">مرحباً بك في Auditry ERP</h1>
          <p className="text-muted-foreground text-sm">لنقم بإعداد حساب نشاطك التجاري خطوة بخطوة</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'gradient-bg text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground'}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-bold ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'اختر الموديول' : 'بيانات النشاط'}
              </span>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-black mb-1">اختر موديول نشاطك التجاري</h2>
                  <p className="text-xs text-muted-foreground">
                    هذا الاختيار يحدد التبويبات، القوائم، والتقارير المناسبة لنشاطك. <strong className="text-primary">لا يمكن تغييره لاحقاً إلا بمساعدة فريق الدعم.</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                  {bizEntries.map(([key, bt]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBizType(key)}
                      className={`relative p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 group hover:scale-105 active:scale-95 ${
                        bizType === key
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                          : 'border-border hover:border-primary/40 bg-card/50'
                      }`}
                    >
                      {bizType === key && (
                        <div className="absolute top-2 left-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="text-3xl group-hover:scale-110 transition-transform">{bt.icon}</span>
                      <span className={`font-bold text-[11px] leading-tight ${bizType === key ? 'text-primary' : ''}`}>{bt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Preview of selected */}
                {selectedBT && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3 mb-4">
                    <span className="text-3xl">{selectedBT.icon}</span>
                    <div>
                      <p className="font-black text-sm text-primary">{selectedBT.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(selectedBT as any).tabs?.length || 0} تبويب متاح لهذا الموديول
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-12 gradient-bg text-primary-foreground border-0 font-bold text-base gap-2 shadow-lg shadow-primary/20"
                >
                  التالي: بيانات النشاط
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    بيانات النشاط التجاري
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    الموديول المختار: <strong className="text-primary">{selectedBT?.icon} {selectedBT?.label}</strong>
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-bold block mb-2">اسم النشاط التجاري *</label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="مثال: مطعم الأمل، شركة الإنشاءات..."
                      className="h-12 text-base"
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">ملخص الإعداد:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الموديول</span>
                      <span className="font-bold">{selectedBT?.icon} {selectedBT?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">فترة التجربة</span>
                      <span className="font-bold text-emerald-500">14 يوم مجاناً</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">اسم النشاط</span>
                      <span className="font-bold">{name || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 gap-2"
                  >
                    <ArrowRight className="w-5 h-5" />
                    رجوع
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={loading || !name.trim()}
                    className="flex-1 h-12 gradient-bg text-primary-foreground border-0 font-bold text-base shadow-lg shadow-primary/20"
                  >
                    {loading ? 'جاري الإنشاء...' : '🚀 إنشاء الحساب'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
