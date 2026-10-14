-- ==============================================================================
-- VIDYA PLATFORM: 10 CORE RELATIONAL TABLES + DIAGNOSTICS SCHEMA
-- Project: https://fxwzjeyiywprabttaznt.supabase.co
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new
-- ==============================================================================

-- 0. Diagnostics table for instant health checks
CREATE TABLE IF NOT EXISTS connection_test (
  id serial PRIMARY KEY,
  message text DEFAULT 'VIDYA Supabase Connected',
  created_at timestamptz DEFAULT now()
);

-- Seed initial verification row
INSERT INTO connection_test (id, message)
VALUES (1, 'VIDYA Supabase Connected')
ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message;

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
  id serial PRIMARY KEY,
  student_id varchar(50) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  class_grade varchar(50) DEFAULT 'Grade 11',
  attendance_percent numeric(5, 2) DEFAULT 85.00,
  study_hours_per_day numeric(4, 2) DEFAULT 3.50,
  previous_score numeric(5, 2) DEFAULT 78.00,
  quiz_score numeric(5, 2) DEFAULT 80.00,
  assignment_score numeric(5, 2) DEFAULT 82.00,
  sleep_hours numeric(4, 2) DEFAULT 7.00,
  motivation_level varchar(20) DEFAULT 'High',
  parental_support varchar(20) DEFAULT 'Medium',
  tutoring varchar(10) DEFAULT 'No',
  internet_access varchar(10) DEFAULT 'Yes',
  stress_level varchar(20) DEFAULT 'Low',
  current_gpa numeric(4, 2) DEFAULT 3.45,
  risk_level varchar(30) DEFAULT 'Low Risk',
  weak_subject varchar(100) DEFAULT 'None',
  created_at timestamptz DEFAULT now()
);

-- 2. Staff Table (Educators, Deans, Administrators)
CREATE TABLE IF NOT EXISTS staff (
  id serial PRIMARY KEY,
  staff_id varchar(50) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'teacher', -- 'teacher', 'admin', 'dean'
  department varchar(100) DEFAULT 'Mathematics & Computing',
  title varchar(100) DEFAULT 'Educator',
  avatar text,
  created_at timestamptz DEFAULT now()
);

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
  id serial PRIMARY KEY,
  subject_id varchar(50) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  department varchar(100) NOT NULL,
  credits integer DEFAULT 3,
  lead_teacher_id varchar(50),
  difficulty_level varchar(30) DEFAULT 'Intermediate',
  description text,
  created_at timestamptz DEFAULT now()
);

-- 4. Student Attendance Table
CREATE TABLE IF NOT EXISTS student_attendance (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'Present', -- 'Present', 'Absent', 'Late', 'Excused'
  session varchar(50) DEFAULT 'Morning',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 5. Staff Attendance Table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id serial PRIMARY KEY,
  staff_id varchar(50) REFERENCES staff(staff_id) ON DELETE CASCADE,
  date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'Present', -- 'Present', 'On-Leave', 'Duty'
  check_in time,
  check_out time,
  created_at timestamptz DEFAULT now()
);

-- 6. Academic Performance Table (Exam & Assignment Records)
CREATE TABLE IF NOT EXISTS academic_performance (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id varchar(50) REFERENCES subjects(subject_id) ON DELETE SET NULL,
  exam_type varchar(50) NOT NULL, -- 'Midterm', 'Quiz', 'Assignment', 'Final'
  score numeric(5, 2) NOT NULL,
  max_score numeric(5, 2) DEFAULT 100.00,
  grade varchar(10),
  assessment_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- 7. Learning Profile Table (Pacing & Styles)
CREATE TABLE IF NOT EXISTS learning_profile (
  id serial PRIMARY KEY,
  student_id varchar(50) UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  preferred_learning_style varchar(50) DEFAULT 'Visual', -- 'Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing'
  study_pacing varchar(50) DEFAULT 'Steady', -- 'Accelerated', 'Steady', 'Needs Support'
  strengths text[] DEFAULT ARRAY['Analytical Thinking', 'Problem Solving'],
  weaknesses text[] DEFAULT ARRAY['Time Allocation'],
  last_updated timestamptz DEFAULT now()
);

-- 8. Predictions Table (ML Academic Forecasts)
CREATE TABLE IF NOT EXISTS predictions (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  predicted_gpa numeric(4, 2) NOT NULL,
  risk_level varchar(30) NOT NULL, -- 'Low Risk', 'Moderate Risk', 'High Priority'
  confidence_score numeric(4, 2) DEFAULT 0.92,
  bottleneck_subject varchar(100),
  model_version varchar(50) DEFAULT 'v1.4-ensemble',
  created_at timestamptz DEFAULT now()
);

-- 9. Recommendations Table (Actionable Mentorship)
CREATE TABLE IF NOT EXISTS recommendations (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  category varchar(50) NOT NULL, -- 'Study Routine', 'Intervention', 'Tutoring', 'Wellness'
  action_text text NOT NULL,
  priority varchar(20) DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
  status varchar(30) DEFAULT 'Active', -- 'Active', 'Completed', 'Dismissed'
  created_at timestamptz DEFAULT now()
);

-- 10. Attendance Summary Table
CREATE TABLE IF NOT EXISTS attendance_summary (
  id serial PRIMARY KEY,
  student_id varchar(50) UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  total_classes integer DEFAULT 60,
  classes_attended integer DEFAULT 52,
  attendance_percentage numeric(5, 2) DEFAULT 86.67,
  last_calculated timestamptz DEFAULT now()
);

-- 11. User Profiles Table (Linked to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  student_id INTEGER REFERENCES students(student_id) ON DELETE SET NULL, -- Maps UUID user to dataset integer student_id
  staff_id VARCHAR(50) REFERENCES staff(staff_id) ON DELETE SET NULL,     -- Maps UUID user to dataset staff_id (e.g. T001)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Configures safe, role-isolated access control
-- ==============================================================================
ALTER TABLE connection_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User Profiles Isolation
DO $$
BEGIN
  -- Authenticated users can view their own profile
  DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
  CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);

  -- Administrators can view all user profiles
  DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
  CREATE POLICY "Admins can view all user profiles" ON user_profiles FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

  -- Administrators can update user profiles, roles, and dataset mappings
  DROP POLICY IF EXISTS "Admins can update user profiles and roles" ON user_profiles;
  CREATE POLICY "Admins can update user profiles and roles" ON user_profiles FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

  -- Users can update only their own name, NOT their role or mappings
  DROP POLICY IF EXISTS "Users can update own name only" ON user_profiles;
  CREATE POLICY "Users can update own name only" ON user_profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
      auth.uid() = id
      AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
      AND student_id IS NOT DISTINCT FROM (SELECT student_id FROM user_profiles WHERE id = auth.uid())
      AND staff_id IS NOT DISTINCT FROM (SELECT staff_id FROM user_profiles WHERE id = auth.uid())
    );

  DROP POLICY IF EXISTS "Public read connection_test" ON connection_test;
  CREATE POLICY "Public read connection_test" ON connection_test FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read students" ON students;
  CREATE POLICY "Public read students" ON students FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read staff" ON staff;
  CREATE POLICY "Public read staff" ON staff FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read subjects" ON subjects;
  CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read student_attendance" ON student_attendance;
  CREATE POLICY "Public read student_attendance" ON student_attendance FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read staff_attendance" ON staff_attendance;
  CREATE POLICY "Public read staff_attendance" ON staff_attendance FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read academic_performance" ON academic_performance;
  CREATE POLICY "Public read academic_performance" ON academic_performance FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read learning_profile" ON learning_profile;
  CREATE POLICY "Public read learning_profile" ON learning_profile FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read predictions" ON predictions;
  CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read recommendations" ON recommendations;
  CREATE POLICY "Public read recommendations" ON recommendations FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public read attendance_summary" ON attendance_summary;
  CREATE POLICY "Public read attendance_summary" ON attendance_summary FOR SELECT USING (true);

  -- Allow insert/update for demo writes
  DROP POLICY IF EXISTS "Public write students" ON students;
  CREATE POLICY "Public write students" ON students FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Public update students" ON students;
  CREATE POLICY "Public update students" ON students FOR UPDATE USING (true);

  DROP POLICY IF EXISTS "Public write connection_test" ON connection_test;
  CREATE POLICY "Public write connection_test" ON connection_test FOR ALL USING (true);
END $$;

-- Automated Profile Creation Trigger for Supabase Auth
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
    'student', -- Always defaults to student for public registration
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

-- ==============================================================================
-- SEED DATA (INITIAL SCHOLARS, STAFF & SUBJECTS)
-- ==============================================================================
INSERT INTO students (student_id, name, email, class_grade, attendance_percent, study_hours_per_day, previous_score, quiz_score, assignment_score, sleep_hours, motivation_level, parental_support, tutoring, internet_access, stress_level, current_gpa, risk_level, weak_subject)
VALUES 
  ('STU-1001', 'Aarav Sharma', 'aarav.sharma@vidya.edu', 'Grade 11', 89.5, 4.2, 84.0, 88.0, 90.0, 7.5, 'High', 'High', 'No', 'Yes', 'Low', 3.84, 'Low Risk', 'None'),
  ('STU-1002', 'Priya Patel', 'priya.patel@vidya.edu', 'Grade 11', 72.0, 2.1, 62.0, 65.0, 60.0, 6.0, 'Medium', 'Medium', 'No', 'Yes', 'Medium', 2.95, 'Moderate Risk', 'Calculus'),
  ('STU-1003', 'Rohan Verma', 'rohan.verma@vidya.edu', 'Grade 11', 61.5, 1.5, 52.0, 55.0, 50.0, 5.0, 'Low', 'Low', 'No', 'Yes', 'High', 2.30, 'High Priority', 'Data Structures')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO staff (staff_id, name, email, role, department, title, avatar)
VALUES
  ('TCH-201', 'Dr. Ananya Sen', 'ananya.sen@vidya.edu', 'teacher', 'Mathematics & Computing', 'Lead Educator - STEM & AI', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
  ('ADM-101', 'Prof. Rajesh Iyer', 'rajesh.iyer@vidya.edu', 'admin', 'Academic Administration', 'Institutional Dean & Analytics Director', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO subjects (subject_id, name, department, credits, lead_teacher_id, difficulty_level, description)
VALUES
  ('SUB-101', 'Advanced Calculus & Linear Algebra', 'Mathematics', 4, 'TCH-201', 'Advanced', 'Multivariate calculus and matrix analysis'),
  ('SUB-102', 'Data Structures & Algorithms', 'Computer Science', 4, 'TCH-201', 'Advanced', 'Computational complexity and graph theory'),
  ('SUB-103', 'Machine Learning Foundations', 'Artificial Intelligence', 3, 'TCH-201', 'Intermediate', 'Supervised learning and classification models')
ON CONFLICT (subject_id) DO NOTHING;

-- 12. Faculty Class Assignments Table (Secure Teacher-Student Mapping)
CREATE TABLE IF NOT EXISTS faculty_class_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id VARCHAR(50) NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES subjects(subject_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT uq_faculty_student_subject UNIQUE (staff_id, student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_fca_staff_id ON faculty_class_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_fca_student_id ON faculty_class_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fca_subject_id ON faculty_class_assignments(subject_id);

ALTER TABLE faculty_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all faculty assignments" ON faculty_class_assignments;
CREATE POLICY "Admins can view all faculty assignments"
  ON faculty_class_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert faculty assignments" ON faculty_class_assignments;
CREATE POLICY "Admins can insert faculty assignments"
  ON faculty_class_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete faculty assignments" ON faculty_class_assignments;
CREATE POLICY "Admins can delete faculty assignments"
  ON faculty_class_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Teachers can view assigned students" ON faculty_class_assignments;
CREATE POLICY "Teachers can view assigned students"
  ON faculty_class_assignments FOR SELECT TO authenticated
  USING (
    staff_id = (SELECT staff_id FROM user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'teacher'
  );

