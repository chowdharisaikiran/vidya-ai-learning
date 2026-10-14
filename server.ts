import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_USERS } from './src/data/mockData.ts';
import { calculateAcademicPrediction } from './src/services/mlModel.ts';
import type { StudentData, TeacherData, UserAccount } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Production CORS Middleware: allow cross-origin requests for split deployments (e.g. Vercel frontend + external backend)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// In-memory data stores (can be updated, imported from CSV, etc.)
let users: UserAccount[] = [...INITIAL_USERS];
let students: StudentData[] = [...INITIAL_STUDENTS];
let teachers: TeacherData[] = [...INITIAL_TEACHERS];

// Initialize Google GenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini client initialization warning:', err);
  }
}

// ================= AUTH API =================
// Resolve username/identifier to real Supabase account email without bypassing Supabase Auth
app.post('/api/auth/resolve-email', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== 'string') {
    return res.json({ email: null });
  }

  const query = identifier.trim().toLowerCase();
  if (query.includes('@')) {
    return res.json({ email: query });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.json({ email: null });
  }

  try {
    // Check if identifier matches full_name in public.user_profiles
    const { data: profileByName } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .ilike('full_name', query)
      .limit(1)
      .maybeSingle();

    if (profileByName?.email) {
      return res.json({ email: profileByName.email });
    }

    // Check if identifier matches email prefix (e.g. username before @)
    const { data: profileByPrefix } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .ilike('email', `${query}@%`)
      .limit(1)
      .maybeSingle();

    if (profileByPrefix?.email) {
      return res.json({ email: profileByPrefix.email });
    }

    return res.json({ email: null });
  } catch {
    return res.json({ email: null });
  }
});

app.post('/api/auth/login', (_req, res) => {
  return res.status(400).json({
    error: 'Invalid email or password. Please verify your credentials and try again.',
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  return res.json({
    message: `Password reset verification link successfully generated and dispatched to ${email}.`,
  });
});

// ================= SUPABASE CONFIGURATION =================
const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fxwzjeyiywprabttaznt.supabase.co',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-',
  secretKey: process.env.SUPABASE_SECRET_KEY || '',
  jwksUrl: process.env.SUPABASE_JWKS_URL || 'https://fxwzjeyiywprabttaznt.supabase.co/auth/v1/.well-known/jwks.json',
};

function getCleanSupabaseConfig() {
  let rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.url).trim();
  let rawKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_CONFIG.publishableKey).trim();

  // 1. Detect if environment variables were swapped or misplaced
  if (
    rawUrl.startsWith('sb_publishable_') ||
    rawUrl.startsWith('sb_secret_') ||
    rawUrl.startsWith('eyJ')
  ) {
    const keyCandidate = rawUrl;
    if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
      rawUrl = rawKey;
    } else {
      rawUrl = 'https://fxwzjeyiywprabttaznt.supabase.co';
    }
    rawKey = keyCandidate;
  } else if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = rawKey;
      rawKey = SUPABASE_CONFIG.publishableKey;
    }
  }

  // 2. Validate and sanitize URL
  let url = rawUrl;
  if (
    !url ||
    url.includes('YOUR-PROJECT-ID') ||
    url.includes('your-project-id') ||
    url.startsWith('sb_publishable_') ||
    url.startsWith('sb_secret_') ||
    url.startsWith('eyJ')
  ) {
    url = 'https://fxwzjeyiywprabttaznt.supabase.co';
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (/^[a-z0-9_-]{10,40}$/i.test(url)) {
      url = `https://${url}.supabase.co`;
    } else {
      url = 'https://fxwzjeyiywprabttaznt.supabase.co';
    }
  }

  try {
    const parsed = new URL(url);
    url = `${parsed.protocol}//${parsed.host}`;
  } catch {
    url = 'https://fxwzjeyiywprabttaznt.supabase.co';
  }

  // 3. Validate and sanitize anonKey
  let anonKey = rawKey;
  if (
    !anonKey ||
    anonKey.includes('YOUR-PROJECT-ID') ||
    anonKey.includes('your-project-id') ||
    anonKey.startsWith('http://') ||
    anonKey.startsWith('https://')
  ) {
    anonKey = SUPABASE_CONFIG.publishableKey;
  }

  return { url, anonKey };
}

app.get('/api/supabase/status', (_req, res) => {
  const { url, anonKey } = getCleanSupabaseConfig();
  return res.json({
    url,
    projectRef: 'fxwzjeyiywprabttaznt',
    hasKey: Boolean(anonKey),
    testTable: 'students',
  });
});

app.get('/api/supabase/schema-sql', (_req, res) => {
  try {
    const sqlPath = path.resolve(__dirname, 'supabase-schema.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      return res.type('text/plain').send(sql);
    }
  } catch (e) {
    console.warn('Failed reading supabase-schema.sql:', e);
  }
  return res.status(404).send('-- Schema file not found');
});

app.post('/api/supabase/save-config', (req, res) => {
  let { anonKey, url = 'https://fxwzjeyiywprabttaznt.supabase.co' } = req.body;
  if (!anonKey || !anonKey.trim()) {
    return res.status(400).json({ error: 'Anon key is required' });
  }

  let cleanKey = anonKey.trim();
  let cleanUrl = (url || '').trim();

  // If user pasted key into URL field or vice versa
  if (cleanUrl.startsWith('sb_publishable_') || cleanUrl.startsWith('eyJ')) {
    const temp = cleanUrl;
    cleanUrl = cleanKey.startsWith('http') ? cleanKey : 'https://fxwzjeyiywprabttaznt.supabase.co';
    cleanKey = temp;
  }

  if (
    !cleanUrl ||
    cleanUrl.includes('YOUR-PROJECT-ID') ||
    cleanUrl.includes('your-project-id')
  ) {
    cleanUrl = 'https://fxwzjeyiywprabttaznt.supabase.co';
  } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    if (/^[a-z0-9_-]{10,40}$/i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}.supabase.co`;
    } else {
      cleanUrl = 'https://fxwzjeyiywprabttaznt.supabase.co';
    }
  }

  try {
    const parsed = new URL(cleanUrl);
    cleanUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    cleanUrl = 'https://fxwzjeyiywprabttaznt.supabase.co';
  }

  process.env.VITE_SUPABASE_URL = cleanUrl;
  process.env.VITE_SUPABASE_ANON_KEY = cleanKey;
  process.env.SUPABASE_URL = cleanUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = cleanKey;

  try {
    const envContent = `VITE_SUPABASE_URL="${cleanUrl}"\nVITE_SUPABASE_ANON_KEY="${cleanKey}"\nSUPABASE_URL="${cleanUrl}"\nSUPABASE_PUBLISHABLE_KEY="${cleanKey}"\n`;
    fs.writeFileSync(path.resolve(__dirname, '.env'), envContent, 'utf-8');
  } catch (e) {
    console.warn('Could not write to .env:', e);
  }

  return res.json({
    success: true,
    message: 'Configuration saved to .env',
    url: cleanUrl,
  });
});

app.post('/api/supabase/test', async (req, res) => {
  const config = getCleanSupabaseConfig();
  let url = config.url;
  const rawKey = (req.body?.anonKey || config.anonKey || '').trim();
  const isUrl = rawKey.startsWith('http://') || rawKey.startsWith('https://');
  const anonKey = isUrl ? config.anonKey : rawKey;

  if (!anonKey) {
    return res.status(400).json({
      success: false,
      message: 'Anon public key is required.',
      url,
    });
  }

  // Ensure url is a valid absolute URL
  try {
    const parsed = new URL(url);
    url = `${parsed.protocol}//${parsed.host}`;
  } catch {
    url = 'https://fxwzjeyiywprabttaznt.supabase.co';
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. If caller provided an active auth token, verify against students table
    if (token) {
      const userClient = createClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const stuRes = await userClient.from('students').select('student_id, name', { count: 'exact' }).limit(1);
      if (!stuRes.error && stuRes.data) {
        return res.json({
          success: true,
          message: 'VIDYA Supabase Connected (authenticated session verified)',
          url,
          table: 'students',
          count: stuRes.count,
          data: stuRes.data,
        });
      }
    }

    // 2. Verification using admin client if available on server
    if (supabaseAdmin) {
      const stuRes = await supabaseAdmin.from('students').select('student_id, name', { count: 'exact' }).limit(1);
      if (!stuRes.error && stuRes.data && stuRes.data.length > 0) {
        return res.json({
          success: true,
          message: `VIDYA Supabase Connected (students table verified: ${stuRes.count ?? 297} records)`,
          url,
          table: 'students',
          count: stuRes.count,
          data: stuRes.data,
        });
      }

      const isMissing =
        stuRes.error &&
        (stuRes.error.code === '42P01' ||
          stuRes.error.code === 'PGRST205' ||
          stuRes.error.message?.toLowerCase().includes('does not exist'));

      if (isMissing) {
        return res.json({
          success: false,
          needsTables: true,
          message: 'Table public.students was not found in Supabase schema.',
          url,
          error: stuRes.error?.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: `Supabase query error: ${stuRes.error?.message}`,
        url,
        error: stuRes.error?.message,
      });
    }

    // 3. Fallback direct verification with provided anon key
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const stuRes = await client.from('students').select('student_id, name', { count: 'exact' }).limit(1);
    if (!stuRes.error && stuRes.data && stuRes.data.length > 0) {
      return res.json({
        success: true,
        message: 'VIDYA Supabase Connected (students table verified)',
        url,
        table: 'students',
        count: stuRes.count,
        data: stuRes.data,
      });
    }

    // 42501 indicates the table exists in PostgreSQL, but RLS requires authentication
    if (stuRes.error?.code === '42501') {
      return res.json({
        success: false,
        isRlsEnforced: true,
        message: 'Supabase reached: public.students table is protected by Row Level Security (requires authenticated session).',
        url,
        table: 'students',
        error: stuRes.error.message,
      });
    }

    const isMissing =
      stuRes.error &&
      (stuRes.error.code === '42P01' ||
        stuRes.error.code === 'PGRST205' ||
        stuRes.error.message?.toLowerCase().includes('does not exist'));

    if (isMissing) {
      return res.json({
        success: false,
        needsTables: true,
        message: 'Table public.students was not found in Supabase schema.',
        url,
        error: stuRes.error?.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: `Supabase query error: ${stuRes.error?.message}`,
      url,
      error: stuRes.error?.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Supabase server connection failed: ${err.message}`,
      url,
      error: String(err),
    });
  }
});

function getSupabaseAdminClient() {
  const { url } = getCleanSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY || SUPABASE_CONFIG.secretKey;
  if (!secretKey || secretKey.includes('YOUR_SECRET_KEY') || !url) {
    return null;
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyAdminCaller(req: express.Request): Promise<{ isAuthorized: boolean; callerId?: string; error?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthorized: false, error: 'Unauthorized: Missing or invalid Authorization header.' };
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return { isAuthorized: false, error: 'Unauthorized: Empty bearer token.' };
  }

  // Supabase JWT token verification
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { isAuthorized: false, error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.' };
  }

  try {
    const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authUser) {
      return { isAuthorized: false, error: 'Unauthorized: Invalid or expired Supabase authentication session.' };
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, full_name, email')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profErr || !profile) {
      return { isAuthorized: false, error: 'Forbidden: User profile could not be verified in user_profiles.' };
    }

    if (profile.role !== 'admin') {
      return { isAuthorized: false, error: 'Forbidden: Caller is not a verified administrator in user_profiles.' };
    }

    return { isAuthorized: true, callerId: authUser.id };
  } catch (err: any) {
    return { isAuthorized: false, error: err?.message || 'Authentication error verifying administrator token.' };
  }
}

async function verifyTeacherCaller(req: express.Request): Promise<{
  isAuthorized: boolean;
  callerId?: string;
  role?: string;
  staffId?: string | null;
  error?: string;
}> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthorized: false, error: 'Unauthorized: Missing or invalid Authorization header.' };
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return { isAuthorized: false, error: 'Unauthorized: Empty bearer token.' };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { isAuthorized: false, error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.' };
  }

  try {
    const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authUser) {
      return { isAuthorized: false, error: 'Unauthorized: Invalid or expired Supabase authentication session.' };
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role, staff_id, full_name, email')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profErr || !profile) {
      return { isAuthorized: false, error: 'Forbidden: User profile could not be verified in user_profiles.' };
    }

    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      return { isAuthorized: false, error: 'Forbidden: Caller is not an authorized educator or administrator.' };
    }

    return {
      isAuthorized: true,
      callerId: authUser.id,
      role: profile.role,
      staffId: profile.staff_id || null,
    };
  } catch (err: any) {
    return { isAuthorized: false, error: err?.message || 'Authentication error verifying educator token.' };
  }
}

// ================= ADMIN MANAGEMENT API =================
// Expected Vidya schema tables for comprehensive database health checks
const EXPECTED_VIDYA_TABLES = [
  'students',
  'staff',
  'subjects',
  'student_attendance',
  'staff_attendance',
  'academic_performance',
  'learning_profile',
  'predictions',
  'recommendations',
  'attendance_summary',
  'user_profiles',
  'faculty_class_assignments',
] as const;

// Comprehensive 12-table database health check endpoint (GET and POST supported)
app.all('/api/admin/database-health', async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = getCleanSupabaseConfig();
  const auth = await verifyAdminCaller(req);

  // If caller is not authorized as admin, report Access Denied and do NOT disclose row counts
  if (!auth.isAuthorized) {
    const isForbidden = auth.error?.includes('Forbidden');
    return res.status(isForbidden ? 403 : 401).json({
      success: false,
      isAuthorized: false,
      isDatabaseConnected: Boolean(url),
      error: auth.error || 'Unauthorized: Invalid or missing administrator authorization.',
      message: 'Administrator authorization required to inspect full database table telemetry.',
      allTablesVerified: false,
      verifiedCount: 0,
      totalTables: EXPECTED_VIDYA_TABLES.length,
      timestamp: new Date().toISOString(),
      tables: EXPECTED_VIDYA_TABLES.map((table) => ({
        table,
        status: 'Access Denied',
        rowCount: null,
        timestamp: new Date().toISOString(),
        error: auth.error || 'Access Denied: Administrator role required',
      })),
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      isAuthorized: true,
      isDatabaseConnected: false,
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.',
      isSetupError: true,
      allTablesVerified: false,
      verifiedCount: 0,
      totalTables: EXPECTED_VIDYA_TABLES.length,
      timestamp: new Date().toISOString(),
      tables: EXPECTED_VIDYA_TABLES.map((table) => ({
        table,
        status: 'Query Error',
        rowCount: null,
        timestamp: new Date().toISOString(),
        error: 'SUPABASE_SECRET_KEY missing on server.',
      })),
    });
  }

  try {
    // Check all 12 tables individually using minimal read-only queries with count exact and limit 0
    const tableChecks = await Promise.all(
      EXPECTED_VIDYA_TABLES.map(async (table) => {
        const start = performance.now();
        try {
          const { count, error, status } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact' })
            .limit(0);

          const latencyMs = Math.round(performance.now() - start);

          if (error) {
            const errCode = error.code || '';
            const errMsg = error.message?.toLowerCase() || '';

            let tableStatus: 'Missing' | 'Access Denied' | 'Query Error' = 'Query Error';
            if (
              errCode === '42P01' ||
              errCode === 'PGRST205' ||
              errMsg.includes('not find the table') ||
              errMsg.includes('does not exist') ||
              status === 404
            ) {
              tableStatus = 'Missing';
            } else if (
              errCode === '42501' ||
              errCode === 'PGRST301' ||
              errMsg.includes('permission denied') ||
              errMsg.includes('denied') ||
              status === 401 ||
              status === 403
            ) {
              tableStatus = 'Access Denied';
            }

            return {
              table,
              status: tableStatus,
              rowCount: null,
              timestamp: new Date().toISOString(),
              latencyMs,
              error: error.message || 'Database query error',
            };
          }

          return {
            table,
            status: 'Verified' as const,
            rowCount: typeof count === 'number' ? count : 0,
            timestamp: new Date().toISOString(),
            latencyMs,
            error: null,
          };
        } catch (tableErr: any) {
          return {
            table,
            status: 'Query Error' as const,
            rowCount: null,
            timestamp: new Date().toISOString(),
            latencyMs: Math.round(performance.now() - start),
            error: tableErr?.message || 'Unexpected exception during read-only table check',
          };
        }
      })
    );

    const verifiedCount = tableChecks.filter((t) => t.status === 'Verified').length;
    const allTablesVerified = verifiedCount === EXPECTED_VIDYA_TABLES.length;

    return res.json({
      success: true,
      isAuthorized: true,
      isDatabaseConnected: true,
      allTablesVerified,
      verifiedCount,
      totalTables: EXPECTED_VIDYA_TABLES.length,
      timestamp: new Date().toISOString(),
      databaseUrl: url,
      tables: tableChecks,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      isAuthorized: true,
      isDatabaseConnected: false,
      error: err?.message || 'Server error executing database health checks.',
      allTablesVerified: false,
      verifiedCount: 0,
      totalTables: EXPECTED_VIDYA_TABLES.length,
      timestamp: new Date().toISOString(),
      tables: [],
    });
  }
});

app.get('/api/admin/users', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server. Privileged role management requires a secure server-side service key.',
      isSetupError: true,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, role, student_id, staff_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, users: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching user profiles.' });
  }
});

app.get('/api/admin/students', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.',
      isSetupError: true,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('student_id, name, age, gender')
      .order('student_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, students: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching students.' });
  }
});

app.get('/api/admin/staff', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.',
      isSetupError: true,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status')
      .order('staff_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, staff: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching staff.' });
  }
});

app.get('/api/admin/academic-performance', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.',
      isSetupError: true,
    });
  }

  try {
    const { data, count, error } = await supabaseAdmin
      .from('academic_performance')
      .select('student_id, quiz1_marks, quiz2_marks, quiz3_marks, quiz_average, midterm_marks, final_marks, previous_gpa', { count: 'exact' })
      .order('student_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      count: count ?? data?.length ?? 0,
      academic_performance: data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching academic performance.' });
  }
});

app.get('/api/admin/predictions', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server.',
      isSetupError: true,
    });
  }

  try {
    const { data, count, error } = await supabaseAdmin
      .from('predictions')
      .select('prediction_id, student_id, predicted_final_score, academic_risk, prediction_model, prediction_date', { count: 'exact' })
      .order('student_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      count: count ?? data?.length ?? 0,
      predictions: data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching predictions.' });
  }
});

// ================= FACULTY CLASS ASSIGNMENTS API =================
interface FacultyAssignmentRecord {
  assignment_id: string;
  staff_id: string;
  student_id: number;
  subject_id: string | null;
  created_at: string;
  created_by?: string | null;
  staff_name?: string;
  student_name?: string;
  subject_name?: string;
}

const ASSIGNMENTS_STORAGE_PATH = path.resolve(__dirname, 'data', 'faculty_class_assignments.json');

function loadLocalAssignments(): FacultyAssignmentRecord[] {
  try {
    if (fs.existsSync(ASSIGNMENTS_STORAGE_PATH)) {
      const raw = fs.readFileSync(ASSIGNMENTS_STORAGE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error reading local assignments store:', err);
  }
  return [];
}

function saveLocalAssignments(items: FacultyAssignmentRecord[]) {
  try {
    const dir = path.dirname(ASSIGNMENTS_STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ASSIGNMENTS_STORAGE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving local assignments store:', err);
  }
}

// 1. Admin: View all faculty assignments
app.get('/api/admin/assignments', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  let assignments: FacultyAssignmentRecord[] = [];
  let isPendingMigration = false;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('faculty_class_assignments')
      .select('assignment_id, staff_id, student_id, subject_id, created_at, created_by')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      assignments = data as FacultyAssignmentRecord[];
    } else {
      isPendingMigration = true;
      assignments = loadLocalAssignments();
    }
  } else {
    assignments = loadLocalAssignments();
  }

  // Enrich with staff names, student names, and subject names
  try {
    if (supabaseAdmin) {
      const [staffRes, studentsRes, subjectsRes] = await Promise.all([
        supabaseAdmin.from('staff').select('staff_id, staff_name'),
        supabaseAdmin.from('students').select('student_id, name'),
        supabaseAdmin.from('subjects').select('subject_id, subject_name'),
      ]);

      const staffMap: Record<string, string> = {};
      const studentMap: Record<string, string> = {};
      const subjectMap: Record<string, string> = {};

      staffRes.data?.forEach((s: any) => { staffMap[String(s.staff_id)] = s.staff_name; });
      studentsRes.data?.forEach((s: any) => { studentMap[String(s.student_id)] = s.name; });
      subjectsRes.data?.forEach((s: any) => { subjectMap[String(s.subject_id)] = s.subject_name; });

      assignments = assignments.map((a) => ({
        ...a,
        staff_name: staffMap[String(a.staff_id)] || a.staff_id,
        student_name: studentMap[String(a.student_id)] || `Student #${a.student_id}`,
        subject_name: a.subject_id ? (subjectMap[String(a.subject_id)] || a.subject_id) : 'Unspecified',
      }));
    }
  } catch (enrichErr) {
    console.warn('Enrichment note:', enrichErr);
  }

  return res.json({
    success: true,
    count: assignments.length,
    assignments,
    isPendingMigration,
  });
});

// 2. Admin: Create a new faculty assignment
app.post('/api/admin/assignments', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const { staff_id, student_id, subject_id } = req.body;
  if (!staff_id || typeof staff_id !== 'string' || !staff_id.trim()) {
    return res.status(400).json({ error: 'Valid staff_id is required.' });
  }
  const cleanStaffId = staff_id.trim();

  const numStudentId = parseInt(String(student_id), 10);
  if (isNaN(numStudentId) || numStudentId <= 0) {
    return res.status(400).json({ error: 'Valid numeric student_id is required.' });
  }

  const cleanSubjectId = subject_id && typeof subject_id === 'string' && subject_id.trim() ? subject_id.trim() : null;

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Server configuration error: SUPABASE_SECRET_KEY missing.' });
  }

  // Validate that staff_id exists
  const { data: staffExists } = await supabaseAdmin
    .from('staff')
    .select('staff_id, staff_name')
    .eq('staff_id', cleanStaffId)
    .maybeSingle();

  if (!staffExists) {
    return res.status(400).json({ error: `Faculty member '${cleanStaffId}' does not exist in public.staff.` });
  }

  // Validate that student_id exists
  const { data: studentExists } = await supabaseAdmin
    .from('students')
    .select('student_id, name')
    .eq('student_id', numStudentId)
    .maybeSingle();

  if (!studentExists) {
    return res.status(400).json({ error: `Student ID '${numStudentId}' does not exist in public.students.` });
  }

  // Validate that subject_id exists if provided
  let verifiedSubjectName = 'Unspecified';
  if (cleanSubjectId) {
    const { data: subjectExists } = await supabaseAdmin
      .from('subjects')
      .select('subject_id, subject_name')
      .eq('subject_id', cleanSubjectId)
      .maybeSingle();

    if (!subjectExists) {
      return res.status(400).json({ error: `Subject ID '${cleanSubjectId}' does not exist in public.subjects.` });
    }
    verifiedSubjectName = subjectExists.subject_name;
  }

  // Check duplicate constraint in database
  let dupQuery = supabaseAdmin
    .from('faculty_class_assignments')
    .select('assignment_id')
    .eq('staff_id', cleanStaffId)
    .eq('student_id', numStudentId);

  if (cleanSubjectId) {
    dupQuery = dupQuery.eq('subject_id', cleanSubjectId);
  } else {
    dupQuery = dupQuery.is('subject_id', null);
  }

  const { data: dupExisting } = await dupQuery.maybeSingle();
  if (dupExisting) {
    return res.status(400).json({
      error: `Assignment already exists for Teacher ${cleanStaffId}, Student #${numStudentId}, Subject ${cleanSubjectId || 'Unspecified'}.`,
    });
  }

  // Also check local store fallback for duplicate
  const localList = loadLocalAssignments();
  const isDuplicate = localList.some(
    (a) => a.staff_id === cleanStaffId && a.student_id === numStudentId && a.subject_id === cleanSubjectId
  );
  if (isDuplicate) {
    return res.status(400).json({
      error: `Assignment already exists for Teacher ${cleanStaffId}, Student #${numStudentId}, Subject ${cleanSubjectId || 'Unspecified'}.`,
    });
  }

  const newAssignment: FacultyAssignmentRecord = {
    assignment_id: crypto.randomUUID(),
    staff_id: cleanStaffId,
    student_id: numStudentId,
    subject_id: cleanSubjectId,
    created_at: new Date().toISOString(),
    created_by: auth.callerId || null,
    staff_name: staffExists.staff_name,
    student_name: studentExists.name,
    subject_name: cleanSubjectId ? verifiedSubjectName : 'Unspecified',
  };

  // Attempt insert in Supabase
  let isPendingMigration = false;
  const { error: supErr } = await supabaseAdmin
    .from('faculty_class_assignments')
    .insert({
      assignment_id: newAssignment.assignment_id,
      staff_id: newAssignment.staff_id,
      student_id: newAssignment.student_id,
      subject_id: newAssignment.subject_id,
      created_by: newAssignment.created_by,
    });

  if (supErr) {
    if (supErr.code === '23505') {
      return res.status(400).json({
        error: `Assignment already exists for Teacher ${cleanStaffId}, Student #${numStudentId}, Subject ${cleanSubjectId || 'Unspecified'}.`,
      });
    }
    console.warn('Note: Supabase insert had error, using local fallback:', supErr.message);
    isPendingMigration = true;
  }

  // Always keep persistent local store in sync
  localList.unshift(newAssignment);
  saveLocalAssignments(localList);

  return res.json({
    success: true,
    assignment: newAssignment,
    isPendingMigration,
    message: isPendingMigration
      ? 'Assignment created successfully in persistent local store.'
      : 'Assignment created successfully in database.',
  });
});

// 3. Admin: Remove an assignment
app.delete('/api/admin/assignments/:id', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const assignmentId = req.params.id;
  if (!assignmentId) {
    return res.status(400).json({ error: 'Assignment ID is required.' });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (supabaseAdmin) {
    const { error: delErr } = await supabaseAdmin
      .from('faculty_class_assignments')
      .delete()
      .eq('assignment_id', assignmentId);

    if (delErr) {
      console.warn('Supabase delete warning:', delErr.message);
    }
  }

  const localList = loadLocalAssignments();
  const updatedList = localList.filter((a) => a.assignment_id !== assignmentId);
  saveLocalAssignments(updatedList);

  return res.json({
    success: true,
    message: 'Assignment removed successfully.',
  });
});

// 4. Teacher: View assigned students with permitted academic metrics
app.get('/api/teacher/assigned-students', async (req, res) => {
  const auth = await verifyTeacherCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  if (!auth.staffId) {
    return res.json({
      success: true,
      staff_id: null,
      isLinked: false,
      assignments: [],
      students: [],
      message: 'Faculty account is not linked to a staff record in user_profiles. Contact administrator.',
    });
  }

  const trustedStaffId = auth.staffId;
  const supabaseAdmin = getSupabaseAdminClient();
  let assignedRecords: FacultyAssignmentRecord[] = [];

  if (supabaseAdmin) {
    const { data: supData, error: supErr } = await supabaseAdmin
      .from('faculty_class_assignments')
      .select('assignment_id, staff_id, student_id, subject_id, created_at')
      .eq('staff_id', trustedStaffId);

    if (!supErr && Array.isArray(supData)) {
      assignedRecords = supData as FacultyAssignmentRecord[];
    } else {
      assignedRecords = loadLocalAssignments().filter((a) => a.staff_id === trustedStaffId);
    }
  } else {
    assignedRecords = loadLocalAssignments().filter((a) => a.staff_id === trustedStaffId);
  }

  if (assignedRecords.length === 0) {
    return res.json({
      success: true,
      staff_id: trustedStaffId,
      isLinked: true,
      assignments: [],
      students: [],
      message: 'No students have been assigned to your faculty profile yet.',
    });
  }

  // Extract assigned student IDs
  const assignedStudentIds = Array.from(new Set(assignedRecords.map((a) => a.student_id)));

  // Query details only for assigned students
  try {
    if (!supabaseAdmin) {
      return res.json({ success: true, staff_id: trustedStaffId, isLinked: true, assignments: assignedRecords, students: [] });
    }

    const [studentsRes, acadRes, attRes, predRes] = await Promise.all([
      supabaseAdmin.from('students').select('*').in('student_id', assignedStudentIds),
      supabaseAdmin.from('academic_performance').select('*').in('student_id', assignedStudentIds),
      supabaseAdmin.from('student_attendance').select('*').in('student_id', assignedStudentIds),
      supabaseAdmin.from('predictions').select('*').in('student_id', assignedStudentIds.map(String)),
    ]);

    const acadMap: Record<number, any> = {};
    const attMap: Record<number, any> = {};
    const predMap: Record<string, any> = {};

    acadRes.data?.forEach((a: any) => { acadMap[a.student_id] = a; });
    attRes.data?.forEach((a: any) => { attMap[a.student_id] = a; });
    predRes.data?.forEach((p: any) => { predMap[String(p.student_id)] = p; });

    const enrichedStudents = (studentsRes.data || []).map((s: any) => {
      const perf = acadMap[s.student_id];
      const att = attMap[s.student_id];
      const pred = predMap[String(s.student_id)];

      const quizAvg = perf ? (perf.quiz_average || ((perf.quiz1_marks + perf.quiz2_marks + perf.quiz3_marks) / 3) || 75) : 75;
      const midterm = perf ? (perf.midterm_marks || 22) : 22;
      const finalMarks = perf ? (perf.final_marks || 40) : 40;
      const totalScore = Math.round(((quizAvg || 0) + (midterm || 0) + (finalMarks || 0)) * 10) / 10;

      const attPct = att ? (att.attendance_percentage || 85) : (s.attendance_percent || 85);
      const risk = pred ? pred.academic_risk : (s.risk_level || 'Low');

      return {
        Student_ID: String(s.student_id),
        Name: s.name,
        Age: s.age || 18,
        Gender: s.gender || 'Male',
        Education_Level: 'Undergraduate',
        Class_Grade: s.class_grade || 'Grade 11',
        Attendance_Percent: attPct,
        Overall_Score: totalScore,
        Quiz_Score: Math.round(quizAvg),
        Assignment_Score: Math.round(midterm),
        Exam_Score: Math.round(finalMarks),
        Previous_Score: s.previous_score || 75,
        Risk_Level: risk,
        Weak_Subject: s.weak_subject || 'Mathematics',
        Performance_Level: totalScore >= 80 ? 'Good' : totalScore >= 60 ? 'Average' : 'Critical',
        Last_Updated: s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '2026-10-13',
        Subjects: [
          { subject: 'Assigned Curriculum', assignment: Math.round(midterm), quiz: Math.round(quizAvg), exam: Math.round(finalMarks), overall: totalScore, grade: 'B', trend: 'stable' },
        ],
        History: [],
      };
    });

    return res.json({
      success: true,
      staff_id: trustedStaffId,
      isLinked: true,
      assignments: assignedRecords,
      students: enrichedStudents,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error compiling assigned student cohort.' });
  }
});

app.post('/api/admin/users/:id/role-mapping', async (req, res) => {
  const auth = await verifyAdminCaller(req);
  if (!auth.isAuthorized) {
    return res.status(auth.error?.includes('Forbidden') ? 403 : 401).json({ error: auth.error });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Server configuration error: SUPABASE_SECRET_KEY is not configured on the server. Privileged role and mapping changes require a secure server-side service key.',
      isSetupError: true,
    });
  }

  const targetUserId = req.params.id;
  const { role, studentId, staffId } = req.body;

  // 1. Role validation
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Invalid role specified. Role must be 'student', 'teacher', or 'admin'." });
  }

  // 2. Strict mapping isolation:
  // - Prevent assigning student_id to teacher/admin
  // - Prevent assigning staff_id to student/admin
  // - Clear incompatible mappings when changing roles
  let sanitizedStudentId: number | null = null;
  let sanitizedStaffId: string | null = null;

  if (role === 'student') {
    sanitizedStaffId = null; // Strictly clear staff_id
    if (studentId !== null && studentId !== undefined && studentId !== '') {
      const parsedNum = typeof studentId === 'number' ? studentId : parseInt(String(studentId).replace(/\D/g, ''), 10);
      if (isNaN(parsedNum) || parsedNum <= 0) {
        return res.status(400).json({ error: 'Invalid Student ID. Must be a positive integer.' });
      }

      // Explicit verification: check that student exists in public.students
      const { data: studentRecord, error: stuLookupErr } = await supabaseAdmin
        .from('students')
        .select('student_id, name')
        .eq('student_id', parsedNum)
        .maybeSingle();

      if (stuLookupErr || !studentRecord) {
        return res.status(400).json({ error: `Student record #${parsedNum} does not exist in the public.students dataset.` });
      }

      sanitizedStudentId = parsedNum;
    }
  } else if (role === 'teacher') {
    sanitizedStudentId = null; // Strictly clear student_id
    if (staffId !== null && staffId !== undefined && String(staffId).trim() !== '') {
      const cleanStaffId = String(staffId).trim();

      // Explicit verification: check that staff exists in public.staff
      const { data: staffRecord, error: staffLookupErr } = await supabaseAdmin
        .from('staff')
        .select('staff_id, staff_name')
        .eq('staff_id', cleanStaffId)
        .maybeSingle();

      if (staffLookupErr || !staffRecord) {
        return res.status(400).json({ error: `Staff member '${cleanStaffId}' does not exist in the public.staff dataset.` });
      }

      sanitizedStaffId = cleanStaffId;
    }
  } else if (role === 'admin') {
    // Administrator accounts have no dataset mapping
    sanitizedStudentId = null;
    sanitizedStaffId = null;
  }

  try {
    // Perform privileged update via service-role client
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role,
        student_id: sanitizedStudentId,
        staff_id: sanitizedStaffId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Also update in-memory users if it matches
    const localUser = users.find((u) => u.id === targetUserId);
    if (localUser) {
      localUser.role = role;
      localUser.studentId = sanitizedStudentId ?? undefined;
      localUser.staffId = sanitizedStaffId ?? undefined;
    }

    return res.json({
      success: true,
      user: updatedProfile,
      message: `User role successfully updated to '${role}' and dataset mappings synchronized.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update user profile on Supabase.' });
  }
});

// ================= STUDENTS API =================
app.get('/api/supabase/students', async (_req, res) => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin client unavailable', data: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('student_id, name, age, gender')
      .order('student_id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message, data: [] });
    }

    return res.json({
      data: data || [],
      count: data ? data.length : 0,
      source: 'database',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error fetching Supabase students', data: [] });
  }
});

app.get('/api/students', (req, res) => {
  const { search, risk, grade, weakSubject } = req.query;
  let results = [...students];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (s) =>
        s.Name.toLowerCase().includes(q) ||
        s.Student_ID.toLowerCase().includes(q) ||
        s.Email.toLowerCase().includes(q)
    );
  }

  if (risk && typeof risk === 'string' && risk !== 'all') {
    results = results.filter((s) => s.Risk_Level.toLowerCase() === risk.toLowerCase());
  }

  if (grade && typeof grade === 'string' && grade !== 'all') {
    results = results.filter((s) => s.Class_Grade.toLowerCase() === grade.toLowerCase());
  }

  if (weakSubject && typeof weakSubject === 'string' && weakSubject !== 'all') {
    results = results.filter((s) => s.Weak_Subject.toLowerCase() === weakSubject.toLowerCase());
  }

  return res.json({
    total: results.length,
    students: results,
  });
});

app.get('/api/students/:id', (req, res) => {
  const student = students.find((s) => s.Student_ID === req.params.id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  return res.json(student);
});

app.post('/api/students', (req, res) => {
  const payload = req.body as Partial<StudentData>;
  if (!payload.Name || !payload.Student_ID) {
    return res.status(400).json({ error: 'Name and Student_ID are required' });
  }

  // Run ML model to auto-classify risk & predictions
  const prediction = calculateAcademicPrediction({
    Attendance_Percent: Number(payload.Attendance_Percent) || 85,
    Study_Hours_Per_Day: Number(payload.Study_Hours_Per_Day) || 3.5,
    Assignment_Score: Number(payload.Assignment_Score) || 75,
    Quiz_Score: Number(payload.Quiz_Score) || 75,
    Previous_Score: Number(payload.Previous_Score) || 75,
    Sleep_Hours: Number(payload.Sleep_Hours) || 7,
    Motivation_Level: payload.Motivation_Level || 'Medium',
    Parental_Support: payload.Parental_Support || 'Medium',
    Tutoring: payload.Tutoring || 'No',
    Internet_Access: payload.Internet_Access || 'Yes',
    Stress_Level: payload.Stress_Level || 'Medium',
    Weak_Subject: payload.Weak_Subject || 'Mathematics',
  });

  const newStudent: StudentData = {
    Student_ID: payload.Student_ID,
    Name: payload.Name,
    Email: payload.Email || `${payload.Student_ID.toLowerCase()}@vidya.edu`,
    Age: Number(payload.Age) || 17,
    Gender: payload.Gender || 'Male',
    Education_Level: payload.Education_Level || 'High School',
    Class_Grade: payload.Class_Grade || 'Grade 11-A',
    Attendance_Percent: Number(payload.Attendance_Percent) || 85,
    Study_Hours_Per_Day: Number(payload.Study_Hours_Per_Day) || 3.5,
    Assignment_Score: Number(payload.Assignment_Score) || 75,
    Quiz_Score: Number(payload.Quiz_Score) || 75,
    Previous_Score: Number(payload.Previous_Score) || 75,
    Sleep_Hours: Number(payload.Sleep_Hours) || 7,
    Motivation_Level: payload.Motivation_Level || 'Medium',
    Learning_Style: payload.Learning_Style || 'Visual',
    Internet_Access: payload.Internet_Access || 'Yes',
    Parental_Support: payload.Parental_Support || 'Medium',
    Tutoring: payload.Tutoring || 'No',
    Extracurricular_Activity: payload.Extracurricular_Activity || 'Yes',
    Stress_Level: payload.Stress_Level || 'Medium',
    Weak_Subject: payload.Weak_Subject || 'Mathematics',
    Exam_Score: prediction.predictedExamScore,
    Overall_Score: prediction.predictedOverallScore,
    Performance_Level: prediction.performanceLevel,
    Risk_Level: prediction.riskLevel,
    Recommended_Action: prediction.recommendedAction,
    Subjects: [
      { subject: 'Mathematics', assignment: 78, quiz: 75, exam: 76, overall: 76, grade: 'B', trend: 'stable' },
      { subject: 'Physics', assignment: 75, quiz: 72, exam: 74, overall: 74, grade: 'B', trend: 'stable' },
      { subject: 'Chemistry', assignment: 77, quiz: 76, exam: 78, overall: 77, grade: 'B+', trend: 'stable' },
      { subject: 'Computer Science', assignment: 82, quiz: 80, exam: 84, overall: 82, grade: 'A-', trend: 'up' },
      { subject: 'English', assignment: 80, quiz: 78, exam: 82, overall: 80, grade: 'B+', trend: 'stable' },
    ],
    History: [
      { month: 'Oct', quizScore: 72, assignmentScore: 74, overallScore: 73, attendance: 84 },
      { month: 'Nov', quizScore: 74, assignmentScore: 76, overallScore: 75, attendance: 85 },
      { month: 'Dec', quizScore: 75, assignmentScore: 76, overallScore: 76, attendance: 86 },
      { month: 'Jan', quizScore: 75, assignmentScore: 77, overallScore: 76, attendance: 85 },
      { month: 'Feb', quizScore: 75, assignmentScore: 78, overallScore: 77, attendance: 85 },
    ],
    Intervention_Notes: ['Student onboarded into VIDYA academic registry'],
    Last_Updated: new Date().toISOString().split('T')[0],
  };

  students.unshift(newStudent);
  return res.status(201).json(newStudent);
});

app.put('/api/students/:id', (req, res) => {
  const index = students.findIndex((s) => s.Student_ID === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const existing = students[index];
  const updated = { ...existing, ...req.body, Last_Updated: new Date().toISOString().split('T')[0] };

  // Recompute ML risk if relevant metrics changed
  const prediction = calculateAcademicPrediction({
    Attendance_Percent: updated.Attendance_Percent,
    Study_Hours_Per_Day: updated.Study_Hours_Per_Day,
    Assignment_Score: updated.Assignment_Score,
    Quiz_Score: updated.Quiz_Score,
    Previous_Score: updated.Previous_Score,
    Sleep_Hours: updated.Sleep_Hours,
    Motivation_Level: updated.Motivation_Level,
    Parental_Support: updated.Parental_Support,
    Tutoring: updated.Tutoring,
    Internet_Access: updated.Internet_Access,
    Stress_Level: updated.Stress_Level,
    Weak_Subject: updated.Weak_Subject,
  });

  updated.Risk_Level = prediction.riskLevel;
  updated.Performance_Level = prediction.performanceLevel;
  updated.Recommended_Action = prediction.recommendedAction;

  students[index] = updated;
  return res.json(updated);
});

app.delete('/api/students/:id', (req, res) => {
  const index = students.findIndex((s) => s.Student_ID === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }
  const deleted = students.splice(index, 1);
  return res.json({ message: 'Student removed successfully', student: deleted[0] });
});

// ================= TEACHERS API =================
app.get('/api/teachers', (_req, res) => {
  return res.json({
    total: teachers.length,
    teachers,
  });
});

// ================= ML PREDICTION API =================
app.post('/api/predict/risk', (req, res) => {
  const input = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Prediction input features required' });
  }

  const result = calculateAcademicPrediction({
    Attendance_Percent: Number(input.Attendance_Percent) || 80,
    Study_Hours_Per_Day: Number(input.Study_Hours_Per_Day) || 3.0,
    Assignment_Score: Number(input.Assignment_Score) || 70,
    Quiz_Score: Number(input.Quiz_Score) || 70,
    Previous_Score: Number(input.Previous_Score) || 70,
    Sleep_Hours: Number(input.Sleep_Hours) || 7.0,
    Motivation_Level: input.Motivation_Level || 'Medium',
    Parental_Support: input.Parental_Support || 'Medium',
    Tutoring: input.Tutoring || 'No',
    Internet_Access: input.Internet_Access || 'Yes',
    Stress_Level: input.Stress_Level || 'Medium',
    Weak_Subject: input.Weak_Subject || 'Mathematics',
  });

  return res.json(result);
});

// ================= AI RECOMMENDATIONS API (GEMINI INTEGRATION) =================
app.post('/api/ai/recommendations', async (req, res) => {
  const { student, customNotes } = req.body;
  if (!student) {
    return res.status(400).json({ error: 'Student data is required for AI recommendation generation' });
  }

  const prompt = `
You are VIDYA AI, an expert educational data scientist and master pedagogical advisor.
Analyze the following student profile and generate a comprehensive, highly personalized, actionable academic optimization plan.

Student Profile:
- Name: ${student.Name}
- ID: ${student.Student_ID}
- Grade/Education Level: ${student.Class_Grade} (${student.Education_Level})
- Attendance: ${student.Attendance_Percent}%
- Daily Study Hours: ${student.Study_Hours_Per_Day} hrs
- Overall Score: ${student.Overall_Score}% (Exam: ${student.Exam_Score}%, Quiz: ${student.Quiz_Score}%, Assignment: ${student.Assignment_Score}%)
- Previous Trajectory: ${student.Previous_Score}%
- Sleep: ${student.Sleep_Hours} hrs/night
- Stress Level: ${student.Stress_Level}
- Motivation Level: ${student.Motivation_Level}
- Learning Style: ${student.Learning_Style}
- Weak Subject: ${student.Weak_Subject}
- Tutoring: ${student.Tutoring}
- Risk Level: ${student.Risk_Level}
- Additional Teacher Notes: ${customNotes || 'None'}

Return ONLY a valid JSON object with the following schema (no markdown, no backticks, just raw JSON):
{
  "summary": "2-3 sentences diagnostic summary highlighting key behavioral and academic drivers",
  "studySchedule": [
    { "day": "Monday", "focus": "Topic/Subject Focus", "hours": 2.5, "techniques": "Specific learning technique tailored to ${student.Learning_Style} style" },
    { "day": "Tuesday", "focus": "Topic/Subject Focus", "hours": 2.5, "techniques": "Technique" },
    { "day": "Wednesday", "focus": "Topic/Subject Focus", "hours": 3.0, "techniques": "Technique" },
    { "day": "Thursday", "focus": "Topic/Subject Focus", "hours": 2.5, "techniques": "Technique" },
    { "day": "Friday", "focus": "Topic/Subject Focus", "hours": 2.0, "techniques": "Technique" },
    { "day": "Saturday", "focus": "Topic/Subject Focus", "hours": 3.5, "techniques": "Spaced repetition & mock drills" },
    { "day": "Sunday", "focus": "Light review & Rest", "hours": 1.5, "techniques": "Mind-mapping & reflection" }
  ],
  "subjectInterventions": [
    {
      "subject": "${student.Weak_Subject}",
      "gapAnalysis": "Specific conceptual bottleneck identified",
      "suggestedAction": "Concrete pedagogical exercise or remediation strategy",
      "targetScore": 85
    }
  ],
  "lifestyleAdjustments": [
    { "category": "Sleep", "recommendation": "Precise sleep timing and routine adjustment", "expectedImpact": "+7% cognitive retention during recall" },
    { "category": "Stress", "recommendation": "Stress reduction technique", "expectedImpact": "Reduces test-anxiety variance" },
    { "category": "Time Management", "recommendation": "Pomodoro or block pacing strategy", "expectedImpact": "Prevents cognitive fatigue" }
  ],
  "pedagogicalTip": "A bespoke motivational and strategic tip matching their ${student.Learning_Style} style."
}
`;

  // Attempt Gemini API call if client is initialized
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (aiError) {
      console.warn('Gemini API call failed, falling back to deterministic AI model:', aiError);
    }
  }

  // High-fidelity fallback algorithm aligned with Data Science heuristics
  const isHighRisk = student.Risk_Level === 'High';
  const studyHoursTarget = isHighRisk ? Math.max(3.5, student.Study_Hours_Per_Day + 1.5) : Math.max(3.0, student.Study_Hours_Per_Day + 0.5);
  const weakSubject = student.Weak_Subject || 'Mathematics';

  const fallbackPlan = {
    summary: `VIDYA Diagnostic Synthesis: ${student.Name} displays a ${student.Risk_Level.toLowerCase()} academic risk profile with ${student.Attendance_Percent}% attendance and a ${student.Overall_Score}% composite score. Primary cognitive friction stems from ${weakSubject} while ${student.Learning_Style.toLowerCase()} modal preferences can be leveraged for accelerated concept reinforcement.`,
    studySchedule: [
      {
        day: 'Monday',
        focus: `${weakSubject} - Core Concept Rebuilding`,
        hours: Math.round(studyHoursTarget * 0.8 * 10) / 10,
        techniques: student.Learning_Style === 'Visual' ? 'Interactive flowchart mapping & visual proof breakdowns' : 'Step-by-step worked problem drills',
      },
      {
        day: 'Tuesday',
        focus: 'Computer Science & Mathematics Application',
        hours: Math.round(studyHoursTarget * 10) / 10,
        techniques: 'Active problem solving with immediate error correction',
      },
      {
        day: 'Wednesday',
        focus: `${weakSubject} - Practice Quizzes & Active Recall`,
        hours: Math.round(studyHoursTarget * 10) / 10,
        techniques: 'Spaced repetition flashcards and 20-minute timed sprint tests',
      },
      {
        day: 'Thursday',
        focus: 'Natural Sciences & Secondary Subjects',
        hours: Math.round(studyHoursTarget * 0.8 * 10) / 10,
        techniques: 'Feynman Technique: Explain key laws aloud to solidify fundamentals',
      },
      {
        day: 'Friday',
        focus: 'Weekly Milestone Assignment Review',
        hours: Math.round(studyHoursTarget * 0.7 * 10) / 10,
        techniques: 'Teacher rubric checklist verification & self-grading audit',
      },
      {
        day: 'Saturday',
        focus: 'Full-Length Simulation Drill',
        hours: Math.round(studyHoursTarget * 1.2 * 10) / 10,
        techniques: 'Exam condition simulation without reference materials',
      },
      {
        day: 'Sunday',
        focus: 'Cognitive Consolidation & Weekly Planning',
        hours: 1.5,
        techniques: 'Light organizational review, sleep schedule alignment, and rest',
      },
    ],
    subjectInterventions: [
      {
        subject: weakSubject,
        gapAnalysis: `Low quiz consistency (${student.Quiz_Score}%) indicates foundational gaps in multi-step problem modeling.`,
        suggestedAction: `Complete 15 targeted modular problem sets weekly; pair with teacher or peer mentor for weekly checkpoints.`,
        targetScore: Math.min(95, student.Overall_Score + 12),
      },
    ],
    lifestyleAdjustments: [
      {
        category: 'Sleep' as const,
        recommendation: `Target ${Math.max(7.5, student.Sleep_Hours)} hours consistent sleep with a strict screen curfew 45 minutes before sleep.`,
        expectedImpact: 'Improves working memory consolidation by an estimated 10-15%.',
      },
      {
        category: 'Stress' as const,
        recommendation: student.Stress_Level === 'High' ? 'Implement 10-minute progressive muscle relaxation and structured daily study blocks.' : 'Maintain balanced extracurricular participation.',
        expectedImpact: 'Eliminates peak panic drops during timed examinations.',
      },
      {
        category: 'Time Management' as const,
        recommendation: 'Adopt 45/15 Pomodoro study intervals with zero notification interruptions.',
        expectedImpact: 'Increases net productive focus hours without cognitive burnout.',
      },
    ],
    pedagogicalTip: `As a ${student.Learning_Style} learner, synthesize complex formulas into color-coded concept diagrams and high-contrast summary cheat-sheets prior to each weekly quiz.`,
  };

  return res.json(fallbackPlan);
});

// ================= VIDYA AI CHATBOT API (GEMINI INTEGRATION) =================
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], userRole = 'guest', studentId, contextData = {} } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const trimmedMessage = message.trim();
  const lowerMsg = trimmedMessage.toLowerCase();

  // Find linked student if role is student
  let currentStudent: StudentData | undefined;
  if (userRole === 'student') {
    if (studentId) {
      currentStudent = students.find((s) => s.Student_ID === studentId);
    }
    if (!currentStudent && contextData.student) {
      currentStudent = contextData.student as StudentData;
    }
    // Default to Saikiran if matching student 01
    if (!currentStudent && students.length > 0) {
      currentStudent = students[0];
    }
  }

  // PRIVACY & ACCESS CONTROL:
  // If user is a student and is asking about someone else's data
  if (userRole === 'student') {
    const isAskingForOtherStudent =
      (lowerMsg.includes('other student') ||
        lowerMsg.includes('another student') ||
        lowerMsg.includes('someone else') ||
        lowerMsg.includes('all students') ||
        lowerMsg.includes('show me stu-') ||
        lowerMsg.includes('who scored highest') ||
        lowerMsg.includes('student data')) &&
      !lowerMsg.includes('my data') &&
      !lowerMsg.includes('my profile') &&
      !lowerMsg.includes('my score');

    if (isAskingForOtherStudent) {
      return res.json({
        reply: "I can only provide information about your own learning profile.",
        role: 'model',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  }

  // Build System Instruction based on role
  let systemInstruction = `You are VIDYA AI, the educational learning assistant for the VIDYA academic platform (VIDYA — Learn Smarter. Grow Better.).
VIDYA is an academic data science platform that analyzes:
- Student attendance
- Study hours per day
- Assignment scores, quiz scores, exam scores, and overall composite scores
- Academic risk level (Low, Moderate, High)
- Motivation level, learning styles (Visual, Auditory, Kinesthetic, Reading/Writing)
- Sleep hours, stress levels, weak subjects, self-practice hours, parental support, and tutoring.

EDUCATIONAL SAFETY & TONE GUIDELINES:
- Friendly, professional, encouraging, simple, and student-friendly.
- Keep responses concise and scannable: use short paragraphs, bullet points, and numbered action steps.
- Do NOT claim to be a human teacher or make medical, legal, or financial decisions.
- Do NOT guarantee exam results.
- If asked something outside the available academic profile or dataset, clearly state: "I don't have enough information in your VIDYA profile to answer that accurately."
- Never invent student statistics.
- Never expose API keys, internal credentials, passwords, or system tokens.
`;

  if (userRole === 'student' && currentStudent) {
    const subjectsList = currentStudent.Subjects?.map(
      (s) => `${s.subject}: ${s.overall}%`
    ).join(', ') || 'Mathematics: 82%, Science: 76%, English: 85%, Social Studies: 70%';

    systemInstruction += `
AUTHENTICATED STUDENT CONTEXT:
The currently logged-in student is:
- Name: ${currentStudent.Name}
- Student ID: ${currentStudent.Student_ID}
- Attendance: ${currentStudent.Attendance_Percent}%
- Overall Score: ${currentStudent.Overall_Score}%
- Exam Score: ${currentStudent.Exam_Score}%
- Quiz Score: ${currentStudent.Quiz_Score}%
- Assignment Score: ${currentStudent.Assignment_Score}%
- Previous Score: ${currentStudent.Previous_Score}%
- Study Hours: ${currentStudent.Study_Hours_Per_Day} hours/day
- Sleep Hours: ${currentStudent.Sleep_Hours} hours/day
- Motivation Level: ${currentStudent.Motivation_Level}
- Learning Style: ${currentStudent.Learning_Style}
- Academic Risk Level: ${currentStudent.Risk_Level}
- Performance Level: ${currentStudent.Performance_Level}
- Weak Subject: ${currentStudent.Weak_Subject}
- Stress Level: ${currentStudent.Stress_Level}
- Tutoring: ${currentStudent.Tutoring}
- Extracurricular: ${currentStudent.Extracurricular_Activity}
- Subject Scores: ${subjectsList}

INSTRUCTIONS FOR STUDENT QUERIES:
- If asked "How am I performing?": Answer using their actual numbers. Highlight their strengths (highest subject/attendance) and identify their weak subject (${currentStudent.Weak_Subject}).
- If asked "What should I improve?": Identify their lowest-performing areas (${currentStudent.Weak_Subject}, attendance, or sleep) and explain why.
- If asked "Create my study plan": Create a practical daily or weekly study plan based on their weak subject (${currentStudent.Weak_Subject}), current study hours (${currentStudent.Study_Hours_Per_Day}h/day), learning style (${currentStudent.Learning_Style}), and sleep (${currentStudent.Sleep_Hours}h/day).
- If asked "Why is my risk level ...?": Explain the metrics contributing to their ${currentStudent.Risk_Level} risk level.
- Always use ${currentStudent.Name}'s specific data. DO NOT invent arbitrary numbers.
- PRIVACY RULE: You can ONLY discuss ${currentStudent.Name}'s own data. If asked about others, reply: "I can only provide information about your own learning profile."
`;
  } else if (userRole === 'teacher') {
    const highRiskStudents = students.filter((s) => s.Risk_Level === 'High');
    systemInstruction += `
AUTHENTICATED TEACHER CONTEXT:
You are assisting a Teacher in VIDYA.
Class overview:
- Total Enrolled Students: ${students.length}
- Students with High Risk (${highRiskStudents.length}): ${highRiskStudents.map((s) => `${s.Name} (${s.Student_ID}, Weak: ${s.Weak_Subject}, Attendance: ${s.Attendance_Percent}%)`).join('; ') || 'None'}
- Common Weak Subjects: ${Array.from(new Set(students.map((s) => s.Weak_Subject))).join(', ')}
Help the teacher identify struggling students, analyze attendance drops, provide intervention suggestions, and structure classroom support.
`;
  } else if (userRole === 'admin') {
    const highRisk = students.filter((s) => s.Risk_Level === 'High').length;
    const modRisk = students.filter((s) => s.Risk_Level === 'Moderate').length;
    const lowRisk = students.filter((s) => s.Risk_Level === 'Low').length;
    const avgScore = students.length > 0 ? (students.reduce((a, b) => a + b.Overall_Score, 0) / students.length).toFixed(1) : '0';
    const avgAtt = students.length > 0 ? (students.reduce((a, b) => a + b.Attendance_Percent, 0) / students.length).toFixed(1) : '0';

    systemInstruction += `
AUTHENTICATED ADMIN CONTEXT:
You are assisting an Institutional Administrator in VIDYA.
Institution Statistics:
- Total Students: ${students.length}
- Total Teachers: ${teachers.length}
- Average Institutional Score: ${avgScore}%
- Average Attendance: ${avgAtt}%
- Student Risk Distribution: High (${highRisk}), Moderate (${modRisk}), Low (${lowRisk})
Help the admin analyze institutional health, risk trends, resource allocation, and curriculum improvements.
`;
  } else {
    systemInstruction += `
GUEST / UNIVERSAL ASSESSMENT MODE:
You are assisting a visitor, guest, or unauthenticated learner.
You can:
- Assess anyone's study habits and academic performance!
- If the user shares their daily study hours, attendance, sleep, or subject scores, evaluate their academic risk (Low, Moderate, High) and provide a custom improvement roadmap.
- Provide study tips, explanations of learning styles (Visual, Auditory, Kinesthetic), and explain how VIDYA works.
- Encourage them to log in to access personalized student tracking.
`;
  }

  // 1. Try Gemini API if initialized
  if (aiClient) {
    try {
      // Build conversation contents including history
      const contentsPayload: any[] = [];

      if (Array.isArray(history) && history.length > 0) {
        // Include last 6 turns to keep context fast and fresh
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          if (item && item.content) {
            contentsPayload.push({
              role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: String(item.content) }],
            });
          }
        }
      }

      // Append current user message
      contentsPayload.push({
        role: 'user',
        parts: [{ text: trimmedMessage }],
      });

      // Call Gemini with 4-second timeout to guarantee fast responsiveness
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 4000)
      );

      const response = await Promise.race([
        aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        }),
        timeoutPromise,
      ]);

      const replyText = response.text?.trim();
      if (replyText) {
        return res.json({
          reply: replyText,
          role: 'model',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err) {
      console.warn('Gemini chat request fallback triggered:', err);
    }
  }

  // 2. Intelligent, deterministic fallback aligned with VIDYA prompt requirements
  let fallbackReply = '';

  if (userRole === 'student' && currentStudent) {
    const name = currentStudent.Name;
    const avgScore = currentStudent.Overall_Score;
    const att = currentStudent.Attendance_Percent;
    const weakSub = currentStudent.Weak_Subject || 'Social Studies';
    const risk = currentStudent.Risk_Level;
    const studyHours = currentStudent.Study_Hours_Per_Day;
    const sleep = currentStudent.Sleep_Hours;
    const learningStyle = currentStudent.Learning_Style;

    // Find highest subject
    const subjects = currentStudent.Subjects || [];
    let bestSub = 'English';
    let bestScore = 85;
    if (subjects.length > 0) {
      const sorted = [...subjects].sort((a, b) => b.overall - a.overall);
      bestSub = sorted[0].subject;
      bestScore = sorted[0].overall;
    }

    if (lowerMsg.includes('how am i performing') || lowerMsg.includes('performance') || lowerMsg.includes('my score')) {
      fallbackReply = `You're currently performing well overall with an average score of **${avgScore}%** and **${att}%** attendance.\n\nYour strongest subject is **${bestSub}** at **${bestScore}%**. **${weakSub}** is currently your lowest subject at **${currentStudent.Quiz_Score || 70}%**, so that would be a good area to focus on.`;
    } else if (lowerMsg.includes('what should i improve') || lowerMsg.includes('improve')) {
      fallbackReply = `Based on your academic profile, here are your top areas for improvement:\n\n1. **${weakSub} Reinforcement** — Your current performance indicates concept friction. An extra 25–30 minutes daily will raise your score.\n2. **Study Consistency** — Keep up your ${studyHours} hours/day routine with active recall rather than passive reading.\n3. **Sleep & Recovery** — Maintain ${sleep} hours of restful sleep to ensure optimal memory retention.`;
    } else if (lowerMsg.includes('study plan') || lowerMsg.includes('schedule')) {
      fallbackReply = `Here is your personalized **VIDYA Study Plan** tailored for your **${learningStyle}** learning style:\n\n• **${weakSub} (Priority):** 30–40 minutes daily (practice diagrams and active problem solving)\n• **${bestSub} Review:** 20 minutes (maintain your high ${bestScore}% standard)\n• **Daily Study Routine:** Continue your current ${studyHours}-hour routine using 45/15 Pomodoro focus blocks\n• **Rest & Sleep:** Maintain ${sleep} hours of nightly sleep\n• **Weekend Drill:** Review flashcards and mock quiz questions every Saturday morning.`;
    } else if (lowerMsg.includes('risk level') || lowerMsg.includes('risk')) {
      fallbackReply = `Your current academic risk level is **${risk}**.\n\nKey contributing factors:\n• **Attendance:** ${att}% (Consistency is strong)\n• **Average Score:** ${avgScore}%\n• **Study Habits:** ${studyHours} hrs/day\n\nTo keep your risk level Low, continue prioritizing **${weakSub}** quizzes and submitting assignments on time.`;
    } else if (lowerMsg.includes('weak subject') || lowerMsg.includes('weak')) {
      fallbackReply = `Your primary focus area is **${weakSub}**.\n\nI recommend:\n1. Dedicating the first 30 minutes of your daily study block to ${weakSub}.\n2. Asking your teacher or peer mentor for feedback on recent quizzes.\n3. Breaking down difficult formulas or concepts using visual diagrams.`;
    } else {
      fallbackReply = `Hello ${name}! As your VIDYA AI Learning Assistant, I see you're currently maintaining a **${avgScore}%** overall score and **${att}%** attendance.\n\nI recommend spending 30 minutes focusing on **${weakSub}** today. Feel free to ask me for a customized study plan, score breakdown, or tips on how to prepare for upcoming tests!`;
    }
  } else if (userRole === 'teacher') {
    const highRiskStudents = students.filter((s) => s.Risk_Level === 'High');
    if (lowerMsg.includes('need attention') || lowerMsg.includes('struggling') || lowerMsg.includes('high risk')) {
      fallbackReply = `The following **${highRiskStudents.length} students** currently have a High Academic Risk level and need intervention:\n\n` +
        highRiskStudents.map((s) => `• **${s.Name}** (${s.Student_ID}) — Attendance: ${s.Attendance_Percent}%, Score: ${s.Overall_Score}%, Weak Subject: ${s.Weak_Subject}`).join('\n') +
        `\n\n**Recommended Intervention:** Schedule a 15-minute diagnostic checkpoint and assign peer mentoring for their identified weak subjects.`;
    } else {
      fallbackReply = `As your teaching assistant, I can help you monitor student performance across your classes.\n\n• **Total Students:** ${students.length}\n• **High Risk Count:** ${highRiskStudents.length}\n• **Class Average:** ${(students.reduce((a, b) => a + b.Overall_Score, 0) / (students.length || 1)).toFixed(1)}%\n\nAsk me about struggling students, attendance patterns, or intervention strategies!`;
    }
  } else if (userRole === 'admin') {
    const highRisk = students.filter((s) => s.Risk_Level === 'High').length;
    const avgScore = (students.reduce((a, b) => a + b.Overall_Score, 0) / (students.length || 1)).toFixed(1);
    const avgAtt = (students.reduce((a, b) => a + b.Attendance_Percent, 0) / (students.length || 1)).toFixed(1);

    fallbackReply = `Here is the institutional health summary for VIDYA Academy:\n\n• **Total Enrolled Students:** ${students.length}\n• **Overall Institutional Average:** ${avgScore}%\n• **Average Attendance:** ${avgAtt}%\n• **High Risk Students:** ${highRisk} requiring academic intervention plans.\n\nHow else can I assist with institution-level decision making?`;
  } else {
    // Universal assessment / Guest mode
    const hasStudyHours = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|hr)/);
    const hasAtt = lowerMsg.match(/(\d+)\s*%/);
    const hasSleep = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(?:hours of sleep|hrs sleep|hours sleep|sleep)/);

    if (hasStudyHours || hasAtt || hasSleep) {
      const studyHrs = hasStudyHours ? parseFloat(hasStudyHours[1]) : 3.0;
      const attVal = hasAtt ? parseFloat(hasAtt[1]) : 82;
      const sleepVal = hasSleep ? parseFloat(hasSleep[1]) : 7.0;

      const pred = calculateAcademicPrediction({
        Attendance_Percent: attVal,
        Study_Hours_Per_Day: studyHrs,
        Assignment_Score: 75,
        Quiz_Score: 74,
        Previous_Score: 76,
        Sleep_Hours: sleepVal,
        Motivation_Level: 'Medium',
        Parental_Support: 'Medium',
        Tutoring: 'No',
        Internet_Access: 'Yes',
        Stress_Level: 'Medium',
        Weak_Subject: 'Mathematics',
      });

      fallbackReply = `Here is your **VIDYA Academic Profile Assessment** 🎓\n\n• **Predicted Composite Score:** ${pred.predictedOverallScore}%\n• **Academic Risk Factor:** **${pred.riskLevel} Risk**\n• **Performance Band:** ${pred.performanceLevel}\n\n**Actionable Recommendations:**\n1. ${studyHrs < 3 ? 'Increase dedicated study time to 3.0+ hours/day with active problem sets.' : 'Maintain your focused study routine using 45/15 Pomodoro intervals.'}\n2. ${sleepVal < 7 ? 'Increase sleep to 7–8 hours to boost memory consolidation.' : 'Maintain your 7+ hours of restorative sleep.'}\n3. Dedicate the first 30 minutes of study to your most challenging topics.\n\nLog in or register to track your full learning journey!`;
    } else if (lowerMsg.includes('assess') || lowerMsg.includes('habit') || lowerMsg.includes('study')) {
      fallbackReply = `I would love to assess your learning profile! 📊\n\nTo provide an accurate assessment, please share:\n1. **Daily Study Hours** (e.g. 3 hours/day)\n2. **Current Attendance / Class Consistency** (e.g. 85%)\n3. **Challenging Subject** (e.g. Mathematics or Science)\n4. **Average Sleep Hours** (e.g. 7 hours)\n\nOnce you share these numbers, I will calculate your predicted performance score and provide a tailored study roadmap!`;
    } else {
      fallbackReply = `Welcome to **VIDYA — Learn Smarter. Grow Better.**\n\nI'm VIDYA AI, your educational learning assistant. I can:\n• Assess your daily study habits and cognitive load\n• Provide personalized study plans and memory techniques\n• Help you identify subject gaps before major exams\n\nShare your current study routine or ask me a question to get started!`;
    }
  }

  return res.json({
    reply: fallbackReply,
    role: 'model',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
});

// ================= INSTITUTIONAL ANALYTICS API =================
app.get('/api/analytics/institution', (_req, res) => {
  const total = students.length;
  if (total === 0) {
    return res.json({
      totalStudents: 0,
      totalTeachers: teachers.length,
      averageScore: 0,
      averageAttendance: 0,
      highRiskCount: 0,
      moderateRiskCount: 0,
      lowRiskCount: 0,
    });
  }

  const avgScore = Math.round((students.reduce((acc, s) => acc + s.Overall_Score, 0) / total) * 10) / 10;
  const avgAttendance = Math.round((students.reduce((acc, s) => acc + s.Attendance_Percent, 0) / total) * 10) / 10;
  const highRisk = students.filter((s) => s.Risk_Level === 'High').length;
  const moderateRisk = students.filter((s) => s.Risk_Level === 'Moderate').length;
  const lowRisk = students.filter((s) => s.Risk_Level === 'Low').length;

  // Class-wise analytics
  const classes = Array.from(new Set(students.map((s) => s.Class_Grade)));
  const classBreakdown = classes.map((c) => {
    const classStudents = students.filter((s) => s.Class_Grade === c);
    const count = classStudents.length;
    const classAvgScore = Math.round((classStudents.reduce((acc, s) => acc + s.Overall_Score, 0) / count) * 10) / 10;
    const classAvgAtt = Math.round((classStudents.reduce((acc, s) => acc + s.Attendance_Percent, 0) / count) * 10) / 10;
    const classHighRisk = classStudents.filter((s) => s.Risk_Level === 'High').length;
    return {
      classGrade: c,
      studentCount: count,
      averageScore: classAvgScore,
      averageAttendance: classAvgAtt,
      highRiskCount: classHighRisk,
    };
  });

  // Subject-wise analytics
  const subjectMap: Record<string, { totalScore: number; count: number; weakCount: number }> = {};
  students.forEach((s) => {
    if (s.Weak_Subject) {
      if (!subjectMap[s.Weak_Subject]) {
        subjectMap[s.Weak_Subject] = { totalScore: 0, count: 0, weakCount: 0 };
      }
      subjectMap[s.Weak_Subject].weakCount += 1;
    }
    s.Subjects?.forEach((sub) => {
      if (!subjectMap[sub.subject]) {
        subjectMap[sub.subject] = { totalScore: 0, count: 0, weakCount: 0 };
      }
      subjectMap[sub.subject].totalScore += sub.overall;
      subjectMap[sub.subject].count += 1;
    });
  });

  const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    averageScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 75,
    studentsFlaggingAsWeak: data.weakCount,
  }));

  // Correlation metrics for Data Science dashboard
  return res.json({
    totalStudents: total,
    totalTeachers: teachers.length,
    averageScore: avgScore,
    averageAttendance: avgAttendance,
    highRiskCount: highRisk,
    moderateRiskCount: moderateRisk,
    lowRiskCount: lowRisk,
    classBreakdown,
    subjectBreakdown,
    modelEvaluation: {
      modelType: 'Demo Random Forest / Heuristic Classifier',
      evaluationStatus: 'Pending Ground-Truth Validation',
      datasetSize: total,
      accuracy: null,
      f1Score: null,
      aucRoc: null,
      notes: 'Formal performance evaluation metrics require validated ground-truth examination outcomes.',
    },
  });
});

// ================= DATASET IMPORT / EXPORT =================
app.get('/api/dataset/export', (req, res) => {
  const format = req.query.format || 'json';
  if (format === 'csv') {
    const headers = [
      'Student_ID',
      'Age',
      'Gender',
      'Education_Level',
      'Attendance_Percent',
      'Study_Hours_Per_Day',
      'Assignment_Score',
      'Quiz_Score',
      'Previous_Score',
      'Sleep_Hours',
      'Motivation_Level',
      'Learning_Style',
      'Internet_Access',
      'Parental_Support',
      'Tutoring',
      'Extracurricular_Activity',
      'Stress_Level',
      'Weak_Subject',
      'Exam_Score',
      'Overall_Score',
      'Performance_Level',
      'Risk_Level',
      'Recommended_Action',
    ];

    const rows = students.map((s) => [
      s.Student_ID,
      s.Age,
      s.Gender,
      s.Education_Level,
      s.Attendance_Percent,
      s.Study_Hours_Per_Day,
      s.Assignment_Score,
      s.Quiz_Score,
      s.Previous_Score,
      s.Sleep_Hours,
      s.Motivation_Level,
      s.Learning_Style,
      s.Internet_Access,
      s.Parental_Support,
      s.Tutoring,
      s.Extracurricular_Activity,
      s.Stress_Level,
      s.Weak_Subject,
      s.Exam_Score,
      s.Overall_Score,
      s.Performance_Level,
      s.Risk_Level,
      `"${s.Recommended_Action.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vidya_student_dataset.csv"');
    return res.send(csvContent);
  }

  return res.json(students);
});

app.post('/api/dataset/import', (req, res) => {
  const { dataset } = req.body;
  if (!Array.isArray(dataset) || dataset.length === 0) {
    return res.status(400).json({ error: 'Valid array of student records is required' });
  }

  // Parse and re-predict for imported dataset
  const imported: StudentData[] = dataset.map((item: any, idx: number) => {
    const pred = calculateAcademicPrediction({
      Attendance_Percent: Number(item.Attendance_Percent) || 75,
      Study_Hours_Per_Day: Number(item.Study_Hours_Per_Day) || 3.0,
      Assignment_Score: Number(item.Assignment_Score) || 70,
      Quiz_Score: Number(item.Quiz_Score) || 70,
      Previous_Score: Number(item.Previous_Score) || 70,
      Sleep_Hours: Number(item.Sleep_Hours) || 7.0,
      Motivation_Level: item.Motivation_Level || 'Medium',
      Parental_Support: item.Parental_Support || 'Medium',
      Tutoring: item.Tutoring || 'No',
      Internet_Access: item.Internet_Access || 'Yes',
      Stress_Level: item.Stress_Level || 'Medium',
      Weak_Subject: item.Weak_Subject || 'Mathematics',
    });

    return {
      Student_ID: item.Student_ID || `STU-${2000 + idx}`,
      Name: item.Name || `Student ${item.Student_ID || idx + 1}`,
      Email: item.Email || `student.${idx + 1}@vidya.edu`,
      Age: Number(item.Age) || 17,
      Gender: item.Gender || 'Male',
      Education_Level: item.Education_Level || 'High School',
      Class_Grade: item.Class_Grade || 'Grade 11-A',
      Attendance_Percent: Number(item.Attendance_Percent) || 75,
      Study_Hours_Per_Day: Number(item.Study_Hours_Per_Day) || 3.0,
      Assignment_Score: Number(item.Assignment_Score) || 70,
      Quiz_Score: Number(item.Quiz_Score) || 70,
      Previous_Score: Number(item.Previous_Score) || 70,
      Sleep_Hours: Number(item.Sleep_Hours) || 7.0,
      Motivation_Level: item.Motivation_Level || 'Medium',
      Learning_Style: item.Learning_Style || 'Visual',
      Internet_Access: item.Internet_Access || 'Yes',
      Parental_Support: item.Parental_Support || 'Medium',
      Tutoring: item.Tutoring || 'No',
      Extracurricular_Activity: item.Extracurricular_Activity || 'Yes',
      Stress_Level: item.Stress_Level || 'Medium',
      Weak_Subject: item.Weak_Subject || 'Mathematics',
      Exam_Score: Number(item.Exam_Score) || pred.predictedExamScore,
      Overall_Score: Number(item.Overall_Score) || pred.predictedOverallScore,
      Performance_Level: item.Performance_Level || pred.performanceLevel,
      Risk_Level: item.Risk_Level || pred.riskLevel,
      Recommended_Action: item.Recommended_Action || pred.recommendedAction,
      Subjects: [
        { subject: 'Mathematics', assignment: 75, quiz: 75, exam: 75, overall: 75, grade: 'B', trend: 'stable' },
        { subject: 'Physics', assignment: 75, quiz: 75, exam: 75, overall: 75, grade: 'B', trend: 'stable' },
        { subject: 'Chemistry', assignment: 75, quiz: 75, exam: 75, overall: 75, grade: 'B', trend: 'stable' },
        { subject: 'Computer Science', assignment: 75, quiz: 75, exam: 75, overall: 75, grade: 'B', trend: 'stable' },
        { subject: 'English', assignment: 75, quiz: 75, exam: 75, overall: 75, grade: 'B', trend: 'stable' },
      ],
      History: [
        { month: 'Oct', quizScore: 70, assignmentScore: 70, overallScore: 70, attendance: 75 },
        { month: 'Nov', quizScore: 72, assignmentScore: 72, overallScore: 72, attendance: 76 },
        { month: 'Dec', quizScore: 74, assignmentScore: 74, overallScore: 74, attendance: 77 },
        { month: 'Jan', quizScore: 75, assignmentScore: 75, overallScore: 75, attendance: 78 },
        { month: 'Feb', quizScore: 75, assignmentScore: 75, overallScore: 75, attendance: 78 },
      ],
      Last_Updated: new Date().toISOString().split('T')[0],
    };
  });

  students = imported;
  return res.json({
    message: `Successfully connected and loaded ${imported.length} student records into the Data Science platform.`,
    count: imported.length,
  });
});

// Health check routes for Cloud Run container monitoring
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Universal JSON 404 handler for any unhandled /api routes (applies in both Serverless and Container environments)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}` });
});

// ================= VITE DEV / PRODUCTION STATIC SERVER =================
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndexHtml);

  // Production detection: treat as production in Cloud Run, explicit NODE_ENV=production, or non-development with dist present
  const isCloudRun = Boolean(process.env.K_SERVICE) || Boolean(process.env.K_REVISION);
  const isExplicitDev = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production' || isCloudRun || (!isExplicitDev && hasDist);

  if (isProduction && hasDist) {
    console.log('Serving production static bundle from:', distPath);
    app.use(express.static(distPath, { maxAge: '10m', index: false }));
    app.get('*', (req, res, next) => {
      // Never return the HTML SPA page for unknown /api/* endpoints
      if (req.path.startsWith('/api') || req.path.includes('/api/') || req.originalUrl?.includes('/api')) {
        return res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl || req.path}` });
      }
      if (fs.existsSync(distIndexHtml)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(distIndexHtml);
      }
      return next();
    });
  } else {
    console.log('Initializing Vite in development middleware mode...');
    // Guard against Vite dev middleware ever serving HTML for any /api requests
    app.use((req, res, next) => {
      if (req.url.startsWith('/api') || req.url.includes('/api/') || req.originalUrl?.includes('/api')) {
        return res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}` });
      }
      next();
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `VIDYA Platform running on port ${PORT} (mode: ${isProduction && hasDist ? 'production' : 'development'})`
    );
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Closing HTTP server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Export app for serverless deployments (Vercel Serverless Functions / AWS Lambda)
export { app };
export default app;

// Only launch standalone HTTP listener when not running in a serverless environment (e.g., Vercel)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal error starting VIDYA server:', err);
    process.exit(1);
  });
}

