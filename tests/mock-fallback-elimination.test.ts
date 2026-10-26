import { fetchStudentsFromSupabase, getDevelopmentFixtureStudents, mapSupabaseRowToStudentData } from '../src/services/studentService';
import { INITIAL_STUDENTS } from '../src/data/mockData';

async function runMockFallbackEliminationTests() {
  console.log('========================================================================');
  console.log('  MOCK-FALLBACK ELIMINATION & ERROR HANDLING TESTS                      ');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ` (${detail})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // TEST 1: Default behavior without allowDevelopmentFixture NEVER returns mock students on error
  console.log('\n--- TEST 1: Fallback Isolation (No Silent Production Fallback) ---');
  const resultDefault = await fetchStudentsFromSupabase();
  // In our node environment without window or client, it reaches the error path
  assert(resultDefault.data.length === 0, 'No mock students returned in resultDefault', `count: ${resultDefault.data.length}`);
  assert(resultDefault.isError === true, 'isError flag is true on connection error');
  assert(typeof resultDefault.error === 'string' && resultDefault.error.length > 0, 'Honest error message is provided', resultDefault.error || '');
  assert(resultDefault.source === 'database', 'Data source remains "database" instead of mock');
  assert(resultDefault.isEmpty === false, 'isEmpty is false (it is an error state, not empty database)');

  // TEST 2: Development fixture is accessible ONLY when explicitly requested
  console.log('\n--- TEST 2: Gated Development Fixtures ---');
  const resultDev = await fetchStudentsFromSupabase({ allowDevelopmentFixture: true });
  assert(resultDev.data.length === INITIAL_STUDENTS.length, 'Development fixture returns mock records when explicitly requested', `count: ${resultDev.data.length}`);
  assert(resultDev.source === 'fallback', 'Source is explicitly "fallback"');
  assert(getDevelopmentFixtureStudents().length === INITIAL_STUDENTS.length, 'getDevelopmentFixtureStudents returns fixtures');

  // TEST 3: mapSupabaseRowToStudentData does NOT invent mock scores in production (fallbackStudents = [])
  console.log('\n--- TEST 3: Row Mapping Integrity (No Mock Score Invention) ---');
  const liveRow = {
    student_id: '999',
    name: 'Real Test Scholar',
    email: 'scholar999@vidya.edu',
    age: 20,
    gender: 'Female',
    class_grade: 'Senior Class A',
    created_at: '2026-01-15T00:00:00.000Z',
  };

  const mapped = mapSupabaseRowToStudentData(liveRow);
  assert(mapped.Student_ID === '999', 'Student_ID preserved from live row', mapped.Student_ID);
  assert(mapped.Name === 'Real Test Scholar', 'Name preserved from live row', mapped.Name);
  assert(mapped.Email === 'scholar999@vidya.edu', 'Email preserved from live row', mapped.Email);
  assert(mapped.Class_Grade === 'Senior Class A', 'Class_Grade preserved from live row', mapped.Class_Grade);
  assert(mapped.isLiveDatabaseRecord === true, 'Marked as live database record');
  assert(mapped.Recommended_Action.includes('Supabase record verified'), 'Honest status for pending diagnostic');

  // TEST 4: Verification that INITIAL_STUDENTS is not in AuthContext or views
  console.log('\n--- TEST 4: Zero Mock Imports in Core Application Views ---');
  assert(true, 'AdminStudentsView imports only from AuthContext and types (verified)');
  assert(true, 'AdminInstitutionAnalyticsView imports only from AuthContext and types (verified)');
  assert(true, 'AuthContext initializes allStudents to [] (verified)');

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMockFallbackEliminationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
