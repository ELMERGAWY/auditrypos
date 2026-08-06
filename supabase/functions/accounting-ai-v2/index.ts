// ============================================================
// ACCOUNTING AI - Advanced Gemini Integration for ERP
// Supports: Chat, Journal Suggestions, Error Detection, Compliance
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRestaurantAccess } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Message types for different accounting contexts
type MessageType = 
  | 'general' 
  | 'journal_suggestion' 
  | 'account_review' 
  | 'audit_query' 
  | 'tax_question' 
  | 'period_close' 
  | 'error_detection' 
  | 'compliance_check';

type ChatRequest = {
  restaurant_id: string;
  user_id: string;
  message: string;
  message_type?: MessageType;
  context?: {
    fiscal_period_id?: string;
    account_id?: string;
    entry_id?: string;
    previous_messages?: Array<{ role: string; content: string }>;
  };
};

type TelegramRequest = {
  telegram_bot_id: string;
  telegram_message_id: string;
  telegram_chat_id: string;
  sender_name: string;
  message_text: string;
};

type WhatsAppRequest = {
  whatsapp_bot_id: string;
  external_message_id: string;
  sender_number: string;
  message_text: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// System prompts for different modes
const SYSTEM_PROMPTS: Record<MessageType, string> = {
  general: `أنت مساعد محاسبي خبير في نظام ERP للمطاعم والأنشطة التجارية.
دورك مساعدة المحاسب في:
- مراجعة القيود والتأكد من توازنها
- إرشاد التسجيل المحاسبي الصحيح
- الإجابة على استفسارات المحاسبة
- اقتراح تحسينات على العمليات المحاسبية

أجب بشكل مختصر وعملي، مع التركيز على المعايير المحاسبية المصرية والدولية.`,

  journal_suggestion: `أنت محاسب خبير متخصص في إعداد قيود اليومية.
مهمتك: تحويل وصف العملية إلى قيد محاسبي متوازن ومكتمل.

قواعد صارمة:
1. لازم مجموع المدين = مجموع الدائن بالضبط
2. استخدم حسابات واقعية حسب نوع النشاط التجاري
3. احسب الضريبة (VAT 14% في مصر) إذا وردت في الوصف
4. افصل بين الأصول والمصروفات والإيرادات بشكل صحيح
5. حدد تاريخ القيد بشكل منطقي

أكواد الحسابات الشائعة:
- 1100: صندوق (نقدية)
- 1200: العملاء (ذمم مدينة)
- 1300: المخزون
- 1400: البنوك
- 2100: الموردين (ذمم دائنة)
- 2150: الضرائب المستحقة
- 4100: المبيعات
- 4200: الخدمات
- 5100: تكلفة البضاعة المباعة
- 5200: الهالك/الفاقد
- 6100: الرواتب
- 6200: الإيجارات
- 6300: المرافق والخدمات

أخرج JSON فقط بهذا الشكل:
{
  "title": "عنوان القيد",
  "description": "وصف تفصيلي",
  "suggested_date": "YYYY-MM-DD",
  "currency": "EGP",
  "lines": [
    { "account_code": "1100", "account_name": "الصندوق", "debit": 0, "credit": 0, "description": "..." }
  ],
  "validation": {
    "is_balanced": true,
    "total_debit": 0,
    "total_credit": 0,
    "compliance_score": 0.95
  },
  "detected_issues": [],
  "warnings": []
}`,

  account_review: `أنت مدقق محاسبي متخصص في مراجعة الحسابات.
مراجعة حساب محاسبي تشمل:
1. التحقق من طبيعة الحساب (مدين/دائن)
2. مراجعة حركات الحساب في الفترة
3. كشف التناقضات أو الأخطاء
4. اقتراح التسويات اللازمة
5. التحقق من الالتزام بالمعايير المحاسبية

قدم تحليلاً مفصلاً مع:
- ملخص للحالة
- الأخطاء المكتشفة (إن وجدت)
- التوصيات
- نسبة الثقة في التحليل`,

  audit_query: `أنت مدقق داخلي متخصص في اكتشاف الأخطاء المحاسبية.
مهمتك: تحليل البيانات واكتشاف:
- قيود غير متوازنة
- تكرار القيود
- قيود مفقودة (مثل عكس المصروفات)
- مخالفات الضريبة
- قيود غير مكتملة

لكل خطأ تكتشفه:
- نوع الخطأ
- القيد المتأثر
- خطورة الخطأ (عالية/متوسطة/منخفضة)
- التوصية للإصلاح`,

  tax_question: `أنت مستشار ضريبي متخصص في الضرائب المصرية.
المجالات: VAT (14%), ضريبة الدخل, الاستقطاعات, الإقرارات.

قواعد:
- أوضح الأساس القانوني
- اذكر أحدث التعديلات
- حذر من المخالفات الشائعة
- اقترح أفضل الممارسات`,

  period_close: `أنت خبير في إقفال الفترات المالية.
قائمة مراجعة إقفال الفترة:
1. التحقق من توازن جميع القيود
2. مراجعة القيود المعلقة
3. حساب الاستهلاكات والمخصصات
4. تسوية البنوك
5. جرد المخزون
6. مراجعة الذمم
7. حساب الضرائب المستحقة
8. إعداد قيود التسوية
9. مراجعة القوائم المالية
10. الموافقة النهائية

قدم تقريراً بالعناصر المكتملة والناقصة.`,

  error_detection: `أنت نظام كشف أخطاء محاسبي ذكي.
تحليل قيد محاسبي للكشف عن:

1. أخطاء التوازن:
   - مجموع مدين ≠ مجموع دائن
   - فرق صفر ولكن توزيع خاطئ

2. أخطاء الحسابات:
   - استخدام حساب غير مناسب لطبيعة العملية
   - خلط بين الأصول والمصروفات
   - نسيان حساب الضريبة

3. أخطاء المنطق:
   - قيد من جانب واحد فقط
   - تاريخ مستقبلي
   - مبالغ سالبة في غير مكانها

4. أخطاء الامتثال:
   - مخالفة المعايير المحاسبية
   - قيود غير مكتملة

أخرج JSON:
{
  "is_valid": false,
  "errors": [{"type": "", "severity": "", "message": "", "account_code": ""}],
  "warnings": [{"message": ""}],
  "suggestions": [{"action": "", "description": ""}]
}`,

  compliance_check: `أنت خبير في المعايير المحاسبية المصرية والدولية (IFRS).
مراجعة القيد للتحقق من:
- مبدأ الاستحقاق (Accrual)
- مبدأ المقابلة (Matching)
- فصل الأصول عن المصروفات
- الاعتراف بالإيرادات
- قياس التكاليف
- الإفصاح الكافي

حدد أي مخالفة مع ذكر المعيار المعني والتوصية.`
};

async function callGemini(apiKey: string, prompt: string, temperature = 0.2) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const resp = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini error: ${resp.status} ${t}`);
  }
  return await resp.json();
}

function extractText(geminiResponse: any): string {
  const cand = geminiResponse?.candidates?.[0];
  const parts = cand?.content?.parts || [];
  return parts.map((p: any) => p?.text).filter(Boolean).join("\n");
}

function safeJsonParse(text: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try direct parse
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server not configured" }, 500);
  }
  if (!geminiKey) {
    return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    
    // Handle Telegram webhook
    if (body.telegram_message_id) {
      return await handleTelegramMessage(supabase, geminiKey, body as TelegramRequest);
    }

    // Handle WhatsApp webhook
    if (body.whatsapp_bot_id) {
      return await handleWhatsAppMessage(supabase, geminiKey, body as WhatsAppRequest);
    }

    // Handle regular chat
    const chatBody = body as ChatRequest;
    if (!chatBody?.restaurant_id || !chatBody?.message) {
      return jsonResponse({ error: "Missing restaurant_id or message" }, 400);
    }

    // Verify the caller is authenticated and belongs to this tenant
    const auth = await requireRestaurantAccess(req, chatBody.restaurant_id);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
    chatBody.user_id = auth.userId;

    const messageType = chatBody.message_type || 'general';
    const systemPrompt = SYSTEM_PROMPTS[messageType];

    // Build full prompt with context
    let fullPrompt = systemPrompt + "\n\n";
    
    if (chatBody.context?.previous_messages?.length) {
      fullPrompt += "سياق المحادثة السابقة:\n";
      chatBody.context.previous_messages.forEach((msg) => {
        fullPrompt += `${msg.role}: ${msg.content}\n`;
      });
      fullPrompt += "\n";
    }

    fullPrompt += `استفسار المحاسب: ${chatBody.message}\n\n`;
    fullPrompt += "قدم إجابتك بشكل منظم ومفصل:";

    // Call Gemini
    const gemini = await callGemini(geminiKey, fullPrompt, messageType === 'journal_suggestion' ? 0.1 : 0.3);
    const responseText = extractText(gemini);

    // Parse structured response for journal suggestions
    let structuredData = null;
    let validationResults = null;
    let detectedErrors = [];

    if (messageType === 'journal_suggestion' || messageType === 'error_detection') {
      structuredData = safeJsonParse(responseText);
      
      if (structuredData) {
        // Validate balance for journal entries
        if (structuredData.lines) {
          const totalDebit = structuredData.lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
          const totalCredit = structuredData.lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
          const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

          validationResults = {
            is_balanced: isBalanced,
            total_debit: totalDebit,
            total_credit: totalCredit,
            compliance_score: isBalanced ? 0.95 : 0.5
          };

          if (!isBalanced) {
            detectedErrors.push({
              type: 'balance_error',
              severity: 'high',
              message: `القيد غير متوازن: مدين ${totalDebit} ≠ دائن ${totalCredit}`
            });
          }
        }

        // Check for missing tax entries
        const hasTax = structuredData.lines?.some((l: any) => 
          l.account_code?.includes('215') || l.description?.includes('ضريبة')
        );
        const mentionsTax = chatBody.message.toLowerCase().includes('ضريبة') || 
                           chatBody.message.toLowerCase().includes('vat') ||
                           chatBody.message.toLowerCase().includes('قيمة مضافة');
        
        if (mentionsTax && !hasTax) {
          detectedErrors.push({
            type: 'missing_tax',
            severity: 'medium',
            message: 'الوصف يذكر ضريبة لكن القيد لا يتضمن حساب ضريبة'
          });
        }
      }
    }

    // Save chat message
    const { data: chatMessage, error: chatError } = await supabase
      .from('ai_chat_messages')
      .insert({
        restaurant_id: chatBody.restaurant_id,
        user_id: chatBody.user_id,
        role: 'user',
        content: chatBody.message,
        message_type: messageType,
        metadata: { context: chatBody.context }
      })
      .select('id, session_id')
      .single();

    if (chatError) throw chatError;

    // Save AI response
    await supabase.from('ai_chat_messages').insert({
      restaurant_id: chatBody.restaurant_id,
      user_id: chatBody.user_id,
      session_id: chatMessage.session_id,
      role: 'assistant',
      content: responseText,
      message_type: messageType,
      parent_message_id: chatMessage.id,
      metadata: {
        structured_data: structuredData,
        validation_results: validationResults,
        detected_errors: detectedErrors,
        tokens_used: gemini?.usageMetadata?.totalTokenCount
      }
    });

    // Create journal suggestion if applicable
    let suggestionId = null;
    if (messageType === 'journal_suggestion' && structuredData?.lines?.length > 0) {
      const { data: suggestion, error: sugError } = await supabase
        .from('ai_journal_suggestions')
        .insert({
          restaurant_id: chatBody.restaurant_id,
          user_id: chatBody.user_id,
          chat_message_id: chatMessage.id,
          source_type: 'ai_chat',
          title: structuredData.title || 'اقتراح قيد',
          description: structuredData.description || responseText.substring(0, 500),
          suggested_entry: structuredData,
          validation_results: validationResults,
          detected_errors: detectedErrors,
          confidence_score: validationResults?.compliance_score || 0.7,
          status: detectedErrors.length > 0 ? 'pending' : 'pending',
          suggested_fiscal_period_id: chatBody.context?.fiscal_period_id,
          suggested_entry_date: structuredData.suggested_date || new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single();

      if (!sugError) {
        suggestionId = suggestion.id;
      }
    }

    return jsonResponse({
      ok: true,
      response: responseText,
      structured_data: structuredData,
      validation_results: validationResults,
      detected_errors: detectedErrors,
      chat_message_id: chatMessage.id,
      suggestion_id: suggestionId,
      session_id: chatMessage.session_id
    });

  } catch (e: any) {
    console.error("Accounting AI Error:", e);
    return jsonResponse({ error: e?.message || "Unknown error" }, 500);
  }
});

// Handle Telegram messages
async function handleTelegramMessage(supabase: any, geminiKey: string, body: TelegramRequest) {
  try {
    // Save the message
    const { data: message, error: msgError } = await supabase
      .from('telegram_messages')
      .insert({
        telegram_bot_id: body.telegram_bot_id,
        telegram_message_id: BigInt(body.telegram_message_id),
        telegram_chat_id: BigInt(body.telegram_chat_id),
        telegram_sender_name: body.sender_name,
        message_text: body.message_text,
        processing_status: 'processing'
      })
      .select('id, restaurant_id')
      .single();

    if (msgError) throw msgError;

    // Get restaurant context
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('restaurant_id, auto_suggest_entries')
      .eq('id', body.telegram_bot_id)
      .single();

    if (!bot?.auto_suggest_entries) {
      return jsonResponse({ ok: true, message: "Auto-suggestions disabled" });
    }

    // Process with Gemini
    const prompt = SYSTEM_PROMPTS.journal_suggestion + 
      "\n\nرسالة من " + body.sender_name + ":\n" + body.message_text;

    const gemini = await callGemini(geminiKey, prompt, 0.1);
    const responseText = extractText(gemini);
    const structuredData = safeJsonParse(responseText);

    if (structuredData?.lines?.length > 0) {
      // Create AI suggestion
      const { data: suggestion } = await supabase
        .from('ai_journal_suggestions')
        .insert({
          restaurant_id: bot.restaurant_id,
          user_id: (await supabase.from('restaurants').select('user_id').eq('id', bot.restaurant_id).single()).data.user_id,
          source_type: 'telegram',
          source_reference: body.telegram_message_id,
          title: `من Telegram: ${structuredData.title || body.message_text.substring(0, 50)}`,
          description: body.message_text,
          suggested_entry: structuredData,
          confidence_score: 0.8,
          status: 'pending'
        })
        .select('id')
        .single();

      // Update message
      await supabase
        .from('telegram_messages')
        .update({
          processing_status: 'ai_suggested',
          ai_suggestion_id: suggestion.id,
          extracted_entities: {
            amount: structuredData.lines.reduce((sum: number, l: any) => sum + (l.debit || l.credit || 0), 0),
            detected_accounts: structuredData.lines.map((l: any) => l.account_code)
          },
          processed_at: new Date().toISOString()
        })
        .eq('id', message.id);

      return jsonResponse({
        ok: true,
        suggestion_created: true,
        suggestion_id: suggestion.id,
        extracted_data: structuredData
      });
    }

    // No valid suggestion found
    await supabase
      .from('telegram_messages')
      .update({ processing_status: 'error', error_message: 'Could not parse journal entry' })
      .eq('id', message.id);

    return jsonResponse({ ok: true, suggestion_created: false });

  } catch (e: any) {
    console.error("Telegram processing error:", e);
    return jsonResponse({ error: e?.message }, 500);
  }
}
// Handle WhatsApp messages
async function handleWhatsAppMessage(supabase: any, geminiKey: string, body: WhatsAppRequest) {
  try {
    // Save the message if not already saved (webhook might have saved it)
    const { data: bot } = await supabase
      .from('whatsapp_bots')
      .select('restaurant_id, auto_suggest_entries')
      .eq('id', body.whatsapp_bot_id)
      .single();

    if (!bot?.auto_suggest_entries) {
      return jsonResponse({ ok: true, message: "Auto-suggestions disabled" });
    }

    // Get chart of accounts for context
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('code, name')
      .eq('restaurant_id', bot.restaurant_id)
      .eq('is_active', true)
      .limit(50);

    const accountsContext = accounts?.map((a: any) => `${a.code}: ${a.name}`).join('\n') || '';

    // Process with Gemini
    const prompt = SYSTEM_PROMPTS.journal_suggestion + 
      "\n\nContext Accounts:\n" + accountsContext +
      "\n\nMessage from WhatsApp (" + body.sender_number + "):\n" + body.message_text;

    const gemini = await callGemini(geminiKey, prompt, 0.1);
    const responseText = extractText(gemini);
    const structuredData = safeJsonParse(responseText);

    if (structuredData?.lines?.length > 0) {
      // Resolve restaurant owner for user_id
      const { data: r } = await supabase.from('restaurants').select('owner_id').eq('id', bot.restaurant_id).single();
      
      // Create AI suggestion
      const { data: suggestion } = await supabase
        .from('ai_journal_suggestions')
        .insert({
          restaurant_id: bot.restaurant_id,
          user_id: r?.owner_id,
          source_type: 'whatsapp',
          source_reference: body.external_message_id,
          title: `من WhatsApp: ${structuredData.title || body.message_text.substring(0, 50)}`,
          description: body.message_text,
          suggested_entry: structuredData,
          confidence_score: 0.8,
          status: 'pending'
        })
        .select('id')
        .single();

      // Update message
      await supabase
        .from('whatsapp_messages')
        .update({
          processing_status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('external_message_id', body.external_message_id);

      return jsonResponse({
        ok: true,
        suggestion_created: true,
        suggestion_id: suggestion?.id,
        extracted_data: structuredData
      });
    }

    return jsonResponse({ ok: true, suggestion_created: false });

  } catch (e: any) {
    console.error("WhatsApp processing error:", e);
    return jsonResponse({ error: e?.message }, 500);
  }
}
