-- Contracting project controls — additive, scoped, and archive-only.

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

-- Backfill only the unambiguous branch scope from the owning restaurant.
UPDATE public.projects p
SET workspace_id = r.workspace_id
FROM public.restaurants r
WHERE p.restaurant_id = r.id
  AND p.workspace_id IS NULL
  AND r.workspace_id IS NOT NULL;

UPDATE public.project_sites s
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE s.project_id = p.id
  AND s.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

UPDATE public.project_blocks b
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE b.project_id = p.id
  AND b.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

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
