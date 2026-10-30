-- ==============================================================================
-- VIDYA PLATFORM: SECURE ROLE-BASED ACCESS CONTROL & DATASET MAPPING MIGRATION
-- Supabase Project: https://fxwzjeyiywprabttaznt.supabase.co
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new
-- ==============================================================================

-- 1. EXTEND public.user_profiles WITH DATASET MAPPING COLUMNS
-- Maps Supabase Auth UUID (id) to dataset integer student_id and text staff_id
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES public.students(student_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) REFERENCES public.staff(staff_id) ON DELETE SET NULL;

-- Create index on mapping columns for high-performance RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_id ON public.user_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON public.user_profiles(staff_id);

-- 2. ENFORCE DEFAULT STUDENT ROLE ON SIGNUP (Prevents Privilege Escalation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''), 'Student Scholar'),
    new.email,
    'student', -- Strictly enforces student role. Users can NEVER self-assign admin or teacher
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 11 TABLES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;

-- 4. SECURITY DEFINER HELPER FUNCTIONS (Bypasses RLS to eliminate recursion)
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
    WHERE id = auth.uid() AND role IN ('admin', 'institution_admin', 'super_admin')
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
    WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'institution_admin', 'super_admin')
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

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_staff_id() TO authenticated;

-- 5. POLICIES: public.user_profiles
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

CREATE POLICY "Users and admins can view profiles"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role = 'student'
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
    AND student_id IS NOT DISTINCT FROM public.get_my_student_id()
    AND staff_id IS NOT DISTINCT FROM public.get_my_staff_id()
  );

CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. POLICIES: public.students
DROP POLICY IF EXISTS "Role-based read students" ON public.students;
CREATE POLICY "Role-based read students"
  ON public.students FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 7. POLICIES: public.academic_performance
DROP POLICY IF EXISTS "Role-based read academic_performance" ON public.academic_performance;
CREATE POLICY "Role-based read academic_performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 8. POLICIES: public.student_attendance
DROP POLICY IF EXISTS "Role-based read student_attendance" ON public.student_attendance;
CREATE POLICY "Role-based read student_attendance"
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 9. POLICIES: public.learning_profile
DROP POLICY IF EXISTS "Role-based read learning_profile" ON public.learning_profile;
CREATE POLICY "Role-based read learning_profile"
  ON public.learning_profile FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 10. POLICIES: public.predictions
DROP POLICY IF EXISTS "Role-based read predictions" ON public.predictions;
CREATE POLICY "Role-based read predictions"
  ON public.predictions FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 11. POLICIES: public.recommendations
DROP POLICY IF EXISTS "Role-based read recommendations" ON public.recommendations;
CREATE POLICY "Role-based read recommendations"
  ON public.recommendations FOR SELECT TO authenticated
  USING (
    student_id = public.get_my_student_id()
    OR public.is_teacher_or_admin()
  );

-- 12. POLICIES: public.subjects
DROP POLICY IF EXISTS "Authenticated users read subjects" ON public.subjects;
CREATE POLICY "Authenticated users read subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

-- 13. POLICIES: public.staff
DROP POLICY IF EXISTS "Teachers and Admins read staff" ON public.staff;
CREATE POLICY "Teachers and Admins read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (public.is_teacher_or_admin());

-- 14. POLICIES: public.staff_attendance
DROP POLICY IF EXISTS "Staff attendance role isolation" ON public.staff_attendance;
CREATE POLICY "Staff attendance role isolation"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    staff_id = public.get_my_staff_id()
    OR public.is_admin()
  );

-- 15. POLICIES: public.attendance_summary (Staff Attendance Summary)
DROP POLICY IF EXISTS "Attendance summary role isolation" ON public.attendance_summary;
CREATE POLICY "Attendance summary role isolation"
  ON public.attendance_summary FOR SELECT TO authenticated
  USING (
    staff_id = public.get_my_staff_id()
    OR public.is_admin()
  );
