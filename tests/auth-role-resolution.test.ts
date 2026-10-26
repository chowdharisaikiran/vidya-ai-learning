import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;
const API_URL = 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('ERROR: SUPABASE_SECRET_KEY is not configured in the environment.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getAuthToken(email: string): Promise<{ token: string; userId: string }> {
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.email_otp || !linkData.user) {
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

  return { token: sessionData.session.access_token, userId: linkData.user.id };
}

async function runAuthRoleResolutionTestSuite() {
  console.log('========================================================================');
  console.log('  VIDYA AUTHENTICATION & ROLE RESOLUTION REGRESSION TEST SUITE          ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      if (detail) console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      if (detail) console.error(`       ${detail}`);
      failed++;
    }
  }

  // 1. Unauthenticated request to /api/auth/me
  console.log('--- TEST 1: Unauthenticated & Malformed Token Access ---');
  const resUnauth = await fetch(`${API_URL}/api/auth/me`);
  assert(resUnauth.status === 401, 'Unauthenticated request to /api/auth/me is rejected with HTTP 401');

  const resInvalid = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: 'Bearer invalid.bogus.jwt.token' },
  });
  assert(resInvalid.status === 401, 'Invalid bearer token is rejected with HTTP 401');

  // 2. Admin role resolution
  console.log('\n--- TEST 2: Admin Profile Resolution (chowdharisaikiran@gmail.com) ---');
  const adminAuth = await getAuthToken('chowdharisaikiran@gmail.com');
  const resAdmin = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  assert(resAdmin.status === 200, 'Admin request to /api/auth/me returns HTTP 200 OK');
  const dataAdmin = await resAdmin.json();
  assert(dataAdmin.success === true, 'Response indicates success: true');
  assert(dataAdmin.isProfileMissing === false, 'Admin profile is marked isProfileMissing: false');
  assert(dataAdmin.user?.role === 'admin', 'Admin role resolves correctly as "admin"', `Resolved role: ${dataAdmin.user?.role}`);
  assert(dataAdmin.user?.id === adminAuth.userId, 'Profile ID matches Supabase Auth UUID', `UUID: ${dataAdmin.user?.id}`);

  // 3. Teacher role resolution
  console.log('\n--- TEST 3: Teacher Profile Resolution (laxmi11munny@gmail.com) ---');
  const teacherAuth = await getAuthToken('laxmi11munny@gmail.com');
  const resTeacher = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${teacherAuth.token}` },
  });
  assert(resTeacher.status === 200, 'Teacher request to /api/auth/me returns HTTP 200 OK');
  const dataTeacher = await resTeacher.json();
  assert(dataTeacher.success === true, 'Response indicates success: true');
  assert(dataTeacher.isProfileMissing === false, 'Teacher profile is marked isProfileMissing: false');
  assert(dataTeacher.user?.role === 'teacher', 'Teacher role resolves correctly as "teacher"', `Resolved role: ${dataTeacher.user?.role}`);
  assert(dataTeacher.user?.staffId === 'T002', 'Teacher staffId is correctly mapped', `staffId: ${dataTeacher.user?.staffId}`);
  assert(dataTeacher.user?.id === teacherAuth.userId, 'Profile ID matches Supabase Auth UUID', `UUID: ${dataTeacher.user?.id}`);

  // 4. Mapped Student role resolution
  console.log('\n--- TEST 4: Mapped Student Profile Resolution (panther221104@gmail.com) ---');
  const studentAuth = await getAuthToken('panther221104@gmail.com');
  const resStudent = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  assert(resStudent.status === 200, 'Student request to /api/auth/me returns HTTP 200 OK');
  const dataStudent = await resStudent.json();
  assert(dataStudent.success === true, 'Response indicates success: true');
  assert(dataStudent.isProfileMissing === false, 'Student profile is marked isProfileMissing: false');
  assert(dataStudent.user?.role === 'student', 'Student role resolves correctly as "student"', `Resolved role: ${dataStudent.user?.role}`);
  assert(dataStudent.user?.studentId === 1, 'Student ID mapping resolves as integer 1', `studentId: ${dataStudent.user?.studentId}`);
  assert(dataStudent.user?.id === studentAuth.userId, 'Profile ID matches Supabase Auth UUID', `UUID: ${dataStudent.user?.id}`);

  // 5. Unmapped Student role resolution
  console.log('\n--- TEST 5: Unmapped Student Profile Resolution (asmithareddy22@gmail.com) ---');
  const unmappedAuth = await getAuthToken('asmithareddy22@gmail.com');
  const resUnmapped = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${unmappedAuth.token}` },
  });
  assert(resUnmapped.status === 200, 'Unmapped student request returns HTTP 200 OK');
  const dataUnmapped = await resUnmapped.json();
  assert(dataUnmapped.success === true, 'Response indicates success: true');
  assert(dataUnmapped.user?.role === 'student', 'Unmapped student role is "student"', `Resolved role: ${dataUnmapped.user?.role}`);
  assert(dataUnmapped.user?.studentId === null, 'Student ID is correctly null (unmapped)', `studentId: ${dataUnmapped.user?.studentId}`);

  // 6. Security & Identity Privacy Check
  console.log('\n--- TEST 6: Identity Isolation & Zero Cross-Exposure ---');
  assert(dataStudent.user?.id !== dataTeacher.user?.id, 'Student and Teacher have distinct isolated UUIDs');
  assert(dataStudent.user?.email !== dataAdmin.user?.email, 'Student and Admin emails are distinct');
  assert(dataAdmin.user?.role !== dataStudent.user?.role, 'Student account cannot resolve as admin');

  console.log('\n========================================================================');
  console.log(`AUTH TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthRoleResolutionTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
