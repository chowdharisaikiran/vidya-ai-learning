import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiUrl, parseApiResponse } from './apiConfig';

export const VIDYA_DEFAULT_SUPABASE_URL = 'https://fxwzjeyiywprabttaznt.supabase.co';
export const VIDYA_DEFAULT_ANON_KEY = 'sb_publishable_eI0LDCJeYSoPbOaoJ_z1vw_nl9xEU7-';

/**
 * Normalizes the Supabase Project URL.
 * Guarantees a valid absolute URL (e.g. "https://fxwzjeyiywprabttaznt.supabase.co").
 */
export function formatSupabaseUrl(rawUrl?: string): string {
  const fallback = VIDYA_DEFAULT_SUPABASE_URL;
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return fallback;
  const trimmed = rawUrl.trim();

  // If provided value is an API key (publishable key or JWT), ignore and use fallback project URL
  if (
    trimmed.startsWith('sb_publishable_') ||
    trimmed.startsWith('sb_secret_') ||
    trimmed.startsWith('eyJ') ||
    trimmed.includes('YOUR-PROJECT-ID') ||
    trimmed.includes('your-project-id')
  ) {
    return fallback;
  }

  // If it's already an HTTP / HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      return `${u.protocol}//${u.host}`;
    } catch {
      return fallback;
    }
  }

  // If it's a project reference ID (e.g., fxwzjeyiywprabttaznt)
  if (/^[a-z0-9_-]{10,40}$/i.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  return fallback;
}

/**
 * Retrieves the active Supabase configuration from environment variables.
 * Falls back to localStorage override if user entered keys in connection modal.
 */
export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  hasKey: boolean;
  isUrlKey: boolean;
} {
  // Sanitize any previously corrupted localStorage entries in client
  if (typeof window !== 'undefined') {
    const sUrl = localStorage.getItem('vidya_supabase_url');
    if (sUrl && (sUrl.startsWith('sb_') || sUrl.startsWith('eyJ') || sUrl.includes('YOUR-PROJECT-ID') || !sUrl.includes('.'))) {
      localStorage.removeItem('vidya_supabase_url');
    }
    const sKey = localStorage.getItem('vidya_supabase_anon_key');
    if (sKey && (sKey.startsWith('http://') || sKey.startsWith('https://'))) {
      localStorage.removeItem('vidya_supabase_anon_key');
    }
  }

  const envSupabaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    VIDYA_DEFAULT_SUPABASE_URL;
  const envAnonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    VIDYA_DEFAULT_ANON_KEY;

  let envUrl = envSupabaseUrl.trim();
  let rawEnvKey = envAnonKey.trim();

  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('vidya_supabase_anon_key') : null;
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('vidya_supabase_url') : null;

  // Swap check: If envUrl is an API key (e.g. starts with sb_publishable_ or eyJ), treat it as anonKey
  if (envUrl.startsWith('sb_publishable_') || envUrl.startsWith('eyJ')) {
    if (!rawEnvKey || rawEnvKey.includes('YOUR-PROJECT-ID') || rawEnvKey.startsWith('http')) {
      if (rawEnvKey.startsWith('http')) {
        envUrl = rawEnvKey;
      } else {
        envUrl = VIDYA_DEFAULT_SUPABASE_URL;
      }
      rawEnvKey = envSupabaseUrl || VIDYA_DEFAULT_ANON_KEY;
    }
  }

  const url = formatSupabaseUrl(storedUrl || envUrl || VIDYA_DEFAULT_SUPABASE_URL);

  let activeKey = (storedKey || rawEnvKey || VIDYA_DEFAULT_ANON_KEY).trim();
  const isUrlKey = activeKey.startsWith('http://') || activeKey.startsWith('https://');

  if (activeKey.includes('YOUR-PROJECT-ID') || activeKey.includes('YOUR_SUPABASE_ANON_KEY') || isUrlKey) {
    activeKey = VIDYA_DEFAULT_ANON_KEY;
  }

  return {
    url,
    anonKey: activeKey,
    hasKey: Boolean(activeKey),
    isUrlKey,
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentKeyUsed: string = '';
let currentUrlUsed: string = '';

/**
 * Creates or retrieves the singleton Supabase client using @supabase/supabase-js.
 * Does not hardcode secret keys.
 */
export function getSupabaseClient(overrideKey?: string): SupabaseClient | null {
  const config = getSupabaseConfig();
  let anonKey = (overrideKey || config.anonKey || VIDYA_DEFAULT_ANON_KEY).trim();
  const url = formatSupabaseUrl(config.url);

  if (anonKey.startsWith('http://') || anonKey.startsWith('https://')) {
    anonKey = VIDYA_DEFAULT_ANON_KEY;
  }

  if (supabaseInstance && currentKeyUsed === anonKey && currentUrlUsed === url) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentKeyUsed = anonKey;
    currentUrlUsed = url;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Default shared Supabase client instance.
 */
export const supabase = getSupabaseClient();

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  url: string;
  error?: string;
  data?: any;
  needsKey?: boolean;
  isUrlWarning?: boolean;
  needsTables?: boolean;
  table?: string;
}

/**
 * Executes an honest connection test against the Supabase database.
 * Reports true ONLY when real database queries succeed or table access is verified.
 */
export async function testSupabaseConnection(overrideKey?: string): Promise<ConnectionTestResult> {
  const config = getSupabaseConfig();
  const rawCandidate = overrideKey !== undefined ? overrideKey.trim() : (config.anonKey || VIDYA_DEFAULT_ANON_KEY);
  const url = formatSupabaseUrl(config.url);

  const isUrl = rawCandidate.startsWith('http://') || rawCandidate.startsWith('https://');
  let anonKey = (isUrl ? config.anonKey : rawCandidate) || VIDYA_DEFAULT_ANON_KEY;
  if (anonKey.startsWith('http')) {
    anonKey = VIDYA_DEFAULT_ANON_KEY;
  }

  if (overrideKey && !isUrl && overrideKey.trim()) {
    localStorage.setItem('vidya_supabase_anon_key', overrideKey.trim());
    fetch(apiUrl('/api/supabase/save-config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonKey: overrideKey.trim(), url }),
    }).catch(() => {});
  }

  if (!anonKey) {
    localStorage.setItem('vidya_supabase_connected', 'false');
    return {
      success: false,
      message: 'Supabase anon public key is required to connect.',
      timestamp: new Date().toLocaleTimeString(),
      url,
      needsKey: true,
    };
  }

  // 1. Direct query using the active Supabase client (which retains active authenticated session if logged in)
  const client = getSupabaseClient(overrideKey) || createClient(url, anonKey, {
    auth: { persistSession: true },
  });

  try {
    // Honest verification against verified students table
    const stuRes = await client.from('students').select('student_id, name').limit(1);
    if (!stuRes.error && Array.isArray(stuRes.data) && stuRes.data.length > 0) {
      localStorage.setItem('vidya_supabase_connected', 'true');
      return {
        success: true,
        message: 'VIDYA Supabase Connected (students table active & verified)',
        timestamp: new Date().toLocaleTimeString(),
        url,
        table: 'students',
        data: stuRes.data,
      };
    }

    // Check if table is genuinely missing (PostgREST: 42P01 or PGRST205)
    const isTableMissing =
      stuRes.error &&
      (stuRes.error.code === '42P01' ||
        stuRes.error.code === 'PGRST205' ||
        stuRes.error.message?.toLowerCase().includes('does not exist'));

    if (isTableMissing) {
      localStorage.setItem('vidya_supabase_connected', 'false');
      return {
        success: false,
        needsTables: true,
        message: 'Table public.students was not found in Supabase schema.',
        timestamp: new Date().toLocaleTimeString(),
        url,
        error: stuRes.error?.message,
      };
    }

    // Check if authorization / JWT error
    if (
      stuRes.error &&
      (stuRes.error.code === 'PGRST301' ||
        stuRes.error.message?.toLowerCase().includes('jwt') ||
        stuRes.error.message?.toLowerCase().includes('api key'))
    ) {
      localStorage.setItem('vidya_supabase_connected', 'false');
      return {
        success: false,
        message: 'Supabase authentication failed. Please check your anon public key.',
        timestamp: new Date().toLocaleTimeString(),
        url,
        error: stuRes.error.message,
      };
    }
  } catch (clientErr: any) {
    console.warn('Direct Supabase SDK query failed, trying backend check:', clientErr);
  }

  // 2. Query our backend endpoint which verifies database status with server bridge
  try {
    const token = await getActiveAuthToken();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl('/api/supabase/test'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ anonKey, url }),
    });
    const parsed = await parseApiResponse<{
      success: boolean;
      message?: string;
      table?: string;
      data?: any;
      details?: any;
      error?: string;
      needsTables?: boolean;
    }>(res, '/api/supabase/test');

    const result = parsed.data;
    if (parsed.ok && result?.success) {
      localStorage.setItem('vidya_supabase_connected', 'true');
      return {
        success: true,
        message: result.message || 'VIDYA Supabase Connected (database verified)',
        timestamp: new Date().toLocaleTimeString(),
        url,
        table: result.table || 'students',
        data: result.data || result.details,
      };
    } else {
      localStorage.setItem('vidya_supabase_connected', 'false');
      return {
        success: false,
        message: result?.message || parsed.error || 'Supabase connection test failed.',
        timestamp: new Date().toLocaleTimeString(),
        url,
        error: result?.error,
        needsTables: result?.needsTables,
      };
    }
  } catch (backendErr: any) {
    localStorage.setItem('vidya_supabase_connected', 'false');
    return {
      success: false,
      message: `Failed to connect to Supabase: ${backendErr?.message || 'Network error'}`,
      timestamp: new Date().toLocaleTimeString(),
      url,
      error: String(backendErr),
    };
  }
}

/**
 * Force-refreshes the active Supabase session and returns a fresh access token.
 * Returns null if the session cannot be refreshed (e.g. refresh token absent or expired).
 */
export async function refreshSupabaseSession(): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        return data.session.access_token;
      }
    }
  } catch (err) {
    console.warn('Failed to refresh Supabase session:', err);
  }
  return null;
}

/**
 * Safely resolves the active Supabase authentication token from the active session.
 * Automatically handles token refresh via Supabase SDK without relying on redundant localStorage tokens.
 * Proactively checks expiry and avoids returning known-expired tokens.
 */
export async function getActiveAuthToken(explicitToken?: string | null): Promise<string | null> {
  if (explicitToken) return explicitToken;
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: sessionData, error } = await client.auth.getSession();
      if (!error && sessionData?.session?.access_token) {
        const expiresAt = sessionData.session.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);
        // If token expires within 60 seconds or is already expired, refresh it
        if (expiresAt && expiresAt <= nowSec + 60) {
          const refreshedToken = await refreshSupabaseSession();
          if (refreshedToken) {
            return refreshedToken;
          }
          // If refresh failed and token is already expired, do not return stale token
          if (expiresAt <= nowSec) {
            return null;
          }
        }
        return sessionData.session.access_token;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}
