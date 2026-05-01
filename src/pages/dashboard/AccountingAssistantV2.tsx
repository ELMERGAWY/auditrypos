// ============================================================
// ACCOUNTING ASSISTANT V2 - Advanced AI Chat with Gemini
// Enhanced with multiple modes: chat, journal suggestions, audit, compliance
// ============================================================

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Send, CheckCircle2, XCircle, Bot, User, 
  BookOpen, AlertTriangle, Calculator, FileCheck, 
  MessageSquare, MoreHorizontal, Clock, ThumbsUp, ThumbsDown,
  Copy, Check, RotateCcw, FileText, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { journalService } from '@/lib/accounting';

// Types
type MessageType = 
  | 'general' 
  | 'journal_suggestion' 
  | 'account_review' 
  | 'audit_query' 
  | 'tax_question' 
  | 'period_close' 
  | 'error_detection' 
  | 'compliance_check';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: MessageType;
  metadata?: {
    structured_data?: any;
    validation_results?: any;
    detected_errors?: any[];
    suggestion_id?: string;
  };
  created_at: string;
  is_bookmarked?: boolean;
}

interface AiSuggestion {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'expired';
  title: string;
  description: string;
  suggested_entry: {
    title: string;
    description: string;
    lines: Array<{
      account_code: string;
      account_name?: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
    validation?: {
      is_balanced: boolean;
      total_debit: number;
      total_credit: number;
    };
  };
  validation_results?: {
    is_balanced: boolean;
    total_debit: number;
    total_credit: number;
    compliance_score: number;
  };
  detected_errors?: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  confidence_score?: number;
  source_type: string;
  created_at: string;
}

interface Props {
  restaurantId: string;
  userId: string;
  currency: string;
  fiscalPeriodId?: string;
}

const MESSAGE_TYPE_CONFIG: Record<MessageType, { label: string; icon: any; color: string; description: string }> = {
  general: { 
    label: 'محادثة عامة', 
    icon: MessageSquare, 
    color: 'bg-blue-500',
    description: 'استفسارات محاسبية عامة'
  },
  journal_suggestion: { 
    label: 'اقتراح قيد', 
    icon: BookOpen, 
    color: 'bg-green-500',
    description: 'تحويل العملية لقيد محاسبي'
  },
  account_review: { 
    label: 'مراجعة حساب', 
    icon: FileCheck, 
    color: 'bg-purple-500',
    description: 'مراجعة وتحليل حساب محاسبي'
  },
  audit_query: { 
    label: 'استعلام تدقيق', 
    icon: AlertTriangle, 
    color: 'bg-orange-500',
    description: 'اكتشاف أخطاء وتناقضات'
  },
  tax_question: { 
    label: 'استشارة ضريبية', 
    icon: Calculator, 
    color: 'bg-red-500',
    description: 'استفسارات ضريبية'
  },
  period_close: { 
    label: 'إقفال فترة', 
    icon: CheckCircle2, 
    color: 'bg-indigo-500',
    description: 'قائمة مراجعة إقفال الفترة'
  },
  error_detection: { 
    label: 'كشف أخطاء', 
    icon: AlertTriangle, 
    color: 'bg-rose-500',
    description: 'فحص قيد محاسبي للأخطاء'
  },
  compliance_check: { 
    label: 'مراجعة معايير', 
    icon: FileCheck, 
    color: 'bg-teal-500',
    description: 'التحقق من المعايير المحاسبية'
  }
};

export function AccountingAssistantV2({ restaurantId, userId, currency, fiscalPeriodId }: Props) {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<MessageType>('general');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load chat history and suggestions
  const loadData = useCallback(async () => {
    try {
      // Load messages
      const { data: msgs } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (msgs) {
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role as any,
          content: m.content,
          message_type: m.message_type as any,
          metadata: m.metadata,
          created_at: m.created_at,
          is_bookmarked: m.is_bookmarked
        })));
        
        // Get last session ID
        const lastUserMsg = msgs.filter(m => m.role === 'user').pop();
        if (lastUserMsg) {
          setSessionId(lastUserMsg.session_id);
        }
      }

      // Load suggestions
      const { data: sugs } = await supabase
        .from('ai_journal_suggestions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sugs) {
        setSuggestions(sugs as AiSuggestion[]);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message locally
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      message_type: selectedType,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Get recent context
      const recentMessages = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('accounting-ai-v2', {
        body: {
          restaurant_id: restaurantId,
          user_id: userId,
          message: userMessage,
          message_type: selectedType,
          context: {
            fiscal_period_id: fiscalPeriodId,
            previous_messages: recentMessages
          }
        }
      });

      if (error) throw error;

      if (data?.ok) {
        // Add AI response
        const aiMessage: ChatMessage = {
          id: data.chat_message_id || 'ai-' + Date.now(),
          role: 'assistant',
          content: data.response,
          message_type: selectedType,
          metadata: {
            structured_data: data.structured_data,
            validation_results: data.validation_results,
            detected_errors: data.detected_errors,
            suggestion_id: data.suggestion_id
          },
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), aiMessage]);

        // Update session ID
        if (data.session_id) {
          setSessionId(data.session_id);
        }

        // Refresh suggestions if a new one was created
        if (data.suggestion_id) {
          await loadData();
          toast.success('تم إنشاء اقتراح قيد للمراجعة');
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'فشل في الاتصال بالمساعد الذكي');
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion actions
  const handleSuggestionAction = async (suggestion: AiSuggestion, action: 'approve' | 'reject' | 'post') => {
    try {
      if (action === 'post') {
        // Convert AI suggestion to actual journal entry
        const entry = suggestion.suggested_entry;
        
        // Get account IDs from codes
        const { data: accounts } = await supabase
          .from('chart_of_accounts')
          .select('id, code')
          .eq('restaurant_id', restaurantId)
          .in('code', entry.lines.map(l => l.account_code));

        const accountMap = new Map(accounts?.map(a => [a.code, a.id]) || []);

        const lines = entry.lines.map((line, index) => ({
          account_id: accountMap.get(line.account_code),
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || '',
          line_order: index + 1
        })).filter(l => l.account_id);

        if (lines.length === 0) {
          toast.error('لم يتم العثور على الحسابات المقترحة');
          return;
        }

        const result = await journalService.createJournalEntry({
          restaurant_id: restaurantId,
          entry_date: new Date(),
          reference_type: 'adjustment',
          description: entry.description || entry.title,
          source: 'manual',
          lines
        });

        if (result.success) {
          // Update suggestion status
          await supabase
            .from('ai_journal_suggestions')
            .update({ 
              status: 'posted', 
              posted_entry_id: result.entry?.id 
            })
            .eq('id', suggestion.id);

          toast.success('تم تسجيل القيد بنجاح');
          await loadData();
        }
      } else {
        await supabase
          .from('ai_journal_suggestions')
          .update({ 
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', suggestion.id);

        toast.success(action === 'approve' ? 'تمت الموافقة على الاقتراح' : 'تم رفض الاقتراح');
        await loadData();
      }
    } catch (e: any) {
      toast.error(e?.message || 'فشل في تنفيذ الإجراء');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('تم النسخ');
  };

  // Quick prompts
  const QUICK_PROMPTS = [
    { type: 'journal_suggestion' as MessageType, text: 'اشترينا بضاعة من المورد أحمد بقيمة 15000 جنيه + ضريبة 14% ودفعنا نقداً' },
    { type: 'audit_query' as MessageType, text: 'افحص القيود الأخيرة للتأكد من عدم وجود أخطاء' },
    { type: 'period_close' as MessageType, text: 'قائمة مراجعة إقفال شهر يناير 2024' },
    { type: 'tax_question' as MessageType, text: 'كيف أحسب الضريبة على المشتريات الخاضعة والمعفاة؟' },
  ];

  const TypeIcon = MESSAGE_TYPE_CONFIG[selectedType].icon;

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">المساعد المحاسبي الذكي</h2>
              <p className="text-sm text-muted-foreground">مدعوم بـ Gemini AI</p>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              المحادثة
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <FileText className="w-4 h-4" />
              الاقتراحات
              {suggestions.filter(s => s.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {suggestions.filter(s => s.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
          {/* Message Type Selector */}
          <div className="px-4 py-3 border-b bg-secondary/20">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MESSAGE_TYPE_CONFIG) as MessageType[]).map((type) => {
                const config = MESSAGE_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                      selectedType === type 
                        ? `${config.color} text-white shadow-md` 
                        : "bg-card hover:bg-secondary border border-border"
                    )}
                    title={config.description}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">مرحباً بك في المساعد المحاسبي</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    يمكنني مساعدتك في اقتراح القيود، مراجعة الحسابات، اكتشاف الأخطاء، 
                    والإجابة على استفساراتك المحاسبية
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedType(prompt.type);
                          setInput(prompt.text);
                        }}
                        className="px-3 py-2 bg-card border rounded-lg text-sm hover:border-primary transition-colors text-right"
                      >
                        <span className="text-muted-foreground text-xs block mb-1">
                          {MESSAGE_TYPE_CONFIG[prompt.type].label}
                        </span>
                        {prompt.text.substring(0, 50)}...
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === 'user' ? "flex-row" : "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                      msg.role === 'user' ? "bg-secondary" : "bg-primary text-primary-foreground"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Content */}
                    <div className={cn(
                      "flex-1 max-w-[85%]",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <Card className={cn(
                        "p-3 inline-block",
                        msg.role === 'user' ? "bg-secondary" : "bg-card border-primary/20"
                      )}>
                        {/* Message Header */}
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {MESSAGE_TYPE_CONFIG[msg.message_type]?.label || 'عام'}
                          </Badge>
                          <span>{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Message Content */}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>

                        {/* Structured Data Display for Journal Suggestions */}
                        {msg.metadata?.structured_data?.lines && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-semibold mb-2">القيد المقترح:</div>
                            <div className="bg-secondary/50 rounded-lg p-2 text-xs space-y-1">
                              {msg.metadata.structured_data.lines.map((line: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span>{line.account_code} - {line.account_name || line.account_code}</span>
                                  <span className={line.debit > 0 ? "text-destructive" : "text-success"}>
                                    {line.debit > 0 ? line.debit.toLocaleString() : line.credit.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                                <span>المجموع</span>
                                <span>{msg.metadata.structured_data.validation?.total_debit?.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Validation Results */}
                            {msg.metadata.validation_results && (
                              <div className={cn(
                                "mt-2 p-2 rounded text-xs",
                                msg.metadata.validation_results.is_balanced 
                                  ? "bg-success/10 text-success" 
                                  : "bg-destructive/10 text-destructive"
                              )}>
                                {msg.metadata.validation_results.is_balanced ? (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    القيد متوازن ({msg.metadata.validation_results.compliance_score >= 0.9 ? 'ممتاز' : 'جيد'})
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    القيد غير متوازن!
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Detected Errors */}
                            {msg.metadata.detected_errors && msg.metadata.detected_errors.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.metadata.detected_errors.map((error: any, i: number) => (
                                  <div key={i} className="flex items-center gap-1 text-xs text-destructive">
                                    <AlertTriangle className="w-3 h-3" />
                                    {error.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 hover:bg-secondary rounded"
                            title="نسخ"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Loading Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-card">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`${MESSAGE_TYPE_CONFIG[selectedType].description}... اضغط Enter للإرسال`}
                  className="pr-4"
                  disabled={loading}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <TypeIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="gap-2 gradient-bg border-0 text-white"
              >
                <Send className="w-4 h-4" />
                إرسال
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>الوضع الحالي: {MESSAGE_TYPE_CONFIG[selectedType].label}</span>
              <span>جميع الاقتراحات تحتاج موافقة المحاسب</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="flex-1 m-0 p-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>لا توجد اقتراحات قيود بعد</p>
                  <p className="text-sm mt-2">استخدم المحادثة لإنشاء اقتراحات</p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            suggestion.status === 'posted' ? 'default' :
                            suggestion.status === 'approved' ? 'secondary' :
                            suggestion.status === 'rejected' ? 'destructive' :
                            'outline'
                          }>
                            {suggestion.status === 'posted' ? 'تم التسجيل' :
                             suggestion.status === 'approved' ? 'معتمد' :
                             suggestion.status === 'rejected' ? 'مرفوض' :
                             'بانتظار المراجعة'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(suggestion.created_at).toLocaleString('ar-EG')}
                          </span>
                          {suggestion.source_type === 'telegram' && (
                            <Badge variant="outline">Telegram</Badge>
                          )}
                        </div>
                        
                        <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>

                        {/* Entry Lines */}
                        {suggestion.suggested_entry?.lines && (
                          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                            <table className="w-full">
                              <thead>
                                <tr className="text-muted-foreground text-xs">
                                  <th className="text-right pb-2">الحساب</th>
                                  <th className="text-left pb-2">مدين</th>
                                  <th className="text-left pb-2">دائن</th>
                                </tr>
                              </thead>
                              <tbody>
                                {suggestion.suggested_entry.lines.map((line, i) => (
                                  <tr key={i} className="border-t border-border/50">
                                    <td className="py-1">
                                      <span className="font-mono text-muted-foreground">{line.account_code}</span>
                                      {' - '}
                                      {line.account_name || line.account_code}
                                      {line.description && (
                                        <span className="text-xs text-muted-foreground block">{line.description}</span>
                                      )}
                                    </td>
                                    <td className="py-1 text-destructive font-mono">
                                      {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                                    </td>
                                    <td className="py-1 text-success font-mono">
                                      {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t font-semibold">
                                  <td className="pt-2">المجموع</td>
                                  <td className="pt-2 font-mono">
                                    {suggestion.validation_results?.total_debit?.toLocaleString()}
                                  </td>
                                  <td className="pt-2 font-mono">
                                    {suggestion.validation_results?.total_credit?.toLocaleString()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}

                        {/* Validation & Errors */}
                        {suggestion.detected_errors && suggestion.detected_errors.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {suggestion.detected_errors.map((error, i) => (
                              <div key={i} className={cn(
                                "flex items-center gap-2 text-sm p-2 rounded",
                                error.severity === 'high' ? "bg-destructive/10 text-destructive" :
                                error.severity === 'medium' ? "bg-warning/10 text-warning" :
                                "bg-muted"
                              )}>
                                <AlertTriangle className="w-4 h-4" />
                                {error.message}
                              </div>
                            ))}
                          </div>
                        )}

                        {suggestion.validation_results && (
                          <div className={cn(
                            "mt-3 p-2 rounded text-sm flex items-center gap-2",
                            suggestion.validation_results.is_balanced 
                              ? "bg-success/10 text-success" 
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {suggestion.validation_results.is_balanced ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                القيد متوازن - درجة الثقة: {(suggestion.confidence_score || 0) * 100}%
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4" />
                                القيد غير متوازن!
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {suggestion.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleSuggestionAction(suggestion, 'approve')}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => handleSuggestionAction(suggestion, 'reject')}
                            >
                              <ThumbsDown className="w-4 h-4" />
                              رفض
                            </Button>
                          </>
                        )}
                        {suggestion.status === 'approved' && (
                          <Button
                            size="sm"
                            className="gap-1 gradient-bg border-0"
                            onClick={() => handleSuggestionAction(suggestion, 'post')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            تسجيل القيد
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AccountingAssistantV2;
