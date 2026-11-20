-- ============================================================================
-- Edura Multi: Student Coupon Onboarding & Pathway-Isolated Student Workspace
-- Scope: Bangla Version & English Version Students ONLY (Phase 1)
-- Guardrail: Does NOT drop, alter, or break any existing Admin tables/policies.
-- ============================================================================

-- 1. Helper: Return the authenticated student's active profile record
CREATE OR REPLACE FUNCTION public.current_student_profile()
RETURNS TABLE (
  pathway TEXT,
  academic_class SMALLINT,
  academic_group TEXT,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pathway, p.academic_class, p.academic_group, p.status
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.role = 'student'
    AND p.status = 'active'
    AND p.pathway IN ('bangla_version', 'english_version')
  LIMIT 1;
$$;

-- 2. Student-scoped SELECT policy on public.notices
-- Students can ONLY read notices from their matching pathway targeted to 'student' or 'both',
-- and matching their academic_class / academic_group when the admin specified them.
DROP POLICY IF EXISTS "notices_student_select_scoped" ON public.notices;
CREATE POLICY "notices_student_select_scoped"
  ON public.notices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_student_profile() sp
      WHERE sp.pathway = notices.pathway
        AND notices.target_audience IN ('student', 'both')
        AND (notices.target_class IS NULL OR notices.target_class = sp.academic_class)
        AND (notices.target_group IS NULL OR notices.target_group = sp.academic_group)
    )
  );

-- 3. Student self-profile read policy on public.profiles
DROP POLICY IF EXISTS "profiles_student_select_own" ON public.profiles;
CREATE POLICY "profiles_student_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'student'
    AND pathway IN ('bangla_version', 'english_version')
  );

-- 4. Public / Anonymous Coupon-based Student Pending Registration Insert Policy
-- Ensures pending student applications are strictly scoped to bangla_version or english_version
-- and enforce the 48-hour expiry window and Class 9-12 group rules.
DROP POLICY IF EXISTS "pending_registrations_student_coupon_insert" ON public.pending_registrations;
CREATE POLICY "pending_registrations_student_coupon_insert"
  ON public.pending_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    role = 'student'
    AND pathway IN ('bangla_version', 'english_version')
    AND coupon_code ~ '^S-[0-9]{5}$'
    AND academic_class BETWEEN 1 AND 12
    AND (
      (academic_class BETWEEN 1 AND 8 AND academic_group IS NULL)
      OR (academic_class BETWEEN 9 AND 12 AND academic_group IN ('Science', 'Arts', 'Commerce'))
    )
    AND expires_at > now()
    AND expires_at <= now() + interval '48 hours 5 minutes'
  );
