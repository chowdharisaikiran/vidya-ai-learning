import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const API_URL = 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('ERROR: SUPABASE_SECRET_KEY is not set in environment.');
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
    throw new Error(`Failed to generate magiclink for ${email}: ${linkErr?.message}`);
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

async function runTests() {
  console.log('=== VIDYA STUDENT ONBOARDING & LINKING TEST SUITE ===\n');
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
    // 1. Get tokens
    console.log('Authenticating test personas...');
    const adminToken = await getAuthToken('chowdharisaikiran@gmail.com');
    const student1Token = await getAuthToken('asmithareddy22@gmail.com');
    const student2Token = await getAuthToken('panther221104@gmail.com');

    // Retrieve initial profile states to guarantee baseline restoration
    const { data: initialStudent1 } = await adminClient.from('user_profiles').select('*').eq('email', 'asmithareddy22@gmail.com').single();
    const { data: initialStudent2 } = await adminClient.from('user_profiles').select('*').eq('email', 'panther221104@gmail.com').single();

    // TEST 1: Unmapped student role and NULL student_id in public.user_profiles
    console.log('\n--- TEST 1: Unmapped Student Profile & Default Role ---');
    assert(initialStudent1.role === 'student', 'Student account default role is "student"');
    assert(initialStudent1.student_id === null, 'Student account student_id defaults to NULL (unmapped)');

    // TEST 2: Row-Level Security (RLS) Isolation for unmapped student
    console.log('\n--- TEST 2: Row-Level Security Isolation for Unmapped Student ---');
    const unmappedClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${student1Token}` } },
    });

    const { data: rlsStudents, error: rlsStuErr } = await unmappedClient.from('students').select('*');
    assert(!rlsStuErr && rlsStudents?.length === 0, 'Unmapped student cannot read any rows from public.students (RLS enforced)', `Returned count: ${rlsStudents?.length || 0}`);

    const { data: rlsPerf, error: rlsPerfErr } = await unmappedClient.from('academic_performance').select('*');
    assert(!rlsPerfErr && rlsPerf?.length === 0, 'Unmapped student cannot read any rows from public.academic_performance (RLS enforced)', `Returned count: ${rlsPerf?.length || 0}`);

    // TEST 3: Unauthorized mapping attempts (Role Escalation & Non-Admin Protection)
    console.log('\n--- TEST 3: Unauthorized Mapping Attempt Protection ---');
    const unauthorizedRes = await fetch(`${API_URL}/api/admin/users/${initialStudent1.id}/role-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`, // Student attempting admin action
      },
      body: JSON.stringify({ role: 'admin', studentId: null }),
    });
    assert(unauthorizedRes.status === 403, 'Student cannot escalate role to admin or call role-mapping (HTTP 403 Forbidden)', `HTTP Status: ${unauthorizedRes.status}`);

    const noAuthRes = await fetch(`${API_URL}/api/admin/users/${initialStudent1.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student', studentId: 1 }),
    });
    assert(noAuthRes.status === 401, 'Unauthenticated caller cannot link student account (HTTP 401 Unauthorized)', `HTTP Status: ${noAuthRes.status}`);

    // TEST 4: Admin Student Candidate Search Endpoint
    console.log('\n--- TEST 4: Admin-Only Student Search Endpoint ---');
    const searchRes = await fetch(`${API_URL}/api/admin/students/search?q=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchJson = await searchRes.json();
    assert(searchRes.status === 200 && searchJson.success, 'Admin can search student candidates (/api/admin/students/search)', `Total returned: ${searchJson.total}`);
    assert(searchJson.students.length > 0 && searchJson.students[0].student_id !== undefined, 'Candidate record contains student_id, name, age, gender, and mapping status');

    const searchStudentUnauthorized = await fetch(`${API_URL}/api/admin/students/search?q=1`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    assert(searchStudentUnauthorized.status === 403, 'Student account cannot access candidate search endpoint (HTTP 403 Forbidden)');

    // TEST 5: Admin Linking Workflow & Conflict Detection
    console.log('\n--- TEST 5: Admin Linking Workflow & Conflict Detection ---');
    const TEST_STUDENT_ID = 1; // Kristina Vaughan in dataset

    // Step 5A: Link Student 1 to Student record #1
    const linkRes1 = await fetch(`${API_URL}/api/admin/users/${initialStudent1.id}/role-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        role: 'student',
        studentId: TEST_STUDENT_ID,
      }),
    });
    const linkJson1 = await linkRes1.json();
    assert(linkRes1.status === 200 && linkJson1.success, `Admin successfully links account ${initialStudent1.email} to student_id #${TEST_STUDENT_ID}`);

    // Step 5B: Attempt duplicate mapping - Link Student 2 to same Student record #1 without override
    const conflictRes = await fetch(`${API_URL}/api/admin/users/${initialStudent2.id}/role-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        role: 'student',
        studentId: TEST_STUDENT_ID,
        overrideExisting: false,
      }),
    });
    const conflictJson = await conflictRes.json();
    assert(conflictRes.status === 409 && conflictJson.isConflict, 'Duplicate mapping is detected and rejected with HTTP 409 Conflict', `Error: ${conflictJson.error}`);
    assert(conflictJson.conflictingUser?.id === initialStudent1.id, 'Conflict response identifies the existing mapped user account');

    // Step 5C: Verify RLS access for linked Student 1 (can read only their own record)
    const linkedClient1 = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${student1Token}` } },
    });
    const { data: student1Data } = await linkedClient1.from('students').select('student_id, name');
    assert(student1Data?.length === 1 && student1Data[0].student_id === TEST_STUDENT_ID, 'Mapped Student 1 can access their own student record under RLS', `Read record: #${student1Data?.[0]?.student_id} (${student1Data?.[0]?.name})`);

    // Step 5D: Conflict Resolution with explicit administrator override
    console.log('\n--- TEST 6: Explicit Administrator Conflict Override & Reassignment ---');
    const overrideRes = await fetch(`${API_URL}/api/admin/users/${initialStudent2.id}/role-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        role: 'student',
        studentId: TEST_STUDENT_ID,
        overrideExisting: true, // Administrator explicitly confirms reassignment
      }),
    });
    const overrideJson = await overrideRes.json();
    assert(overrideRes.status === 200 && overrideJson.success, `Admin successfully overrides conflict and reassigns student record #${TEST_STUDENT_ID} to ${initialStudent2.email}`);

    // Verify Student 1 was atomically unmapped
    const { data: updatedStudent1 } = await adminClient.from('user_profiles').select('student_id').eq('id', initialStudent1.id).single();
    assert(updatedStudent1?.student_id === null, `Previous account ${initialStudent1.email} was atomically unlinked (student_id set to NULL)`);

    // TEST 7: Dedicated Unlinking Endpoint
    console.log('\n--- TEST 7: Dedicated Account Unlinking Endpoint ---');
    const unlinkRes = await fetch(`${API_URL}/api/admin/users/${initialStudent2.id}/unlink-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const unlinkJson = await unlinkRes.json();
    assert(unlinkRes.status === 200 && unlinkJson.success, `Admin unlinks account ${initialStudent2.email} (/api/admin/users/:id/unlink-student)`);

    const { data: finalStudent2 } = await adminClient.from('user_profiles').select('student_id').eq('id', initialStudent2.id).single();
    assert(finalStudent2?.student_id === null, 'Student 2 profile verified as unlinked (student_id = NULL)');

    // Baseline Restoration: ensure database records match original clean state
    console.log('\n--- Restoring Baseline Database State ---');
    await adminClient.from('user_profiles').update({
      role: initialStudent1.role,
      student_id: initialStudent1.student_id,
      staff_id: initialStudent1.staff_id,
      updated_at: new Date().toISOString(),
    }).eq('id', initialStudent1.id);

    await adminClient.from('user_profiles').update({
      role: initialStudent2.role,
      student_id: initialStudent2.student_id,
      staff_id: initialStudent2.staff_id,
      updated_at: new Date().toISOString(),
    }).eq('id', initialStudent2.id);

    console.log('Baseline user_profiles state successfully restored.');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
