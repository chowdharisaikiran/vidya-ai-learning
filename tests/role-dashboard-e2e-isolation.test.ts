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
  console.log('  VIDYA MULTI-ROLE DASHBOARD E2E & ISOLATION REGRESSION TEST SUITE      ');
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
  const [adminToken, teacherToken, mappedStudentToken, unmappedStudentToken] = await Promise.all([
    getAuthToken('chowdharisaikiran@gmail.com'),
    getAuthToken('laxmi11munny@gmail.com'),
    getAuthToken('panther221104@gmail.com'),
    getAuthToken('asmithareddy22@gmail.com'),
  ]);

  // ------------------------------------------------------------------------
  // TEST 1: Teacher Profile & Assigned Students Isolation
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 1: Teacher Profile & Assigned Students Isolation ---');

  // Teacher profile
  const unauthTeachProf = await fetch(`${API_URL}/api/teacher/profile`);
  assert(unauthTeachProf.status === 401, 'Unauthenticated /api/teacher/profile returns HTTP 401');

  const studentTeachProf = await fetch(`${API_URL}/api/teacher/profile`, {
    headers: { Authorization: `Bearer ${mappedStudentToken}` },
  });
  assert(studentTeachProf.status === 403, 'Student is forbidden from /api/teacher/profile (HTTP 403)');

  const validTeachProf = await fetch(`${API_URL}/api/teacher/profile`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(validTeachProf.status === 200, 'Teacher accesses /api/teacher/profile with HTTP 200 OK');
  const teachProfJson = await validTeachProf.json();
  assert(teachProfJson.success === true, 'Teacher profile response indicates success: true');
  assert(teachProfJson.staff?.staff_id === 'T002', 'Teacher staff_id is verified as T002', `Staff ID: ${teachProfJson.staff?.staff_id}`);
  assert(teachProfJson.staff?.staff_name === 'Emily Carter', 'Teacher staff_name is verified as Emily Carter', `Name: ${teachProfJson.staff?.staff_name}`);
  assert(Boolean(teachProfJson.staff?.subject), 'Teacher subject is populated', `Subject: ${teachProfJson.staff?.subject}`);

  // Teacher assigned cohort
  const validTeachCohort = await fetch(`${API_URL}/api/teacher/assigned-students`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(validTeachCohort.status === 200, 'Teacher accesses assigned cohort with HTTP 200 OK');
  const teachCohortJson = await validTeachCohort.json();
  assert(teachCohortJson.isLinked === true, 'Teacher is linked to faculty profile');
  assert(Array.isArray(teachCohortJson.students), 'Teacher receives assigned student array', `Cohort size: ${teachCohortJson.students?.length}`);

  // ------------------------------------------------------------------------
  // TEST 2: Student Dashboard Profile Records Isolation
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 2: Student Dashboard Profile Records Isolation ---');

  const unauthStuRec = await fetch(`${API_URL}/api/student/profile-records`);
  assert(unauthStuRec.status === 401, 'Unauthenticated /api/student/profile-records returns HTTP 401');

  const teacherStuRec = await fetch(`${API_URL}/api/student/profile-records`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(teacherStuRec.status === 403, 'Teacher is forbidden from /api/student/profile-records (HTTP 403)');

  const adminStuRec = await fetch(`${API_URL}/api/student/profile-records`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStuRec.status === 403, 'Admin is forbidden from /api/student/profile-records (HTTP 403)');

  const validStuRec = await fetch(`${API_URL}/api/student/profile-records`, {
    headers: { Authorization: `Bearer ${mappedStudentToken}` },
  });
  assert(validStuRec.status === 200, 'Mapped student accesses /api/student/profile-records with HTTP 200 OK');
  const stuRecJson = await validStuRec.json();
  assert(stuRecJson.success === true && stuRecJson.isLinked === true, 'Student record indicates success and isLinked: true');
  assert(stuRecJson.student_id === 1, 'Student ID matches verified profile #1', `Student ID: ${stuRecJson.student_id}`);
  assert(stuRecJson.student?.name === 'Kristina Vaughan', 'Student name matches verified record', `Name: ${stuRecJson.student?.name}`);
  assert(typeof stuRecJson.performance?.quiz_average === 'number', 'Student has verified quiz_average', `Quiz Avg: ${stuRecJson.performance?.quiz_average}`);
  assert(typeof stuRecJson.attendance?.attendance_percentage === 'number', 'Student has verified attendance_percentage', `Attendance: ${stuRecJson.attendance?.attendance_percentage}%`);
  assert(Array.isArray(stuRecJson.predictions) && stuRecJson.predictions.length > 0, 'Student has verified ML predictions', `Predictions: ${stuRecJson.predictions?.length}`);
  assert(Array.isArray(stuRecJson.recommendations) && stuRecJson.recommendations.length > 0, 'Student has verified recommendations', `Recommendations: ${stuRecJson.recommendations?.length}`);

  // ------------------------------------------------------------------------
  // TEST 3: Unmapped Student Safe Isolation (Zero Data Exposure)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 3: Unmapped Student Safe Isolation ---');

  const unmappedStuRec = await fetch(`${API_URL}/api/student/profile-records`, {
    headers: { Authorization: `Bearer ${unmappedStudentToken}` },
  });
  assert(unmappedStuRec.status === 200, 'Unmapped student request returns HTTP 200 OK');
  const unmappedJson = await unmappedStuRec.json();
  assert(unmappedJson.isLinked === false, 'Unmapped student receives isLinked: false');
  assert(unmappedJson.student === null && unmappedJson.performance === null && unmappedJson.attendance === null, 'All academic records are null (zero leakage)');

  // ------------------------------------------------------------------------
  // TEST 4: Parameter Tampering Immunity
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 4: Parameter Tampering Immunity ---');

  const tamperRes = await fetch(`${API_URL}/api/student/profile-records?student_id=2&id=2`, {
    headers: { Authorization: `Bearer ${mappedStudentToken}` },
  });
  const tamperJson = await tamperRes.json();
  assert(
    tamperJson.student_id === 1 && tamperJson.student?.student_id === 1,
    'Client cannot tamper with student ID via query params; derived strictly from authenticated user_profile',
    `Resolved student_id: ${tamperJson.student_id}`
  );

  console.log('\n========================================================================');
  console.log(`REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
