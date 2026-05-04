// Telegram long-polling worker. Designed to be invoked by pg_cron every minute.
// For each active bot in telegram_bots, fetch new updates via Telegram Bot API,
// store them in telegram_messages, and (optionally) trigger AI analysis.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 50_000;
const MIN_REMAINING_MS = 6_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing env configuration' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load all active bots
  const { data: bots, error: botsErr } = await supabase
    .from('telegram_bots')
    .select('id, restaurant_id, auto_suggest_entries, allowed_chat_ids')
    .eq('is_active', true);

  if (botsErr) {
    return new Response(JSON.stringify({ error: botsErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const summary: Record<string, number> = {};

  for (const bot of bots ?? []) {
    if (Date.now() - startTime > MAX_RUNTIME_MS - MIN_REMAINING_MS) break;

    // Ensure bot_state row exists, get current offset
    let { data: state } = await supabase
      .from('telegram_bot_state')
      .select('update_offset')
      .eq('telegram_bot_id', bot.id)
      .maybeSingle();

    if (!state) {
      const { data: created } = await supabase
        .from('telegram_bot_state')
        .insert({ telegram_bot_id: bot.id, restaurant_id: bot.restaurant_id, update_offset: 0 })
        .select('update_offset').single();
      state = created;
    }

    let currentOffset = state?.update_offset ?? 0;
    let processed = 0;

    // Poll loop per bot, share remaining time across bots
    while (true) {
      const elapsed = Date.now() - startTime;
      const remaining = MAX_RUNTIME_MS - elapsed;
      if (remaining < MIN_REMAINING_MS) break;

      const timeout = Math.min(20, Math.floor(remaining / 1000) - 5);
      if (timeout < 1) break;

      const resp = await fetch(`${GATEWAY_URL}/getUpdates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message'] }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('telegram getUpdates failed', data);
        break;
      }

      const updates = data.result ?? [];
      if (updates.length === 0) break; // no new messages, move to next bot

      const allowedSet: Set<number> | null = Array.isArray(bot.allowed_chat_ids) && bot.allowed_chat_ids.length > 0
        ? new Set(bot.allowed_chat_ids.map((x: any) => Number(x)))
        : null;

      const rows = updates
        .filter((u: any) => u.message)
        .filter((u: any) => !allowedSet || allowedSet.has(u.message.chat.id))
        .map((u: any) => ({
          restaurant_id: bot.restaurant_id,
          telegram_bot_id: bot.id,
          telegram_message_id: u.message.message_id,
          telegram_chat_id: u.message.chat.id,
          telegram_chat_title: u.message.chat.title || u.message.chat.username || null,
          telegram_sender_id: u.message.from?.id ?? null,
          telegram_sender_name: u.message.from?.first_name || u.message.from?.username || null,
          message_text: u.message.text || u.message.caption || null,
          message_type: u.message.text ? 'text' : (u.message.photo ? 'photo' : (u.message.document ? 'document' : 'other')),
          telegram_data: u,
          processing_status: 'pending',
          received_at: new Date((u.message.date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        }));

      if (rows.length > 0) {
        const { error: insErr, data: inserted } = await supabase
          .from('telegram_messages')
          .insert(rows)
          .select('id, restaurant_id, message_text');
        if (insErr) {
          console.error('insert telegram_messages failed', insErr);
          break;
        }
        processed += inserted?.length ?? 0;

        // Optionally trigger AI analysis for each new message
        if (bot.auto_suggest_entries && inserted) {
          for (const m of inserted) {
            if (!m.message_text) continue;
            // Fire-and-forget call to ai-accountant-analyze
            fetch(`${supabaseUrl}/functions/v1/ai-accountant-analyze`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                restaurant_id: m.restaurant_id,
                source_type: 'telegram',
                source_message_id: m.id,
                text: m.message_text,
              }),
            }).catch((e) => console.error('analyze fire-and-forget failed', e));
          }
        }
      }

      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      const { error: updErr } = await supabase
        .from('telegram_bot_state')
        .update({ update_offset: newOffset, last_polled_at: new Date().toISOString() })
        .eq('telegram_bot_id', bot.id);
      if (updErr) {
        console.error('update offset failed', updErr);
        break;
      }
      currentOffset = newOffset;
    }

    summary[bot.id] = processed;
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
