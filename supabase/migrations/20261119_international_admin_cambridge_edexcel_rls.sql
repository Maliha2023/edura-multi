-- ============================================================================
-- International Curriculum (English Medium) Admin Dashboard
-- Strict Pathway Isolation for Cambridge & Edexcel (Admin-Only Phase)
-- ============================================================================
-- Guardrail: Does NOT alter or drop any NCTB (bangla_version / english_version)
-- or Madrasa tables/policies. All objects below are isolated to International
-- Curriculum administration.

-- 1. Helper: Resolve authenticated International Admin pathway from profiles
CREATE OR REPLACE FUNCTION public.current_international_admin_pathway()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pathway
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.role = 'admin'
    AND p.status = 'active'
    AND p.pathway IN ('cambridge', 'edexcel')
  LIMIT 1;
$$;

-- 2. International Admin Coupons (48-hour validity, T-XXXXX / S-XXXXX)
CREATE TABLE IF NOT EXISTS public.international_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[TS]-[0-9]{5}$'),
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  pathway TEXT NOT NULL CHECK (pathway IN ('cambridge', 'edexcel')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intl_coupons_pathway_status
  ON public.international_coupons (pathway, status, created_at DESC);

ALTER TABLE public.international_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intl_admin_coupons_select" ON public.international_coupons;
CREATE POLICY "intl_admin_coupons_select"
  ON public.international_coupons
  FOR SELECT
  USING (pathway = public.current_international_admin_pathway());

DROP POLICY IF EXISTS "intl_admin_coupons_insert" ON public.international_coupons;
CREATE POLICY "intl_admin_coupons_insert"
  ON public.international_coupons
  FOR INSERT
  WITH CHECK (pathway = public.current_international_admin_pathway());

DROP POLICY IF EXISTS "intl_admin_coupons_update" ON public.international_coupons;
CREATE POLICY "intl_admin_coupons_update"
  ON public.international_coupons
  FOR UPDATE
  USING (pathway = public.current_international_admin_pathway())
  WITH CHECK (pathway = public.current_international_admin_pathway());

DROP POLICY IF EXISTS "intl_admin_coupons_delete" ON public.international_coupons;
CREATE POLICY "intl_admin_coupons_delete"
  ON public.international_coupons
  FOR DELETE
  USING (pathway = public.current_international_admin_pathway());

-- 3. International Pending Approvals Queue (Teacher & Student)
CREATE TABLE IF NOT EXISTS public.international_pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  pathway TEXT NOT NULL CHECK (pathway IN ('cambridge', 'edexcel')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  academic_level TEXT NOT NULL,
  subject_or_stream TEXT NOT NULL,
  coupon_code TEXT NOT NULL CHECK (coupon_code ~ '^[TS]-[0-9]{5}$'),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  CONSTRAINT chk_intl_pending_level CHECK (
    (pathway = 'cambridge' AND academic_level IN ('O Level / IGCSE', 'A Level / IAL'))
    OR (pathway = 'edexcel' AND academic_level IN ('International GCSE', 'IAL'))
  )
);

CREATE INDEX IF NOT EXISTS idx_intl_pending_pathway_role
  ON public.international_pending_registrations (pathway, role, submitted_at DESC);

ALTER TABLE public.international_pending_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intl_admin_pending_all" ON public.international_pending_registrations;
CREATE POLICY "intl_admin_pending_all"
  ON public.international_pending_registrations
  FOR ALL
  USING (pathway = public.current_international_admin_pathway())
  WITH CHECK (pathway = public.current_international_admin_pathway());

-- 4. International User Directory Profiles (Cambridge & Edexcel Teachers & Students)
CREATE TABLE IF NOT EXISTS public.international_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  pathway TEXT NOT NULL CHECK (pathway IN ('cambridge', 'edexcel')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  academic_level TEXT NOT NULL,
  subject_or_stream TEXT NOT NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('coupon_auto', 'admin_manual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  coupon_code TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pathway, email),
  CONSTRAINT chk_intl_profile_level CHECK (
    (pathway = 'cambridge' AND academic_level IN ('O Level / IGCSE', 'A Level / IAL'))
    OR (pathway = 'edexcel' AND academic_level IN ('International GCSE', 'IAL'))
  )
);

CREATE INDEX IF NOT EXISTS idx_intl_profiles_pathway_role_status
  ON public.international_profiles (pathway, role, status, joined_at DESC);

ALTER TABLE public.international_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intl_admin_profiles_all" ON public.international_profiles;
CREATE POLICY "intl_admin_profiles_all"
  ON public.international_profiles
  FOR ALL
  USING (pathway = public.current_international_admin_pathway())
  WITH CHECK (pathway = public.current_international_admin_pathway());

-- 5. International Pathway Notices
CREATE TABLE IF NOT EXISTS public.international_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway TEXT NOT NULL CHECK (pathway IN ('cambridge', 'edexcel')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('teacher', 'student', 'both')),
  academic_level TEXT NOT NULL DEFAULT 'all',
  tag TEXT NOT NULL DEFAULT 'General' CHECK (tag IN ('General', 'Exam', 'Urgent')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_intl_notice_level CHECK (
    academic_level = 'all'
    OR (pathway = 'cambridge' AND academic_level IN ('O Level / IGCSE', 'A Level / IAL'))
    OR (pathway = 'edexcel' AND academic_level IN ('International GCSE', 'IAL'))
  )
);

CREATE INDEX IF NOT EXISTS idx_intl_notices_pathway_created
  ON public.international_notices (pathway, created_at DESC);

ALTER TABLE public.international_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intl_admin_notices_all" ON public.international_notices;
CREATE POLICY "intl_admin_notices_all"
  ON public.international_notices
  FOR ALL
  USING (pathway = public.current_international_admin_pathway())
  WITH CHECK (pathway = public.current_international_admin_pathway());

-- 6. International Admin Recent Activity Audit Feed
CREATE TABLE IF NOT EXISTS public.international_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway TEXT NOT NULL CHECK (pathway IN ('cambridge', 'edexcel')),
  category TEXT NOT NULL CHECK (category IN ('coupon', 'approval', 'directory', 'notice', 'security')),
  summary TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intl_activity_pathway_created
  ON public.international_activity_logs (pathway, created_at DESC);

ALTER TABLE public.international_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intl_admin_activity_all" ON public.international_activity_logs;
CREATE POLICY "intl_admin_activity_all"
  ON public.international_activity_logs
  FOR ALL
  USING (pathway = public.current_international_admin_pathway())
  WITH CHECK (pathway = public.current_international_admin_pathway());
