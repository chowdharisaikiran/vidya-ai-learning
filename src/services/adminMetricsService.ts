import { getSupabaseClient, getActiveAuthToken, refreshSupabaseSession } from '../lib/supabase';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';

export interface AdminDashboardMetrics {
  totalStudents: number | null;
  totalStaff: number | null;
  avgPerformance: number | null;
  avgAttendance: number | null;
  highRiskStudentsCount: number | null;
  modRiskStudentsCount: number | null;
  lowRiskStudentsCount: number | null;
  passRate: number | null;
  avgQuiz: number | null;
  avgMidterm: number | null;
  avgFinal: number | null;
  avgLabAttendance: number | null;
  validAcadCount: number;
  validAttCount: number;
  validPredictionsCount: number;
  predictionModelName: string | null;
  staffSubjectsBreakdown: Array<{ subject: string; count: number; avgAttendance?: number }>;
  genderBreakdown: { male: number; female: number; other: number };
  performanceDistribution: {
    critical: number; // < 50
    belowAverage: number; // 50 - 59
    average: number; // 60 - 69
    good: number; // 70 - 79
    excellent: number; // >= 80
  };
  errors: {
    students?: string | null;
    staff?: string | null;
    academic?: string | null;
    attendance?: string | null;
    predictions?: string | null;
  };
  hasError: boolean;
  isSessionExpired?: boolean;
}

/**
 * Fetches real Supabase dataset metrics for the Admin Dashboard.
 * 
 * Formulas & Data Handling:
 * 1. Total Students: Exact row count from `students` table (297 records).
 * 2. Total Faculty: Exact row count from `staff` table (29 records).
 * 3. Average Performance: Calculated across all valid non-null rows in `academic_performance`:
 *    Student Score = Quiz Average (out of 10) + Midterm Marks (out of 30) + Final Marks (out of 60)
 *    Null or invalid numeric values are ignored.
 * 4. Average Attendance: Mean of valid, non-null `attendance_percentage` values in `student_attendance`.
 * 5. High-Risk Students: Distinct count of student IDs in `predictions` where
 *    `academic_risk` is marked 'High' (case-insensitive and trimmed).
 * 
 * Never fabricates values, never uses mock fallbacks for metrics, and respects RLS.
 */
export async function fetchAdminDashboardMetrics(authToken?: string | null): Promise<AdminDashboardMetrics> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      totalStudents: null,
      totalStaff: null,
      avgPerformance: null,
      avgAttendance: null,
      highRiskStudentsCount: null,
      modRiskStudentsCount: null,
      lowRiskStudentsCount: null,
      passRate: null,
      avgQuiz: null,
      avgMidterm: null,
      avgFinal: null,
      avgLabAttendance: null,
      validAcadCount: 0,
      validAttCount: 0,
      validPredictionsCount: 0,
      predictionModelName: null,
      staffSubjectsBreakdown: [],
      genderBreakdown: { male: 0, female: 0, other: 0 },
      performanceDistribution: { critical: 0, belowAverage: 0, average: 0, good: 0, excellent: 0 },
      errors: { students: 'Supabase client not initialized' },
      hasError: true,
    };
  }

  // Resolve active administrator token for secure authenticated queries
  const activeToken = await getActiveAuthToken(authToken);

  // Execute parallel queries against real database tables
  const [studentsRes, staffRes, acadRes, attRes, predRes] = await Promise.all([
    client.from('students').select('student_id, name, age, gender', { count: 'exact' }),
    client.from('staff').select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status', { count: 'exact' }),
    client.from('academic_performance').select('student_id, quiz1_marks, quiz2_marks, quiz3_marks, quiz_average, midterm_marks, final_marks, previous_gpa'),
    client.from('student_attendance').select('attendance_id, student_id, attendance_percentage, lab_attendance_percentage, lectures_attended, total_lectures'),
    client.from('predictions').select('prediction_id, student_id, predicted_final_score, academic_risk, prediction_model, prediction_date'),
  ]);

  // 1. Total Students
  let totalStudents: number | null = null;
  const genderBreakdown = { male: 0, female: 0, other: 0 };
  let studentList = (!studentsRes.error && Array.isArray(studentsRes.data) && studentsRes.data.length > 0) ? studentsRes.data : null;
  let studentsFetchError: string | null = studentsRes.error?.message || null;

  if (!studentList && activeToken) {
    try {
      const resp = await fetch(apiUrl('/api/admin/students'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const parsed = await parseApiResponse<{ success: boolean; students: any[] }>(resp, 'Admin students endpoint');
      if (parsed.ok && parsed.data?.success && Array.isArray(parsed.data.students) && parsed.data.students.length > 0) {
        studentList = parsed.data.students;
        studentsFetchError = null;
      } else if (!parsed.ok) {
        studentsFetchError = parsed.error;
      }
    } catch (e: any) {
      if (!studentsFetchError) studentsFetchError = e?.message || 'Error fetching students via admin bridge.';
    }
  }

  if (studentList) {
    totalStudents = typeof studentsRes.count === 'number' ? studentsRes.count : studentList.length;
    studentList.forEach((s: any) => {
      const g = (s.gender || '').toString().trim().toLowerCase();
      if (g === 'male' || g === 'm') genderBreakdown.male++;
      else if (g === 'female' || g === 'f') genderBreakdown.female++;
      else genderBreakdown.other++;
    });
  }

  // 2. Total Faculty & Subjects Breakdown (Exact counts from public.staff)
  let totalStaff: number | null = null;
  const staffSubjectsBreakdown: Array<{ subject: string; count: number; avgAttendance?: number }> = [];
  let staffList = (!staffRes.error && Array.isArray(staffRes.data) && staffRes.data.length > 0) ? staffRes.data : null;
  let staffFetchError: string | null = staffRes.error?.message || null;

  if (!staffList && activeToken) {
    try {
      const resp = await fetch(apiUrl('/api/admin/staff'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const parsed = await parseApiResponse<{ success: boolean; staff: any[] }>(resp, 'Admin staff endpoint');
      if (parsed.ok && parsed.data?.success && Array.isArray(parsed.data.staff) && parsed.data.staff.length > 0) {
        staffList = parsed.data.staff;
        staffFetchError = null;
      } else if (!parsed.ok) {
        staffFetchError = parsed.error;
      }
    } catch (e: any) {
      if (!staffFetchError) staffFetchError = e?.message || 'Error fetching staff via admin bridge.';
    }
  }

  if (staffList) {
    totalStaff = staffList.length;
    const subjectMap: Record<string, { count: number; attSum: number; attCount: number }> = {};
    staffList.forEach((st: any) => {
      const rawSub = typeof st.subject === 'string' ? st.subject.trim() : '';
      const sub =
        !rawSub || rawSub.toUpperCase() === 'NULL' || rawSub.toLowerCase() === 'unassigned'
          ? 'Unspecified'
          : rawSub;

      if (!subjectMap[sub]) {
        subjectMap[sub] = { count: 0, attSum: 0, attCount: 0 };
      }
      subjectMap[sub].count++;
      if (typeof st.overall_attendance_percentage === 'number' && !isNaN(st.overall_attendance_percentage)) {
        subjectMap[sub].attSum += st.overall_attendance_percentage;
        subjectMap[sub].attCount++;
      }
    });

    Object.entries(subjectMap).forEach(([subject, val]) => {
      staffSubjectsBreakdown.push({
        subject,
        count: val.count,
        avgAttendance: val.attCount > 0 ? Math.round((val.attSum / val.attCount) * 10) / 10 : undefined,
      });
    });
    staffSubjectsBreakdown.sort((a, b) => b.count - a.count);
  }

  // 3. Average Performance & Distribution (Direct client query with secure admin endpoint fallback)
  let avgPerformance: number | null = null;
  let passRate: number | null = null;
  let avgQuiz: number | null = null;
  let avgMidterm: number | null = null;
  let avgFinal: number | null = null;
  let validAcadCount = 0;
  const performanceDistribution = { critical: 0, belowAverage: 0, average: 0, good: 0, excellent: 0 };

  let academicRows: any[] = [];
  let academicFetchError: string | null = null;
  let isSessionExpired = false;

  if (!acadRes.error && Array.isArray(acadRes.data) && acadRes.data.length > 0) {
    academicRows = acadRes.data;
  } else {
    // Under Row Level Security, direct client queries may return 0 rows.
    // Query the protected server endpoint with the admin's active bearer token.
    let tokenToUse = activeToken || (await getActiveAuthToken());

    const queryAcademicApi = async (tok: string | null): Promise<{ ok: boolean; status: number; rows: any[]; error?: string }> => {
      if (!tok) {
        return { ok: false, status: 401, rows: [], error: 'Unauthorized: Invalid or expired Supabase authentication session.' };
      }
      try {
        const resp = await fetch(apiUrl('/api/admin/academic-performance'), {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tok}`,
          },
        });
        const parsed = await parseApiResponse<{ success: boolean; academic_performance: any[] }>(
          resp,
          'Academic performance endpoint (/api/admin/academic-performance)'
        );

        if (parsed.ok && parsed.data?.success && Array.isArray(parsed.data.academic_performance)) {
          return { ok: true, status: parsed.status, rows: parsed.data.academic_performance };
        }

        return {
          ok: false,
          status: parsed.status,
          rows: [],
          error: parsed.error || 'No academic_performance rows returned from database.',
        };
      } catch (e: any) {
        return { ok: false, status: 500, rows: [], error: e?.message || 'Error fetching academic_performance via admin bridge.' };
      }
    };

    let result = await queryAcademicApi(tokenToUse);

    // If query failed with 401 or expired session, attempt a safe session refresh and retry
    if (!result.ok && (result.status === 401 || result.error?.toLowerCase().includes('unauthorized') || result.error?.toLowerCase().includes('expired'))) {
      const refreshedToken = await refreshSupabaseSession();
      if (refreshedToken) {
        tokenToUse = refreshedToken;
        result = await queryAcademicApi(refreshedToken);
      }
    }

    if (result.ok && result.rows.length > 0) {
      academicRows = result.rows;
      academicFetchError = null;
    } else {
      academicFetchError = result.error || acadRes.error?.message || 'Failed to fetch academic_performance rows.';
      if (result.status === 401 || academicFetchError.toLowerCase().includes('unauthorized') || academicFetchError.toLowerCase().includes('expired')) {
        isSessionExpired = true;
      }
    }
  }

  if (academicRows.length > 0) {
    let totalScoreSum = 0;
    let passCount = 0;
    let quizSum = 0;
    let midtermSum = 0;
    let finalSum = 0;

    academicRows.forEach((row) => {
      const q =
        typeof row.quiz_average === 'number' && !isNaN(row.quiz_average)
          ? row.quiz_average
          : typeof row.quiz1_marks === 'number' && !isNaN(row.quiz1_marks)
          ? ((row.quiz1_marks || 0) + (row.quiz2_marks || 0) + (row.quiz3_marks || 0)) / 3
          : null;

      const m = typeof row.midterm_marks === 'number' && !isNaN(row.midterm_marks) ? row.midterm_marks : null;
      const f = typeof row.final_marks === 'number' && !isNaN(row.final_marks) ? row.final_marks : null;

      // Ignore record if all assessment components are null/invalid
      if (q === null && m === null && f === null) {
        return;
      }

      validAcadCount++;
      const studentTotal = (q || 0) + (m || 0) + (f || 0);
      totalScoreSum += studentTotal;

      if (studentTotal >= 50) {
        passCount++;
      }

      if (q !== null) quizSum += q;
      if (m !== null) midtermSum += m;
      if (f !== null) finalSum += f;

      // Score bands according to institutional grading scale
      if (studentTotal < 50) performanceDistribution.critical++;
      else if (studentTotal < 60) performanceDistribution.belowAverage++;
      else if (studentTotal < 70) performanceDistribution.average++;
      else if (studentTotal < 80) performanceDistribution.good++;
      else performanceDistribution.excellent++;
    });

    if (validAcadCount > 0) {
      avgPerformance = Math.round((totalScoreSum / validAcadCount) * 10) / 10;
      passRate = Math.round((passCount / validAcadCount) * 1000) / 10;
      avgQuiz = Math.round((quizSum / validAcadCount) * 10) / 10;
      avgMidterm = Math.round((midtermSum / validAcadCount) * 10) / 10;
      avgFinal = Math.round((finalSum / validAcadCount) * 10) / 10;
    }
  }

  // 4. Average Attendance
  let avgAttendance: number | null = null;
  let avgLabAttendance: number | null = null;
  let validAttCount = 0;

  if (!attRes.error && attRes.data) {
    let attSum = 0;
    let labSum = 0;
    let validLabCount = 0;

    attRes.data.forEach((row) => {
      if (typeof row.attendance_percentage === 'number' && !isNaN(row.attendance_percentage)) {
        validAttCount++;
        attSum += row.attendance_percentage;
      }
      if (typeof row.lab_attendance_percentage === 'number' && !isNaN(row.lab_attendance_percentage)) {
        validLabCount++;
        labSum += row.lab_attendance_percentage;
      }
    });

    if (validAttCount > 0) {
      avgAttendance = Math.round((attSum / validAttCount) * 10) / 10;
    }
    if (validLabCount > 0) {
      avgLabAttendance = Math.round((labSum / validLabCount) * 10) / 10;
    }
  }

  // 5. Predictions & High-Risk Students (Distinct Student IDs)
  let highRiskStudentsCount: number | null = null;
  let modRiskStudentsCount: number | null = null;
  let lowRiskStudentsCount: number | null = null;
  let validPredictionsCount = 0;
  let predictionModelName: string | null = null;

  if (!predRes.error && predRes.data) {
    validPredictionsCount = predRes.data.length;
    if (predRes.data.length > 0 && predRes.data[0].prediction_model) {
      predictionModelName = String(predRes.data[0].prediction_model).trim();
    }

    const highRiskSet = new Set<string>();
    const modRiskSet = new Set<string>();
    const lowRiskSet = new Set<string>();

    predRes.data.forEach((p) => {
      if (p.student_id === null || p.student_id === undefined) return;
      const sid = String(p.student_id).trim();
      if (!sid) return;

      const riskNorm = (p.academic_risk || '').toString().trim().toLowerCase();
      if (riskNorm === 'high' || riskNorm.includes('high')) {
        highRiskSet.add(sid);
      } else if (riskNorm === 'medium' || riskNorm === 'moderate' || riskNorm.includes('mod')) {
        modRiskSet.add(sid);
      } else if (riskNorm === 'low' || riskNorm.includes('low')) {
        lowRiskSet.add(sid);
      }
    });

    highRiskStudentsCount = highRiskSet.size;
    modRiskStudentsCount = modRiskSet.size;
    lowRiskStudentsCount = lowRiskSet.size;
  }

  const errors: AdminDashboardMetrics['errors'] = {
    students: studentList && studentList.length > 0 ? null : (studentsFetchError || studentsRes.error?.message || null),
    staff: staffList && staffList.length > 0 ? null : (staffFetchError || staffRes.error?.message || null),
    academic: academicRows.length > 0 ? null : (academicFetchError || acadRes.error?.message || null),
    attendance: attRes.error?.message || null,
    predictions: predRes.error?.message || null,
  };

  const hasError = Boolean(
    errors.students || errors.staff || errors.academic || errors.attendance || errors.predictions
  );

  return {
    totalStudents,
    totalStaff,
    avgPerformance,
    avgAttendance,
    highRiskStudentsCount,
    modRiskStudentsCount,
    lowRiskStudentsCount,
    passRate,
    avgQuiz,
    avgMidterm,
    avgFinal,
    avgLabAttendance,
    validAcadCount,
    validAttCount,
    validPredictionsCount,
    predictionModelName,
    staffSubjectsBreakdown,
    genderBreakdown,
    performanceDistribution,
    errors,
    hasError,
    isSessionExpired,
  };
}
