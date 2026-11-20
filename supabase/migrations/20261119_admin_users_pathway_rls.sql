-- ============================================================================
-- Edura Multi — Admin Users Workspace Schema & Strict Pathway Isolation (RLS)
-- Scope: ONLY `profiles` and `pending_registrations` for `bangla_version`
--        and `english_version` admin panels. Does not drop or alter unrelated tables.
-- ============================================================================

-- 1. Ensure required columns exist on `profiles`
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('bangla_version', 'english_version')),
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'teacher', 'student')),
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS academic_class SMALLINT CHECK (academic_class BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS academic_group TEXT CHECK (
    academic_group IS NULL OR academic_group IN ('Science', 'Arts', 'Commerce')
  ),
  ADD COLUMN IF NOT EXISTS registration_type TEXT NOT NULL DEFAULT 'coupon_auto'
    CHECK (registration_type IN ('coupon_auto', 'admin_manual')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Enforce group validity: only Class 9-12 may carry Science/Arts/Commerce
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_class_group_consistency'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_class_group_consistency
      CHECK (
        academic_class IS NULL
        OR (academic_class BETWEEN 1 AND 8 AND academic_group IS NULL)
        OR (academic_class BETWEEN 9 AND 12)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_pathway_role_status
  ON public.profiles (pathway, role, status);

CREATE INDEX IF NOT EXISTS idx_profiles_pathway_class_group
  ON public.profiles (pathway, academic_class, academic_group);

-- 2. Ensure required columns exist on `pending_registrations`
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway TEXT NOT NULL CHECK (pathway IN ('bangla_version', 'english_version')),
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  academic_class SMALLINT NOT NULL CHECK (academic_class BETWEEN 1 AND 12),
  academic_group TEXT CHECK (
    academic_group IS NULL OR academic_group IN ('Science', 'Arts', 'Commerce')
  ),
  coupon_code TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pending_registrations
  ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('bangla_version', 'english_version')),
  ADD COLUMN IF NOT EXISTS academic_class SMALLINT CHECK (academic_class BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS academic_group TEXT CHECK (
    academic_group IS NULL OR academic_group IN ('Science', 'Arts', 'Commerce')
  ),
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pending_reg_pathway_role
  ON public.pending_registrations (pathway, role, expires_at);

-- 3. Helper function resolving the authenticated admin's active pathway
--    (reads from JWT app_metadata.pathway or falls back to their own profile row)
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- 5. Strict Pathway-Isolated RLS Policies for `profiles`
DROP POLICY IF EXISTS "pathway_admin_select_profiles" ON public.profiles;
CREATE POLICY "pathway_admin_select_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_active_pathway_admin()
      AND role IN ('teacher', 'student')
      AND pathway = public.current_admin_pathway()
    )
  );

DROP POLICY IF EXISTS "pathway_admin_insert_profiles" ON public.profiles;
CREATE POLICY "pathway_admin_insert_profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_pathway_admin()
    AND role IN ('teacher', 'student')
    AND pathway = public.current_admin_pathway()
    AND registration_type IN ('coupon_auto', 'admin_manual')
  );

DROP POLICY IF EXISTS "pathway_admin_update_profiles" ON public.profiles;
CREATE POLICY "pathway_admin_update_profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND role IN ('teacher', 'student')
    AND pathway = public.current_admin_pathway()
  )
  WITH CHECK (
    public.is_active_pathway_admin()
    AND role IN ('teacher', 'student')
    AND pathway = public.current_admin_pathway()
  );

DROP POLICY IF EXISTS "pathway_admin_delete_profiles" ON public.profiles;
CREATE POLICY "pathway_admin_delete_profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND role IN ('teacher', 'student')
    AND pathway = public.current_admin_pathway()
  );

-- 6. Strict Pathway-Isolated RLS Policies for `pending_registrations`
DROP POLICY IF EXISTS "pathway_admin_select_pending_registrations" ON public.pending_registrations;
CREATE POLICY "pathway_admin_select_pending_registrations"
  ON public.pending_registrations
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );

DROP POLICY IF EXISTS "pathway_admin_update_pending_registrations" ON public.pending_registrations;
CREATE POLICY "pathway_admin_update_pending_registrations"
  ON public.pending_registrations
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

DROP POLICY IF EXISTS "pathway_admin_delete_pending_registrations" ON public.pending_registrations;
CREATE POLICY "pathway_admin_delete_pending_registrations"
  ON public.pending_registrations
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_pathway_admin()
    AND pathway = public.current_admin_pathway()
  );
