import { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, CheckCircle, AlertCircle, 
  BookOpen, Calculator, FileText, Sparkles, 
  ThumbsUp, ThumbsDown, RotateCcw, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { journalService } from '@/lib/accounting/journalService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type?: 'general' | 'journal_suggestion' | 'error_detection' | 'compliance_check';
  metadata?: {
    suggestion_id?: string;
    journal_entry?: any;
    validation?: any;
    detected_issues?: string[];
  };
  created_at: string;
  status?: 'pending' | 'completed' | 'error';
}

interface JournalSuggestion {
  id: string;
  title: string;
  description: string;
  suggested_date: string;
  currency: string;
  lines: Array<{
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  validation: {
    is_balanced: boolean;
    total_debit: number;
    total_credit: number;
    compliance_score: number;
  };
  detected_issues: string[];
  warnings: string[];
}

interface Props {
  restaurantId: string;
  userId: string;
  fiscalPeriodId?: string;
}

const SUGGESTION_TEMPLATES = [
  { icon: '📦', text: 'اشترينا بضاعة من المورد أحمد بقيمة 10,000 جنيه + VAT نقداً' },
  { icon: '💰', text: 'العميل محمد سدد فاتورة سابقة بمبلغ 5,000 جنيه تحويل بنكي' },
  { icon: '🏢', text: 'تم دفع إيجار المحل للشهر الحالي 8,000 جنيه نقداً' },
  { icon: '💵', text: 'صرف راتب للموظف خالد 6,000 جنيه + تأمينات 300' },
  { icon: '📊', text: 'مراجعة قيود الفترة الحالية واكتشاف الأخطاء' },
];

export function AccountingAssistantChat({ restaurantId, userId, fiscalPeriodId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('general');
  const [suggestions, setSuggestions] = useState<JournalSuggestion[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messageTypes = [
    { id: 'general', label: 'محادثة عامة', icon: Bot },
    { id: 'journal_suggestion', label: 'اقتراح قيد', icon: FileText },
    { id: 'account_review', label: 'مراجعة حساب', icon: Calculator },
    { id: 'audit_query', label: 'تدقيق الأخطاء', icon: AlertCircle },
    { id: 'tax_question', label: 'استفسار ضريبي', icon: BookOpen },
    { id: 'period_close', label: 'إقفال فترة', icon: CheckCircle },
  ];

  useEffect(() => {
    loadChatHistory();
    loadPendingSuggestions();
  }, [restaurantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        message_type: m.message_type,
        metadata: m.metadata,
        created_at: m.created_at,
        status: 'completed'
      })));
    }
  };

  const loadPendingSuggestions = async () => {
    const { data } = await supabase
      .from('ai_journal_suggestions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) {
      setSuggestions(data.map(s => ({
        id: s.id,
        ...s.suggestion_data
      })));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      message_type: selectedType as any,
      created_at: new Date().toISOString(),
      status: 'completed'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Save user message
      await supabase.from('ai_chat_messages').insert({
        restaurant_id: restaurantId,
        user_id: userId,
        role: 'user',
        content: userMessage.content,
        message_type: selectedType,
        session_id: fiscalPeriodId
      });

      // Call AI Edge Function
      const { data: aiResponse, error } = await supabase.functions.invoke('accounting-ai-v2', {
        body: {
          restaurant_id: restaurantId,
          user_id: userId,
          message: userMessage.content,
          message_type: selectedType,
          context: {
            fiscal_period_id: fiscalPeriodId,
            previous_messages: messages.slice(-5).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse.message || 'تم معالجة طلبك',
        message_type: selectedType as any,
        metadata: aiResponse.metadata,
        created_at: new Date().toISOString(),
        status: 'completed'
      };

      // Save assistant message
      await supabase.from('ai_chat_messages').insert({
        restaurant_id: restaurantId,
        user_id: userId,
        role: 'assistant',
        content: assistantMessage.content,
        message_type: selectedType,
        metadata: aiResponse.metadata,
        session_id: fiscalPeriodId
      });

      setMessages(prev => [...prev, assistantMessage]);

      // If journal suggestion was created, reload suggestions
      if (aiResponse.suggestion_created) {
        loadPendingSuggestions();
        toast.success('✨ تم إنشاء اقتراح قيد جديد!');
      }

    } catch (err: any) {
      console.error('AI Error:', err);
      toast.error('حدث خطأ في الاتصال بالمساعد الذكي');
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: '⚠️ عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
        created_at: new Date().toISOString(),
        status: 'error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const approveSuggestion = async (suggestion: JournalSuggestion) => {
    try {
      // Create actual journal entry from suggestion
      const result = await journalService.createJournalEntry(
        restaurantId,
        {
          entry_date: suggestion.suggested_date,
          reference_type: 'ai_suggestion',
          reference_id: suggestion.id,
          description: suggestion.description,
          source: 'ai_assistant',
          is_posted: true,
          created_by: userId,
          lines: suggestion.lines.map((line, idx) => ({
            account_id: line.account_code, // Will be resolved by account code
            debit: line.debit,
            credit: line.credit,
            description: line.description,
            line_order: idx + 1
          }))
        }
      );

      if (result) {
        // Update suggestion status
        await supabase
          .from('ai_journal_suggestions')
          .update({ 
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            resulting_entry_id: result.id
          })
          .eq('id', suggestion.id);

        toast.success('✅ تم إنشاء القيد واعتماده بنجاح!');
        loadPendingSuggestions();
      }
    } catch (err: any) {
      toast.error('فشل في إنشاء القيد: ' + err.message);
    }
  };

  const rejectSuggestion = async (suggestionId: string) => {
    await supabase
      .from('ai_journal_suggestions')
      .update({ 
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString()
      })
      .eq('id', suggestionId);
    
    toast.info('تم رفض الاقتراح');
    loadPendingSuggestions();
  };

  const applyTemplate = (text: string) => {
    setInput(text);
    setSelectedType('journal_suggestion');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">المحاسب الذكي</h2>
            <p className="text-xs text-muted-foreground">مساعدك في المراجعة والتدقيق المحاسبي</p>
          </div>
          {suggestions.length > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              {suggestions.length} اقتراح معلق
            </Badge>
          )}
        </div>
      </div>

      {/* Message Type Selector */}
      <div className="px-4 py-2 border-b overflow-x-auto">
        <div className="flex gap-2">
          {messageTypes.map(type => (
            <Button
              key={type.id}
              variant={selectedType === type.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type.id)}
              className="whitespace-nowrap"
            >
              <type.icon className="w-4 h-4 mr-1" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Pending Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-b p-4 bg-amber-50/50 dark:bg-amber-950/10">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            اقتراحات القيود في انتظار الموافقة
          </h3>
          <div className="space-y-2">
            {suggestions.map(suggestion => (
              <div 
                key={suggestion.id}
                className="bg-card rounded-lg border p-3 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setExpandedSuggestion(
                  expandedSuggestion === suggestion.id ? null : suggestion.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="font-medium">{suggestion.title}</span>
                    {suggestion.validation?.compliance_score && (
                      <Badge variant="outline" className="text-xs">
                        دقة: {Math.round(suggestion.validation.compliance_score * 100)}%
                      </Badge>
                    )}
                  </div>
                  {expandedSuggestion === suggestion.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
                
                <AnimatePresence>
                  {expandedSuggestion === suggestion.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t"
                    >
                      <p className="text-sm text-muted-foreground mb-3">
                        {suggestion.description}
                      </p>
                      
                      {/* Journal Lines Preview */}
                      <table className="w-full text-xs mb-3">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-1 text-right">الحساب</th>
                            <th className="p-1 text-left">مدين</th>
                            <th className="p-1 text-left">دائن</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suggestion.lines.map((line, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-1">{line.account_name}</td>
                              <td className="p-1 text-left text-emerald-600">
                                {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                              </td>
                              <td className="p-1 text-left text-destructive">
                                {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-primary/5 font-bold">
                          <tr>
                            <td className="p-1">الإجمالي</td>
                            <td className="p-1 text-left">{suggestion.validation?.total_debit?.toLocaleString()}</td>
                            <td className="p-1 text-left">{suggestion.validation?.total_credit?.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* Validation Warnings */}
                      {suggestion.detected_issues?.length > 0 && (
                        <div className="bg-destructive/10 rounded p-2 mb-3">
                          <p className="text-xs font-bold text-destructive mb-1">⚠️ ملاحظات:</p>
                          <ul className="text-xs text-destructive list-disc list-inside">
                            {suggestion.detected_issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveSuggestion(suggestion);
                          }}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          اعتماد القيد
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectSuggestion(suggestion.id);
                          }}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          رفض
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">مرحباً! أنا المحاسب الذكي</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              يمكنني مساعدتك في اقتراح القيود، مراجعة الحسابات، اكتشاف الأخطاء، 
              والإجابة على استفساراتك المحاسبية.
            </p>
            
            {/* Quick Templates */}
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              <p className="text-xs text-muted-foreground mb-2">جرب أمثلة جاهزة:</p>
              {SUGGESTION_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTemplate(template.text)}
                  className="text-right p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
                >
                  <span className="mr-2">{template.icon}</span>
                  {template.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : message.role === 'system'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : message.role === 'system' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-3 ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : message.role === 'system'
                ? 'bg-destructive/10 text-destructive rounded-tl-sm'
                : 'bg-muted rounded-tl-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.metadata?.journal_entry && (
                <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                  <p className="font-bold">💡 اقتراح قيد:</p>
                  <p>{message.metadata.journal_entry.title}</p>
                </div>
              )}
              <span className="text-[10px] opacity-50 mt-1 block">
                {new Date(message.created_at).toLocaleTimeString('ar-EG', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </motion.div>
        ))}
        
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-card">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              selectedType === 'journal_suggestion' 
                ? 'صف العملية المحاسبية (مثال: اشترينا بضاعة بقيمة 10000 من المورد أحمد)...'
                : selectedType === 'account_review'
                ? 'أدخل رمز الحساب للمراجعة...'
                : selectedType === 'audit_query'
                ? 'اكتب استفسار عن أخطاء محتملة...'
                : 'اكتب رسالتك هنا...'
            }
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || loading}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          المساعد الذكي يستخدم Gemini AI. يرجى مراجعة الاقتراحات قبل الاعتماد.
        </p>
      </div>
    </div>
  );
}
