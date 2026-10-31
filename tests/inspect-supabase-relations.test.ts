import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';

const adminClient = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function inspectRelations() {
  console.log('========================================================================');
  console.log('         SUPABASE DATASET RELATIONSHIP & MAPPING INSPECTION             ');
  console.log('========================================================================\n');

  // 1. Counts
  const [sCount, aCount, pCount, lCount, subCount] = await Promise.all([
    adminClient.from('students').select('*', { count: 'exact', head: true }),
    adminClient.from('student_attendance').select('*', { count: 'exact', head: true }),
    adminClient.from('academic_performance').select('*', { count: 'exact', head: true }),
    adminClient.from('learning_profile').select('*', { count: 'exact', head: true }),
    adminClient.from('subjects').select('*', { count: 'exact', head: true }),
  ]);

  console.log('Table Counts:');
  console.log(`- students: ${sCount.count}`);
  console.log(`- student_attendance: ${aCount.count}`);
  console.log(`- academic_performance: ${pCount.count}`);
  console.log(`- learning_profile: ${lCount.count}`);
  console.log(`- subjects: ${subCount.count}\n`);

  // 2. Fetch sample students and related records for student IDs 1 to 5
  for (let id = 1; id <= 5; id++) {
    const [s, att, perf, learn] = await Promise.all([
      adminClient.from('students').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('student_attendance').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('academic_performance').select('*').eq('student_id', id).maybeSingle(),
      adminClient.from('learning_profile').select('*').in('student_id', [id, String(id)]).maybeSingle(),
    ]);

    console.log(`Student ID #${id} (${s.data?.name || 'Unknown'}:`);
    console.log(`  - students row:`, s.data);
    console.log(`  - student_attendance row:`, att.data);
    console.log(`  - academic_performance row:`, perf.data);
    console.log(`  - learning_profile row:\n`, learn.data);
  }
}

inspectRelations().catch(console.error);
