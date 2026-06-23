import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, Loader2, UserPlus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EXAMPLES = [
  'ضيف أحمد محمد كاشير، إيميله ahmed@shop.com، باسوورده Ahmed@2026، يقدر يفتح نقطة البيع ويعمل خصومات.',
  'أنشئ حساب محاسب اسمه سارة علي، sara@shop.com، باسوورده Sara@2026، صلاحياتها على المالية والتقارير فقط.',
  'موظف مخزن: omar@shop.com / Omar@2026 اسمه عمر، يقدر يعدل المخزون ويستلم بضاعة.',
];

export function AIPermissionsAssistant({ companyId, onCreated }: { companyId: string; onCreated?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    if (!prompt.trim()) return toast.error('اكتب وصف الموظف المطلوب إضافته');
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { restaurant_id: companyId, prompt },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data);
      toast.success('تم إنشاء الموظف وتعيين الصلاحيات بنجاح ✨');
      setPrompt('');
      onCreated?.();
    } catch (e: any) {
      toast.error('فشل الإنشاء: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 p-6 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-black flex items-center gap-2">
              مساعد الصلاحيات الذكي
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-xs text-muted-foreground">اكتب بلغة طبيعية: من تريد إضافته، إيميله، باسورده وصلاحياته</p>
          </div>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: ضيف أحمد محمد كاشير، إيميله ahmed@shop.com، باسوورده Ahmed@2026، يقدر يفتح نقطة البيع ويعمل خصومات"
          className="min-h-[100px] rounded-2xl text-sm bg-background/60 border-primary/10 focus-visible:ring-primary/40"
          disabled={loading}
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setPrompt(ex)} disabled={loading}
              className="text-[11px] px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary border border-border/40 transition-colors">
              مثال {i + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            يستخدم نموذج ذكاء اصطناعي لاستخراج البيانات تلقائياً وإنشاء الحساب فوراً.
          </p>
          <Button onClick={submit} disabled={loading} className="rounded-xl gradient-bg text-primary-foreground gap-2 shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'جاري الإنشاء...' : 'إنشاء الموظف'}
          </Button>
        </div>

        {result?.user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 p-4 rounded-2xl bg-success/10 border border-success/30 text-sm">
            <div className="flex items-center gap-2 font-bold text-success mb-2">
              <UserPlus className="w-4 h-4" /> تم إنشاء الموظف
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">الاسم:</span> {result.user.full_name}</div>
              <div><span className="text-muted-foreground">الإيميل:</span> {result.user.email}</div>
              <div><span className="text-muted-foreground">الدور:</span> {result.user.role}</div>
              <div><span className="text-muted-foreground">الصلاحيات:</span> {result.user.permissions?.length || 0}</div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
