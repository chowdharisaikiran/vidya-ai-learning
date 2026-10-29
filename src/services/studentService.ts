import { getSupabaseClient } from '../lib/supabase';
import type { StudentData } from '../types';
import { INITIAL_STUDENTS } from '../data/mockData';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';
import { normalizeWeakSubject, getDemoWeakSubject } from '../utils/subjectUtils';

/**
 * Confirmed columns present in Supabase `students` table:
 * student_id, name, age, gender, email, class_grade, created_at, id
 */
export interface SupabaseStudentRow {
  id?: number;
  student_id: string | number;
  name: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  class_grade?: string | null;
  created_at?: string | null;
  attendance_percent?: number | null;
  study_hours_per_day?: number | null;
  assignment_score?: number | null;
  quiz_score?: number | null;
  previous_score?: number | null;
  sleep_hours?: number | null;
  motivation_level?: string | null;
  learning_style?: string | null;
  internet_access?: string | null;
  parental_support?: string | null;
  tutoring?: string | null;
  extracurricular_activity?: string | null;
  stress_level?: string | null;
  weak_subject?: string | null;
  weak_subject_label?: string | null;
  exam_score?: number | null;
  overall_score?: number | null;
  performance_level?: string | null;
  risk_level?: string | null;
}

export interface StudentFetchResult {
  data: StudentData[];
  source: 'database' | 'fallback';
  error?: string | null;
  isEmpty: boolean;
  isError?: boolean;
}

export interface FetchStudentsOptions {
  /**
   * Only enabled in explicit development or automated test harnesses.
   * Strictly disabled in production.
   */
  allowDevelopmentFixture?: boolean;
}

/**
 * Explicit development/test fixture helper.
 * Strictly gated: only available when explicitly requested for testing/fixtures,
 * NEVER as a silent production fallback.
 */
export function getDevelopmentFixtureStudents(): StudentData[] {
  return INITIAL_STUDENTS;
}

/**
 * Maps a Supabase student row with actual database columns:
 * (`student_id`, `name`, `age`, `gender`, `email`, `class_grade`, `created_at`)
 * into the application's `StudentData` model without inventing or fabricating academic scores.
 *
 * In production, `fallbackStudents` defaults to empty array ([]).
 * Development fixtures are only matched when explicitly passed.
 */
export function mapSupabaseRowToStudentData(
  row: SupabaseStudentRow,
  fallbackStudents: StudentData[] = []
): StudentData {
  const rawId = String(row.student_id ?? '').trim();
  const normId = rawId.toUpperCase();
  const normEmail = (row.email || '').trim().toLowerCase();

  // If explicit test/fixture students are supplied, check for match
  const matched = fallbackStudents.find(
    (s) =>
      s.Student_ID.toUpperCase() === normId ||
      (normEmail && s.Email.toLowerCase() === normEmail)
  );

  // Normalize Gender
  let gender: 'Male' | 'Female' | 'Non-Binary' = 'Male';
  if (row.gender) {
    const g = row.gender.trim().toLowerCase();
    if (g === 'female' || g === 'f') gender = 'Female';
    else if (g === 'non-binary' || g === 'nb' || g === 'other') gender = 'Non-Binary';
    else gender = 'Male';
  } else if (matched) {
    gender = matched.Gender;
  }

  const age = typeof row.age === 'number' && !isNaN(row.age) ? row.age : (matched?.Age || 18);
  const classGrade = (row.class_grade && row.class_grade.trim()) || matched?.Class_Grade || 'Undergraduate';
  const name = (row.name && row.name.trim()) || matched?.Name || `Student ${rawId}`;
  const email = (row.email && row.email.trim()) || matched?.Email || `student_${rawId.toLowerCase()}@vidya.edu`;

  if (matched) {
    return {
      ...matched,
      Student_ID: rawId || matched.Student_ID,
      Name: name,
      Email: email,
      Age: age,
      Gender: gender,
      Class_Grade: classGrade,
      isLiveDatabaseRecord: true,
    };
  }

  // When a student exists in Supabase DB without a mock template,
  // map actual columns and provide deterministic demo weak subject when quiz score is valid
  const normWeak = normalizeWeakSubject(row.weak_subject);
  const quizSc = typeof row.quiz_score === 'number' ? row.quiz_score : null;
  const demoRes = getDemoWeakSubject(rawId, quizSc);
  const finalWeak = normWeak !== 'Not assessed' ? normWeak : demoRes.subject;
  const finalLabel = row.weak_subject_label || (normWeak !== 'Not assessed' ? 'Verified weak subject' : demoRes.label);

  return {
    Student_ID: rawId,
    Name: name,
    Email: email,
    Age: age,
    Gender: gender,
    Education_Level: 'Undergraduate',
    Class_Grade: classGrade,
    Attendance_Percent: typeof row.attendance_percent === 'number' ? row.attendance_percent : 0,
    Study_Hours_Per_Day: typeof row.study_hours_per_day === 'number' ? row.study_hours_per_day : 0,
    Assignment_Score: typeof row.assignment_score === 'number' ? row.assignment_score : 0,
    Quiz_Score: typeof row.quiz_score === 'number' ? row.quiz_score : 0,
    Previous_Score: typeof row.previous_score === 'number' ? row.previous_score : 0,
    Sleep_Hours: typeof row.sleep_hours === 'number' ? row.sleep_hours : 0,
    Motivation_Level: (row.motivation_level as any) || 'Not assessed',
    Learning_Style: (row.learning_style as any) || 'Not assessed',
    Internet_Access: (row.internet_access as any) || 'Not available',
    Parental_Support: (row.parental_support as any) || 'Not assessed',
    Tutoring: (row.tutoring as any) || 'Not available',
    Extracurricular_Activity: (row.extracurricular_activity as any) || 'Not available',
    Stress_Level: (row.stress_level as any) || 'Not assessed',
    Weak_Subject: finalWeak,
    Weak_Subject_Label: finalLabel,
    Exam_Score: typeof row.exam_score === 'number' ? row.exam_score : 0,
    Overall_Score: typeof row.overall_score === 'number' ? row.overall_score : 0,
    Performance_Level: (row.performance_level as any) || 'Not assessed',
    Risk_Level: (row.risk_level as any) || 'Insufficient data',
    Recommended_Action: 'Supabase record verified: Diagnostic assessment pending.',
    Subjects: [],
    History: [],
    Intervention_Notes: [`Verified record from database (ID: ${rawId})`],
    Last_Updated: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    isLiveDatabaseRecord: true,
  };
}

/**
 * Fetches student records from Supabase using only confirmed existing columns.
 *
 * Query execution path:
 * 1. Tries client-side Supabase query first.
 * 2. If client query returns 0 rows or fails (e.g. anon RLS policy), queries verified
 *    server-side endpoint `/api/supabase/students`.
 * 3. If the database legitimately has 0 rows, returns an empty array with isEmpty: true and error: null.
 * 4. If network/server fails, returns an empty array with error message and isError: true.
 *    STRICTLY NEVER SILENTLY FALLS BACK TO MOCK DATA IN PRODUCTION.
 * 5. Development fixtures are only accessible when options.allowDevelopmentFixture is explicitly true.
 */
export async function fetchStudentsFromSupabase(
  options?: FetchStudentsOptions
): Promise<StudentFetchResult> {
  const client = getSupabaseClient();
  let clientError: string | null = null;
  let serverError: string | null = null;

  // 1. Try client-side Supabase query first
  if (client) {
    try {
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('student_id', { ascending: true });

      if (error) {
        clientError = error.message;
      } else if (data && data.length > 0) {
        const mapped = (data as SupabaseStudentRow[]).map((row) =>
          mapSupabaseRowToStudentData(row, options?.allowDevelopmentFixture ? INITIAL_STUDENTS : [])
        );

        return {
          data: mapped,
          source: 'database',
          error: null,
          isEmpty: false,
          isError: false,
        };
      }
    } catch (clientErr: any) {
      clientError = clientErr?.message || 'Client query failed';
      console.warn('Client-side Supabase query failed, attempting server proxy:', clientErr);
    }
  }

  // 2. Try server-side Supabase proxy which queries the confirmed database with service key
  if (typeof window !== 'undefined') {
    try {
      const resp = await fetch(apiUrl('/api/supabase/students'));
      if (!resp.ok) {
        serverError = `Server returned HTTP ${resp.status}: ${resp.statusText}`;
      } else {
        const parsed = await parseApiResponse<{ success: boolean; data: SupabaseStudentRow[]; count?: number }>(
          resp,
          '/api/supabase/students'
        );
        if (parsed.ok && parsed.data && Array.isArray(parsed.data.data)) {
          if (parsed.data.data.length > 0) {
            const mapped = (parsed.data.data as SupabaseStudentRow[]).map((row) =>
              mapSupabaseRowToStudentData(row, options?.allowDevelopmentFixture ? INITIAL_STUDENTS : [])
            );

            return {
              data: mapped,
              source: 'database',
              error: null,
              isEmpty: false,
              isError: false,
            };
          } else {
            // Live database is genuinely empty (0 records)
            return {
              data: [],
              source: 'database',
              error: null,
              isEmpty: true,
              isError: false,
            };
          }
        } else {
          serverError = parsed.error || 'Failed to parse student data from server';
        }
      }
    } catch (proxyErr: any) {
      serverError = proxyErr?.message || 'Network request failed while fetching students';
      console.warn('Proxy fetch for Supabase students failed:', proxyErr);
    }
  }

  // 3. Explicit development fixture path: ONLY if explicitly requested in options
  if (options?.allowDevelopmentFixture) {
    return {
      data: getDevelopmentFixtureStudents(),
      source: 'fallback',
      error: serverError || clientError || null,
      isEmpty: false,
      isError: Boolean(serverError || clientError),
    };
  }

  // 4. Production behavior: Return honest error state with empty data array.
  // Never silently substitute mock data!
  return {
    data: [],
    source: 'database',
    error: serverError || clientError || 'Unable to connect to student records database.',
    isEmpty: false,
    isError: true,
  };
}
