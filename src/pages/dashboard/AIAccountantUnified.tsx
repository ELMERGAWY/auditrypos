
// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Send, CheckCircle2, XCircle, Bot, 
  FileSearch, MessageCircle, Plus, Sparkles, 
  BrainCircuit, TrendingUp, ShieldCheck, ClipboardList, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";

type Standard = "EAS" | "IFRS" | "US_GAAP";

interface Props {
  restaurantId: string;
}

export default function AIAccountantUnified({ restaurantId }: Props) {
  const [standard, setStandard] = useState<Standard>("EAS");
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewReport, setReviewReport] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [waBots, setWaBots] = useState<any[]>([]);
  const [newBotUsername, setNewBotUsername] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [waInstanceId, setWaInstanceId] = useState("");
  const [waToken, setWaToken] = useState("");

  useEffect(() => {
    if (!restaurantId) return;
    loadAll();

    const ch1 = supabase.channel("ai_chat_" + restaurantId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_chat_messages", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe();

    const ch2 = supabase.channel("ai_sug_" + restaurantId)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_journal_suggestions", filter: `restaurant_id=eq.${restaurantId}` },
        () => loadSuggestions())
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [restaurantId]);

  async function loadAll() {
    await Promise.all([loadMessages(), loadSuggestions(), loadBots(), loadWaBots()]);
  }

  async function loadMessages() {
    const { data } = await supabase.from("ai_chat_messages").select("*")
      .eq("restaurant_id", restaurantId).order("created_at", { ascending: true }).limit(50);
    setMessages(data ?? []);
  }

  async function loadSuggestions() {
    const { data } = await supabase.from("ai_journal_suggestions").select("*")
      .eq("restaurant_id", restaurantId).eq("status", "pending")
      .order("created_at", { ascending: false });
    setSuggestions(data ?? []);
  }

  async function loadBots() {
    const { data } = await supabase.from("telegram_bots").select("*")
      .eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
    setBots(data ?? []);
  }

  async function loadWaBots() {
    const { data } = await supabase.from("whatsapp_bots").select("*")
      .eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
    setWaBots(data ?? []);
  }

  async function addTelegramBot() {
    if (!newBotUsername || !tgToken) return;
    const { error } = await supabase.from("telegram_bots").insert({
      restaurant_id: restaurantId,
      bot_username: newBotUsername.replace("@", ""),
      bot_token_hash: tgToken,
      is_active: true
    });
    if (error) toast.error("خطأ في إضافة تليجرام: " + error.message);
    else {
      toast.success("تم ربط بوت تليجرام بنجاح");
      setNewBotUsername(""); setTgToken(""); loadBots();
    }
  }

  async function addWaBot() {
    if (!waInstanceId || !waToken) return;
    const { error } = await supabase.from("whatsapp_bots").insert({
      restaurant_id: restaurantId,
      bot_name: "WhatsApp Bot",
      instance_id: waInstanceId,
      token_hash: waToken,
    });
    if (error) toast.error("خطأ في الإضافة: " + error.message);
    else {
      toast.success("تمت إضافة بوت واتساب بنجاح");
      setWaInstanceId(""); setWaToken(""); loadWaBots();
    }
  }

  async function approveSuggestion(id: string, suggestion: any) {
    try {
      // 1. Create journal entry
      const { data: entry, error: entryErr } = await supabase.from("journal_entries").insert({
        restaurant_id: restaurantId,
        entry_number: `AI-${Date.now()}`,
        entry_date: suggestion.suggested_entry_date || new Date().toISOString().split('T')[0],
        description: suggestion.description,
        source: 'auto',
        total_debit: suggestion.suggested_entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0),
        total_credit: suggestion.suggested_entry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0),
        is_posted: true,
        posted_at: new Date().toISOString()
      }).select().single();

      if (entryErr) throw entryErr;

      // 2. Create lines
      const lines = suggestion.suggested_entry.lines.map((l: any, i: number) => ({
        entry_id: entry.id,
        account_id: l.account_id, 
        debit: l.debit || 0,
        credit: l.credit || 0,
        description: l.description || suggestion.description,
        line_order: i
      }));

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (linesErr) throw linesErr;

      // 3. Update suggestion status
      await supabase.from("ai_journal_suggestions").update({ 
        status: 'approved', 
        journal_entry_id: entry.id 
      }).eq("id", id);

      toast.success("تم اعتماد القيد وترحيله بنجاح");
      loadSuggestions();
    } catch (err: any) {
      toast.error("فشل الاعتماد: " + err.message);
    }
  }

  async function rejectSuggestion(id: string) {
    await supabase.from("ai_journal_suggestions").update({ status: 'rejected' }).eq("id", id);
    toast.info("تم رفض الاقتراح");
    loadSuggestions();
  }

  async function runFinancialReview() {
    setReviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-accountant-review", {
        body: { 
          restaurant_id: restaurantId, 
          standard 
        },
      });
      if (error) throw error;
      setReviewReport(data.report);
      toast.success("تم الانتهاء من المراجعة الذكية للميزانية والقيود");
    } catch (err: any) {
      toast.error("فشل المراجعة: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput("");
    setChatLoading(true);

    const { data: userMsg } = await supabase.from("ai_chat_messages").insert({
      restaurant_id: restaurantId,
      role: "user",
      content: text,
      message_type: "general",
    }).select().single();

    const { data, error } = await supabase.functions.invoke("ai-accountant-analyze", {
      body: { restaurant_id: restaurantId, source_type: "chat", chat_message_id: userMsg?.id, text, standard },
    });

    if (error) {
      toast.error("فشل التحليل: " + error.message);
    } else if (data?.suggestion) {
      await supabase.from("ai_chat_messages").insert({
        restaurant_id: restaurantId,
        role: "assistant",
        content: `تم تحليل العملية بنجاح. القيد المقترح جاهز للمراجعة في تبويب الاقتراحات (بنسبة ثقة ${Math.round((data.suggestion.confidence_score ?? 0) * 100)}%).`,
        message_type: "journal_suggestion",
      });
      toast.success("تم توليد اقتراح قيد محاسبي ذكي");
    }

    setChatLoading(false);
  }

  return (
    <div className="space-y-8 fade-in h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 glow-soft">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black gradient-text">المساعد المحاسبي الذكي</h1>
            <p className="text-muted-foreground font-medium">ذكاء اصطناعي متخصص في المعايير المحاسبية الدولية والمحلية</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 glass-card p-2 !rounded-2xl">
          <span className="text-xs font-bold text-muted-foreground mr-2">معيار التقرير:</span>
          <Select value={standard} onValueChange={(v) => setStandard(v as Standard)}>
            <SelectTrigger className="w-44 bg-transparent border-0 font-bold focus:ring-0 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card">
              <SelectItem value="EAS">المصري (EAS)</SelectItem>
              <SelectItem value="IFRS">الدولي (IFRS)</SelectItem>
              <SelectItem value="US_GAAP">الأمريكي (US GAAP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col gap-6">
        <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] max-w-fit flex h-14 backdrop-blur-xl">
          <TabsTrigger value="chat" className="rounded-full px-8 font-bold data-[state=active]:gradient-bg data-[state=active]:text-white">
            <MessageCircle className="w-4 h-4 ml-2" /> الدردشة الذكية
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-full px-8 font-bold data-[state=active]:gradient-bg data-[state=active]:text-white">
            الاقتراحات <Badge className="mr-2 bg-indigo-500/20 text-indigo-500 border-indigo-500/30">{suggestions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-full px-8 font-bold data-[state=active]:gradient-bg data-[state=active]:text-white">
            <FileSearch className="w-4 h-4 ml-2" /> مراجعة القوائم
          </TabsTrigger>
          <TabsTrigger value="bots" className="rounded-full px-8 font-bold data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Bot className="w-4 h-4 ml-2" /> إعدادات الربط
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="chat" className="flex-1 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="glass-card flex-1 flex flex-col p-6 min-h-[500px]">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6">
                      {messages.map((m) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={m.id} 
                          className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`max-w-[85%] rounded-[2rem] px-6 py-4 shadow-sm border ${
                            m.role === "user" 
                              ? "bg-white/5 border-white/10 text-foreground" 
                              : "gradient-bg text-white border-0"
                          }`}>
                            <p className="text-sm leading-relaxed">{m.content}</p>
                            <span className="text-[10px] opacity-50 mt-2 block">{new Date(m.created_at).toLocaleTimeString('ar-EG')}</span>
                          </div>
                        </motion.div>
                      ))}
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                          <Sparkles className="w-16 h-16 text-indigo-500/20" />
                          <p className="text-muted-foreground max-w-xs">صف لي أي معاملة مالية وسأقوم بتحليلها وتوليد القيود المحاسبية المناسبة لك فوراً.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-6 flex gap-3 p-2 bg-white/5 rounded-[2.5rem] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="مثال: تم شراء أثاث للمكتب بقيمة 12000 جنيه بشيك بنكي..."
                      className="min-h-[60px] bg-transparent border-0 focus-visible:ring-0 resize-none pr-6 pt-4"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={chatLoading}
                      className="w-14 h-14 rounded-full gradient-bg self-end shadow-xl"
                    >
                      {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-500" /> القواعد المطبقة</h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                      <p className="text-xs font-bold text-emerald-600">القيد المزدوج التلقائي</p>
                      <p className="text-[10px] text-muted-foreground mt-1">يتم موازنة الحسابات تلقائياً (مدين/دائن).</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-xs font-bold text-indigo-600">التصنيف الذكي</p>
                      <p className="text-[10px] text-muted-foreground mt-1">تحديد الحساب من شجرة الحسابات بناءً على الوصف.</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-0">
                  <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> ملخص النشاط</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-indigo-600">{messages.length}</p>
                      <p className="text-[10px] text-muted-foreground">استفسار</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-purple-600">{suggestions.length}</p>
                      <p className="text-[10px] text-muted-foreground">اقتراح معلق</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

          <TabsContent value="suggestions" className="flex-1 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {suggestions.map((s) => (
                <Card key={s.id} className="glass-card border-indigo-500/20 overflow-hidden group">
                  <div className="h-1.5 gradient-bg opacity-50" />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-indigo-500/10 text-indigo-500 border-0">{s.source_type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <CardTitle className="text-lg font-black">{s.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{s.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                      {s.suggested_entry?.lines?.map((l: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] font-medium border-b border-white/5 pb-1 last:border-0">
                          <span className="text-muted-foreground">{l.account_name || l.account_code}</span>
                          <span className={l.debit > 0 ? "text-emerald-500" : "text-purple-500"}>
                            {l.debit > 0 ? `+${l.debit}` : `-${l.credit}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveSuggestion(s.id, s)}
                        className="flex-1 gradient-bg text-white border-0 h-9 font-bold text-xs"
                      >اعتماد القيد</Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => rejectSuggestion(s.id)}
                        className="flex-1 h-9 font-bold text-xs hover:bg-destructive/10 hover:text-destructive"
                      >تجاهل</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {suggestions.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-20 text-center border-2 border-dashed border-white/10 rounded-[2rem]">
                  <ClipboardList className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">لا توجد اقتراحات معلقة حالياً.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="review" className="flex-1 mt-0">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-card p-10 text-center space-y-6">
                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto shadow-xl">
                  <FileSearch className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">المراجعة المحاسبية الشاملة</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">سيقوم الذكاء الاصطناعي بتحليل كافة القيود والحسابات خلال الفترة الحالية واكتشاف أي خلل في التوازن أو مخالفة للمعايير.</p>
                </div>
                <Button 
                  onClick={runFinancialReview} 
                  disabled={reviewLoading}
                  className="gradient-bg text-white border-0 px-10 h-14 rounded-full font-black text-lg shadow-xl shadow-indigo-500/20"
                >
                  {reviewLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3" />}
                  ابدأ المراجعة الآن
                </Button>
              </div>

              {reviewReport && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-8 space-y-6 border-indigo-500/30"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black">نتائج التحليل الذكي</h3>
                      <Badge className={`${
                        reviewReport.overall_health === 'good' ? 'bg-emerald-500/20 text-emerald-500' : 
                        reviewReport.overall_health === 'critical' ? 'bg-destructive/20 text-destructive' : 
                        'bg-warning/20 text-warning'
                      } border-0`}>
                        {reviewReport.overall_health === 'good' ? 'حالة مستقرة' : 
                         reviewReport.overall_health === 'critical' ? 'تنبيه حرج' : 'ملاحظات متوسطة'}
                      </Badge>
                    </div>
                    <Badge className="bg-indigo-500 text-white border-0">تقرير المراجعة #{Date.now().toString().slice(-6)}</Badge>
                  </div>
                  
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                      <p className="whitespace-pre-wrap font-medium">{reviewReport.summary}</p>
                    </div>
                  </div>

                  {reviewReport.findings?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> الملاحظات المكتشفة ({reviewReport.findings.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reviewReport.findings.map((err: any, i: number) => (
                          <div key={i} className={`p-4 rounded-xl border flex gap-3 items-start ${
                            err.severity === 'error' ? 'bg-destructive/10 border-destructive/20' : 
                            err.severity === 'warn' ? 'bg-warning/10 border-warning/20' : 
                            'bg-blue-500/10 border-blue-500/20'
                          }`}>
                            <div className="shrink-0 mt-0.5">
                              {err.severity === 'error' ? <ShieldAlert className="w-5 h-5 text-destructive" /> : 
                               err.severity === 'warn' ? <ShieldAlert className="w-5 h-5 text-warning" /> : 
                               <ShieldCheck className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${
                                err.severity === 'error' ? 'text-destructive' : 
                                err.severity === 'warn' ? 'text-warning' : 'text-blue-500'
                              }`}>{err.title}</p>
                              <p className="text-xs opacity-80 mt-1">{err.detail}</p>
                              {err.standard_reference && <p className="text-[9px] mt-2 font-mono opacity-50">{err.standard_reference}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviewReport.recommendations?.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <h4 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" /> التوصيات المقترحة
                      </h4>
                      <div className="space-y-2">
                        {reviewReport.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center">
                            <div className="flex gap-3 items-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              <div className="text-sm">
                                <span className="font-bold">{rec.title}: </span>
                                <span className="text-muted-foreground">{rec.action}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase">{rec.priority}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bots" className="flex-1 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-sky-500" /> Telegram Bot Integration</CardTitle>
                  <CardDescription className="text-[11px]">
                    اربط المحاسب الذكي بتليجرام لاستخراج القيود من رسائل المجموعات.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-sky-600">خطوات التفعيل:</p>
                    <ol className="text-[9px] text-muted-foreground list-decimal list-inside space-y-1">
                      <li>تحدث مع <a href="https://t.me/botfather" target="_blank" className="underline">@BotFather</a> وأنشئ بوت جديد.</li>
                      <li>انسخ الـ API Token والصقه هنا مع اسم البوت.</li>
                      <li>اضبط الـ Webhook في تليجرام ليشير إلى رابط النظام الخاص بك.</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Bot Username (e.g. AuditryBot)" value={newBotUsername} onChange={e => setNewBotUsername(e.target.value)} />
                    <Input type="password" placeholder="Bot API Token" value={tgToken} onChange={e => setTgToken(e.target.value)} />
                    <Button onClick={addTelegramBot} className="w-full bg-sky-600 hover:bg-sky-700 text-white border-0">ربط تليجرام</Button>
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    {bots.map(b => (
                      <div key={b.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs">@{b.bot_username}</p>
                          <p className="text-[10px] text-muted-foreground">Status: Active</p>
                        </div>
                        <Badge className="bg-sky-500/20 text-sky-500 border-sky-500/30 text-[10px]">نشط</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-emerald-500" /> WhatsApp (UltraMsg)</CardTitle>
                  <CardDescription className="text-[11px]">
                    اربط واتساب لاستقبال الاقتراحات المحاسبية مباشرة من رسائل المالك.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-emerald-600">خطوات التفعيل:</p>
                    <ol className="text-[9px] text-muted-foreground list-decimal list-inside space-y-1">
                      <li>سجل في <a href="https://ultramsg.com" target="_blank" className="underline">UltraMsg</a> واربط رقم الواتساب.</li>
                      <li>انسخ الـ Instance ID والـ Token من لوحة التحكم الخاصة بهم.</li>
                      <li>اضبط الـ Webhook URL لديهم ليشير لرابط Edge Function الخاص بنا.</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Instance ID (e.g. instance123)" value={waInstanceId} onChange={e => setWaInstanceId(e.target.value)} />
                    <Input type="password" placeholder="Token" value={waToken} onChange={e => setWaToken(e.target.value)} />
                    <Button onClick={addWaBot} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0">ربط واتساب</Button>
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    {waBots.map(b => (
                      <div key={b.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs">WhatsApp ({b.instance_id})</p>
                          <p className="text-[10px] text-muted-foreground">Provider: {b.provider}</p>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px]">متصل</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
