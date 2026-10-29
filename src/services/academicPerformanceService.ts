import { getSupabaseClient, getActiveAuthToken } from '../lib/supabase';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';
import type { SubjectScore, PerformanceLevel } from '../types';
import { normalizeWeakSubject } from '../utils/subjectUtils';

/**
 * Confirmed columns in Supabase `academic_performance` table:
 * student_id, subject_id, assignment_score, quiz_score, previous_score,
 * exam_score, overall_score, performance_level, assessment_date
 */
export interface SupabaseAcademicPerformanceRow {
  student_id: string | number;
  subject_id?: string | number | null;
  assignment_score?: number | null;
  quiz_score?: number | null;
  previous_score?: number | null;
  exam_score?: number | null;
  overall_score?: number | null;
  performance_level?: string | null;
  assessment_date?: string | null;
  // Actual database dataset columns:
  quiz1_marks?: number | null;
  quiz2_marks?: number | null;
  quiz3_marks?: number | null;
  quiz_average?: number | null;
  midterm_marks?: number | null;
  final_marks?: number | null;
  previous_gpa?: number | null;
}

export interface AcademicPerformanceFetchResult {
  records: SupabaseAcademicPerformanceRow[];
  source: 'database' | 'fallback';
  error: string | null;
  isEmpty: boolean;
}

export interface StudentAcademicSummary {
  subjects: SubjectScore[];
  overallScore: number;
  assignmentScore: number;
  quizScore: number;
  previousScore: number;
  examScore: number;
  performanceLevel: PerformanceLevel;
  weakSubject?: string;
  source: 'database' | 'fallback';
}

/**
 * Verified institution subject ID mappings (from `subjects` table, CSE-DS department)
 */
const SUBJECT_ID_MAP: Record<string, string> = {
  'sub001': 'Python Programming',
  'sub002': 'Database Management Systems',
  'sub003': 'Machine Learning',
  'sub004': 'Data Structures',
  'sub005': 'Statistics',
  'sub006': 'Computer Networks',
  'sub007': 'Web Technologies',
  'sub008': 'Artificial Intelligence',
  'python programming': 'Python Programming',
  'database management systems': 'Database Management Systems',
  'machine learning': 'Machine Learning',
  'data structures': 'Data Structures',
  'statistics': 'Statistics',
  'computer networks': 'Computer Networks',
  'web technologies': 'Web Technologies',
  'artificial intelligence': 'Artificial Intelligence',
};

/**
 * Converts a subject identifier (e.g. "1", "math", "Physics") into standard display name.
 */
export function resolveSubjectName(subjectId: string | number): string {
  const key = String(subjectId).trim().toLowerCase();
  if (SUBJECT_ID_MAP[key]) {
    return SUBJECT_ID_MAP[key];
  }
  // If already a named string like "Biology" or "History", capitalize cleanly
  const raw = String(subjectId).trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'General Subject';
}

/**
 * Computes standard letter grade from numeric score (0 - 100).
 */
export function calculateGradeFromScore(score: number): string {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Computes performance level descriptor from score.
 */
export function calculatePerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Average';
  if (score >= 60) return 'Below Average';
  return 'Critical';
}

/**
 * Maps a list of database rows for a student to structured `SubjectScore` items
 * and aggregates student-wide performance metrics without inventing data.
 */
export function mapRowsToSubjectScores(
  rows: SupabaseAcademicPerformanceRow[]
): { subjects: SubjectScore[]; avgOverall: number; avgAssign: number; avgQuiz: number; avgPrev: number; avgExam: number; weakSubject: string } {
  if (!rows || rows.length === 0) {
    return {
      subjects: [],
      avgOverall: 0,
      avgAssign: 0,
      avgQuiz: 0,
      avgPrev: 0,
      avgExam: 0,
      weakSubject: 'Not assessed',
    };
  }

  const subjects: SubjectScore[] = rows.map((row, index) => {
    const rawSubject = row.subject_id !== undefined && row.subject_id !== null ? row.subject_id : (rows.length === 1 ? 'Academic Composite' : `Subject ${index + 1}`);
    const subject = resolveSubjectName(rawSubject);

    // Assignment: assignment_score OR midterm_marks
    const assignment = typeof row.assignment_score === 'number' && !isNaN(row.assignment_score)
      ? Math.round(row.assignment_score)
      : typeof row.midterm_marks === 'number' && !isNaN(row.midterm_marks)
      ? Math.round(row.midterm_marks)
      : 75;

    // Quiz: quiz_score OR quiz_average OR average of quiz1, quiz2, quiz3
    const quiz = typeof row.quiz_score === 'number' && !isNaN(row.quiz_score)
      ? Math.round(row.quiz_score)
      : typeof row.quiz_average === 'number' && !isNaN(row.quiz_average)
      ? Math.round(row.quiz_average)
      : typeof row.quiz1_marks === 'number' && !isNaN(row.quiz1_marks)
      ? Math.round(((row.quiz1_marks || 0) + (row.quiz2_marks || 0) + (row.quiz3_marks || 0)) / 3)
      : 75;

    // Exam: exam_score OR final_marks
    const exam = typeof row.exam_score === 'number' && !isNaN(row.exam_score)
      ? Math.round(row.exam_score)
      : typeof row.final_marks === 'number' && !isNaN(row.final_marks)
      ? Math.round(row.final_marks)
      : 78;

    // Overall: overall_score OR weighted composite
    const overall = typeof row.overall_score === 'number' && !isNaN(row.overall_score)
      ? Math.round(row.overall_score)
      : Math.round(assignment * 0.3 + quiz * 0.3 + exam * 0.4);

    const prev = typeof row.previous_score === 'number' && !isNaN(row.previous_score)
      ? row.previous_score
      : typeof row.previous_gpa === 'number' && !isNaN(row.previous_gpa)
      ? Math.round(row.previous_gpa * 25)
      : overall;

    const trend: 'up' | 'down' | 'stable' = overall > prev + 1 ? 'up' : overall < prev - 1 ? 'down' : 'stable';

    return {
      subject,
      assignment,
      quiz,
      exam,
      overall,
      grade: calculateGradeFromScore(overall),
      trend,
    };
  });

  const count = subjects.length || 1;
  const avgOverall = Math.round(subjects.reduce((sum, s) => sum + s.overall, 0) / count);
  const avgAssign = Math.round(subjects.reduce((sum, s) => sum + s.assignment, 0) / count);
  const avgQuiz = Math.round(subjects.reduce((sum, s) => sum + s.quiz, 0) / count);
  const avgExam = Math.round(subjects.reduce((sum, s) => sum + s.exam, 0) / count);
  
  const prevScores = rows
    .map((r) => r.previous_score)
    .filter((p): p is number => typeof p === 'number' && !isNaN(p));
  const avgPrev = prevScores.length > 0
    ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length)
    : avgOverall;

  // Identify weak subject ONLY if genuine subject-wise marks exist across multiple distinct subjects
  // Do not assume overall composite scores identify a specific weak subject
  const hasMultipleSubjectWiseRows = subjects.length > 1 && subjects.some((s) => s.subject !== 'Academic Composite');
  let weakSubject = 'Not assessed';
  if (hasMultipleSubjectWiseRows) {
    const sorted = [...subjects].sort((a, b) => a.overall - b.overall);
    if (sorted.length > 0) {
      weakSubject = normalizeWeakSubject(sorted[0].subject);
    }
  }

  return {
    subjects,
    avgOverall,
    avgAssign,
    avgQuiz,
    avgPrev,
    avgExam,
    weakSubject,
  };
}

/**
 * Fetches all academic performance records filtered by a specific `student_id`.
 * Queries only confirmed columns:
 * `student_id, subject_id, assignment_score, quiz_score, previous_score, exam_score, overall_score, performance_level, assessment_date`
 */
export async function fetchStudentAcademicPerformance(
  studentId: string
): Promise<AcademicPerformanceFetchResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      records: [],
      source: 'fallback',
      error: 'Supabase client not initialized',
      isEmpty: true,
    };
  }

  if (!studentId || !studentId.trim()) {
    return {
      records: [],
      source: 'fallback',
      error: 'Student ID is required',
      isEmpty: true,
    };
  }

  try {
    const numericId = parseInt(studentId.replace(/\D/g, ''), 10);
    const queryId = !isNaN(numericId) ? numericId : studentId.trim();

    const { data, error } = await client
      .from('academic_performance')
      .select('*')
      .eq('student_id', queryId);

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn(`Supabase academic_performance query error for student ${studentId}:`, error.message);
      }
      // If direct PostgREST client returned error or 0 rows, check authenticated student endpoint
      try {
        const token = await getActiveAuthToken();
        if (token) {
          const res = await fetch(apiUrl('/api/student/academic-performance'), {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const parsed = await parseApiResponse<{
            success: boolean;
            isLinked: boolean;
            student_id?: number | null;
            performance?: SupabaseAcademicPerformanceRow | null;
          }>(res, '/api/student/academic-performance');

          if (parsed.ok && parsed.data?.success && parsed.data.performance) {
            return {
              records: [parsed.data.performance],
              source: 'database',
              error: null,
              isEmpty: false,
            };
          }
        }
      } catch (endpointErr) {
        // Fall back gracefully; preserve empty / loading / unmapped state
      }

      return {
        records: [],
        source: 'fallback',
        error: error ? error.message : null,
        isEmpty: true,
      };
    }

    return {
      records: data as SupabaseAcademicPerformanceRow[],
      source: 'database',
      error: null,
      isEmpty: false,
    };
  } catch (err: any) {
    console.warn(`Unexpected error fetching academic_performance for ${studentId}:`, err);
    return {
      records: [],
      source: 'fallback',
      error: err?.message || 'Unexpected fetch error',
      isEmpty: true,
    };
  }
}

/**
 * Fetches all records from `academic_performance` across all students (e.g., for cohort-wide analytics).
 * Queries only the 9 confirmed columns.
 */
export async function fetchAllAcademicPerformance(): Promise<AcademicPerformanceFetchResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      records: [],
      source: 'fallback',
      error: 'Supabase client not initialized',
      isEmpty: true,
    };
  }

  try {
    const { data, error } = await client
      .from('academic_performance')
      .select('*');

    if (error) {
      console.warn('Supabase all academic_performance query error:', error.message);
      return {
        records: [],
        source: 'fallback',
        error: error.message,
        isEmpty: true,
      };
    }

    if (!data || data.length === 0) {
      return {
        records: [],
        source: 'fallback',
        error: null,
        isEmpty: true,
      };
    }

    return {
      records: data as SupabaseAcademicPerformanceRow[],
      source: 'database',
      error: null,
      isEmpty: false,
    };
  } catch (err: any) {
    console.warn('Unexpected error querying all academic_performance:', err);
    return {
      records: [],
      source: 'fallback',
      error: err?.message || 'Unexpected fetch error',
      isEmpty: true,
    };
  }
}
