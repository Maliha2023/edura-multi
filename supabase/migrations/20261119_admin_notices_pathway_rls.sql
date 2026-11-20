-- ============================================================================
-- Edura Multi — Admin Notices Schema & Strict Pathway Isolation (RLS)
-- Scope: ONLY `public.notices` for `bangla_version` and `english_version`
--        admin panels. Does not drop or alter unrelated tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway TEXT NOT NULL CHECK (pathway IN ('bangla_version', 'english_version')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2),
  description TEXT NOT NULL CHECK (char_length(trim(description)) >= 5),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('teacher', 'student', 'both')),
  target_class SMALLINT CHECK (target_class IS NULL OR (target_class BETWEEN 1 AND 12)),
  target_group TEXT CHECK (
    target_group IS NULL OR target_group IN ('Science', 'Arts', 'Commerce')
  ),
  category_tag TEXT CHECK (
    category_tag IS NULL OR category_tag IN ('General', 'Academic', 'Urgent')
  ),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Teacher-only notices cannot carry student class/group scope;
  -- Classes 1-8 cannot carry a Science/Arts/Commerce group scope.
  CONSTRAINT notices_audience_scope_consistency CHECK (
    (target_audience = 'teacher' AND target_class IS NULL AND target_group IS NULL)
    OR (
      target_audience IN ('student', 'both')
      AND (
        target_class IS NULL
        OR (target_class BETWEEN 1 AND 8 AND target_group IS NULL)
        OR (target_class BETWEEN 9 AND 12)
      )
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_notices_pathway_audience_created
  ON public.notices (pathway, target_audience, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notices_pathway_class_group
  ON public.notices (pathway, target_class, target_group);

-- Automatic `updated_at` timestamp maintenance for `public.notices`
CREATE OR REPLACE FUNCTION public.touch_notices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notices_touch_updated_at ON public.notices;
CREATE TRIGGER trg_notices_touch_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_notices_updated_at();

-- Helper functions resolving the logged-in admin's active pathway (idempotent)
CREATE OR REPLACE FUNCTION public.current_admin_pathway()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'pathway', ''),
    (
      SELECT p.pathway
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.status = 'active'
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_pathway_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
      AND p.pathway IN ('bangla_version', 'english_version')
  );
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Strict Pathway-Isolated RLS Policies for `public.notices`
DROP POLICY IF EXISTS "pathway_admin_select_notices" ON public.notices;
CREATE POLICY "pathway_admin_select_notices"
  ON public.notices
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );

DROP POLICY IF EXISTS "pathway_admin_insert_notices" ON public.notices;
CREATE POLICY "pathway_admin_insert_notices"
  ON public.notices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );

DROP POLICY IF EXISTS "pathway_admin_update_notices" ON public.notices;
CREATE POLICY "pathway_admin_update_notices"
  ON public.notices
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  )
  WITH CHECK (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );

DROP POLICY IF EXISTS "pathway_admin_delete_notices" ON public.notices;
CREATE POLICY "pathway_admin_delete_notices"
  ON public.notices
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );
