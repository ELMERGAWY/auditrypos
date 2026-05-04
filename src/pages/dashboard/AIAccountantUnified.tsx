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
import { Loader2, Send, CheckCircle2, XCircle, Bot, FileSearch, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";

type Standard = "EAS" | "IFRS" | "US_GAAP";

interface Props {
  restaurantId: string;
}

export default function AIAccountantUnified({ restaurantId }: Props) {
  const [standard, setStandard] = useState<Standard>("EAS");
  const [tab, setTab] = useState("chat");

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Review
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewReport, setReviewReport] = useState<any>(null);

  // Telegram bots
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

    // Persist user message
    const { data: userMsg } = await supabase.from("ai_chat_messages").insert({
      restaurant_id: restaurantId,
      role: "user",
      content: text,
      message_type: "general",
    }).select().single();

    // Call analyze function
    const { data, error } = await supabase.functions.invoke("ai-accountant-analyze", {
      body: { restaurant_id: restaurantId, source_type: "chat", chat_message_id: userMsg?.id, text, standard },
    });

    if (error) {
      toast.error("فشل التحليل: " + error.message);
    } else if (data?.suggestion) {
      await supabase.from("ai_chat_messages").insert({
        restaurant_id: restaurantId,
        role: "assistant",
        content: `تم اقتراح قيد محاسبي بثقة ${Math.round((data.suggestion.confidence_score ?? 0) * 100)}%. راجعه في تبويب "الاقتراحات".`,
        message_type: "journal_suggestion",
      });
      toast.success("تم توليد اقتراح قيد محاسبي");
    }

    setChatLoading(false);
  }

  async function approveSuggestion(s: any) {
    // Create journal_entry + lines from suggested_entry
    const entry = s.suggested_entry || {};
    const lines = entry.lines || [];

    const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);

    const { data: created, error: e1 } = await supabase.from("journal_entries").insert({
      restaurant_id: restaurantId,
      entry_date: s.suggested_entry_date,
      description: s.title,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: "posted",
      reference: `AI:${s.id.slice(0, 8)}`,
    } as any).select().single();

    if (e1 || !created) {
      toast.error("فشل ترحيل القيد: " + (e1?.message || ""));
      return;
    }

    if (lines.length > 0) {
      const lineRows = lines.map((l: any) => ({
        entry_id: created.id,
        account_code: l.account_code,
        account_name: l.account_name,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description,
      }));
      await supabase.from("journal_entry_lines").insert(lineRows as any);
    }

    await supabase.from("ai_journal_suggestions").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      posted_entry_id: created.id,
    }).eq("id", s.id);

    toast.success("تم اعتماد القيد وترحيله");
    loadSuggestions();
  }

  async function rejectSuggestion(s: any) {
    const reason = window.prompt("سبب الرفض (اختياري)") || "";
    await supabase.from("ai_journal_suggestions").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    }).eq("id", s.id);
    toast.info("تم رفض الاقتراح");
    loadSuggestions();
  }

  async function runReview() {
    setReviewLoading(true);
    setReviewReport(null);
    const { data, error } = await supabase.functions.invoke("ai-accountant-review", {
      body: { restaurant_id: restaurantId, standard },
    });
    if (error) toast.error("فشل المراجعة: " + error.message);
    else setReviewReport(data?.report);
    setReviewLoading(false);
  }

  async function addBot() {
    if (!newBotUsername.trim()) return;
    const { error } = await supabase.from("telegram_bots").insert({
      restaurant_id: restaurantId,
      bot_username: newBotUsername.trim(),
      bot_token_hash: "managed-by-connector",
      is_active: true,
      auto_suggest_entries: true,
      require_approval: true,
      allowed_chat_ids: [],
    } as any);
    if (error) toast.error(error.message);
    else { setNewBotUsername(""); loadBots(); toast.success("تمت إضافة البوت"); }
  }

  async function toggleBot(b: any) {
    await supabase.from("telegram_bots").update({ is_active: !b.is_active } as any).eq("id", b.id);
    loadBots();
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المساعد المحاسبي الذكي</h1>
          <p className="text-sm text-muted-foreground">تحليل تلقائي للرسائل، توليد قيود، ومراجعة القوائم المالية</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">المعيار:</span>
          <Select value={standard} onValueChange={(v) => setStandard(v as Standard)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EAS">المصري EAS</SelectItem>
              <SelectItem value="IFRS">الدولي IFRS</SelectItem>
              <SelectItem value="US_GAAP">الأمريكي US GAAP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="chat"><MessageCircle className="w-4 h-4 ml-1" /> الدردشة</TabsTrigger>
          <TabsTrigger value="suggestions">الاقتراحات <Badge className="mr-1">{suggestions.length}</Badge></TabsTrigger>
          <TabsTrigger value="review"><FileSearch className="w-4 h-4 ml-1" /> مراجعة القوائم</TabsTrigger>
          <TabsTrigger value="bots"><Bot className="w-4 h-4 ml-1" /> Telegram</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader><CardTitle>اكتب وصف العملية وسأقترح القيد المحاسبي</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-[420px] border rounded-md p-3">
                {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">ابدأ بكتابة معاملة، مثلاً: "اشتريت بضاعة بـ 5000 جنيه نقداً"</div>}
                <div className="space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="اكتب وصف العملية..."
                  className="min-h-[60px]"
                />
                <Button onClick={sendMessage} disabled={chatLoading}>
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          {suggestions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد اقتراحات معلّقة</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => {
                const entry = s.suggested_entry || {};
                const lines = entry.lines || [];
                return (
                  <Card key={s.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{s.title}</span>
                        <Badge variant="outline">ثقة {Math.round((s.confidence_score ?? 0) * 100)}%</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <table className="w-full text-sm border">
                        <thead className="bg-muted">
                          <tr><th className="p-2">الحساب</th><th className="p-2">مدين</th><th className="p-2">دائن</th><th className="p-2">البيان</th></tr>
                        </thead>
                        <tbody>
                          {lines.map((l: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{l.account_code} - {l.account_name}</td>
                              <td className="p-2">{Number(l.debit || 0).toFixed(2)}</td>
                              <td className="p-2">{Number(l.credit || 0).toFixed(2)}</td>
                              <td className="p-2">{l.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.detected_errors?.length > 0 && (
                        <div className="text-xs text-destructive">⚠ {s.detected_errors.join(" • ")}</div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => approveSuggestion(s)}>
                          <CheckCircle2 className="w-4 h-4 ml-1" /> اعتماد وترحيل
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectSuggestion(s)}>
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                مراجعة القوائم المالية وفق {standard}
                <Button size="sm" onClick={runReview} disabled={reviewLoading}>
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <FileSearch className="w-4 h-4 ml-1" />}
                  بدء المراجعة
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reviewReport && !reviewLoading && (
                <p className="text-sm text-muted-foreground">اضغط "بدء المراجعة" لتحليل الحسابات والقيود الأخيرة وتقديم توصيات.</p>
              )}
              {reviewReport && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={reviewReport.overall_health === "good" ? "default" : reviewReport.overall_health === "warning" ? "outline" : "destructive"}>
                      {reviewReport.overall_health}
                    </Badge>
                    <p className="text-sm">{reviewReport.summary}</p>
                  </div>
                  {reviewReport.findings?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">الملاحظات</h4>
                      <ul className="space-y-1 text-sm">
                        {reviewReport.findings.map((f: any, i: number) => (
                          <li key={i} className="border-r-2 pr-2" style={{ borderColor: f.severity === "error" ? "red" : f.severity === "warn" ? "orange" : "gray" }}>
                            <strong>{f.title}</strong> — {f.detail} {f.standard_reference && <em className="text-xs text-muted-foreground">({f.standard_reference})</em>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reviewReport.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">التوصيات</h4>
                      <ul className="space-y-1 text-sm list-disc pr-5">
                        {reviewReport.recommendations.map((r: any, i: number) => (
                          <li key={i}>[{r.priority}] <strong>{r.title}</strong> — {r.action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bots" className="mt-4">
          <Card>
            <CardHeader><CardTitle>بوتات Telegram المرتبطة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                الرسائل النصية الواردة لهذه البوتات تُحلَّل تلقائياً وتُولّد اقتراحات قيود محاسبية للمراجعة.
                التوكن يُدار مركزياً عبر اتصال Telegram. أضف اسم مستخدم البوت فقط.
              </p>
              <div className="flex gap-2">
                <Input placeholder="@my_accounting_bot" value={newBotUsername} onChange={(e) => setNewBotUsername(e.target.value)} />
                <Button onClick={addBot}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
              </div>
              <div className="space-y-2">
                {bots.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border rounded-md p-2">
                    <div>
                      <div className="font-medium text-sm">{b.bot_username}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.auto_suggest_entries ? "تحليل تلقائي مفعّل" : "تحليل تلقائي معطّل"} •
                        {b.is_active ? " نشط" : " متوقف"}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleBot(b)}>
                      {b.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </div>
                ))}
                {bots.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">لا يوجد بوتات بعد</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
