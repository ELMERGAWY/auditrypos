
// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BrainCircuit, TrendingUp, ShieldCheck 
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
  const [newBotUsername, setNewBotUsername] = useState("");

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
    await Promise.all([loadMessages(), loadSuggestions(), loadBots()]);
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
            <Bot className="w-4 h-4 ml-2" /> Telegram
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
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
