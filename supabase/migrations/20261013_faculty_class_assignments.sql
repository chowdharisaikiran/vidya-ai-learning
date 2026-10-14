-- ==============================================================================
-- VIDYA PLATFORM: SECURE TEACHER-TO-STUDENT ASSIGNMENT SYSTEM MIGRATION
-- Supabase Project: https://fxwzjeyiywprabttaznt.supabase.co
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new
-- ==============================================================================

-- 1. CREATE ASSIGNMENT RELATIONSHIP TABLE
CREATE TABLE IF NOT EXISTS public.faculty_class_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id VARCHAR(50) NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES public.subjects(subject_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT uq_faculty_student_subject UNIQUE (staff_id, student_id, subject_id)
);

-- Performance indices for relational joins and RLS filter evaluation
CREATE INDEX IF NOT EXISTS idx_fca_staff_id ON public.faculty_class_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_fca_student_id ON public.faculty_class_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fca_subject_id ON public.faculty_class_assignments(subject_id);

-- Enforce uniqueness even when subject_id is NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_fca_unique_staff_student_subject
  ON public.faculty_class_assignments (staff_id, student_id, COALESCE(subject_id, ''));

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.faculty_class_assignments ENABLE ROW LEVEL SECURITY;

-- 3. LEAST-PRIVILEGE RLS POLICIES

-- Policy A: Administrators full read access
DROP POLICY IF EXISTS "Admins can view all faculty assignments" ON public.faculty_class_assignments;
CREATE POLICY "Admins can view all faculty assignments"
  ON public.faculty_class_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy B: Administrators can create new assignments
DROP POLICY IF EXISTS "Admins can insert faculty assignments" ON public.faculty_class_assignments;
CREATE POLICY "Admins can insert faculty assignments"
  ON public.faculty_class_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy C: Administrators can remove assignments
DROP POLICY IF EXISTS "Admins can delete faculty assignments" ON public.faculty_class_assignments;
CREATE POLICY "Admins can delete faculty assignments"
  ON public.faculty_class_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy D: Teachers can only view assignments matching their trusted staff_id from user_profiles
DROP POLICY IF EXISTS "Teachers can view assigned students" ON public.faculty_class_assignments;
CREATE POLICY "Teachers can view assigned students"
  ON public.faculty_class_assignments FOR SELECT TO authenticated
  USING (
    staff_id = (SELECT staff_id FROM public.user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Students: Strictly no access policy (access is denied by default under RLS)
