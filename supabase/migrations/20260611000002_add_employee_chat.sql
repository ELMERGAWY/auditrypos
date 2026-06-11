-- ============================================================
-- EMPLOYEE INTERNAL CHAT SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.employee_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name VARCHAR(150) NOT NULL,
  sender_role VARCHAR(100),
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_restaurant ON public.employee_chat_messages(restaurant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.employee_chat_messages ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Allow reading and inserting messages if the user belongs to the restaurant
-- (either they are the owner, or they have a staff profile matching the restaurant_id)
DROP POLICY IF EXISTS chat_messages_access ON public.employee_chat_messages;
CREATE POLICY chat_messages_access ON public.employee_chat_messages
  FOR ALL TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM public.staff_profiles WHERE email = auth.email() OR id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
      UNION
      SELECT restaurant_id FROM public.staff_profiles WHERE email = auth.email() OR id::text = auth.uid()::text
    )
  );

-- Grants
GRANT ALL ON public.employee_chat_messages TO authenticated;

COMMIT;
