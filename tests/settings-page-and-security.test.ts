import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const API_URL = 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('ERROR: SUPABASE_SECRET_KEY is not configured in the environment.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getAuthToken(email: string): Promise<string> {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.email_otp) {
    throw new Error(`Failed to generate magic link for ${email}: ${linkErr?.message}`);
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: sessionData, error: otpErr } = await anonClient.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'email',
  });

  if (otpErr || !sessionData?.session?.access_token) {
    throw new Error(`Failed to verify OTP for ${email}: ${otpErr?.message}`);
  }

  return sessionData.session.access_token;
}

async function runSettingsSecurityTestSuite() {
  console.log('========================================================================');
  console.log('  VIDYA SETTINGS PAGE & DATABASE HEALTH SECURITY REGRESSION TEST        ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       ${details}`);
      failed++;
    }
  }

  console.log('Authenticating test personas...');
  const adminToken = await getAuthToken('chowdharisaikiran@gmail.com');
  const teacherToken = await getAuthToken('laxmi11munny@gmail.com');
  const studentToken = await getAuthToken('panther221104@gmail.com');

  assert(Boolean(adminToken), 'Admin persona authenticated (chowdharisaikiran@gmail.com)');
  assert(Boolean(teacherToken), 'Teacher persona authenticated (laxmi11munny@gmail.com)');
  assert(Boolean(studentToken), 'Student persona authenticated (panther221104@gmail.com)');

  console.log('\n--- TEST SUITE 1: Admin Authorized Access to Settings Database Health Endpoint ---');
  {
    const res = await fetch(`${API_URL}/api/admin/database-health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert(res.status === 200, 'Admin can access /api/admin/database-health with HTTP 200', `Status: ${res.status}`);
    assert(data.success === true, 'Admin response indicates success: true');
    assert(data.isAuthorized === true, 'Admin response indicates isAuthorized: true');
    assert(data.isDatabaseConnected === true, 'Admin response confirms database is connected');
    assert(data.allTablesVerified === true, 'Admin health check confirms allTablesVerified: true');
    assert(data.verifiedCount === 12, 'Admin health check reports exactly 12/12 tables verified', `Count: ${data.verifiedCount}`);
    assert(Array.isArray(data.tables) && data.tables.length === 12, 'Admin response contains 12-table health telemetry');

    // Verify critical tables have exact row counts
    const studentsTable = data.tables?.find((t: any) => t.table === 'students');
    const staffTable = data.tables?.find((t: any) => t.table === 'staff');
    const userProfilesTable = data.tables?.find((t: any) => t.table === 'user_profiles');

    assert(studentsTable && studentsTable.rowCount === 297, 'Admin sees verified 297 student rows in students table', `Rows: ${studentsTable?.rowCount}`);
    assert(staffTable && staffTable.rowCount === 29, 'Admin sees verified 29 staff rows in staff table', `Rows: ${staffTable?.rowCount}`);
    assert(userProfilesTable && userProfilesTable.rowCount > 0, 'Admin sees verified user_profiles table count', `Rows: ${userProfilesTable?.rowCount}`);
  }

  console.log('\n--- TEST SUITE 2: Teacher Strict Role Isolation (Settings Diagnostics Forbidden) ---');
  {
    const res = await fetch(`${API_URL}/api/admin/database-health`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const data = await res.json();

    assert(res.status === 403, 'Teacher access to /api/admin/database-health is rejected with HTTP 403 Forbidden', `Status: ${res.status}`);
    assert(data.success === false, 'Teacher response indicates success: false');
    assert(data.isAuthorized === false, 'Teacher response indicates isAuthorized: false');
    assert(data.allTablesVerified === false, 'Teacher response has allTablesVerified: false');
    assert(data.verifiedCount === 0, 'Teacher response has verifiedCount: 0 (no leakage)');

    // Verify zero row count leakage
    const hasRowCounts = data.tables?.some((t: any) => t.rowCount !== null);
    assert(!hasRowCounts, 'Teacher receives no row count telemetry (all rowCount: null)');
    const allDenied = data.tables?.every((t: any) => t.status === 'Access Denied');
    assert(allDenied, 'All table statuses returned to Teacher are "Access Denied"');
  }

  console.log('\n--- TEST SUITE 3: Student Strict Role Isolation (Settings Diagnostics Forbidden) ---');
  {
    const res = await fetch(`${API_URL}/api/admin/database-health`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data = await res.json();

    assert(res.status === 403, 'Student access to /api/admin/database-health is rejected with HTTP 403 Forbidden', `Status: ${res.status}`);
    assert(data.success === false, 'Student response indicates success: false');
    assert(data.isAuthorized === false, 'Student response indicates isAuthorized: false');
    assert(data.allTablesVerified === false, 'Student response has allTablesVerified: false');
    assert(data.verifiedCount === 0, 'Student response has verifiedCount: 0 (no leakage)');

    // Verify zero row count leakage
    const hasRowCounts = data.tables?.some((t: any) => t.rowCount !== null);
    assert(!hasRowCounts, 'Student receives no row count telemetry (all rowCount: null)');
    const allDenied = data.tables?.every((t: any) => t.status === 'Access Denied');
    assert(allDenied, 'All table statuses returned to Student are "Access Denied"');
  }

  console.log('\n--- TEST SUITE 4: Unauthenticated Requests ---');
  {
    const resNoAuth = await fetch(`${API_URL}/api/admin/database-health`);
    assert(resNoAuth.status === 401, 'Unauthenticated request to /api/admin/database-health is rejected with HTTP 401 Unauthorized', `Status: ${resNoAuth.status}`);
    const dataNoAuth = await resNoAuth.json();
    assert(dataNoAuth.isAuthorized === false, 'Unauthenticated response indicates isAuthorized: false');
    const hasRowCounts = dataNoAuth.tables?.some((t: any) => t.rowCount !== null);
    assert(!hasRowCounts, 'Unauthenticated request receives no row count telemetry (all null)');
  }

  console.log('\n--- TEST SUITE 5: Core Dashboard Data Integrity Post-Cleanup ---');
  {
    // Admin attendance & predictions endpoints must operate without RLS recursion
    const attRes = await fetch(`${API_URL}/api/admin/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(attRes.status === 200, 'Admin attendance endpoint operates with HTTP 200');
    const attData = await attRes.json();
    assert(attData.success === true, 'Admin attendance reports success: true');
    assert(attData.count === 301, 'Live attendance count is 301 rows', `Count: ${attData.count}`);

    const predRes = await fetch(`${API_URL}/api/admin/predictions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(predRes.status === 200, 'Admin predictions endpoint operates with HTTP 200');
    const predData = await predRes.json();
    assert(predData.success === true, 'Admin predictions reports success: true');
    assert(predData.count === 299, 'Live predictions count is 299 rows', `Count: ${predData.count}`);

    // Dataset export endpoint operates with HTTP 200
    const exportRes = await fetch(`${API_URL}/api/admin/dataset/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(exportRes.status === 200, 'Admin dataset export operates with HTTP 200');
  }

  console.log('\n--- TEST SUITE 6: Teacher Settings & Cohort Prediction Endpoints ---');
  {
    // Teacher profile endpoint
    const profRes = await fetch(`${API_URL}/api/teacher/profile`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert(profRes.status === 200, 'Teacher profile endpoint returns HTTP 200 OK');
    const profData = await profRes.json();
    assert(profData.success === true, 'Teacher profile response indicates success: true');
    assert(profData.staff_id === 'T002', 'Teacher staff_id is verified as T002', `staff_id: ${profData.staff_id}`);

    // Teacher assigned cohort endpoint
    const cohortRes = await fetch(`${API_URL}/api/teacher/assigned-students`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert(cohortRes.status === 200, 'Teacher assigned cohort endpoint returns HTTP 200 OK');
    const cohortData = await cohortRes.json();
    assert(cohortData.success === true, 'Teacher assigned cohort response indicates success: true');
    assert(Array.isArray(cohortData.students), 'Teacher receives assigned students array');
  }

  console.log('\n--- TEST SUITE 7: Student Settings & Profile Records Endpoints ---');
  {
    // Student personal profile records
    const studentRecordsRes = await fetch(`${API_URL}/api/student/profile-records`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentRecordsRes.status === 200, 'Student profile records endpoint returns HTTP 200 OK');
    const studentRecordsData = await studentRecordsRes.json();
    assert(studentRecordsData.success === true, 'Student profile records response indicates success: true');
    assert(studentRecordsData.isLinked === true, 'Student account isLinked: true');
    assert(studentRecordsData.student_id === 1, 'Student ID matches #1');
    assert(Boolean(studentRecordsData.performance), 'Student receives verified academic performance record');
    assert(Boolean(studentRecordsData.attendance), 'Student receives verified attendance record');
    assert(Array.isArray(studentRecordsData.predictions), 'Student receives verified predictions array');
  }

  console.log('\n========================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED / ${failed} FAILED                     `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSettingsSecurityTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
