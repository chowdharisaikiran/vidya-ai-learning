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

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  VIDYA ADMIN VIEW STUDENT DASHBOARD SECURITY & DATA INTEGRATION TEST   ');
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
  const [adminToken, teacherToken, studentToken] = await Promise.all([
    getAuthToken('chowdharisaikiran@gmail.com'),
    getAuthToken('laxmi11munny@gmail.com'),
    getAuthToken('panther221104@gmail.com'),
  ]);
  console.log('Test personas authenticated successfully.\n');

  // ------------------------------------------------------------------------
  // TEST 1: Unauthenticated & Invalid Token Rejection
  // ------------------------------------------------------------------------
  console.log('--- TEST 1: Unauthenticated & Invalid Token Rejection ---');

  const unauthRes = await fetch(`${API_URL}/api/admin/students/1/dashboard-records`);
  assert(unauthRes.status === 401, 'Unauthenticated request to /api/admin/students/1/dashboard-records returns HTTP 401');

  const badTokenRes = await fetch(`${API_URL}/api/admin/students/1/dashboard-records`, {
    headers: { Authorization: 'Bearer invalid-token-xyz' },
  });
  assert(badTokenRes.status === 401, 'Invalid Bearer token returns HTTP 401');

  // ------------------------------------------------------------------------
  // TEST 2: Role Authorization Checks (Teacher & Student Forbidden)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 2: Role Authorization Checks (Strict Non-Admin Blocking) ---');

  const teacherRes = await fetch(`${API_URL}/api/admin/students/1/dashboard-records`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(teacherRes.status === 403, 'Teacher caller returns HTTP 403 Forbidden for admin student dashboard endpoint');
  const teacherJson = await teacherRes.json();
  assert(teacherJson.error && teacherJson.error.includes('Forbidden'), 'Teacher response contains explicit Forbidden message');

  const studentRes = await fetch(`${API_URL}/api/admin/students/1/dashboard-records`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(studentRes.status === 403, 'Student caller returns HTTP 403 Forbidden for admin student dashboard endpoint');
  const studentJson = await studentRes.json();
  assert(studentJson.error && studentJson.error.includes('Forbidden'), 'Student response contains explicit Forbidden message');

  // ------------------------------------------------------------------------
  // TEST 3: Admin Query for Student #1 (Kristina Vaughan)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 3: Admin Query for Student #1 (Verified Supabase Records) ---');

  const adminStudent1Res = await fetch(`${API_URL}/api/admin/students/1/dashboard-records`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStudent1Res.status === 200, 'Admin request for Student #1 returns HTTP 200 OK');

  const stu1Data = await adminStudent1Res.json();
  assert(stu1Data.success === true, 'Response payload contains success: true');
  assert(stu1Data.student_id === 1, 'Response student_id is integer 1');
  assert(Boolean(stu1Data.student && stu1Data.student.name), `Student #1 name retrieved from public.students: "${stu1Data.student?.name}"`);
  assert(stu1Data.student.student_id === 1, 'Student record student_id matches requested ID #1');

  // Validate linked tables
  assert(stu1Data.performance !== undefined, 'Academic performance object exists in response');
  if (stu1Data.performance) {
    assert(stu1Data.performance.student_id === 1, 'Academic performance student_id matches #1');
    assert(typeof stu1Data.performance.final_marks === 'number', `Student #1 final_marks is numeric: ${stu1Data.performance.final_marks}`);
  }

  assert(stu1Data.attendance !== undefined, 'Attendance object exists in response');
  if (stu1Data.attendance) {
    assert(stu1Data.attendance.student_id === 1, 'Attendance student_id matches #1');
    assert(typeof stu1Data.attendance.attendance_percentage === 'number', `Student #1 attendance % is numeric: ${stu1Data.attendance.attendance_percentage}%`);
  }

  assert(Array.isArray(stu1Data.predictions), `Predictions is an array (${stu1Data.predictions.length} records)`);
  assert(Array.isArray(stu1Data.recommendations), `Recommendations is an array (${stu1Data.recommendations.length} records)`);
  assert(Array.isArray(stu1Data.assignments), `Faculty assignments is an array (${stu1Data.assignments.length} records)`);

  // ------------------------------------------------------------------------
  // TEST 4: Dynamic Distinct Records for Student #2
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 4: Dynamic Distinct Records for Student #2 ---');

  const adminStudent2Res = await fetch(`${API_URL}/api/admin/students/2/dashboard-records`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStudent2Res.status === 200, 'Admin request for Student #2 returns HTTP 200 OK');

  const stu2Data = await adminStudent2Res.json();
  assert(stu2Data.success === true, 'Response payload contains success: true');
  assert(stu2Data.student_id === 2, 'Response student_id is integer 2');
  assert(Boolean(stu2Data.student && stu2Data.student.name), `Student #2 name retrieved from public.students: "${stu2Data.student?.name}"`);
  assert(stu2Data.student.name !== stu1Data.student.name, `Student #2 name ("${stu2Data.student.name}") differs dynamically from Student #1 ("${stu1Data.student.name}")`);

  // ------------------------------------------------------------------------
  // TEST 5: Non-existent & Invalid Student ID Validation
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 5: Non-existent & Invalid Student ID Validation ---');

  const notFoundRes = await fetch(`${API_URL}/api/admin/students/999999/dashboard-records`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(notFoundRes.status === 404, 'Non-existent student ID #999999 returns HTTP 404 Not Found');
  const notFoundJson = await notFoundRes.json();
  assert(notFoundJson.error && notFoundJson.error.includes('999999'), '404 response mentions requested student ID');

  const invalidIdRes = await fetch(`${API_URL}/api/admin/students/invalid-id-xyz/dashboard-records`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(invalidIdRes.status === 400, 'Non-numeric student ID returns HTTP 400 Bad Request');
  const invalidIdJson = await invalidIdRes.json();
  assert(invalidIdJson.error && invalidIdJson.error.includes('Invalid'), '400 response mentions invalid student ID parameter');

  // ------------------------------------------------------------------------
  // TEST SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
