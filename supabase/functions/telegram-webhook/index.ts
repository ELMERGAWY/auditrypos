// ============================================================
// TELEGRAM WEBHOOK HANDLER
// Processes incoming Telegram messages and sends to AI
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

// Telegram API helper
async function sendTelegramMessage(botToken: string, chatId: string, text: string, replyToMessageId?: number) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  };
  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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
    // Handle incoming webhook from Telegram
    const body = await req.json();
    
    // Extract message data
    const message = body.message || body.edited_message || body.channel_post;
    if (!message) {
      return jsonResponse({ ok: true }); // Acknowledge
    }

    const chatId = message.chat?.id?.toString();
    const messageId = message.message_id;
    const text = message.text || message.caption || '';
    const senderId = message.from?.id?.toString();
    const senderName = message.from?.username || message.from?.first_name || 'Unknown';
    const chatTitle = message.chat?.title || message.chat?.username || `Chat ${chatId}`;

    // Find bot configuration by chat ID
    const { data: botConfig } = await supabase
      .from('telegram_bots')
      .select('*')
      .contains('allowed_chat_ids', [chatId])
      .eq('is_active', true)
      .single();

    if (!botConfig) {
      console.log(`No active bot found for chat ${chatId}`);
      return jsonResponse({ ok: true });
    }

    // Check if auto-suggestions enabled
    if (!botConfig.auto_suggest_entries) {
      await sendTelegramMessage(
        botConfig.bot_token_hash, // Note: This should be decrypted in real implementation
        chatId,
        "⚙️ الإقتراحات التلقائية معطلة حالياً. يرجى الاتصال بالمسؤول."
      );
      return jsonResponse({ ok: true });
    }

    // Save the message
    const { data: savedMessage, error: saveError } = await supabase
      .from('telegram_messages')
      .insert({
        restaurant_id: botConfig.restaurant_id,
        telegram_bot_id: botConfig.id,
        telegram_message_id: BigInt(messageId),
        telegram_chat_id: BigInt(chatId),
        telegram_chat_title: chatTitle,
        telegram_sender_id: BigInt(senderId || 0),
        telegram_sender_name: senderName,
        message_text: text,
        message_type: message.photo ? 'photo' : message.document ? 'document' : 'text',
        telegram_data: body,
        processing_status: 'pending'
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('Failed to save message:', saveError);
      return jsonResponse({ error: "Failed to save message" }, 500);
    }

    // Process text messages with AI
    if (text && text.length > 5) {
      // Call the AI function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('accounting-ai-v2', {
        body: {
          telegram_bot_id: botConfig.id,
          telegram_message_id: messageId.toString(),
          telegram_chat_id: chatId,
          sender_name: senderName,
          message_text: text
        }
      });

      if (aiError || !aiResult?.ok) {
        console.error('AI processing failed:', aiError);
        await sendTelegramMessage(
          botConfig.bot_token_hash,
          chatId,
          `⚠️ عذراً ${senderName}، لم أتمكن من معالجة هذه الرسالة.\n\nيرجى التأكد من:\n• ذكر المبلغ بوضوح\n• تحديد نوع العملية (شراء/بيع/دفع/تحصيل)\n• ذكر طريقة الدفع (نقداً/آجل/بنك)`
        );
        return jsonResponse({ ok: true });
      }

      // If suggestion was created
      if (aiResult.suggestion_created && aiResult.suggestion_id) {
        const suggestion = aiResult.extracted_data;
        
        // Build response message
        let responseText = `✅ <b>تم إنشاء اقتراح قيد</b>\n\n`;
        responseText += `<b>${suggestion.title || 'قيد محاسبي'}</b>\n`;
        if (suggestion.description) {
          responseText += `${suggestion.description}\n\n`;
        }
        
        responseText += `<b>تفاصيل القيد:</b>\n`;
        responseText += `<pre>`;
        suggestion.lines?.forEach((line: any) => {
          const account = `${line.account_code} ${line.account_name || ''}`.substring(0, 25).padEnd(25);
          const amount = (line.debit || line.credit || 0).toLocaleString().padStart(12);
          responseText += `${account} ${amount}\n`;
        });
        responseText += `────────────────────────────\n`;
        responseText += `الإجمالي: ${suggestion.validation?.total_debit?.toLocaleString() || 0}\n`;
        responseText += `</pre>\n\n`;
        
        if (suggestion.validation?.is_balanced) {
          responseText += `✅ القيد متوازن\n`;
        } else {
          responseText += `⚠️ تحذير: القيد غير متوازن\n`;
        }
        
        responseText += `\n📋 <b>الحالة:</b> بانتظار مراجعة المحاسب في النظام\n`;
        responseText += `🔒 سيتم التسجيل فقط بعد موافقة المحاسب`;

        await sendTelegramMessage(
          botConfig.bot_token_hash,
          chatId,
          responseText,
          messageId
        );
      } else {
        // Could not create suggestion
        await sendTelegramMessage(
          botConfig.bot_token_hash,
          chatId,
          `🤔 عذراً ${senderName}، لم أفهم العملية المحاسبية من هذه الرسالة.\n\n💡 <b>نصائح للحصول على اقتراح:</b>\n• اكتب: "اشترينا بضاعة من المورد X بـ 10000 جنيه نقداً"\n• أو: "دفعنا إيجار المحل 5000 جنيه من البنك"\n• أو: "بيعنا للعميل Y بـ 15000 جنيه آجل"\n\nيرجى إعادة الصياغة بشكل أوضح.`,
          messageId
        );
      }
    } else if (text && text.length <= 5) {
      // Too short
      await sendTelegramMessage(
        botConfig.bot_token_hash,
        chatId,
        `⚠️ الرسالة قصيرة جداً. يرجى تقديم وصف أوضح للعملية المحاسبية.`,
        messageId
      );
    } else {
      // Non-text message (photo, etc.)
      await sendTelegramMessage(
        botConfig.bot_token_hash,
        chatId,
        `📎 تم استلام المرفق. ${message.photo ? 'الصور' : 'الملفات'} لا تُعالج تلقائياً حالياً. يرجى إرسال نص وصفي للعملية.`,
        messageId
      );
    }

    return jsonResponse({ ok: true, processed: true });

  } catch (e: any) {
    console.error("Telegram webhook error:", e);
    return jsonResponse({ error: e?.message || "Unknown error" }, 500);
  }
});
