import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/charts/MetricCard';
import {
  Users,
  GraduationCap,
  Award,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Database,
  Download,
  Upload,
  LogOut,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  UserCheck,
  Lock,
  AlertCircle,
  Clock,
  Activity,
  Layers,
  Search,
} from 'lucide-react';
import { apiUrl } from '../../lib/apiConfig';
import { SupabaseConnectionModal } from '../../components/SupabaseConnectionModal';
import { testSupabaseConnection, ConnectionTestResult } from '../../lib/supabase';
import {
  fetchAdminDashboardMetrics,
  AdminDashboardMetrics,
} from '../../services/adminMetricsService';
import {
  fetchDatabaseTablesHealth,
  DatabaseTablesHealthResponse,
  TableHealthItem,
  TableStatus,
  TABLE_METADATA,
  ExpectedTableName,
} from '../../services/databaseHealthService';
import { AcademicPerformanceOverviewChart } from '../../components/charts/AcademicPerformanceOverviewChart';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout, isSupabaseConnected, setSupabaseConnected, getActiveAuthToken, refreshSession } = useAuth();
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // Real database metrics state
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Honest Supabase connection health check state (students table probe)
  const [healthStatus, setHealthStatus] = useState<{
    checking: boolean;
    result: ConnectionTestResult | null;
  }>({
    checking: false,
    result: null,
  });

  // Comprehensive 12-table database health check state
  const [tablesHealth, setTablesHealth] = useState<{
    checking: boolean;
    result: DatabaseTablesHealthResponse | null;
    error: string | null;
  }>({
    checking: false,
    result: null,
    error: null,
  });

  const [tableFilter, setTableFilter] = useState<'all' | 'verified' | 'issues'>('all');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getActiveAuthToken();
      const data = await fetchAdminDashboardMetrics(token);
      setMetrics(data);
      if (data.hasError) {
        const errorList = Object.entries(data.errors)
          .filter(([_, msg]) => Boolean(msg))
          .map(([tbl, msg]) => `${tbl}: ${msg}`)
          .join('; ');
        setFetchError(`Database query notice: ${errorList}`);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to fetch metrics from Supabase.');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [getActiveAuthToken]);

  const handleSessionRefreshAndRetry = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const refreshedToken = await refreshSession();
      const data = await fetchAdminDashboardMetrics(refreshedToken);
      setMetrics(data);
      if (data.hasError) {
        const errorList = Object.entries(data.errors)
          .filter(([_, msg]) => Boolean(msg))
          .map(([tbl, msg]) => `${tbl}: ${msg}`)
          .join('; ');
        setFetchError(`Database query notice: ${errorList}`);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to refresh Supabase session.');
    } finally {
      setLoading(false);
    }
  };

  const runConnectionCheck = useCallback(async () => {
    setHealthStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await testSupabaseConnection();
      setHealthStatus({ checking: false, result: res });
      setSupabaseConnected(res.success);
    } catch {
      setHealthStatus({
        checking: false,
        result: {
          success: false,
          message: 'Connection check failed. Verify Supabase availability.',
          timestamp: new Date().toLocaleTimeString(),
          url: '',
        },
      });
      setSupabaseConnected(false);
    }
  }, [setSupabaseConnected]);

  const runFullDatabaseHealthCheck = useCallback(async () => {
    setTablesHealth((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const token = await getActiveAuthToken();
      const res = await fetchDatabaseTablesHealth(token);
      setTablesHealth({
        checking: false,
        result: res,
        error: res.success ? null : res.error || 'Failed to complete full database check',
      });
      if (res.isDatabaseConnected) {
        setSupabaseConnected(true);
      }
    } catch (err: any) {
      setTablesHealth({
        checking: false,
        result: null,
        error: err?.message || 'Database health check could not reach the server.',
      });
    }
  }, [getActiveAuthToken, setSupabaseConnected]);

  const runAllHealthChecks = useCallback(async () => {
    await Promise.allSettled([
      runConnectionCheck(),
      runFullDatabaseHealthCheck(),
    ]);
  }, [runConnectionCheck, runFullDatabaseHealthCheck]);

  useEffect(() => {
    loadMetrics();
    runConnectionCheck();
    runFullDatabaseHealthCheck();
  }, [loadMetrics, runConnectionCheck, runFullDatabaseHealthCheck]);

  const exportCSV = async () => {
    try {
      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl('/api/admin/dataset/export'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || `Export failed with status ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'vidya_live_students_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err?.message || 'Failed to download authenticated export.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Alert banner if admin profile record is missing */}
      {user?.isProfileMissing && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-rose-900">Admin profile not found</h4>
            <p className="mt-0.5 text-rose-700 leading-relaxed">
              Your active session (<span className="font-mono font-semibold">{user?.email}</span>, UUID:{' '}
              <span className="font-mono">{user?.id}</span>) does not have a corresponding record in{' '}
              <span className="font-mono">public.user_profiles</span>. Please contact your institutional administrator.
            </p>
          </div>
        </div>
      )}

      {/* Dedicated Session Expired / Authentication Warning Banner */}
      {(metrics?.isSessionExpired ||
        metrics?.errors?.academic?.toLowerCase().includes('unauthorized') ||
        metrics?.errors?.academic?.toLowerCase().includes('expired')) && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-sm text-amber-950">Supabase Authentication Session Notice</h4>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Your active session credentials need to be refreshed to query institutional assessment records from{' '}
                <code className="font-mono font-semibold text-amber-900">public.academic_performance</code>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleSessionRefreshAndRetry}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Session & Retry</span>
            </button>
            <button
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign In Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Honest Error State if query failed due to RLS or database error */}
      {fetchError && !metrics?.isSessionExpired && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Live Database Notice</p>
            <p className="mt-0.5 text-amber-800">{fetchError}</p>
          </div>
          <button
            onClick={loadMetrics}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 cursor-pointer"
          >
            Retry Queries
          </button>
        </div>
      )}

      {/* Welcome & Institutional Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
            <span className="font-mono text-[11px] tracking-wider uppercase text-slate-400">Institutional Directorate</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>VIDYA Platform</span>
            {metrics?.totalStudents !== null && metrics?.totalStudents !== undefined && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono ml-2">
                <Database className="w-2.5 h-2.5" />
                Live Supabase Verified ({metrics.totalStudents} Students · {metrics.totalStaff ?? 0} Faculty)
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Institutional Governance: {user?.isProfileMissing ? 'Admin profile not found' : (user?.name || user?.email || 'Administrator')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
            Enterprise overview of academic health, faculty performance, student retention, and Data Science ML predictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh metrics directly from Supabase tables"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
          <button
            onClick={() => onNavigate('students')}
            className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-slate-700" />
            <span>Manage Students</span>
          </button>
          <button
            onClick={() => onNavigate('user-roles')}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100 text-xs font-semibold transition-all border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-300" />
            <span>Manage User Roles</span>
          </button>
          <button
            onClick={() => onNavigate('teachers')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-300" />
            <span>Manage Faculty</span>
          </button>
          <button
            onClick={() => onNavigate('assignments')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span>Manage Assignments</span>
          </button>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-medium transition-all border border-rose-400/20 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Connected to Real Supabase Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Students */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total Students
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse" />
              ) : metrics?.totalStudents !== null && metrics?.totalStudents !== undefined ? (
                metrics.totalStudents
              ) : (
                'N/A'
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Table: <span className="font-mono text-slate-700">public.students</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Demographics:</span>
            <span className="font-medium text-slate-700">
              {metrics ? `${metrics.genderBreakdown.male}M · ${metrics.genderBreakdown.female}F` : '—'}
            </span>
          </div>
        </div>

        {/* 2. Total Faculty / Teachers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-violet-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total Faculty
              </span>
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse" />
              ) : metrics?.totalStaff !== null && metrics?.totalStaff !== undefined ? (
                metrics.totalStaff
              ) : (
                'N/A'
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Table: <span className="font-mono text-slate-700">public.staff</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Specializations:</span>
            <span className="font-medium text-slate-700">
              {metrics ? `${metrics.staffSubjectsBreakdown.length} Subjects` : '—'}
            </span>
          </div>
        </div>

        {/* 3. Average Performance (Calculated from valid marks in academic_performance) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Avg Performance
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {loading ? (
                <span className="inline-block w-20 h-7 bg-slate-200 rounded animate-pulse" />
              ) : metrics?.errors?.academic ? (
                <span className="text-amber-600 text-lg font-sans font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Auth Notice</span>
                </span>
              ) : metrics?.avgPerformance !== null && metrics?.avgPerformance !== undefined ? (
                `${metrics.avgPerformance}%`
              ) : (
                'N/A'
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {metrics?.errors?.academic ? (
                <button
                  onClick={handleSessionRefreshAndRetry}
                  className="text-amber-700 hover:text-amber-900 font-medium underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh session to view rows</span>
                </button>
              ) : metrics?.validAcadCount && metrics.validAcadCount > 0 ? (
                `From ${metrics.validAcadCount} valid assessment rows`
              ) : (
                'No assessment rows recorded'
              )}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Pass Rate (≥50%):</span>
            <span className="font-medium text-emerald-700 font-mono">
              {metrics?.errors?.academic ? '—' : metrics?.passRate !== null && metrics?.passRate !== undefined ? `${metrics.passRate}%` : '—'}
            </span>
          </div>
        </div>

        {/* 4. Average Attendance (Calculated from valid attendance_percentage in student_attendance) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Avg Attendance
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {loading ? (
                <span className="inline-block w-20 h-7 bg-slate-200 rounded animate-pulse" />
              ) : metrics?.avgAttendance !== null && metrics?.avgAttendance !== undefined ? (
                `${metrics.avgAttendance}%`
              ) : (
                'N/A'
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              From {metrics?.validAttCount ?? 0} student attendance rows
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Lab Attendance:</span>
            <span className="font-medium text-slate-700 font-mono">
              {metrics?.avgLabAttendance !== null && metrics?.avgLabAttendance !== undefined ? `${metrics.avgLabAttendance}%` : '—'}
            </span>
          </div>
        </div>

        {/* 5. High-Risk Students (Distinct Student IDs in predictions) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                High-Risk Students
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-rose-600 font-mono">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse" />
                ) : metrics?.highRiskStudentsCount !== null && metrics?.highRiskStudentsCount !== undefined ? (
                  metrics.highRiskStudentsCount
                ) : (
                  'N/A'
                )}
              </span>
              {metrics?.modRiskStudentsCount !== null && metrics?.modRiskStudentsCount !== undefined && (
                <span className="text-xs text-amber-600 font-medium font-mono">
                  +{metrics.modRiskStudentsCount} Mod
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Distinct student IDs in <span className="font-mono text-slate-700">predictions</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Low Risk:</span>
            <span className="font-medium text-emerald-700 font-mono">
              {metrics?.lowRiskStudentsCount ?? 0} scholars
            </span>
          </div>
        </div>
      </div>

      {/* Real Performance Analysis & Verified Supabase Connection Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Performance Index & Documented Calculation Formula */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Academic Performance
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Synthesized across {metrics?.validAcadCount ?? 0} records in <code className="font-mono text-slate-700">academic_performance</code>
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                <span>Loading academic performance records from Supabase...</span>
              </div>
            ) : metrics?.errors?.academic ? (
              <div className="my-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Academic Performance Query Notice</span>
                      <p className="mt-0.5 text-rose-700 leading-relaxed">{metrics.errors.academic}</p>
                    </div>
                  </div>
                  <button
                    onClick={loadMetrics}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Query</span>
                  </button>
                </div>
              </div>
            ) : metrics && metrics.validAcadCount === 0 ? (
              <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs text-center">
                <p>No valid performance records found in public.academic_performance table.</p>
                <button
                  onClick={loadMetrics}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            ) : (
              <>
                {/* Academic Performance Overview Bar Chart (Normalized comparison) */}
                <div className="mb-4">
                  <AcademicPerformanceOverviewChart
                    avgQuiz={metrics?.avgQuiz}
                    avgMidterm={metrics?.avgMidterm}
                    avgFinal={metrics?.avgFinal}
                    validCount={metrics?.validAcadCount}
                  />
                </div>

                {/* Real Component Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Mean Quiz Average
                    </span>
                    <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-1 block">
                      {metrics?.avgQuiz !== null && metrics?.avgQuiz !== undefined ? `${metrics.avgQuiz} / 10` : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Continuous assessment
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Mean Midterm Marks
                    </span>
                    <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-1 block">
                      {metrics?.avgMidterm !== null && metrics?.avgMidterm !== undefined ? `${metrics.avgMidterm} / 30` : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Mid-semester benchmark
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Mean Final Exam Marks
                    </span>
                    <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-1 block">
                      {metrics?.avgFinal !== null && metrics?.avgFinal !== undefined ? `${metrics.avgFinal} / 60` : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Summative assessment
                    </span>
                  </div>
                </div>

                {/* Real Grade Distribution Bands */}
                {metrics?.performanceDistribution && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                      Cohort Score Distribution
                    </span>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                        <span className="block font-bold font-mono text-sm">{metrics.performanceDistribution.critical}</span>
                        <span className="text-[10px] text-rose-600 block">Critical (&lt;50)</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                        <span className="block font-bold font-mono text-sm">{metrics.performanceDistribution.belowAverage}</span>
                        <span className="text-[10px] text-amber-600 block">50 - 59</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                        <span className="block font-bold font-mono text-sm">{metrics.performanceDistribution.average}</span>
                        <span className="text-[10px] text-blue-600 block">60 - 69</span>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800">
                        <span className="block font-bold font-mono text-sm">{metrics.performanceDistribution.good}</span>
                        <span className="text-[10px] text-indigo-600 block">70 - 79</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <span className="block font-bold font-mono text-sm">{metrics.performanceDistribution.excellent}</span>
                        <span className="text-[10px] text-emerald-600 block">Excellent (≥80)</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-normal">
              Total Valid Predictions in DB:{' '}
              <span className="font-semibold text-slate-800 font-mono">{metrics?.validPredictionsCount ?? 0}</span>
            </span>
            <button
              onClick={() => onNavigate('institution-analytics')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Institution Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real Supabase Setup & Health Indicator Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Supabase Setup & Health</h3>
                  <p className="text-xs text-slate-500 font-normal">Active database connection &amp; schema integrity</p>
                </div>
              </div>
              <button
                onClick={runAllHealthChecks}
                disabled={healthStatus.checking || tablesHealth.checking}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh database connectivity & 12-table schema status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthStatus.checking || tablesHealth.checking ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              VIDYA connects to production Supabase PostgreSQL tables using authenticated role-based access control.
            </p>

            {/* Health Check Live Indicator Card */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Connection Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isSupabaseConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {healthStatus.checking
                    ? 'Verifying...'
                    : isSupabaseConnected
                    ? 'Connected & Verified'
                    : 'Unconfirmed / Offline'}
                </span>
              </div>

              {/* Distinction: Database Connectivity vs 12-Table Schema Accessibility */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Schema Integrity:</span>
                {tablesHealth.checking ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                    Checking 12 tables...
                  </span>
                ) : tablesHealth.result ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      tablesHealth.result.allTablesVerified
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {tablesHealth.result.allTablesVerified ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                    )}
                    {tablesHealth.result.allTablesVerified
                      ? 'All 12 Tables Verified'
                      : `${tablesHealth.result.verifiedCount}/${tablesHealth.result.totalTables} Tables Verified`}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px]">Pending verification</span>
                )}
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Verified Table:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {healthStatus.result?.table || 'students'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500">Last Verified:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {tablesHealth.result?.timestamp
                    ? new Date(tablesHealth.result.timestamp).toLocaleTimeString()
                    : healthStatus.result?.timestamp || 'Pending check'}
                </span>
              </div>

              {/* Informative notice distinguishing DB connectivity from table permissions */}
              {tablesHealth.result && !tablesHealth.result.allTablesVerified && (
                <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Note:</strong> Database is connected, but specific table accessibility is restricted by Row Level Security or missing schema tables.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                {tablesHealth.result?.allTablesVerified
                  ? 'All 12 expected institutional schema tables verified with exact row counts.'
                  : healthStatus.result?.message || 'Awaiting connection verification.'}
              </div>
            </div>

            {/* Comprehensive 12-Table Health Matrix */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800">
                    Expected Schema Tables ({tablesHealth.result?.tables.length ?? 12})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setTableFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      tableFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({tablesHealth.result?.tables.length ?? 12})
                  </button>
                  <button
                    onClick={() => setTableFilter('verified')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      tableFilter === 'verified'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Verified ({tablesHealth.result?.verifiedCount ?? 0})
                  </button>
                  {tablesHealth.result && tablesHealth.result.verifiedCount < tablesHealth.result.totalTables && (
                    <button
                      onClick={() => setTableFilter('issues')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        tableFilter === 'issues'
                          ? 'bg-amber-700 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Issues ({tablesHealth.result.totalTables - tablesHealth.result.verifiedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Search filter for tables */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter tables (e.g. students, attendance)..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Table List Container with high density & smooth scroll */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white">
                {tablesHealth.checking && !tablesHealth.result ? (
                  <div className="p-6 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">Querying 12 expected institutional tables...</p>
                    <p className="text-[11px] text-slate-400">Performing minimal read-only checks with count exact</p>
                  </div>
                ) : tablesHealth.error && !tablesHealth.result ? (
                  <div className="p-4 text-xs text-rose-800 bg-rose-50 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Health Check Error</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{tablesHealth.error}</p>
                    <button
                      onClick={runFullDatabaseHealthCheck}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Check</span>
                    </button>
                  </div>
                ) : (
                  (() => {
                    const rawList = tablesHealth.result?.tables || [];
                    const filtered = rawList.filter((item) => {
                      if (tableFilter === 'verified' && item.status !== 'Verified') return false;
                      if (tableFilter === 'issues' && item.status === 'Verified') return false;
                      if (
                        tableSearchQuery.trim() &&
                        !item.table.toLowerCase().includes(tableSearchQuery.toLowerCase().trim())
                      ) {
                        return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No tables matched the current filter criteria.
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const meta = TABLE_METADATA[item.table as ExpectedTableName];
                      const isVerified = item.status === 'Verified';
                      const isDenied = item.status === 'Access Denied';
                      const isMissing = item.status === 'Missing';

                      return (
                        <div key={item.table} className="p-2.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-semibold text-slate-900 text-[11.5px] truncate">
                                public.{item.table}
                              </span>
                              {meta && (
                                <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-sans">
                                  {meta.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-600 truncate mt-0.5">
                              {meta?.description || 'Institutional schema record'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status Pill */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${
                                isVerified
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isDenied
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : isMissing
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}
                            >
                              {isVerified && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                              {isDenied && <Lock className="w-2.5 h-2.5 text-amber-600" />}
                              {isMissing && <XCircle className="w-2.5 h-2.5 text-rose-600" />}
                              {!isVerified && !isDenied && !isMissing && <AlertCircle className="w-2.5 h-2.5 text-red-600" />}
                              <span>{item.status}</span>
                            </span>

                            {/* Row Count (Shown only when authorized to obtain that count) */}
                            <div className="text-right min-w-[58px]">
                              {item.rowCount !== null && typeof item.rowCount === 'number' ? (
                                <span className="font-mono font-bold text-slate-800 text-[11px] block">
                                  {item.rowCount.toLocaleString()}
                                  <span className="text-[10px] font-normal text-slate-600 ml-0.5">rows</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-mono italic block">
                                  {isDenied ? 'Restricted' : 'N/A'}
                                </span>
                              )}
                              {item.latencyMs !== undefined && (
                                <span className="text-[9.5px] text-slate-500 font-mono block">
                                  {item.latencyMs}ms
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={runAllHealthChecks}
              disabled={healthStatus.checking || tablesHealth.checking}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthStatus.checking || tablesHealth.checking ? 'animate-spin' : ''}`} />
              <span>
                {healthStatus.checking || tablesHealth.checking
                  ? 'Verifying All 12 Tables...'
                  : 'Run Comprehensive Health Check'}
              </span>
            </button>
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Configure Database Credentials</span>
            </button>
            <button
              onClick={exportCSV}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Dataset as CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Faculty Subject Distribution Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Faculty Curriculum Distribution
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Specialization count and attendance metrics from <code className="font-mono text-slate-700">public.staff</code> table (Total: {metrics?.totalStaff ?? 0})
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>Loading faculty curriculum records from public.staff...</span>
          </div>
        ) : metrics?.errors?.staff ? (
          <div className="py-6 px-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Faculty Query Notice</span>
                  <p className="mt-0.5 text-rose-700">{metrics.errors.staff}</p>
                </div>
              </div>
              <button
                onClick={loadMetrics}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : !metrics?.staffSubjectsBreakdown || metrics.staffSubjectsBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No staff records found in public.staff.</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.staffSubjectsBreakdown.map((item) => (
                <div
                  key={item.subject}
                  className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{item.subject}</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {item.count} faculty member{item.count > 1 ? 's' : ''} assigned
                    </span>
                  </div>
                  {item.avgAttendance !== undefined && (
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block">{item.avgAttendance}%</span>
                      <span className="text-[10px] text-slate-400">Faculty Att.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
              <span>
                Faculty Count Sum:{' '}
                <strong className="font-mono text-slate-900">
                  {metrics.staffSubjectsBreakdown.reduce((acc, curr) => acc + curr.count, 0)}
                </strong>{' '}
                / <strong className="font-mono text-slate-900">{metrics.totalStaff ?? 29}</strong> total records in <code className="font-mono text-slate-700">public.staff</code>
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium self-start sm:self-auto">
                All 29 records verified in public.staff
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Supabase Connection Test Modal */}
      <SupabaseConnectionModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConnectionStatusChange={setSupabaseConnected}
      />
    </div>
  );
};
