-- ============================================================
-- WHATSAPP INTEGRATION SCHEMA
-- Stores configuration for WhatsApp bots/webhooks and messages
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  bot_name TEXT NOT NULL,
  provider VARCHAR(50) DEFAULT 'ultramsg', -- 'ultramsg', 'twilio', 'custom'
  instance_id TEXT, -- For UltraMsg
  token_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  allowed_numbers TEXT[], 
  auto_suggest_entries BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, instance_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  whatsapp_bot_id UUID REFERENCES public.whatsapp_bots(id) ON DELETE CASCADE,
  external_message_id TEXT,
  sender_number TEXT,
  sender_name TEXT,
  message_text TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  whatsapp_data JSONB,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.whatsapp_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_bots_isolation ON public.whatsapp_bots
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY whatsapp_messages_isolation ON public.whatsapp_messages
  FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

COMMIT;
