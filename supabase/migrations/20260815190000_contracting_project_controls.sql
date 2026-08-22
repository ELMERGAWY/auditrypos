-- Contracting project controls — additive, scoped, and archive-only.
-- The remote preflight showed project_sites is missing, so this migration
-- creates the dependency before adding controls. No existing rows are changed.

CREATE TABLE IF NOT EXISTS public.project_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE
);

ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_sites_owner_all ON public.project_sites;
CREATE POLICY project_sites_owner_all ON public.project_sites
FOR ALL TO authenticated
USING (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.check_user_permission(
    auth.uid(),
    (SELECT r.company_id FROM public.restaurants r WHERE r.id = project_sites.restaurant_id),
    'projects.manage'
  )
)
WITH CHECK (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.check_user_permission(
    auth.uid(),
    (SELECT r.company_id FROM public.restaurants r WHERE r.id = project_sites.restaurant_id),
    'projects.manage'
  )
);

CREATE INDEX IF NOT EXISTS idx_project_sites_project_restaurant
  ON public.project_sites(project_id, restaurant_id, created_at DESC);

ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'construction',
  ADD COLUMN IF NOT EXISTS contract_number text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_percent numeric NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  ADD COLUMN IF NOT EXISTS cost_control_method text NOT NULL DEFAULT 'actual_cost';

ALTER TABLE IF EXISTS public.project_sites
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE IF EXISTS public.project_blocks
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_percent numeric NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_active
  ON public.projects(restaurant_id, workspace_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_sites_workspace_active
  ON public.project_sites(restaurant_id, workspace_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_blocks_workspace_active
  ON public.project_blocks(project_id, workspace_id, archived_at, created_at DESC);

INSERT INTO public.permissions (code, name_ar, description_ar, module)
VALUES ('projects.manage', 'إدارة المشاريع والمقاولات', 'إنشاء وتعديل وأرشفة المشاريع والمواقع والمراحل', 'projects')
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  module = EXCLUDED.module;

-- Deliberately no data backfill here. Existing project scope is preserved;
-- any approved backfill must be reviewed and run as a separate, targeted action.

CREATE OR REPLACE FUNCTION public.archive_contracting_entity(
  p_entity text,
  p_entity_id uuid,
  p_restaurant_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (
    public.is_restaurant_owner(auth.uid(), p_restaurant_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.check_user_permission(
      auth.uid(),
      (SELECT r.company_id FROM public.restaurants r WHERE r.id = p_restaurant_id),
      'projects.manage'
    )
  ) THEN
    RAISE EXCEPTION 'غير مصرح بأرشفة كيان المقاولات';
  END IF;

  IF p_entity = 'project' THEN
    UPDATE public.projects
    SET archived_at = now(), status = 'archived', updated_at = now()
    WHERE id = p_entity_id AND restaurant_id = p_restaurant_id AND archived_at IS NULL;
  ELSIF p_entity = 'site' THEN
    UPDATE public.project_sites
    SET archived_at = now()
    WHERE id = p_entity_id AND restaurant_id = p_restaurant_id AND archived_at IS NULL;
  ELSIF p_entity = 'block' THEN
    UPDATE public.project_blocks b
    SET archived_at = now()
    WHERE b.id = p_entity_id
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = b.project_id AND p.restaurant_id = p_restaurant_id
      )
      AND b.archived_at IS NULL;
  ELSE
    RAISE EXCEPTION 'نوع كيان المقاولات غير مدعوم';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_contracting_entity(text,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_contracting_entity(text,uuid,uuid,text) TO authenticated, service_role;
