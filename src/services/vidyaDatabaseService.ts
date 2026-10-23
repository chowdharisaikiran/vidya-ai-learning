import { getSupabaseClient, getActiveAuthToken } from '../lib/supabase';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';
export { getActiveAuthToken };

export interface DatabaseStudentRow {
  student_id: number;
  name: string;
  age: number;
  gender: string;
}

export interface DatabaseStaffRow {
  staff_id: string;
  staff_name: string;
  subject: string;
  overall_attendance_percentage: number;
  attendance_status: string;
}

export interface DatabaseSubjectRow {
  subject_id: string;
  subject_name: string;
  department: string;
}

export interface DatabaseAcademicPerformanceRow {
  student_id: number;
  quiz1_marks: number;
  quiz2_marks: number;
  quiz3_marks: number;
  midterm_marks: number;
  final_marks: number;
  previous_gpa: number;
  quiz_average: number;
}

export interface DatabaseStudentAttendanceRow {
  attendance_id: number;
  student_id: number;
  total_lectures: number;
  lectures_attended: number;
  attendance_percentage: number;
  total_lab_sessions: number;
  labs_attended: number;
  lab_attendance_percentage: number;
}

export interface DatabaseStaffAttendanceSummaryRow {
  staff_id: string;
  total_working_days: number;
  days_present: number;
  overall_attendance_percentage: number;
}

export interface DatabaseLearningProfileRow {
  student_id: string | number;
  study_hours_per_day: number;
  learning_style: string;
  motivation_level: string;
  sleep_hours: number;
  self_practice_hours: number;
}

export interface DatabasePredictionRow {
  prediction_id: string;
  student_id: string | number;
  predicted_final_score: number;
  academic_risk: string;
  prediction_model: string;
  prediction_date: string;
}

export interface DatabaseRecommendationRow {
  recommendation_id: string;
  student_id: string | number;
  focus_area: string;
  recommended_action: string;
  priority: string;
  reason: string;
}

export interface DatabaseStaffAttendanceRow {
  attendance_id: string;
  staff_id: string;
  date: string;
  status: string;
}

export interface LinkedStudentData {
  student: DatabaseStudentRow | null;
  performance: DatabaseAcademicPerformanceRow | null;
  attendance: DatabaseStudentAttendanceRow | null;
  learningProfile: DatabaseLearningProfileRow | null;
  prediction: DatabasePredictionRow | null;
  predictions: DatabasePredictionRow[];
  recommendations: DatabaseRecommendationRow[];
  error: string | null;
}

/**
 * Fetches the comprehensive linked dataset records for a single student.
 * Uses exact confirmed table columns, handles type differences safely (integer vs string),
 * and handles empty results, NULLs, and multiple records gracefully without crashing.
 */
export async function fetchStudentLinkedRecords(
  studentId: number | string | null | undefined
): Promise<LinkedStudentData | null> {
  if (studentId === null || studentId === undefined || studentId === '') {
    return null;
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      student: null,
      performance: null,
      attendance: null,
      learningProfile: null,
      prediction: null,
      predictions: [],
      recommendations: [],
      error: 'Supabase client not initialized.',
    };
  }

  const numId = typeof studentId === 'number' ? studentId : parseInt(String(studentId).replace(/\D/g, ''), 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }

  const strId = String(numId);

  try {
    const [
      studentRes,
      perfRes,
      attRes,
      learningRes,
      predRes,
      recomRes,
    ] = await Promise.all([
      // Integer student_id table
      client.from('students').select('*').eq('student_id', numId),
      // Integer student_id table
      client.from('academic_performance').select('*').eq('student_id', numId),
      // Integer student_id table
      client.from('student_attendance').select('*').eq('student_id', numId),
      // Text student_id table (query both string and number for safety)
      client.from('learning_profile').select('*').in('student_id', [strId, numId]),
      // Text student_id table (query both string and number for safety, order by date)
      client.from('predictions').select('*').in('student_id', [strId, numId]),
      // Text student_id table (query both string and number for safety)
      client.from('recommendations').select('*').in('student_id', [strId, numId]),
    ]);

    const errorMsg =
      studentRes.error?.message ||
      perfRes.error?.message ||
      attRes.error?.message ||
      learningRes.error?.message ||
      predRes.error?.message ||
      recomRes.error?.message ||
      null;

    const studentRow = (studentRes.data && studentRes.data[0] as DatabaseStudentRow) || null;
    let perfRow = (perfRes.data && perfRes.data[0] as DatabaseAcademicPerformanceRow) || null;

    // If direct PostgREST client query returned no academic record, query authenticated student endpoint
    if (!perfRow) {
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
            performance?: DatabaseAcademicPerformanceRow | null;
          }>(res, '/api/student/academic-performance');

          if (parsed.ok && parsed.data?.success && parsed.data.performance) {
            perfRow = parsed.data.performance;
          }
        }
      } catch (endpointErr) {
        // Fall back gracefully; preserve empty / loading / unlinked state
      }
    }

    const attRow = (attRes.data && attRes.data[0] as DatabaseStudentAttendanceRow) || null;
    const learningRow = (learningRes.data && learningRes.data[0] as DatabaseLearningProfileRow) || null;

    // Handle predictions without silently picking an arbitrary record
    const allPredictions = ((predRes.data as DatabasePredictionRow[]) || []);
    allPredictions.sort((a, b) => {
      if (a.prediction_date && b.prediction_date) {
        return new Date(b.prediction_date).getTime() - new Date(a.prediction_date).getTime();
      }
      return String(b.prediction_id || '').localeCompare(String(a.prediction_id || ''));
    });
    const primaryPrediction = allPredictions[0] || null;

    // Handle recommendations: sort by priority (High -> Medium -> Low)
    const allRecommendations = ((recomRes.data as DatabaseRecommendationRow[]) || []);
    const priorityWeights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    allRecommendations.sort((a, b) => {
      const pA = priorityWeights[a.priority] || 0;
      const pB = priorityWeights[b.priority] || 0;
      if (pB !== pA) return pB - pA;
      return String(a.recommendation_id || '').localeCompare(String(b.recommendation_id || ''));
    });

    return {
      student: studentRow,
      performance: perfRow,
      attendance: attRow,
      learningProfile: learningRow,
      prediction: primaryPrediction,
      predictions: allPredictions,
      recommendations: allRecommendations,
      error: errorMsg,
    };
  } catch (err: any) {
    console.warn('Error fetching student linked records:', err);
    return {
      student: null,
      performance: null,
      attendance: null,
      learningProfile: null,
      prediction: null,
      predictions: [],
      recommendations: [],
      error: err?.message || 'Failed to fetch student records from Supabase.',
    };
  }
}

export interface StaffFetchResult {
  staff: DatabaseStaffRow[];
  error: string | null;
}

/**
 * Fetches all staff members and their attendance summaries for Admin / Teacher portals with status reporting.
 */
export async function fetchAllStaffRecordsWithStatus(authToken?: string): Promise<StaffFetchResult> {
  const activeToken = await getActiveAuthToken(authToken);

  // 1. Try secure server-side admin endpoint first
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl('/api/admin/staff'), { headers });
    const parsed = await parseApiResponse<{ staff: DatabaseStaffRow[] }>(res, '/api/admin/staff');
    if (parsed.ok && parsed.data?.staff && Array.isArray(parsed.data.staff)) {
      return { staff: parsed.data.staff as DatabaseStaffRow[], error: null };
    } else if (!parsed.ok) {
      return { staff: [], error: parsed.error || `Server returned status ${parsed.status}` };
    }
  } catch (netErr: any) {
    // Proceed to direct client query fallback if network fetch failed
  }

  // 2. Client query fallback
  const client = getSupabaseClient();
  if (!client) {
    return { staff: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('staff')
      .select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status')
      .order('staff_id', { ascending: true });

    if (error) {
      return { staff: [], error: error.message };
    }
    return { staff: (data || []) as DatabaseStaffRow[], error: null };
  } catch (err: any) {
    return { staff: [], error: err?.message || 'Error querying public.staff table.' };
  }
}

/**
 * Fetches all staff members and their attendance summaries for Admin / Teacher portals.
 */
export async function fetchAllStaffRecords(authToken?: string): Promise<DatabaseStaffRow[]> {
  const result = await fetchAllStaffRecordsWithStatus(authToken);
  return result.staff;
}

/**
 * Fetches all subjects across academic departments.
 */
export async function fetchAllSubjects(): Promise<DatabaseSubjectRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from('subjects').select('*').order('subject_id', { ascending: true });
    if (error || !data) return [];
    return data as DatabaseSubjectRow[];
  } catch {
    return [];
  }
}

/**
 * Fetches staff attendance logs for a specific teacher.
 */
export async function fetchStaffAttendanceLogs(staffId: string): Promise<DatabaseStaffAttendanceRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('staff_attendance')
      .select('*')
      .eq('staff_id', staffId)
      .order('date', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as DatabaseStaffAttendanceRow[];
  } catch {
    return [];
  }
}

/**
 * Fetches all 297 imported students for administrative management and linking dropdowns.
 */
export async function fetchAllDatabaseStudents(authToken?: string): Promise<DatabaseStudentRow[]> {
  // 1. Try secure server-side admin endpoint first
  try {
    const token = await getActiveAuthToken(authToken);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(apiUrl('/api/admin/students'), { headers });
    const parsed = await parseApiResponse<{ students: DatabaseStudentRow[] }>(res, '/api/admin/students');
    if (parsed.ok && parsed.data?.students && Array.isArray(parsed.data.students)) {
      return parsed.data.students as DatabaseStudentRow[];
    }
  } catch {
    // fallback to client query
  }

  // 2. Client query fallback
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('students')
      .select('student_id, name, age, gender')
      .order('student_id', { ascending: true });

    if (error || !data) return [];
    return data as DatabaseStudentRow[];
  } catch {
    return [];
  }
}

export interface PredictionsFetchResult {
  predictions: DatabasePredictionRow[];
  error: string | null;
}

/**
 * Fetches all prediction records from public.predictions table for Admin ML Model Management.
 */
export async function fetchAllPredictionRecordsWithStatus(authToken?: string): Promise<PredictionsFetchResult> {
  const activeToken = await getActiveAuthToken(authToken);

  // 1. Try secure server-side admin endpoint first
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl('/api/admin/predictions'), { headers });
    const parsed = await parseApiResponse<{ predictions: DatabasePredictionRow[] }>(res, '/api/admin/predictions');
    if (parsed.ok && parsed.data?.predictions && Array.isArray(parsed.data.predictions)) {
      return { predictions: parsed.data.predictions as DatabasePredictionRow[], error: null };
    } else if (!parsed.ok) {
      return { predictions: [], error: parsed.error || `Server returned status ${parsed.status}` };
    }
  } catch {
    // Proceed to client query fallback
  }

  // 2. Client query fallback
  const client = getSupabaseClient();
  if (!client) {
    return { predictions: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('predictions')
      .select('prediction_id, student_id, predicted_final_score, academic_risk, prediction_model, prediction_date')
      .order('prediction_date', { ascending: false });

    if (error) {
      return { predictions: [], error: error.message };
    }
    return { predictions: (data || []) as DatabasePredictionRow[], error: null };
  } catch (err: any) {
    return { predictions: [], error: err?.message || 'Error querying public.predictions table.' };
  }
}

export interface DatabaseFacultyAssignment {
  assignment_id: string;
  staff_id: string;
  student_id: number;
  subject_id: string | null;
  created_at: string;
  created_by?: string | null;
  staff_name?: string;
  student_name?: string;
  subject_name?: string;
}

export interface AssignmentsFetchResult {
  assignments: DatabaseFacultyAssignment[];
  count: number;
  isPendingMigration?: boolean;
  error: string | null;
}

export interface TeacherAssignedCohortResult {
  staff_id: string | null;
  isLinked: boolean;
  assignments: DatabaseFacultyAssignment[];
  students: any[];
  message?: string;
  error: string | null;
}


export async function fetchFacultyAssignmentsWithStatus(authToken?: string): Promise<AssignmentsFetchResult> {
  const activeToken = await getActiveAuthToken(authToken);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl('/api/admin/assignments'), { headers });
    const parsed = await parseApiResponse<{ assignments: DatabaseFacultyAssignment[]; count: number; isPendingMigration?: boolean }>(
      res,
      '/api/admin/assignments'
    );
    if (parsed.ok && parsed.data) {
      return {
        assignments: parsed.data.assignments || [],
        count: parsed.data.count || 0,
        isPendingMigration: Boolean(parsed.data.isPendingMigration),
        error: null,
      };
    } else {
      return {
        assignments: [],
        count: 0,
        error: parsed.error || `Server returned status ${parsed.status}`,
      };
    }
  } catch (err: any) {
    return {
      assignments: [],
      count: 0,
      error: err?.message || 'Failed to fetch assignments.',
    };
  }
}

export async function createFacultyAssignment(
  payload: { staff_id: string; student_id: number; subject_id?: string | null },
  authToken?: string
): Promise<{ success: boolean; assignment?: DatabaseFacultyAssignment; isPendingMigration?: boolean; error?: string }> {
  const activeToken = await getActiveAuthToken(authToken);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl('/api/admin/assignments'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const parsed = await parseApiResponse<{ success: boolean; assignment?: DatabaseFacultyAssignment; isPendingMigration?: boolean }>(
      res,
      'POST /api/admin/assignments'
    );
    if (parsed.ok && parsed.data?.success) {
      return {
        success: true,
        assignment: parsed.data.assignment,
        isPendingMigration: parsed.data.isPendingMigration,
      };
    } else {
      return {
        success: false,
        error: parsed.error || 'Failed to create faculty assignment.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error creating assignment.',
    };
  }
}

export async function deleteFacultyAssignment(
  assignmentId: string,
  authToken?: string
): Promise<{ success: boolean; error?: string }> {
  const activeToken = await getActiveAuthToken(authToken);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl(`/api/admin/assignments/${encodeURIComponent(assignmentId)}`), {
      method: 'DELETE',
      headers,
    });

    const parsed = await parseApiResponse<{ success: boolean }>(res, 'DELETE /api/admin/assignments/:id');
    if (parsed.ok && parsed.data?.success) {
      return { success: true };
    } else {
      return { success: false, error: parsed.error || 'Failed to remove assignment.' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error removing assignment.' };
  }
}

export async function fetchTeacherAssignedCohort(authToken?: string): Promise<TeacherAssignedCohortResult> {
  const activeToken = await getActiveAuthToken(authToken);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const res = await fetch(apiUrl('/api/teacher/assigned-students'), { headers });
    const parsed = await parseApiResponse<{
      success: boolean;
      staff_id: string;
      isLinked: boolean;
      assignments?: any[];
      students?: any[];
      message?: string;
    }>(res, '/api/teacher/assigned-students');

    if (parsed.ok && parsed.data?.success) {
      return {
        staff_id: parsed.data.staff_id,
        isLinked: parsed.data.isLinked,
        assignments: parsed.data.assignments || [],
        students: parsed.data.students || [],
        message: parsed.data.message,
        error: null,
      };
    } else {
      return {
        staff_id: null,
        isLinked: false,
        assignments: [],
        students: [],
        error: parsed.error || `Server returned status ${parsed.status}`,
      };
    }
  } catch (err: any) {
    return {
      staff_id: null,
      isLinked: false,
      assignments: [],
      students: [],
      error: err?.message || 'Error fetching assigned student cohort.',
    };
  }
}
