// AI Accountant — reviews the financial statements and recent journal entries
// against a chosen accounting standard (IFRS / EAS / US GAAP) and returns
// recommendations & detected issues.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireRestaurantAccess } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface ReviewBody {
  restaurant_id: string;
  standard?: 'IFRS' | 'EAS' | 'US_GAAP';
  period_from?: string;
  period_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env' }), { status: 500, headers: corsHeaders });
  }

  let body: ReviewBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }
  if (!body.restaurant_id) {
    return new Response(JSON.stringify({ error: 'restaurant_id required' }), { status: 400, headers: corsHeaders });
  }

  // Require an authenticated caller with access to this tenant
  const auth = await requireRestaurantAccess(req, body.restaurant_id);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  const standard = body.standard || 'EAS';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Pull recent journal entries summary
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id, entry_date, description, total_debit, total_credit')
    .eq('restaurant_id', body.restaurant_id)
    .order('entry_date', { ascending: false })
    .limit(50);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('code, name, account_type, current_balance')
    .eq('restaurant_id', body.restaurant_id)
    .eq('is_active', true)
    .limit(120);

  const summary = {
    period: { from: body.period_from ?? null, to: body.period_to ?? null },
    standard,
    accounts_summary: (accounts ?? []).map((a: any) => ({
      code: a.code, name: a.name, type: a.account_type, balance: a.current_balance,
    })),
    recent_entries: (entries ?? []).map((e: any) => ({
      date: e.entry_date, description: e.description,
      debit: e.total_debit, credit: e.total_credit, status: e.status,
    })),
  };

  const systemPrompt = `
أنت مراجع حسابات خبير وفقاً لمعايير ${standard === 'IFRS' ? 'IFRS الدولية' : standard === 'US_GAAP' ? 'US GAAP الأمريكية' : 'المحاسبة المصرية EAS'}.
ستحلل ملخص الحسابات والقيود الأخيرة وتعيد JSON بالشكل التالي:
{
  "overall_health": "good" | "warning" | "critical",
  "summary": "ملخص قصير",
  "findings": [
    { "severity": "info"|"warn"|"error", "title": "...", "detail": "...", "standard_reference": "..." }
  ],
  "recommendations": [
    { "title": "...", "action": "...", "priority": "low"|"medium"|"high" }
  ]
}
`.trim();

  const aiResp = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(summary) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!aiResp.ok) {
    const t = await aiResp.text();
    console.error('AI review failed', aiResp.status, t);
    return new Response(JSON.stringify({ error: 'AI review failed', status: aiResp.status }), {
      status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await aiResp.json();
  let report: any = {};
  try { report = JSON.parse(data.choices?.[0]?.message?.content ?? '{}'); } catch { report = { error: 'parse_failed' }; }

  return new Response(JSON.stringify({ ok: true, standard, report, sampled: { entries: entries?.length ?? 0, accounts: accounts?.length ?? 0 } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
