import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRestaurantAccess } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatRequest = {
  restaurant_id: string;
  message: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGemini(apiKey: string, prompt: string) {
  // Minimal Gemini REST call (works in Edge Functions)
  // Using a stable endpoint shape: generateContent
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const resp = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
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
  const text = parts.map((p: any) => p?.text).filter(Boolean).join("\n");
  return text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Server not configured" }, 500);
  if (!geminiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = (await req.json()) as ChatRequest;
    if (!body?.restaurant_id || !body?.message) {
      return jsonResponse({ error: "Missing restaurant_id or message" }, 400);
    }

    // Require an authenticated caller with access to this tenant
    const auth = await requireRestaurantAccess(req, body.restaurant_id);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);


    // Build instruction: output strictly JSON suggestion
    const systemInstruction = `
أنت مساعد محاسبي داخل نظام ERP.
هدفك: تحويل وصف العملية إلى اقتراح قيد يومية متوازن وفق المبادئ المحاسبية.

أخرج الناتج بصيغة JSON فقط بدون أي نص إضافي بالشكل:
{
  "title": "...",
  "description": "...",
  "currency": "EGP",
  "lines": [
    { "account_code": "1100", "debit": 0, "credit": 0, "description": "..." }
  ],
  "checks": {
    "balanced": true,
    "total_debit": 0,
    "total_credit": 0
  }
}

قواعد:
- لازم مجموع المدين = مجموع الدائن.
- استخدم أكواد حسابات شائعة: 1100 صندوق، 1400 بنوك، 2100 موردين، 1200 عملاء، 1300 مخزون، 4100 مبيعات، 5100 COGS، 2150 ضريبة مستحقة.
- إذا المعلومات ناقصة، افترض السيناريو الأكثر شيوعًا واذكر ذلك في description.
`;

    const fullPrompt = `${systemInstruction}\n\nوصف العملية:\n${body.message}\n`;
    const gemini = await callGemini(geminiKey, fullPrompt);
    const text = extractText(gemini);

    let suggestion: any;
    try {
      suggestion = JSON.parse(text);
    } catch {
      // Fallback: wrap as raw
      suggestion = { title: "اقتراح قيد", description: text, lines: [], checks: { balanced: false } };
    }

    const title = suggestion?.title || "اقتراح قيد";
    const description = suggestion?.description || null;

    const { data: row, error: insErr } = await supabase
      .from("ai_journal_suggestions")
      .insert({
        restaurant_id: body.restaurant_id,
        source: "chat",
        status: "pending",
        title,
        description,
        suggestion,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return jsonResponse({ ok: true, suggestion_id: row.id });
  } catch (e: any) {
    return jsonResponse({ error: e?.message || "Unknown error" }, 500);
  }
});

