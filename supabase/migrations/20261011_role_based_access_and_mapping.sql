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

-- 4. POLICIES: public.user_profiles
-- Users can view their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only Admins can modify roles and dataset mappings
DROP POLICY IF EXISTS "Admins can update user profiles and roles" ON public.user_profiles;
CREATE POLICY "Admins can update user profiles and roles"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can update only their own full_name (cannot alter role or mappings)
DROP POLICY IF EXISTS "Users can update own name only" ON public.user_profiles;
CREATE POLICY "Users can update own name only"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    AND student_id IS NOT DISTINCT FROM (SELECT student_id FROM public.user_profiles WHERE id = auth.uid())
    AND staff_id IS NOT DISTINCT FROM (SELECT staff_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- 5. POLICIES: public.students
DROP POLICY IF EXISTS "Role-based read students" ON public.students;
CREATE POLICY "Role-based read students"
  ON public.students FOR SELECT TO authenticated
  USING (
    student_id = (SELECT student_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 6. POLICIES: public.academic_performance
DROP POLICY IF EXISTS "Role-based read academic_performance" ON public.academic_performance;
CREATE POLICY "Role-based read academic_performance"
  ON public.academic_performance FOR SELECT TO authenticated
  USING (
    student_id = (SELECT student_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 7. POLICIES: public.student_attendance
DROP POLICY IF EXISTS "Role-based read student_attendance" ON public.student_attendance;
CREATE POLICY "Role-based read student_attendance"
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    student_id = (SELECT student_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 8. POLICIES: public.learning_profile
DROP POLICY IF EXISTS "Role-based read learning_profile" ON public.learning_profile;
CREATE POLICY "Role-based read learning_profile"
  ON public.learning_profile FOR SELECT TO authenticated
  USING (
    student_id::text = (SELECT student_id::text FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 9. POLICIES: public.predictions
DROP POLICY IF EXISTS "Role-based read predictions" ON public.predictions;
CREATE POLICY "Role-based read predictions"
  ON public.predictions FOR SELECT TO authenticated
  USING (
    student_id::text = (SELECT student_id::text FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 10. POLICIES: public.recommendations
DROP POLICY IF EXISTS "Role-based read recommendations" ON public.recommendations;
CREATE POLICY "Role-based read recommendations"
  ON public.recommendations FOR SELECT TO authenticated
  USING (
    student_id::text = (SELECT student_id::text FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

-- 11. POLICIES: public.subjects
DROP POLICY IF EXISTS "Authenticated users read subjects" ON public.subjects;
CREATE POLICY "Authenticated users read subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

-- 12. POLICIES: public.staff
DROP POLICY IF EXISTS "Teachers and Admins read staff" ON public.staff;
CREATE POLICY "Teachers and Admins read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

-- 13. POLICIES: public.staff_attendance
DROP POLICY IF EXISTS "Staff attendance role isolation" ON public.staff_attendance;
CREATE POLICY "Staff attendance role isolation"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    staff_id = (SELECT staff_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 14. POLICIES: public.attendance_summary (Staff Attendance Summary)
DROP POLICY IF EXISTS "Attendance summary role isolation" ON public.attendance_summary;
CREATE POLICY "Attendance summary role isolation"
  ON public.attendance_summary FOR SELECT TO authenticated
  USING (
    staff_id = (SELECT staff_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
