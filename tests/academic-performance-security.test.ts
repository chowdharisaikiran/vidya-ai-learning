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

async function runSecurityTestSuite() {
  console.log('========================================================================');
  console.log('  VIDYA ACADEMIC PERFORMANCE SECURITY & DATA ISOLATION TEST SUITE       ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       ${detail}`);
      failed++;
    }
  }

  try {
    console.log('Authenticating test personas...');
    const adminToken = await getAuthToken('chowdharisaikiran@gmail.com');
    const teacherToken = await getAuthToken('laxmi11munny@gmail.com');
    const mappedStudentToken = await getAuthToken('panther221104@gmail.com'); // student_id = 1
    const unmappedStudentToken = await getAuthToken('asmithareddy22@gmail.com'); // student_id = null

    // ------------------------------------------------------------------------
    // TEST 1: Own-Record Access (Mapped Student #1)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Own-Record Access for Mapped Student #1 ---');
    const ownRes = await fetch(`${API_URL}/api/student/academic-performance`, {
      headers: { Authorization: `Bearer ${mappedStudentToken}` },
    });
    const ownJson = await ownRes.json();

    assert(ownRes.status === 200, 'Student endpoint returns HTTP 200 OK');
    assert(ownJson.success === true && ownJson.isLinked === true, 'Response indicates success: true and isLinked: true');
    assert(ownJson.student_id === 1, 'Endpoint returns correct authenticated student_id = 1');
    assert(ownJson.performance !== null, 'Performance payload is present');
    assert(
      ownJson.performance?.quiz_average === 7.03 &&
      ownJson.performance?.midterm_marks === 30 &&
      ownJson.performance?.final_marks === 36.5 &&
      ownJson.performance?.previous_gpa === 2.57,
      'Performance payload matches live Supabase database marks exactly',
      `Marks: Quiz Avg=${ownJson.performance?.quiz_average}, Midterm=${ownJson.performance?.midterm_marks}, Final=${ownJson.performance?.final_marks}, GPA=${ownJson.performance?.previous_gpa}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Parameter Tampering & Cross-Student Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Parameter Tampering & Cross-Student Denial ---');
    // Attempt spoofing with ?studentId=2
    const tamperRes = await fetch(`${API_URL}/api/student/academic-performance?studentId=2&student_id=2`, {
      headers: { Authorization: `Bearer ${mappedStudentToken}` },
    });
    const tamperJson = await tamperRes.json();

    assert(tamperRes.status === 200, 'Endpoint responds safely to query parameters');
    assert(
      tamperJson.student_id === 1 && tamperJson.performance?.student_id === 1,
      'Client cannot spoof student ID via query parameters; server derives ID exclusively from user_profiles',
      `Returned student_id: ${tamperJson.student_id} (Student #2 data was NOT returned)`
    );

    // Direct Supabase query cross-student check
    const mappedClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${mappedStudentToken}` } },
    });
    const crossStuRes = await mappedClient.from('students').select('*').eq('student_id', 2);
    assert(
      crossStuRes.data?.length === 0,
      'Mapped student cannot access other students records in public.students under RLS',
      `Rows visible: ${crossStuRes.data?.length ?? 0}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Unmapped Student Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Unmapped Student Isolation ---');
    const unmappedRes = await fetch(`${API_URL}/api/student/academic-performance`, {
      headers: { Authorization: `Bearer ${unmappedStudentToken}` },
    });
    const unmappedJson = await unmappedRes.json();

    assert(unmappedRes.status === 200, 'Unmapped student request completes with HTTP 200 OK');
    assert(
      unmappedJson.isLinked === false && unmappedJson.student_id === null && unmappedJson.performance === null,
      'Unmapped student receives isLinked: false and performance: null (zero data leakage)',
      `Response: ${unmappedJson.message}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Role-Based Denial for Non-Students
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Role-Based Denial for Non-Students on /api/student/academic-performance ---');
    const teacherDeniedRes = await fetch(`${API_URL}/api/student/academic-performance`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert(
      teacherDeniedRes.status === 403,
      'Teacher account is strictly forbidden from student endpoint (HTTP 403 Forbidden)'
    );

    const adminDeniedRes = await fetch(`${API_URL}/api/student/academic-performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminDeniedRes.status === 403,
      'Admin account is strictly forbidden from student endpoint (HTTP 403 Forbidden)'
    );

    const unauthRes = await fetch(`${API_URL}/api/student/academic-performance`);
    assert(
      unauthRes.status === 401,
      'Unauthenticated request is rejected (HTTP 401 Unauthorized)'
    );

    // ------------------------------------------------------------------------
    // TEST 5: Admin Cohort Access via Approved Path
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Cohort Access via Approved Endpoint ---');
    const adminPathRes = await fetch(`${API_URL}/api/admin/academic-performance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminPathJson = await adminPathRes.json();
    assert(
      adminPathRes.status === 200 && adminPathJson.success === true,
      'Admin successfully queries institutional academic performance via /api/admin/academic-performance'
    );
    assert(
      Array.isArray(adminPathJson.academic_performance) && adminPathJson.academic_performance.length > 200,
      'Admin receives full cohort records (295 rows)',
      `Total rows: ${adminPathJson.academic_performance?.length}`
    );

    const studentAdminDeniedRes = await fetch(`${API_URL}/api/admin/academic-performance`, {
      headers: { Authorization: `Bearer ${mappedStudentToken}` },
    });
    assert(
      studentAdminDeniedRes.status === 403,
      'Student account is forbidden from admin academic performance endpoint (HTTP 403 Forbidden)'
    );

    // ------------------------------------------------------------------------
    // TEST 6: Teacher Assigned-Students Access Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Teacher Assigned-Students Access Isolation ---');
    const teacherAssignedRes = await fetch(`${API_URL}/api/teacher/assigned-students`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert(
      teacherAssignedRes.status === 200,
      'Teacher endpoint /api/teacher/assigned-students returns HTTP 200 OK for faculty'
    );

    const studentTeacherDeniedRes = await fetch(`${API_URL}/api/teacher/assigned-students`, {
      headers: { Authorization: `Bearer ${mappedStudentToken}` },
    });
    assert(
      studentTeacherDeniedRes.status === 403,
      'Student account is forbidden from teacher analytics endpoint (HTTP 403 Forbidden)'
    );

    console.log('\n========================================================================');
    console.log(`SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runSecurityTestSuite();
