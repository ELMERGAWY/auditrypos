import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, CheckCircle2, XCircle } from 'lucide-react';

type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'posted';

type AiSuggestionRow = {
  id: string;
  status: SuggestionStatus;
  title: string | null;
  description: string | null;
  suggestion: any;
  created_at: string;
};

interface Props {
  restaurantId: string;
  currency: string;
}

export function AccountingAssistant({ restaurantId, currency }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestionRow[]>([]);

  const canSend = useMemo(() => prompt.trim().length >= 3 && !loading, [prompt, loading]);

  const loadSuggestions = async () => {
    const { data, error } = await supabase
      .from('ai_journal_suggestions')
      .select('id,status,title,description,suggestion,created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setSuggestions((data || []) as any);
  };

  useEffect(() => {
    loadSuggestions();
  }, [restaurantId]);

  const send = async () => {
    if (!canSend) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('accounting-ai', {
        body: { restaurant_id: restaurantId, message: prompt },
      });
      if (error) throw error;

      if (data?.suggestion_id) {
        toast.success('تم إنشاء اقتراح قيد للمراجعة');
        setPrompt('');
        await loadSuggestions();
      } else {
        toast.success('تم استلام الرد');
      }
    } catch (e: any) {
      toast.error(e?.message || 'فشل إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: SuggestionStatus) => {
    const { error } = await supabase
      .from('ai_journal_suggestions')
      .update({ status })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);
    if (error) {
      toast.error('تعذر تحديث الحالة');
      return;
    }
    await loadSuggestions();
  };

  const badgeVariant = (status: SuggestionStatus) => {
    if (status === 'approved' || status === 'posted') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'outline';
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">مساعد المحاسب (Gemini)</h2>
            <p className="text-sm text-muted-foreground">
              اكتب وصف العملية، وسيقترح النظام قيدًا متوازنًا للمراجعة والموافقة.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: اشترينا خامات من المورد أحمد بـ 10000 + VAT ودفعنا كاش..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
          />
          <Button onClick={send} disabled={!canSend} className="gap-2 gradient-bg border-0 text-white">
            <Send className="w-4 h-4" />
            إرسال
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">لا توجد اقتراحات بعد.</div>
        ) : (
          suggestions.map((s) => (
            <Card key={s.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">{s.title || 'اقتراح قيد'}</span>
                    <Badge variant={badgeVariant(s.status)}>{s.status}</Badge>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {s.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setStatus(s.id, 'approved')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => setStatus(s.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <pre className="bg-secondary/30 rounded-lg p-3 text-xs overflow-auto" dir="ltr">
                {JSON.stringify(s.suggestion, null, 2)}
              </pre>

              <p className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString('ar-EG')} — {currency}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default AccountingAssistant;

