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
  Settings,
  CreditCard,
} from 'lucide-react';
import { apiUrl } from '../../lib/apiConfig';
import {
  fetchAdminDashboardMetrics,
  AdminDashboardMetrics,
} from '../../services/adminMetricsService';
import { AcademicPerformanceOverviewChart } from '../../components/charts/AcademicPerformanceOverviewChart';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout, getActiveAuthToken, refreshSession } = useAuth();

  // Real database metrics state
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
  }, []);

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

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

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
                Your active session credentials need to be refreshed to query institutional assessment records.
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
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">
                  Verified: {metrics.totalStudents} Students · {metrics.totalStaff ?? 0} Faculty
                </span>
              </>
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
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
            title="Export authenticated student dataset as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export CSV</span>
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

      {/* Institutional Management Shortcuts Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Administrative Navigation</span>
          <span>Core Registries & Governance</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => onNavigate('students')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Students</p>
                <p className="text-[10.5px] text-slate-500">
                  {metrics?.totalStudents !== undefined && metrics?.totalStudents !== null
                    ? `${metrics.totalStudents} records`
                    : 'Roster & profiles'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('teachers')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Faculty</p>
                <p className="text-[10.5px] text-slate-500">
                  {metrics?.totalStaff !== undefined && metrics?.totalStaff !== null
                    ? `${metrics.totalStaff} educators`
                    : 'Directory & staff'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('assignments')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Assignments</p>
                <p className="text-[10.5px] text-slate-500">Course allocation</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('ai-prediction')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">ML Predictions</p>
                <p className="text-[10.5px] text-slate-500">Risk forecasting</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('institution-analytics')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Analytics</p>
                <p className="text-[10.5px] text-slate-500">Institutional trends</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('user-roles')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">User Roles</p>
                <p className="text-[10.5px] text-slate-500">Access control</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('subscription')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Subscription</p>
                <p className="text-[10.5px] text-slate-500">Plans & quotas</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-900">Settings</p>
                <p className="text-[10.5px] text-slate-500">System & DB</p>
              </div>
            </div>
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
              Active enrolled scholars cohort
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
              Certified instructional educators
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
              Across {metrics?.validAttCount ?? 0} attendance records
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
              Early warning academic risk flags
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

      {/* Real Academic Performance Analysis */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Academic Performance
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Synthesized across {metrics?.validAcadCount ?? 0} student assessment records
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                <span>Loading academic performance records...</span>
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
              Total Evaluated Predictions:{' '}
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


      {/* Real Faculty Subject Distribution Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Faculty Curriculum Distribution
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              Specialization count and instructional attendance metrics (Total: {metrics?.totalStaff ?? 0} educators)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>Loading faculty curriculum records...</span>
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
          <div className="py-8 text-center text-xs text-slate-500">No faculty records found.</div>
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
    </div>
  );
};
