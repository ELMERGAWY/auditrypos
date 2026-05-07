// ============================================================
// WHATSAPP WEBHOOK HANDLER
// Processes incoming WhatsApp messages (UltraMsg compatible)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    
    // UltraMsg format: data: { from, to, body, id, ... }
    const msgData = body.data || body;
    const text = msgData.body || '';
    const from = msgData.from; // Phone number
    const instanceId = body.instanceId || body.instance_id;
    const msgId = msgData.id;

    if (!text || !from) {
      return jsonResponse({ ok: true });
    }

    // Find bot config
    const { data: botConfig } = await supabase
      .from('whatsapp_bots')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('is_active', true)
      .single();

    if (!botConfig) {
      console.log(`No active WhatsApp bot found for instance ${instanceId}`);
      return jsonResponse({ ok: true });
    }

    // Save message
    const { data: savedMsg, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        restaurant_id: botConfig.restaurant_id,
        whatsapp_bot_id: botConfig.id,
        external_message_id: msgId,
        sender_number: from,
        message_text: text,
        whatsapp_data: body,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save WhatsApp message:', saveError);
      return jsonResponse({ error: "Storage failure" }, 500);
    }

    // Invoke AI Accountant
    if (text.length > 5 && botConfig.auto_suggest_entries) {
      await supabase.functions.invoke('accounting-ai-v2', {
        body: {
          whatsapp_bot_id: botConfig.id,
          external_message_id: msgId,
          sender_number: from,
          message_text: text
        }
      });
    }

    return jsonResponse({ ok: true, processed: true });

  } catch (e: any) {
    console.error("WhatsApp webhook error:", e);
    return jsonResponse({ error: e?.message || "Internal error" }, 500);
  }
});
