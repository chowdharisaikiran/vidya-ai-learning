-- ==============================================================================
-- VIDYA PLATFORM MIGRATION: FIX RLS INFINITE RECURSION ON user_profiles
-- Project Reference: fxwzjeyiywprabttaznt (https://fxwzjeyiywprabttaznt.supabase.co)
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- Bypasses table-level RLS during role & mapping checks to eliminate circular recursion.
-- Fixed search_path (public, auth) prevents search_path injection vulnerabilities.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'institution_admin', 'super_admin', 'platform_owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'institution_admin', 'super_admin', 'platform_owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_student_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT student_id FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_staff_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT staff_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Restrict function execution: Revoke from PUBLIC, grant exclusively to authenticated users
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_student_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_staff_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_staff_id() TO authenticated;

-- 2. DROP OBSOLETE & RECURSIVE POLICIES ON public.user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles and roles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own name only" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public read user_profiles" ON public.user_profiles;

-- 3. CREATE NON-RECURSIVE POLICIES ON public.user_profiles

-- SELECT: Authenticated users view only their own record; verified administrators view all records
CREATE POLICY "Users and admins can view profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- INSERT: Self-registration strictly enforces 'student' role (prevents role elevation)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'student'
  );

-- UPDATE (Self): Users can modify own profile but CANNOT alter role, student_id, or staff_id
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
    AND student_id IS NOT DISTINCT FROM public.get_my_student_id()
    AND staff_id IS NOT DISTINCT FROM public.get_my_staff_id()
  );

-- UPDATE (Admin): Verified administrators can update any profile, assign roles, and map IDs
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE (Admin): Only verified administrators can delete user profiles
CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. DEPENDENT TABLE POLICIES WITH STRICT TYPE CASTING & LEAST PRIVILEGE

-- Students (student_id is INTEGER)
DROP POLICY IF EXISTS "Role-based read students" ON public.students;
DROP POLICY IF EXISTS "Public read students" ON public.students;
DROP POLICY IF EXISTS "Public write students" ON public.students;
DROP POLICY IF EXISTS "Public update students" ON public.students;
DROP POLICY IF EXISTS "Admins manage students" ON public.students;

CREATE POLICY "Role-based read students"
  ON public.students FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Admins manage students"
  ON public.students FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Academic Performance (student_id is INTEGER)
DROP POLICY IF EXISTS "Role-based read academic_performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Public read academic_performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Teachers and admins manage academic_performance" ON public.academic_performance;

CREATE POLICY "Role-based read academic_performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers and admins manage academic_performance"
  ON public.academic_performance FOR ALL TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Student Attendance (student_id is INTEGER)
DROP POLICY IF EXISTS "Role-based read student_attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Public read student_attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Teachers and admins manage student_attendance" ON public.student_attendance;

CREATE POLICY "Role-based read student_attendance"
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers and admins manage student_attendance"
  ON public.student_attendance FOR ALL TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Learning Profile (student_id is TEXT - cast integer get_my_student_id to text)
DROP POLICY IF EXISTS "Role-based read learning_profile" ON public.learning_profile;
DROP POLICY IF EXISTS "Public read learning_profile" ON public.learning_profile;
DROP POLICY IF EXISTS "Teachers and admins manage learning_profile" ON public.learning_profile;

CREATE POLICY "Role-based read learning_profile"
  ON public.learning_profile FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()::text
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers and admins manage learning_profile"
  ON public.learning_profile FOR ALL TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Predictions (student_id is TEXT - cast integer get_my_student_id to text)
DROP POLICY IF EXISTS "Role-based read predictions" ON public.predictions;
DROP POLICY IF EXISTS "Public read predictions" ON public.predictions;
DROP POLICY IF EXISTS "Admins and teachers manage predictions" ON public.predictions;

CREATE POLICY "Role-based read predictions"
  ON public.predictions FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()::text
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Admins and teachers manage predictions"
  ON public.predictions FOR ALL TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Recommendations (student_id is TEXT - cast integer get_my_student_id to text)
DROP POLICY IF EXISTS "Role-based read recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Public read recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Teachers and admins manage recommendations" ON public.recommendations;

CREATE POLICY "Role-based read recommendations"
  ON public.recommendations FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()::text
    OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers and admins manage recommendations"
  ON public.recommendations FOR ALL TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Staff (staff_id is TEXT)
DROP POLICY IF EXISTS "Teachers and Admins read staff" ON public.staff;
DROP POLICY IF EXISTS "Public read staff" ON public.staff;
DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;

CREATE POLICY "Teachers and Admins read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (public.is_teacher_or_admin());

CREATE POLICY "Admins manage staff"
  ON public.staff FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Staff Attendance (staff_id is TEXT)
DROP POLICY IF EXISTS "Staff attendance role isolation" ON public.staff_attendance;
DROP POLICY IF EXISTS "Public read staff_attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Admins manage staff_attendance" ON public.staff_attendance;

CREATE POLICY "Staff attendance role isolation"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    staff_id = public.get_my_staff_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins manage staff_attendance"
  ON public.staff_attendance FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Attendance Summary (Staff Attendance Summary - staff_id is TEXT)
DROP POLICY IF EXISTS "Attendance summary role isolation" ON public.attendance_summary;
DROP POLICY IF EXISTS "Public read attendance_summary" ON public.attendance_summary;
DROP POLICY IF EXISTS "Admins manage attendance_summary" ON public.attendance_summary;

CREATE POLICY "Attendance summary role isolation"
  ON public.attendance_summary FOR SELECT TO authenticated
  USING (
    staff_id = public.get_my_staff_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins manage attendance_summary"
  ON public.attendance_summary FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Faculty Class Assignments (student_id is INTEGER, staff_id is VARCHAR)
DROP POLICY IF EXISTS "Admins can view all faculty assignments" ON public.faculty_class_assignments;
DROP POLICY IF EXISTS "Admins can insert faculty assignments" ON public.faculty_class_assignments;
DROP POLICY IF EXISTS "Admins can update faculty assignments" ON public.faculty_class_assignments;
DROP POLICY IF EXISTS "Admins can delete faculty assignments" ON public.faculty_class_assignments;
DROP POLICY IF EXISTS "Teachers can view assigned students" ON public.faculty_class_assignments;

CREATE POLICY "Admins can view all faculty assignments"
  ON public.faculty_class_assignments FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert faculty assignments"
  ON public.faculty_class_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update faculty assignments"
  ON public.faculty_class_assignments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete faculty assignments"
  ON public.faculty_class_assignments FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Teachers can view assigned students"
  ON public.faculty_class_assignments FOR SELECT TO authenticated
  USING (
    staff_id = public.get_my_staff_id()
    AND public.get_my_role() = 'teacher'
  );
