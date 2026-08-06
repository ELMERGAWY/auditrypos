// AI Accountant — analyzes a free-text message (from Telegram, WhatsApp, or in-app chat)
// and proposes a journal entry / payment voucher / receipt voucher.
// The accountant must approve the suggestion before it is posted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireRestaurantAccess } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface AnalyzeBody {
  restaurant_id: string;
  source_type: 'telegram' | 'whatsapp' | 'chat' | 'manual';
  source_message_id?: string; // telegram_messages.id or chat message id
  chat_message_id?: string;
  text: string;
  standard?: 'IFRS' | 'EAS' | 'US_GAAP';
}

const SYSTEM_PROMPT = (standard: string, accountsContext: string) => `
أنت مساعد محاسبي خبير. تتلقى رسائل عربية (أو إنجليزية) من المالك أو الموظف
وتستخرج منها قيداً محاسبياً مقترحاً وفقاً لمعيار ${standard}.

سياق شجرة الحسابات المتاحة (استخدم رموز موجودة فقط أو اقترح حساباً جديداً واضح الاسم):
${accountsContext || '(غير متاحة — استخدم تسميات قياسية)'}

أرجع JSON فقط بهذا الشكل:
{
  "transaction_type": "journal_entry" | "payment_voucher" | "receipt_voucher",
  "title": "عنوان قصير",
  "description": "وصف العملية",
  "entry_date": "YYYY-MM-DD",
  "lines": [
    { "account_code": "1100", "account_name": "النقدية", "debit": 0, "credit": 0, "description": "..." }
  ],
  "confidence_score": 0.0-1.0,
  "validation": { "is_balanced": true, "warnings": [] },
  "detected_errors": []
}

قواعد:
- مجموع المدين = مجموع الدائن (وإلا أضف تحذيراً).
- التواريخ افتراضياً اليوم إن لم تُذكر.
- لا تخترع مبالغ — إن كانت غير واضحة اطلبها في "detected_errors".
`.trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env configuration' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: AnalyzeBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  if (!body.restaurant_id || !body.text || !body.source_type) {
    return new Response(JSON.stringify({ error: 'restaurant_id, source_type and text are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Require an authenticated caller with access to this tenant
  const auth = await requireRestaurantAccess(req, body.restaurant_id);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId: string = auth.userId;

  const standard = body.standard || 'EAS';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load chart of accounts for context
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('code, name, account_type')
    .eq('restaurant_id', body.restaurant_id)
    .eq('is_active', true)
    .limit(80);

  const accountsContext = (accounts ?? [])
    .map((a: any) => `${a.code} - ${a.name} (${a.account_type})`)
    .join('\n');

  // Call Lovable AI
  const aiResp = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(standard, accountsContext) },
        { role: 'user', content: body.text },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error('AI gateway failed', aiResp.status, errText);
    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded — try later' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted — add funds in Settings' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const aiData = await aiResp.json();
  const rawContent = aiData.choices?.[0]?.message?.content ?? '{}';
  let suggestion: any;
  try { suggestion = JSON.parse(rawContent); } catch {
    suggestion = { error: 'invalid_ai_output', raw: rawContent };
  }

  // Persist suggestion
  const { data: inserted, error: insErr } = await supabase
    .from('ai_journal_suggestions')
    .insert({
      restaurant_id: body.restaurant_id,
      user_id: userId,
      chat_message_id: body.chat_message_id ?? null,
      source_type: body.source_type === 'chat' ? 'ai_chat' : body.source_type,
      source_reference: body.source_message_id ?? null,
      title: suggestion.title ?? 'اقتراح قيد محاسبي',
      description: suggestion.description ?? body.text.slice(0, 200),
      suggested_entry: suggestion,
      validation_results: suggestion.validation ?? {},
      detected_errors: suggestion.detected_errors ?? [],
      confidence_score: suggestion.confidence_score ?? 0.5,
      status: 'pending',
      analysis_standard: standard,
      suggested_entry_date: suggestion.entry_date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (insErr) {
    console.error('insert suggestion failed', insErr);
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Link telegram_messages row if relevant
  if (body.source_type === 'telegram' && body.source_message_id) {
    await supabase.from('telegram_messages')
      .update({ ai_suggestion_id: inserted.id, processing_status: 'analyzed', processed_at: new Date().toISOString() })
      .eq('id', body.source_message_id);
  }

  return new Response(JSON.stringify({ ok: true, suggestion: inserted }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
