-- AuditryPOS marketing content approval and delivery queue
-- Additive only. Existing posts remain drafts unless explicitly submitted by a user.

BEGIN;

INSERT INTO public.permissions (code, name_ar, description_ar, module) VALUES
  ('marketing.access', 'الدخول للتسويق', 'الوصول إلى مركز التسويق والحسابات الاجتماعية', 'marketing'),
  ('marketing.content.create', 'إنشاء محتوى تسويقي', 'إنشاء وتعديل مسودات المحتوى وجدولته للمراجعة', 'marketing'),
  ('marketing.content.approve', 'اعتماد المحتوى التسويقي', 'اعتماد أو رفض المحتوى قبل النشر', 'marketing'),
  ('marketing.content.publish', 'نشر المحتوى التسويقي', 'نشر المحتوى المعتمد على الحسابات المرتبطة', 'marketing'),
  ('marketing.analytics.read', 'قراءة تحليلات التسويق', 'عرض نتائج المنشورات والحملات', 'marketing'),
  ('marketing.ads.read', 'قراءة الحملات الإعلانية', 'عرض الحملات والإنفاق والنتائج', 'marketing'),
  ('marketing.ads.manage', 'إدارة الحملات الإعلانية', 'إنشاء وتعديل وإيقاف الحملات بعد الاعتماد', 'marketing')
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  module = EXCLUDED.module;

ALTER TABLE public.social_media_posts
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.social_media_posts'::regclass
      AND conname = 'social_media_posts_approval_status_check'
  ) THEN
    ALTER TABLE public.social_media_posts
      ADD CONSTRAINT social_media_posts_approval_status_check
      CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_social_media_posts_idempotency
  ON public.social_media_posts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_media_posts_approval
  ON public.social_media_posts (restaurant_id, approval_status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.social_media_post_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed', 'cancelled')),
  idempotency_key TEXT NOT NULL UNIQUE,
  external_post_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, social_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_post_deliveries_queue
  ON public.social_media_post_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_social_post_deliveries_restaurant
  ON public.social_media_post_deliveries (restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_media_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'published', 'failed', 'cancelled')),
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_approval_events_post
  ON public.social_media_approval_events (post_id, created_at DESC);

ALTER TABLE public.social_media_post_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_approval_events ENABLE ROW LEVEL SECURITY;

-- Replace legacy owner-only post policies with company permission checks. These
-- policies do not grant any access to OAuth secrets or service-side queue writes.
DROP POLICY IF EXISTS "Users can view own restaurant social posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can insert own restaurant social posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can update own restaurant social posts" ON public.social_media_posts;
DROP POLICY IF EXISTS "Users can delete own restaurant social posts" ON public.social_media_posts;

CREATE POLICY marketing_posts_read ON public.social_media_posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_posts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);
CREATE POLICY marketing_posts_create ON public.social_media_posts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_posts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.content.create'))
  )
);
CREATE POLICY marketing_posts_update ON public.social_media_posts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_posts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.content.create'))
  )
);
CREATE POLICY marketing_posts_delete ON public.social_media_posts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_posts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.content.create'))
  )
);

DROP POLICY IF EXISTS "Users can view own restaurant social accounts" ON public.social_media_accounts;
CREATE POLICY marketing_accounts_read ON public.social_media_accounts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_accounts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);

DROP POLICY IF EXISTS "Users can update own restaurant social accounts" ON public.social_media_accounts;
CREATE POLICY marketing_accounts_update ON public.social_media_accounts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_accounts.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);

CREATE POLICY marketing_delivery_read ON public.social_media_post_deliveries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_post_deliveries.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);

CREATE POLICY marketing_approval_events_read ON public.social_media_approval_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = social_media_approval_events.restaurant_id
      AND (r.owner_id = auth.uid() OR public.check_user_permission(auth.uid(), r.company_id, 'marketing.access'))
  )
);

COMMENT ON TABLE public.social_media_post_deliveries IS
  'Idempotent per-account delivery outbox for social posts. Writes are server-side only.';
COMMENT ON TABLE public.social_media_approval_events IS
  'Audit trail for marketing content approval and delivery state changes.';

COMMIT;
