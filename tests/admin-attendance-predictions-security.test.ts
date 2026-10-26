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
  console.log('  VIDYA ADMIN ATTENDANCE & PREDICTIONS SECURITY & INTEGRATION TEST      ');
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

  // ------------------------------------------------------------------------
  // TEST 1: Unauthenticated & Invalid Token Rejection
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 1: Unauthenticated & Invalid Token Rejection ---');

  const unauthAtt = await fetch(`${API_URL}/api/admin/attendance`);
  assert(unauthAtt.status === 401, 'Unauthenticated request to /api/admin/attendance returns HTTP 401');

  const unauthPred = await fetch(`${API_URL}/api/admin/predictions`);
  assert(unauthPred.status === 401, 'Unauthenticated request to /api/admin/predictions returns HTTP 401');

  const badTokenAtt = await fetch(`${API_URL}/api/admin/attendance`, {
    headers: { Authorization: 'Bearer invalid-token-xyz' },
  });
  assert(badTokenAtt.status === 401, 'Invalid bearer token to /api/admin/attendance returns HTTP 401');

  const badTokenPred = await fetch(`${API_URL}/api/admin/predictions`, {
    headers: { Authorization: 'Bearer invalid-token-xyz' },
  });
  assert(badTokenPred.status === 401, 'Invalid bearer token to /api/admin/predictions returns HTTP 401');

  // ------------------------------------------------------------------------
  // TEST 2: Role-Based Access Control Denial (Student & Teacher)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 2: Role-Based Denial for Non-Admins ---');

  // Student attempts
  const stuAtt = await fetch(`${API_URL}/api/admin/attendance`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(stuAtt.status === 403, 'Student account is forbidden from /api/admin/attendance (HTTP 403)');

  const stuPred = await fetch(`${API_URL}/api/admin/predictions`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(stuPred.status === 403, 'Student account is forbidden from /api/admin/predictions (HTTP 403)');

  // Teacher attempts
  const teacherAtt = await fetch(`${API_URL}/api/admin/attendance`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(teacherAtt.status === 403, 'Teacher account is forbidden from /api/admin/attendance (HTTP 403)');

  const teacherPred = await fetch(`${API_URL}/api/admin/predictions`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(teacherPred.status === 403, 'Teacher account is forbidden from /api/admin/predictions (HTTP 403)');

  // ------------------------------------------------------------------------
  // TEST 3: Admin Authorized Attendance Access
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 3: Admin Authorized Attendance Access ---');

  const adminAttRes = await fetch(`${API_URL}/api/admin/attendance`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAttRes.status === 200, 'Admin request to /api/admin/attendance returns HTTP 200 OK');

  const adminAttJson = await adminAttRes.json();
  assert(adminAttJson.success === true, 'Admin attendance response indicates success: true');
  assert(
    Array.isArray(adminAttJson.student_attendance) && adminAttJson.student_attendance.length === 301,
    'Admin receives full student attendance cohort (301 records)',
    `Retrieved: ${adminAttJson.student_attendance?.length ?? 0} rows (count: ${adminAttJson.count})`
  );

  const sampleAtt = adminAttJson.student_attendance?.[0];
  assert(
    sampleAtt &&
    typeof sampleAtt.attendance_percentage === 'number' &&
    typeof sampleAtt.student_id !== 'undefined',
    'Attendance schema contains valid numeric attendance_percentage and student_id',
    `Sample Student #${sampleAtt?.student_id}: Attendance=${sampleAtt?.attendance_percentage}%, Lab=${sampleAtt?.lab_attendance_percentage}%`
  );

  // ------------------------------------------------------------------------
  // TEST 4: Admin Authorized Predictions Access
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 4: Admin Authorized Predictions Access ---');

  const adminPredRes = await fetch(`${API_URL}/api/admin/predictions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminPredRes.status === 200, 'Admin request to /api/admin/predictions returns HTTP 200 OK');

  const adminPredJson = await adminPredRes.json();
  assert(adminPredJson.success === true, 'Admin predictions response indicates success: true');
  assert(
    Array.isArray(adminPredJson.predictions) && adminPredJson.predictions.length === 299,
    'Admin receives full predictions cohort (299 records)',
    `Retrieved: ${adminPredJson.predictions?.length ?? 0} rows (count: ${adminPredJson.count})`
  );

  const samplePred = adminPredJson.predictions?.[0];
  assert(
    samplePred &&
    typeof samplePred.predicted_final_score === 'number' &&
    typeof samplePred.academic_risk === 'string',
    'Prediction schema contains valid predicted_final_score and academic_risk label',
    `Sample Student #${samplePred?.student_id}: Risk=${samplePred?.academic_risk}, Score=${samplePred?.predicted_final_score}, Model=${samplePred?.prediction_model}`
  );

  // ------------------------------------------------------------------------
  // TEST 5: Direct Verification of Live Database Metrics
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 5: Direct Calculation Verification ---');

  // Attendance metrics calculation
  let totalAtt = 0;
  let countAtt = 0;
  adminAttJson.student_attendance.forEach((r: any) => {
    if (typeof r.attendance_percentage === 'number' && !isNaN(r.attendance_percentage)) {
      totalAtt += r.attendance_percentage;
      countAtt++;
    }
  });
  const avgAttendance = Math.round((totalAtt / countAtt) * 10) / 10;
  assert(countAtt === 301 && avgAttendance > 0, 'Average attendance accurately computed across 301 rows', `Mean Attendance: ${avgAttendance}%`);

  // Predictions distinct high risk students
  const highRiskSet = new Set<string>();
  adminPredJson.predictions.forEach((p: any) => {
    const risk = (p.academic_risk || '').toLowerCase();
    if (risk === 'high' || risk.includes('high')) {
      highRiskSet.add(String(p.student_id));
    }
  });
  assert(highRiskSet.size > 0, 'Distinct high-risk students correctly aggregated', `High-Risk count: ${highRiskSet.size} unique students`);

  // ------------------------------------------------------------------------
  // TEST 6: fetchAdminDashboardMetrics Integration (Zero-Error Verification)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 6: fetchAdminDashboardMetrics Integration ---');
  const { fetchAdminDashboardMetrics } = await import('../src/services/adminMetricsService');
  const metrics = await fetchAdminDashboardMetrics(adminToken);

  assert(metrics.hasError === false, 'fetchAdminDashboardMetrics reports hasError === false');
  assert(metrics.errors.attendance === null, 'errors.attendance is null (no 42P17 recursion)');
  assert(metrics.errors.predictions === null, 'errors.predictions is null (no 42P17 recursion)');
  assert(metrics.errors.students === null && metrics.errors.staff === null && metrics.errors.academic === null, 'All table errors are null');
  assert(metrics.avgAttendance !== null && metrics.avgAttendance === 50, `Average attendance resolves to 50% (got: ${metrics.avgAttendance}%)`);
  assert(metrics.highRiskStudentsCount !== null && metrics.highRiskStudentsCount === 267, `High risk students resolves to 267 (got: ${metrics.highRiskStudentsCount})`);
  assert(metrics.validAttCount === 301, `validAttCount is 301 rows (got: ${metrics.validAttCount})`);
  assert(metrics.validPredictionsCount === 299, `validPredictionsCount is 299 rows (got: ${metrics.validPredictionsCount})`);

  console.log('\n========================================================================');
  console.log(`SECURITY & INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
