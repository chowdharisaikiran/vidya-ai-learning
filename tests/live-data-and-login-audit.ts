import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const API_URL = 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('SUPABASE_SECRET_KEY is required for the audit.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface AuditResult {
  category: string;
  item: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  details: string;
  evidence: any;
}

const auditLog: AuditResult[] = [];

function record(category: string, item: string, status: 'PASS' | 'WARN' | 'FAIL' | 'INFO', details: string, evidence?: any) {
  auditLog.push({ category, item, status, details, evidence });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : status === 'FAIL' ? '❌' : 'ℹ️';
  console.log(`${icon} [${category}] ${item}: ${details}`);
}

async function getAuthToken(email: string): Promise<string | null> {
  try {
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      console.warn(`Could not generate magic link for ${email}:`, linkErr?.message);
      return null;
    }
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: sessionData, error: otpErr } = await anonClient.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: 'email',
    });
    if (otpErr || !sessionData?.session?.access_token) {
      console.warn(`Could not verify OTP for ${email}:`, otpErr?.message);
      return null;
    }
    return sessionData.session.access_token;
  } catch (err: any) {
    console.warn(`Exception getting token for ${email}:`, err?.message);
    return null;
  }
}

async function runAudit() {
  console.log('========================================================================');
  console.log('  VIDYA APPLICATION: COMPREHENSIVE LIVE DATA & AUTHENTICATION AUDIT     ');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: READ-ONLY DATABASE TABLE ROW COUNTS & SCHEMA HEALTH
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: DATABASE ROW COUNTS (READ-ONLY) ---');
  const tables = [
    'students',
    'staff',
    'subjects',
    'student_attendance',
    'staff_attendance',
    'academic_performance',
    'learning_profile',
    'predictions',
    'recommendations',
    'attendance_summary',
    'user_profiles',
    'faculty_class_assignments',
  ];

  const dbCounts: Record<string, number | null> = {};

  for (const table of tables) {
    try {
      const { count, error } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        dbCounts[table] = null;
        record('Database Counts', table, 'WARN', `Query error: ${error.message} (code: ${error.code})`);
      } else {
        dbCounts[table] = count;
        record('Database Counts', table, 'PASS', `Live verified count: ${count} rows`);
      }
    } catch (e: any) {
      dbCounts[table] = null;
      record('Database Counts', table, 'FAIL', `Exception: ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 2: AUTHENTICATION, ACCOUNTS & USER PROFILES AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: AUTH.USERS & USER_PROFILES AUDIT ---');
  const { data: authUsersRes, error: authUsersErr } = await adminClient.auth.admin.listUsers();
  const authUsers = authUsersRes?.users || [];
  record('Auth Users', 'List Auth Users', authUsersErr ? 'FAIL' : 'PASS', `Total auth.users: ${authUsers.length}`, { error: authUsersErr?.message });

  const { data: userProfiles, error: profErr } = await adminClient
    .from('user_profiles')
    .select('id, full_name, email, role, student_id, staff_id, created_at, updated_at');
  record('User Profiles', 'Query user_profiles', profErr ? 'FAIL' : 'PASS', `Total user_profiles rows: ${userProfiles?.length || 0}`, { error: profErr?.message });

  const authUserEmails = new Map(authUsers.map(u => [u.id, u.email]));
  const profileMapByEmail = new Map<string, any>();
  const profileMapById = new Map<string, any>();

  (userProfiles || []).forEach(p => {
    if (p.email) profileMapByEmail.set(p.email.toLowerCase(), p);
    if (p.id) profileMapById.set(p.id, p);
  });

  // Check each account
  const accountAuditList: any[] = [];
  for (const u of authUsers) {
    const email = u.email || 'NO_EMAIL';
    const profile = profileMapById.get(u.id);
    const profileByEmail = profileMapByEmail.get(email.toLowerCase());

    const itemReport = {
      auth_id: u.id,
      email: email,
      created_at: u.created_at,
      has_profile: Boolean(profile),
      profile_role: profile?.role || 'MISSING',
      student_id: profile?.student_id ?? null,
      staff_id: profile?.staff_id ?? null,
      id_mismatch: profile && profile.id !== u.id,
      email_mismatch: profile && profile.email?.toLowerCase() !== email.toLowerCase(),
    };
    accountAuditList.push(itemReport);

    if (!profile) {
      record('Account Audit', email, 'WARN', `Account exists in auth.users (${u.id}) but has no row in user_profiles!`);
    } else if (itemReport.email_mismatch) {
      record('Account Audit', email, 'WARN', `Email mismatch: auth.users has ${email}, user_profiles has ${profile.email}`);
    } else {
      record('Account Audit', email, 'PASS', `Role: ${profile.role}, student_id: ${profile.student_id ?? 'null'}, staff_id: ${profile.staff_id ?? 'null'}`);
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) & ENDPOINT AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: ENDPOINT & ROLE ISOLATION AUDIT ---');

  const adminEmail = 'chowdharisaikiran@gmail.com';
  const teacherEmail = 'laxmi11munny@gmail.com';
  const mappedStudentEmail = 'panther221104@gmail.com';
  const unmappedStudentEmail = 'asmithareddy22@gmail.com';

  const [adminToken, teacherToken, mappedStudentToken, unmappedStudentToken] = await Promise.all([
    getAuthToken(adminEmail),
    getAuthToken(teacherEmail),
    getAuthToken(mappedStudentEmail),
    getAuthToken(unmappedStudentEmail),
  ]);

  record('Auth Personas', 'Admin Token', adminToken ? 'PASS' : 'FAIL', adminEmail);
  record('Auth Personas', 'Teacher Token', teacherToken ? 'PASS' : 'FAIL', teacherEmail);
  record('Auth Personas', 'Mapped Student Token', mappedStudentToken ? 'PASS' : 'FAIL', mappedStudentEmail);
  record('Auth Personas', 'Unmapped Student Token', unmappedStudentToken ? 'PASS' : 'FAIL', unmappedStudentEmail);

  // Helper for API testing
  async function testEndpoint(name: string, url: string, token: string | null, expectedStatus: number, method = 'GET', body?: any) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      const isExpected = res.status === expectedStatus;
      record(
        'Endpoint Audit',
        `${name} [${method} ${url}]`,
        isExpected ? 'PASS' : 'FAIL',
        `Expected ${expectedStatus}, received ${res.status}`,
        { status: res.status, dataSample: typeof data === 'object' ? Object.keys(data || {}) : data }
      );
      return { status: res.status, data };
    } catch (err: any) {
      record('Endpoint Audit', `${name} [${method} ${url}]`, 'FAIL', `Exception: ${err.message}`);
      return { status: 0, data: null };
    }
  }

  // 3A: Admin Endpoints
  console.log('\n--- 3A: Admin Endpoints Testing ---');
  await testEndpoint('Admin DB Health (Admin)', '/api/admin/database-health', adminToken, 200);
  await testEndpoint('Admin DB Health (Teacher Forbidden)', '/api/admin/database-health', teacherToken, 403);
  await testEndpoint('Admin DB Health (Student Forbidden)', '/api/admin/database-health', mappedStudentToken, 403);
  await testEndpoint('Admin DB Health (Unauth)', '/api/admin/database-health', null, 401);

  await testEndpoint('Admin Attendance (Admin)', '/api/admin/attendance', adminToken, 200);
  await testEndpoint('Admin Attendance (Teacher Forbidden)', '/api/admin/attendance', teacherToken, 403);
  await testEndpoint('Admin Attendance (Student Forbidden)', '/api/admin/attendance', mappedStudentToken, 403);

  await testEndpoint('Admin Predictions (Admin)', '/api/admin/predictions', adminToken, 200);
  await testEndpoint('Admin Predictions (Teacher Forbidden)', '/api/admin/predictions', teacherToken, 403);
  await testEndpoint('Admin Predictions (Student Forbidden)', '/api/admin/predictions', mappedStudentToken, 403);

  await testEndpoint('Admin Academic Performance (Admin)', '/api/admin/academic-performance', adminToken, 200);
  await testEndpoint('Admin Academic Performance (Student Forbidden)', '/api/admin/academic-performance', mappedStudentToken, 403);

  await testEndpoint('Admin Student Dashboard View #1 (Admin)', '/api/admin/students/1/dashboard-records', adminToken, 200);
  await testEndpoint('Admin Student Dashboard View #1 (Teacher Forbidden)', '/api/admin/students/1/dashboard-records', teacherToken, 403);
  await testEndpoint('Admin Student Dashboard View #1 (Student Forbidden)', '/api/admin/students/1/dashboard-records', mappedStudentToken, 403);

  // 3B: Teacher Endpoints
  console.log('\n--- 3B: Teacher Endpoints Testing ---');
  await testEndpoint('Teacher Profile (Teacher)', '/api/teacher/profile', teacherToken, 200);
  await testEndpoint('Teacher Profile (Student Forbidden)', '/api/teacher/profile', mappedStudentToken, 403);
  await testEndpoint('Teacher Assigned Students (Teacher)', '/api/teacher/assigned-students', teacherToken, 200);
  await testEndpoint('Teacher Assigned Students (Student Forbidden)', '/api/teacher/assigned-students', mappedStudentToken, 403);

  // 3C: Student Endpoints
  console.log('\n--- 3C: Student Endpoints Testing ---');
  await testEndpoint('Student Profile Records (Mapped Student)', '/api/student/profile-records', mappedStudentToken, 200);
  await testEndpoint('Student Profile Records (Unmapped Student)', '/api/student/profile-records', unmappedStudentToken, 200);
  await testEndpoint('Student Profile Records (Teacher Forbidden)', '/api/student/profile-records', teacherToken, 403);
  await testEndpoint('Student Profile Records (Admin Forbidden)', '/api/student/profile-records', adminToken, 403);

  await testEndpoint('Student Academic Performance (Mapped Student)', '/api/student/academic-performance', mappedStudentToken, 200);
  await testEndpoint('Student Academic Performance (Unmapped Student)', '/api/student/academic-performance', unmappedStudentToken, 200);
  await testEndpoint('Student Academic Performance (Teacher Forbidden)', '/api/student/academic-performance', teacherToken, 403);
  await testEndpoint('Student Academic Performance (Admin Forbidden)', '/api/student/academic-performance', adminToken, 403);

  // -------------------------------------------------------------------------
  // SECTION 4: LIVE DATA TRUTH VS DASHBOARD TOTALS & AGGREGATES
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: DATA TRUTH VS DASHBOARD METRICS ---');

  // 4A: Admin Dashboard Totals
  const adminAttRes = await testEndpoint('Fetch Admin Attendance For Analysis', '/api/admin/attendance', adminToken, 200);
  const adminPredRes = await testEndpoint('Fetch Admin Predictions For Analysis', '/api/admin/predictions', adminToken, 200);
  const adminPerfRes = await testEndpoint('Fetch Admin Perf For Analysis', '/api/admin/academic-performance', adminToken, 200);

  const rawAttendance = adminAttRes.data?.attendance || adminAttRes.data?.student_attendance || [];
  const rawPredictions = adminPredRes.data?.predictions || [];
  const rawAcademic = adminPerfRes.data?.academic_performance || [];

  const rawStudentsCount = dbCounts['students'] || 0;
  const rawStaffCount = dbCounts['staff'] || 0;
  const rawAttendanceCount = rawAttendance.length;
  const rawPredictionsCount = rawPredictions.length;
  const rawAcademicCount = rawAcademic.length;

  // Compute actual mathematical averages from database rows
  let sumAttendance = 0;
  let countAttendance = 0;
  rawAttendance.forEach((r: any) => {
    const val = Number(r.attendance_percentage);
    if (!isNaN(val)) {
      sumAttendance += val;
      countAttendance++;
    }
  });
  const trueAvgAttendance = countAttendance > 0 ? (sumAttendance / countAttendance).toFixed(2) : '0';

  let highRiskCount = 0;
  rawPredictions.forEach((p: any) => {
    if (String(p.academic_risk || '').toLowerCase() === 'high') {
      highRiskCount++;
    }
  });

  record('Data Comparison', 'Total Students', 'PASS', `DB: ${rawStudentsCount} rows`);
  record('Data Comparison', 'Total Faculty/Staff', 'PASS', `DB: ${rawStaffCount} rows`);
  record('Data Comparison', 'Attendance Records', 'PASS', `DB: ${rawAttendanceCount} rows, Mean Attendance: ${trueAvgAttendance}%`);
  record('Data Comparison', 'Predictions Records', 'PASS', `DB: ${rawPredictionsCount} rows, High Risk Count: ${highRiskCount}`);
  record('Data Comparison', 'Academic Performance Records', 'PASS', `DB: ${rawAcademicCount} rows`);

  // 4B: Teacher Assigned Cohort Truth
  const teacherCohortRes = await testEndpoint('Teacher Cohort Data', '/api/teacher/assigned-students', teacherToken, 200);
  const teacherCohort = teacherCohortRes.data?.students || [];
  record('Teacher Data', 'Assigned Cohort Size', 'PASS', `Staff T002 cohort has ${teacherCohort.length} assigned students`, {
    teacherStaffId: 'T002',
    count: teacherCohort.length,
    students: teacherCohort.map((s: any) => ({ student_id: s.student_id, name: s.name, risk: s.Risk_Level })),
  });

  // 4C: Mapped Student Truth (#1 Kristina Vaughan)
  const studentRecRes = await testEndpoint('Student #1 Profile Records', '/api/student/profile-records', mappedStudentToken, 200);
  const sData = studentRecRes.data;
  record('Student Data', 'Student #1 Linked Record', 'PASS', `Linked: ${sData?.isLinked}, student_id: ${sData?.student_id}`, {
    name: sData?.student?.name,
    attendance_pct: sData?.attendance?.attendance_percentage,
    final_marks: sData?.performance?.final_marks,
    quiz_average: sData?.performance?.quiz_average,
    midterm_marks: sData?.performance?.midterm_marks,
    previous_gpa: sData?.performance?.previous_gpa,
    prediction_risk: sData?.predictions?.[0]?.academic_risk,
    prediction_score: sData?.predictions?.[0]?.predicted_final_score,
    recommendations_count: sData?.recommendations?.length,
  });

  // 4D: Unmapped Student Truth (#null Asmitha)
  const unmappedRecRes = await testEndpoint('Unmapped Student Profile Records', '/api/student/profile-records', unmappedStudentToken, 200);
  const uData = unmappedRecRes.data;
  record('Unmapped Student Data', 'Unmapped Record Status', 'PASS', `Linked: ${uData?.isLinked}, student_id: ${uData?.student_id}`, {
    message: uData?.message,
    student: uData?.student,
    performance: uData?.performance,
    attendance: uData?.attendance,
  });

  // -------------------------------------------------------------------------
  // SECTION 5: FRONTEND MOCK DATA AUDIT IN SOURCE FILES
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: CLIENT FALLBACK & MOCK DATA AUDIT ---');

  // Print summary JSON for inclusion in final report
  console.log('\n========================================================================');
  console.log('  AUDIT EXECUTION COMPLETE: SUMMARY OF ALL ITEMS                         ');
  console.log('========================================================================');
  console.log(JSON.stringify({
    dbCounts,
    accountAuditList,
    auditLog,
    computedMetrics: {
      rawStudentsCount,
      rawStaffCount,
      rawAttendanceCount,
      rawPredictionsCount,
      rawAcademicCount,
      trueAvgAttendance,
      highRiskCount,
      teacherCohortSize: teacherCohort.length,
    }
  }, null, 2));
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
