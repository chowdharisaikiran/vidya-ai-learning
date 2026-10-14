import { apiUrl, parseApiResponse } from '../lib/apiConfig';
import { getActiveAuthToken, refreshSupabaseSession } from '../lib/supabase';

export type TableStatus = 'Verified' | 'Access Denied' | 'Missing' | 'Query Error';

export interface TableHealthItem {
  table: string;
  status: TableStatus;
  rowCount: number | null;
  timestamp: string;
  latencyMs?: number;
  error?: string | null;
}

export interface DatabaseTablesHealthResponse {
  success: boolean;
  isAuthorized: boolean;
  isDatabaseConnected: boolean;
  allTablesVerified: boolean;
  verifiedCount: number;
  totalTables: number;
  timestamp: string;
  databaseUrl?: string;
  tables: TableHealthItem[];
  error?: string | null;
  message?: string;
}

export const EXPECTED_VIDYA_TABLES = [
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

export type ExpectedTableName = (typeof EXPECTED_VIDYA_TABLES)[number];

export const TABLE_METADATA: Record<
  ExpectedTableName,
  { label: string; description: string; category: 'Core Registry' | 'Attendance' | 'Academic & AI' | 'Governance' }
> = {
  students: {
    label: 'Students Roster',
    description: 'Primary institutional student registry and biographical records',
    category: 'Core Registry',
  },
  staff: {
    label: 'Faculty & Staff',
    description: 'Faculty directory, employee codes, departments, and roles',
    category: 'Core Registry',
  },
  subjects: {
    label: 'Academic Curriculum',
    description: 'Course catalog, credit values, subject codes, and syllabi',
    category: 'Core Registry',
  },
  student_attendance: {
    label: 'Student Attendance',
    description: 'Daily session timestamps, presence, leaves, and absence logs',
    category: 'Attendance',
  },
  staff_attendance: {
    label: 'Staff Attendance',
    description: 'Faculty clock-in records, duty sessions, and work schedules',
    category: 'Attendance',
  },
  academic_performance: {
    label: 'Academic Performance',
    description: 'Quiz averages, midterm grades, final exam marks, and GPAs',
    category: 'Academic & AI',
  },
  learning_profile: {
    label: 'Learning Profiles',
    description: 'Pedagogical assessments, engagement indices, and study traits',
    category: 'Academic & AI',
  },
  predictions: {
    label: 'AI Risk Predictions',
    description: 'Machine learning dropout probabilities and academic risk tiers',
    category: 'Academic & AI',
  },
  recommendations: {
    label: 'Advisory Interventions',
    description: 'Automated remediation advisories and institutional action items',
    category: 'Academic & AI',
  },
  attendance_summary: {
    label: 'Attendance Syntheses',
    description: 'Aggregated monthly attendance percentages and institutional rates',
    category: 'Attendance',
  },
  user_profiles: {
    label: 'User Authorization',
    description: 'Role-based access controls, account isolation, and system roles',
    category: 'Governance',
  },
  faculty_class_assignments: {
    label: 'Faculty Course Allocations',
    description: 'Educator class section mappings and student roster assignments',
    category: 'Governance',
  },
};

/**
 * Executes a comprehensive, secure server-side database health check across all 12 expected Vidya tables.
 * Uses minimal read-only queries on the server without exposing service-role secrets.
 * Preserves Supabase RLS, safely refreshes stale sessions, and reports row counts only when authorized.
 */
export async function fetchDatabaseTablesHealth(
  activeToken?: string | null
): Promise<DatabaseTablesHealthResponse> {
  let tokenToUse = activeToken || (await getActiveAuthToken());

  const executeCheck = async (token: string | null): Promise<DatabaseTablesHealthResponse> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(apiUrl('/api/admin/database-health'), {
        method: 'GET',
        headers,
      });

      const parsed = await parseApiResponse<DatabaseTablesHealthResponse>(
        response,
        'Database health check endpoint (/api/admin/database-health)'
      );

      if (parsed.ok && parsed.data) {
        return parsed.data;
      }

      // If response is not ok, format a structured response preserving error classification
      return {
        success: false,
        isAuthorized: parsed.status !== 401 && parsed.status !== 403,
        isDatabaseConnected: parsed.status !== 503,
        allTablesVerified: false,
        verifiedCount: 0,
        totalTables: EXPECTED_VIDYA_TABLES.length,
        timestamp: new Date().toISOString(),
        tables: EXPECTED_VIDYA_TABLES.map((table) => ({
          table,
          status: parsed.status === 401 || parsed.status === 403 ? 'Access Denied' : 'Query Error',
          rowCount: null,
          timestamp: new Date().toISOString(),
          error: parsed.error || `HTTP ${parsed.status} response from server`,
        })),
        error: parsed.error || 'Failed to complete database health verification.',
      };
    } catch (err: any) {
      return {
        success: false,
        isAuthorized: false,
        isDatabaseConnected: false,
        allTablesVerified: false,
        verifiedCount: 0,
        totalTables: EXPECTED_VIDYA_TABLES.length,
        timestamp: new Date().toISOString(),
        tables: EXPECTED_VIDYA_TABLES.map((table) => ({
          table,
          status: 'Query Error',
          rowCount: null,
          timestamp: new Date().toISOString(),
          error: err?.message || 'Network error connecting to API',
        })),
        error: err?.message || 'Network exception while connecting to database health endpoint.',
      };
    }
  };

  let result = await executeCheck(tokenToUse);

  // If unauthorized due to expired token, attempt safe session refresh and retry once
  if (
    !result.isAuthorized ||
    result.error?.toLowerCase().includes('unauthorized') ||
    result.error?.toLowerCase().includes('expired')
  ) {
    const refreshed = await refreshSupabaseSession();
    if (refreshed) {
      result = await executeCheck(refreshed);
    }
  }

  return result;
}
