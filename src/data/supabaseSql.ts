export const VIDYA_10_TABLES_SQL = `-- ==============================================================================
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
  role varchar(50) NOT NULL DEFAULT 'teacher',
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
  status varchar(20) NOT NULL DEFAULT 'Present',
  session varchar(50) DEFAULT 'Morning',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 5. Staff Attendance Table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id serial PRIMARY KEY,
  staff_id varchar(50) REFERENCES staff(staff_id) ON DELETE CASCADE,
  date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'Present',
  check_in time,
  check_out time,
  created_at timestamptz DEFAULT now()
);

-- 6. Academic Performance Table
CREATE TABLE IF NOT EXISTS academic_performance (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id varchar(50) REFERENCES subjects(subject_id) ON DELETE SET NULL,
  exam_type varchar(50) NOT NULL,
  score numeric(5, 2) NOT NULL,
  max_score numeric(5, 2) DEFAULT 100.00,
  grade varchar(10),
  assessment_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- 7. Learning Profile Table
CREATE TABLE IF NOT EXISTS learning_profile (
  id serial PRIMARY KEY,
  student_id varchar(50) UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  preferred_learning_style varchar(50) DEFAULT 'Visual',
  study_pacing varchar(50) DEFAULT 'Steady',
  strengths text[] DEFAULT ARRAY['Analytical Thinking', 'Problem Solving'],
  weaknesses text[] DEFAULT ARRAY['Time Allocation'],
  last_updated timestamptz DEFAULT now()
);

-- 8. Predictions Table (ML Academic Forecasts)
CREATE TABLE IF NOT EXISTS predictions (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  predicted_gpa numeric(4, 2) NOT NULL,
  risk_level varchar(30) NOT NULL,
  confidence_score numeric(4, 2) DEFAULT 0.92,
  bottleneck_subject varchar(100),
  model_version varchar(50) DEFAULT 'v1.4-ensemble',
  created_at timestamptz DEFAULT now()
);

-- 9. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
  id serial PRIMARY KEY,
  student_id varchar(50) REFERENCES students(student_id) ON DELETE CASCADE,
  category varchar(50) NOT NULL,
  action_text text NOT NULL,
  priority varchar(20) DEFAULT 'Medium',
  status varchar(30) DEFAULT 'Active',
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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

DO $$
BEGIN
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

  DROP POLICY IF EXISTS "Public write students" ON students;
  CREATE POLICY "Public write students" ON students FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Public update students" ON students;
  CREATE POLICY "Public update students" ON students FOR UPDATE USING (true);

  DROP POLICY IF EXISTS "Public write connection_test" ON connection_test;
  CREATE POLICY "Public write connection_test" ON connection_test FOR ALL USING (true);
END $$;

-- ==============================================================================
-- SEED DATA
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
`;
