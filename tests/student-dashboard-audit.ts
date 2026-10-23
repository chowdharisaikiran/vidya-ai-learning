import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const API_URL = 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('SUPABASE_SECRET_KEY is missing from environment.');
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

async function runStudentDashboardAudit() {
  console.log('========================================================================');
  console.log('  VIDYA STUDENT DASHBOARD: DATA ISOLATION & ACCURACY AUDIT (READ-ONLY)  ');
  console.log('========================================================================\n');

  // Fetch accounts
  const { data: profiles } = await adminClient
    .from('user_profiles')
    .select('*')
    .order('email');

  console.log('Profiles in user_profiles:');
  console.table(profiles);

  // Authenticate personas
  const unmappedEmail = 'asmithareddy22@gmail.com';
  const mappedEmail = 'panther221104@gmail.com';

  const unmappedToken = await getAuthToken(unmappedEmail);
  const mappedToken = await getAuthToken(mappedEmail);

  const unmappedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${unmappedToken}` } },
  });

  const mappedClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${mappedToken}` } },
  });

  console.log('\n--- SECTION A: AUTHENTICATION & IDENTITY ---');
  // A.1 Verify user UUID and role using active session
  const { data: { user: unmappedAuthUser } } = await unmappedClient.auth.getUser();
  const { data: { user: mappedAuthUser } } = await mappedClient.auth.getUser();

  console.log(`Unmapped Auth UUID: ${unmappedAuthUser?.id} (${unmappedAuthUser?.email})`);
  console.log(`Mapped Auth UUID:   ${mappedAuthUser?.id} (${mappedAuthUser?.email})`);

  // A.2 Read user_profiles.student_id mapping
  const { data: unmappedProfile } = await unmappedClient.from('user_profiles').select('*').eq('id', unmappedAuthUser!.id).single();
  const { data: mappedProfile } = await mappedClient.from('user_profiles').select('*').eq('id', mappedAuthUser!.id).single();

  console.log(`Unmapped user_profiles.student_id: ${unmappedProfile?.student_id} (Expected: null)`);
  console.log(`Mapped user_profiles.student_id:   ${mappedProfile?.student_id} (Expected: 1)`);

  // A.4 Confirm unmapped student cannot access any student's records
  const unmappedStudentsRead = await unmappedClient.from('students').select('*');
  console.log(`Unmapped student read from students: ${unmappedStudentsRead.data?.length ?? 0} rows (Expected: 0)`);

  console.log('\n--- SECTION B: ROW-LEVEL SECURITY & DATA ISOLATION ---');
  // B.1 Authenticated student can read their own students record
  const mappedOwnStudent = await mappedClient.from('students').select('*');
  console.log(`Mapped student read from students: ${mappedOwnStudent.data?.length ?? 0} rows (Expected: 1)`);
  if (mappedOwnStudent.data?.[0]) {
    console.log(`  Row details: student_id=${mappedOwnStudent.data[0].student_id}, name=${mappedOwnStudent.data[0].name}`);
  }

  // B.2 Student can read only authorized tables
  const mappedAtt = await mappedClient.from('student_attendance').select('*');
  console.log(`Mapped student read from student_attendance: ${mappedAtt.data?.length ?? 0} rows (Expected: 1)`);

  const mappedLearn = await mappedClient.from('learning_profile').select('*');
  console.log(`Mapped student read from learning_profile: ${mappedLearn.data?.length ?? 0} rows (Expected: 1)`);

  const mappedPred = await mappedClient.from('predictions').select('*');
  console.log(`Mapped student read from predictions: ${mappedPred.data?.length ?? 0} rows (Expected: 1)`);

  const mappedRec = await mappedClient.from('recommendations').select('*');
  console.log(`Mapped student read from recommendations: ${mappedRec.data?.length ?? 0} rows (Expected: 1)`);

  const mappedAcad = await mappedClient.from('academic_performance').select('*');
  console.log(`Mapped student read from academic_performance: ${mappedAcad.data?.length ?? 0} rows (Expected: 1, Actual: ${mappedAcad.data?.length ?? 0})`);

  // B.3 Attempts to access another student's record
  const otherStudentId = 2;
  const crossStu = await mappedClient.from('students').select('*').eq('student_id', otherStudentId);
  const crossAtt = await mappedClient.from('student_attendance').select('*').eq('student_id', otherStudentId);
  const crossLearn = await mappedClient.from('learning_profile').select('*').eq('student_id', String(otherStudentId));
  const crossPred = await mappedClient.from('predictions').select('*').eq('student_id', String(otherStudentId));
  const crossRec = await mappedClient.from('recommendations').select('*').eq('student_id', String(otherStudentId));

  console.log(`Cross-student attempt (student_id=${otherStudentId}) returns:`);
  console.log(`  students: ${crossStu.data?.length ?? 0} rows`);
  console.log(`  student_attendance: ${crossAtt.data?.length ?? 0} rows`);
  console.log(`  learning_profile: ${crossLearn.data?.length ?? 0} rows`);
  console.log(`  predictions: ${crossPred.data?.length ?? 0} rows`);
  console.log(`  recommendations: ${crossRec.data?.length ?? 0} rows`);

  // B.4 Attempts to access admin-only endpoints & faculty tables
  const adminEndpoints = [
    '/api/admin/users',
    '/api/admin/students',
    '/api/admin/students/search?q=1',
    '/api/admin/staff',
    '/api/admin/academic-performance',
    '/api/admin/predictions',
  ];
  console.log('\nAdmin endpoint access check:');
  for (const ep of adminEndpoints) {
    const res = await fetch(`${API_URL}${ep}`, {
      headers: { Authorization: `Bearer ${mappedToken}` },
    });
    console.log(`  ${ep} -> HTTP ${res.status}`);
  }

  const teacherRes = await fetch(`${API_URL}/api/teacher/assigned-students`, {
    headers: { Authorization: `Bearer ${mappedToken}` },
  });
  console.log(`  /api/teacher/assigned-students -> HTTP ${teacherRes.status}`);

  const staffQuery = await mappedClient.from('staff').select('*');
  console.log(`  staff table direct query -> ${staffQuery.data?.length ?? 0} rows (Error: ${staffQuery.error?.message ?? 'None'})`);

  const otherProfiles = await mappedClient.from('user_profiles').select('*');
  console.log(`  user_profiles direct query -> ${otherProfiles.data?.length ?? 0} rows (Only own profile visible: ${otherProfiles.data?.[0]?.email === mappedEmail})`);

  console.log('\n--- SECTION C: DATA ACCURACY COMPARISON FOR STUDENT_ID = 1 ---');
  // Fetch ground-truth rows from live database using admin client
  const { data: dbStudent } = await adminClient.from('students').select('*').eq('student_id', 1).single();
  const { data: dbPerf } = await adminClient.from('academic_performance').select('*').eq('student_id', 1).single();
  const { data: dbAtt } = await adminClient.from('student_attendance').select('*').eq('student_id', 1).single();
  const { data: dbLearning } = await adminClient.from('learning_profile').select('*').eq('student_id', '1').single();
  const { data: dbPred } = await adminClient.from('predictions').select('*').eq('student_id', '1').single();
  const { data: dbRec } = await adminClient.from('recommendations').select('*').eq('student_id', '1');

  console.log('Ground truth from Supabase DB:');
  console.log('Student:', dbStudent?.student_id, dbStudent?.name, dbStudent?.age, dbStudent?.gender);
  console.log('Attendance:', dbAtt?.total_lectures, dbAtt?.lectures_attended, dbAtt?.attendance_percentage, dbAtt?.lab_attendance_percentage);
  console.log('Learning Profile:', dbLearning?.study_hours_per_day, dbLearning?.learning_style, dbLearning?.sleep_hours, dbLearning?.self_practice_hours);
  console.log('Prediction:', dbPred?.predicted_final_score, dbPred?.academic_risk, dbPred?.prediction_model);
  console.log('Recommendations count:', dbRec?.length, dbRec?.[0]?.focus_area, dbRec?.[0]?.recommended_action);
  console.log('Academic Performance:', dbPerf?.quiz_average, dbPerf?.midterm_marks, dbPerf?.final_marks, dbPerf?.previous_gpa);
}

runStudentDashboardAudit().catch(console.error);
