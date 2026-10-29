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

async function runPlatformOwnerSecurityTestSuite() {
  console.log('========================================================================');
  console.log('   VIDYA PLATFORM OWNER DASHBOARD & API SECURITY REGRESSION SUITE       ');
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

  // 1. Logged-out / Unauthenticated Direct Requests
  console.log('--- TEST 1: Logged-out Direct Requests (Zero Authorization) ---');
  const platformEndpoints = [
    '/api/platform/auth/verify',
    '/api/platform/overview',
    '/api/platform/institutions',
    '/api/platform/subscriptions',
    '/api/platform/invoices',
    '/api/platform/audit-logs',
  ];

  for (const ep of platformEndpoints) {
    const res = await fetch(`${API_URL}${ep}`);
    assert(res.status === 401, `Unauthenticated request to ${ep} is rejected with HTTP 401`, `Status: ${res.status}`);
    const data = await res.json();
    assert(data.success === false || data.isAuthorized === false, `${ep} response contains failure indication`);
  }

  // 2. Expired / Invalid JWT Bearer Tokens
  console.log('\n--- TEST 2: Expired and Malformed JWT Tokens ---');
  const invalidTokens = [
    'Bearer invalid.jwt.signature',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
    'Bearer ',
    'Basic YWRtaW46cGFzc3dvcmQ=',
  ];

  for (const authHeader of invalidTokens) {
    const res = await fetch(`${API_URL}/api/platform/auth/verify`, {
      headers: { Authorization: authHeader },
    });
    assert(res.status === 401, `Invalid/expired token header "${authHeader.substring(0, 15)}..." rejected with HTTP 401`);
  }

  // 3. Authenticated Institutional Admin Attempting Platform Owner Access
  console.log('\n--- TEST 3: Authenticated Admin (chowdharisaikiran@gmail.com) Non-Owner Protection ---');
  const adminAuth = await getAuthToken('chowdharisaikiran@gmail.com');
  for (const ep of platformEndpoints) {
    const res = await fetch(`${API_URL}${ep}`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert(res.status === 403, `Admin request to ${ep} is rejected with HTTP 403 Forbidden`, `Status: ${res.status}`);
    const body = await res.json();
    assert(body.isAuthorized === false || body.success === false, `Admin denied access to ${ep} with explicit forbidden response`);
  }

  // 4. Authenticated Teacher Attempting Platform Owner Access
  console.log('\n--- TEST 4: Authenticated Teacher (laxmi11munny@gmail.com) Non-Owner Protection ---');
  const teacherAuth = await getAuthToken('laxmi11munny@gmail.com');
  const resTeacher = await fetch(`${API_URL}/api/platform/overview`, {
    headers: { Authorization: `Bearer ${teacherAuth.token}` },
  });
  assert(resTeacher.status === 403, 'Teacher request to /api/platform/overview is rejected with HTTP 403 Forbidden', `Status: ${resTeacher.status}`);

  // 5. Authenticated Student Attempting Platform Owner Access
  console.log('\n--- TEST 5: Authenticated Student (panther221104@gmail.com) Non-Owner Protection ---');
  const studentAuth = await getAuthToken('panther221104@gmail.com');
  const resStudent = await fetch(`${API_URL}/api/platform/overview`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  assert(resStudent.status === 403, 'Student request to /api/platform/overview is rejected with HTTP 403 Forbidden', `Status: ${resStudent.status}`);

  // 6. Client-Side Role Tampering and Header Injection Immunity
  console.log('\n--- TEST 6: Client-Side Role Tampering & Header Spoofing Immunity ---');
  const resSpoofed = await fetch(`${API_URL}/api/platform/overview`, {
    headers: {
      Authorization: `Bearer ${studentAuth.token}`,
      'X-User-Role': 'platform_owner',
      'X-Role': 'platform_owner',
      'X-Admin': 'true',
    },
  });
  assert(resSpoofed.status === 403, 'Spoofed header injection does not bypass server-side JWT verification (HTTP 403)');

  // 7. Demo Switcher Bypass Attempt (Mock user with no valid JWT)
  console.log('\n--- TEST 7: Demo-Switcher Bypass Immunity ---');
  const resDemo = await fetch(`${API_URL}/api/platform/auth/verify`, {
    headers: {
      Authorization: 'Bearer usr_platform_owner_hq',
    },
  });
  assert(resDemo.status === 401, 'Mock demo token without verified Supabase session rejected with HTTP 401');

  // 8. Role Whitelist Preservation in /api/auth/me
  console.log('\n--- TEST 8: Role Whitelist Preservation (Zero Mutation) ---');
  const resAdminMe = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` },
  });
  const dataAdminMe = await resAdminMe.json();
  assert(dataAdminMe.user?.role === 'admin', 'Admin role preserved strictly as "admin" (not mapped to platform_owner)');

  const resTeacherMe = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${teacherAuth.token}` },
  });
  const dataTeacherMe = await resTeacherMe.json();
  assert(dataTeacherMe.user?.role === 'teacher', 'Teacher role preserved strictly as "teacher"');

  const resStudentMe = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${studentAuth.token}` },
  });
  const dataStudentMe = await resStudentMe.json();
  assert(dataStudentMe.user?.role === 'student', 'Student role preserved strictly as "student"');

  // 9. Fail-Closed Verification (Owner privileges not granted without explicit trusted configuration)
  console.log('\n--- TEST 9: Fail-Closed Security Posture ---');
  assert(
    dataAdminMe.user?.role !== 'platform_owner',
    'System fails closed: Admin is not granted platform_owner privileges by default'
  );

  // 10. Authorized Platform Owner Access (saikiranchowdhari@gmail.com)
  console.log('\n--- TEST 10: Authorized Platform Owner (saikiranchowdhari@gmail.com) Verification ---');
  const ownerAuth = await getAuthToken('saikiranchowdhari@gmail.com');
  const resOwnerMe = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${ownerAuth.token}` },
  });
  const dataOwnerMe = await resOwnerMe.json();
  assert(
    resOwnerMe.status === 200 && dataOwnerMe.user?.role === 'platform_owner',
    'Platform Owner identity resolves to role "platform_owner"',
    `Role: ${dataOwnerMe.user?.role}`
  );
  assert(
    dataOwnerMe.isProfileMissing === false,
    'Platform Owner does not get blocked by missing user_profiles row'
  );

  for (const ep of platformEndpoints) {
    const res = await fetch(`${API_URL}${ep}`, {
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
    });
    assert(
      res.status === 200,
      `Authorized Platform Owner accesses ${ep} with HTTP 200 OK`,
      `Status: ${res.status}`
    );
    const body = await res.json();
    assert(
      body.success !== false && (body.isAuthorized === true || body.data !== undefined),
      `Authorized response received for ${ep}`
    );
  }

  // 11. Password Recovery Endpoint Flow
  console.log('\n--- TEST 11: Platform Owner Password Reset Endpoint Flow ---');
  const resReset = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saikiranchowdhari@gmail.com' }),
  });
  const dataReset = await resReset.json();
  assert(
    resReset.status === 200 && dataReset.success === true,
    'Password reset request dispatched cleanly through Supabase Auth'
  );

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlatformOwnerSecurityTestSuite().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
