-- ==============================================================================
-- Migration: 20261015_least_privilege_academic_performance_rls.sql
-- VIDYA PLATFORM: LEAST-PRIVILEGE RLS POLICIES FOR ACADEMIC PERFORMANCE
-- Supabase Project: https://fxwzjeyiywprabttaznt.supabase.co
--
-- STATUS: PREPARED ONLY (NOT EXECUTED). AWAITING USER APPROVAL.
--
-- ARCHITECTURE: Pure declarative RLS (Simplest Secure Design).
-- Bypasses the need for any SECURITY DEFINER helper by leveraging the existing
-- tested RLS policies on public.faculty_class_assignments and public.user_profiles.
-- ==============================================================================

BEGIN;

-- 1. Ensure Row-Level Security is active on academic_performance
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;

-- 2. Drop only explicitly verified legacy and prior policy names
DROP POLICY IF EXISTS "Public read academic_performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Role-based read academic_performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Allow all read" ON public.academic_performance;
DROP POLICY IF EXISTS "Students can view own academic performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Teachers can view assigned students academic performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Admins can view all academic performance" ON public.academic_performance;

-- 3. Policy A: Students can view only their own linked academic performance record
--    - Strictly matches user_profiles.student_id (integer) to academic_performance.student_id
--    - Unmapped students (student_id IS NULL) evaluate to NULL/false (0 rows returned)
--    - Enforces role = 'student'
CREATE POLICY "Students can view own academic performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    student_id = (
      SELECT up.student_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'student'
    )
  );

-- 4. Policy B: Teachers can view only assigned students' academic performance
--    - Direct relational join via public.faculty_class_assignments
--    - Evaluates cleanly under faculty_class_assignments' existing RLS policy
--    - Students have NO SELECT policy on faculty_class_assignments, ensuring zero cross-role leak
CREATE POLICY "Teachers can view assigned students academic performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.faculty_class_assignments fca
      WHERE fca.student_id = public.academic_performance.student_id
        AND fca.staff_id = (
          SELECT up.staff_id
          FROM public.user_profiles up
          WHERE up.id = auth.uid()
            AND up.role = 'teacher'
        )
    )
  );

-- 5. Policy C: Administrators can view the institutional cohort
--    - Verified against user_profiles role = 'admin'
CREATE POLICY "Admins can view all academic performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

COMMIT;
