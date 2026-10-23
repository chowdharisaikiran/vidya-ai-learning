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

async function runVerification() {
  console.log('================================================================');
  console.log('   VIDYA STUDENT RECORD LINKING: READ-ONLY AUDIT & VERIFICATION  ');
  console.log('================================================================\n');

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
    // 0. Capture initial state of user profiles
    const { data: initialProfiles, error: initErr } = await adminClient
      .from('user_profiles')
      .select('id, email, role, student_id, staff_id')
      .order('email');

    console.log('Current user profiles in database:');
    console.table(initialProfiles);

    console.log('\nAuthenticating test roles...');
    const adminToken = await getAuthToken('chowdharisaikiran@gmail.com');
    const teacherToken = await getAuthToken('laxmi11munny@gmail.com');
    const studentToken = await getAuthToken('asmithareddy22@gmail.com');

    // CHECK 1 & 2: Candidate search returns actual students.student_id from live Supabase table
    console.log('\n--- CHECK 1 & 2: Live Candidate Search & Real student_id ---');
    const searchRes = await fetch(`${API_URL}/api/admin/students/search?q=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchJson = await searchRes.json();

    assert(searchRes.status === 200 && searchJson.success, 'Candidate search endpoint returns HTTP 200 OK');
    assert(Array.isArray(searchJson.students) && searchJson.students.length > 0, 'Candidate search returns student array from live database');

    const firstCand = searchJson.students[0];
    assert(
      typeof firstCand.student_id === 'number' && firstCand.student_id > 0,
      'Candidate displays actual database students.student_id (number), not array index',
      `First candidate student_id: ${firstCand.student_id} (${firstCand.name})`
    );

    // Cross-verify with direct Supabase table query
    const { data: liveStudent, error: liveStuErr } = await adminClient
      .from('students')
      .select('student_id, name, age, gender')
      .eq('student_id', firstCand.student_id)
      .single();

    assert(
      !liveStuErr && liveStudent && liveStudent.name === firstCand.name,
      'Search result matches live record in public.students table',
      `Live DB: #${liveStudent?.student_id} - ${liveStudent?.name}`
    );

    // CHECK 3: "Available" is calculated from live user_profiles.student_id mappings
    console.log('\n--- CHECK 3: Live Mapping Status Calculation ---');
    assert(
      firstCand.isMapped === true && firstCand.mappedUser?.email === 'panther221104@gmail.com',
      'Linked student record #1 is correctly calculated as already linked (isMapped: true)',
      `student_id #${firstCand.student_id} isMapped: ${firstCand.isMapped}, mappedUser: ${firstCand.mappedUser?.email}`
    );

    // Query an unmapped student (student_id = 2) to verify 'Available' calculation
    const unmappedCandRes = await fetch(`${API_URL}/api/admin/students/search?q=2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const unmappedCandJson = await unmappedCandRes.json();
    const stu2Cand = unmappedCandJson.students?.find((s: any) => s.student_id === 2);
    assert(
      stu2Cand && stu2Cand.isMapped === false && stu2Cand.mappedUser === null,
      'Unmapped student record #2 is correctly calculated as Available (isMapped: false)',
      `student_id #2 isMapped: ${stu2Cand?.isMapped}, mappedUser: ${stu2Cand?.mappedUser}`
    );

    // CHECK 6: Server-side validation of account UUID and student ID
    console.log('\n--- CHECK 6: Server-Side UUID & Student ID Validation ---');

    // 6A: Invalid UUID format rejection
    const invalidUuidRes = await fetch(`${API_URL}/api/admin/users/invalid-not-a-uuid/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'student', studentId: 1 }),
    });
    const invalidUuidJson = await invalidUuidRes.json();
    assert(
      invalidUuidRes.status === 400 && invalidUuidJson.error?.includes('UUID'),
      'Server rejects non-UUID account identifier with HTTP 400',
      `Response: ${invalidUuidJson.error}`
    );

    // 6B: Non-existent UUID rejection
    const nonExistentUuidRes = await fetch(`${API_URL}/api/admin/users/00000000-0000-0000-0000-000000000000/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'student', studentId: 1 }),
    });
    const nonExistentUuidJson = await nonExistentUuidRes.json();
    assert(
      nonExistentUuidRes.status === 404 && nonExistentUuidJson.error?.includes('does not exist'),
      'Server rejects non-existent account UUID with HTTP 404',
      `Response: ${nonExistentUuidJson.error}`
    );

    // 6C: Invalid Student ID rejection (negative/zero)
    const invalidStuIdRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'student', studentId: -1 }),
    });
    const invalidStuIdJson = await invalidStuIdRes.json();
    assert(
      invalidStuIdRes.status === 400,
      'Server rejects invalid/negative Student ID with HTTP 400',
      `Response: ${invalidStuIdJson.error}`
    );

    // 6D: Non-existent Student ID rejection
    const nonExistentStuRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'student', studentId: 999999 }),
    });
    const nonExistentStuJson = await nonExistentStuRes.json();
    assert(
      nonExistentStuRes.status === 400 && nonExistentStuJson.error?.includes('does not exist in the public.students dataset'),
      'Server rejects non-existent student record #999999 with HTTP 400',
      `Response: ${nonExistentStuJson.error}`
    );

    // CHECK 7: Non-admin users cannot call linking endpoint
    console.log('\n--- CHECK 7: Access Control: Non-Admin Rejection ---');

    // 7A: Student calling role-mapping
    const studentCallRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert(
      studentCallRes.status === 403,
      'Student caller is strictly forbidden from role-mapping (HTTP 403 Forbidden)'
    );

    // 7B: Teacher calling role-mapping
    const teacherCallRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert(
      teacherCallRes.status === 403,
      'Teacher caller is strictly forbidden from role-mapping (HTTP 403 Forbidden)'
    );

    // 7C: Unauthenticated caller
    const unauthCallRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/role-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student', studentId: 1 }),
    });
    assert(
      unauthCallRes.status === 401,
      'Unauthenticated caller is rejected with HTTP 401 Unauthorized'
    );

    // 7D: Student calling candidate search
    const studentSearchRes = await fetch(`${API_URL}/api/admin/students/search`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentSearchRes.status === 403,
      'Student caller cannot access candidate search endpoint (HTTP 403 Forbidden)'
    );

    // 7E: Student calling unlink-student
    const studentUnlinkRes = await fetch(`${API_URL}/api/admin/users/${initialProfiles?.[2]?.id}/unlink-student`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentUnlinkRes.status === 403,
      'Student caller cannot call unlink-student endpoint (HTTP 403 Forbidden)'
    );

    // CHECK 8: Row-Level Security: Unmapped student cannot access cross-student records
    console.log('\n--- CHECK 8: Row-Level Security (RLS) Isolation ---');
    const studentRlsClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${studentToken}` } },
    });

    const { data: rlsStudents, error: rlsStuErr } = await studentRlsClient
      .from('students')
      .select('student_id, name');

    assert(
      !rlsStuErr && (rlsStudents === null || rlsStudents.length === 0),
      'Unmapped student account cannot read any records from public.students under RLS',
      `Rows visible: ${rlsStudents?.length || 0}`
    );

    const { data: rlsAcademic, error: rlsAcadErr } = await studentRlsClient
      .from('academic_performance')
      .select('student_id, final_marks');

    assert(
      !rlsAcadErr && (rlsAcademic === null || rlsAcademic.length === 0),
      'Unmapped student account cannot read grades from public.academic_performance under RLS',
      `Rows visible: ${rlsAcademic?.length || 0}`
    );

    // CHECK 10: Verify database records remain pristine and unmodified
    console.log('\n--- CHECK 10: Zero-Mutation Verification ---');
    const { data: finalProfiles } = await adminClient
      .from('user_profiles')
      .select('id, email, role, student_id, staff_id')
      .order('email');

    let allIdentical = true;
    for (let i = 0; i < (initialProfiles?.length || 0); i++) {
      const p1 = initialProfiles![i];
      const p2 = finalProfiles?.find((p) => p.id === p1.id);
      if (p1.role !== p2?.role || p1.student_id !== p2?.student_id || p1.staff_id !== p2?.staff_id) {
        allIdentical = false;
        break;
      }
    }

    assert(allIdentical, 'No database records were modified, unlinked, or remapped during verification');

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runVerification();
