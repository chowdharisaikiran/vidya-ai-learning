import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/charts/MetricCard';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { StudentData } from '../../types';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { getSupabaseClient, getActiveAuthToken } from '../../lib/supabase';
import { apiUrl, parseApiResponse } from '../../lib/apiConfig';
import {
  fetchTeacherAssignedCohort,
  DatabaseFacultyAssignment,
} from '../../services/vidyaDatabaseService';
import {
  Users,
  Award,
  CalendarCheck,
  AlertTriangle,
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  LogOut,
  TrendingUp,
  Database,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

interface TeacherDashboardProps {
  onNavigate: (tab: string) => void;
  onSelectStudentDetails: (student: StudentData) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  onSelectStudentDetails,
}) => {
  const { user, logout, refreshUserRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'High' | 'Moderate' | 'Low'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Staff info
  const [staffInfo, setStaffInfo] = useState<{
    staff_id: string;
    staff_name: string;
    subject: string;
    overall_attendance_percentage: number;
    attendance_status: string;
  } | null>(null);

  // Assigned cohort state
  const [assignedStudents, setAssignedStudents] = useState<StudentData[]>([]);
  const [assignedRecords, setAssignedRecords] = useState<DatabaseFacultyAssignment[]>([]);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [cohortError, setCohortError] = useState<string | null>(null);

  // Authenticated user identity from Supabase Auth & user_profiles
  const userName = user?.name || user?.email?.split('@')[0] || 'Faculty Educator';
  const staffId = user?.staffId;

  // Load staff profile details
  useEffect(() => {
    let isMounted = true;
    if (staffId) {
      const loadProfile = async () => {
        try {
          const token = await getActiveAuthToken();
          if (token) {
            const res = await fetch(apiUrl('/api/teacher/profile'), {
              headers: { Authorization: `Bearer ${token}` },
            });
            const parsed = await parseApiResponse<{ success: boolean; staff: any }>(res, '/api/teacher/profile');
            if (isMounted && parsed.ok && parsed.data?.staff) {
              setStaffInfo(parsed.data.staff);
              return;
            }
          }
        } catch {
          // Proceed to client fallback
        }
        const client = getSupabaseClient();
        if (client) {
          client
            .from('staff')
            .select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status')
            .eq('staff_id', staffId)
            .maybeSingle()
            .then(({ data, error }) => {
              if (isMounted && !error && data) {
                setStaffInfo(data);
              }
            });
        }
      };
      loadProfile();
    } else {
      setStaffInfo(null);
    }
    return () => {
      isMounted = false;
    };
  }, [staffId]);

  // Load assigned students for this teacher
  const loadAssignedCohort = async () => {
    if (!staffId) return;
    setLoadingCohort(true);
    setCohortError(null);
    try {
      const res = await fetchTeacherAssignedCohort();
      if (res.error) {
        setCohortError(res.error);
        setAssignedStudents([]);
        setAssignedRecords([]);
      } else {
        setAssignedStudents(res.students || []);
        setAssignedRecords(res.assignments || []);
      }
    } catch (err: any) {
      setCohortError(err?.message || 'Failed to load assigned student cohort.');
    } finally {
      setLoadingCohort(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadAssignedCohort();
    }
  }, [staffId]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserRole();
      if (staffId) {
        await loadAssignedCohort();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered assigned students
  const filteredStudents = useMemo(() => {
    return assignedStudents.filter((student) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        student.Name.toLowerCase().includes(q) ||
        String(student.Student_ID).toLowerCase().includes(q);

      const matchesRisk = filterRisk === 'all' || student.Risk_Level === filterRisk;
      return matchesSearch && matchesRisk;
    });
  }, [assignedStudents, searchQuery, filterRisk]);

  // Aggregate stats from assigned cohort only
  const cohortStats = useMemo(() => {
    const total = assignedStudents.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, avgAttendance: 0, highRisk: 0, moderateRisk: 0 };
    }
    const sumScore = assignedStudents.reduce((acc, s) => acc + (s.Overall_Score || 0), 0);
    const sumAtt = assignedStudents.reduce((acc, s) => acc + (s.Attendance_Percent || 0), 0);
    const highRisk = assignedStudents.filter((s) => s.Risk_Level === 'High').length;
    const moderateRisk = assignedStudents.filter((s) => s.Risk_Level === 'Moderate').length;

    return {
      total,
      avgScore: Math.round((sumScore / total) * 10) / 10,
      avgAttendance: Math.round((sumAtt / total) * 10) / 10,
      highRisk,
      moderateRisk,
    };
  }, [assignedStudents]);

  // Group assignments by subject
  const subjectGroups = useMemo(() => {
    const map: Record<string, number> = {};
    assignedRecords.forEach((a) => {
      const sub = a.subject_name || a.subject_id || 'Assigned Curriculum';
      map[sub] = (map[sub] || 0) + 1;
    });
    return Object.entries(map).map(([subject, count]) => ({ subject, count }));
  }, [assignedRecords]);

  // =========================================================================
  // CASE 1: If staff_id is NULL, show safe empty state.
  // Hide student selectors, rosters, cohort analytics, and AI predictions.
  // Never show preview student, 297 students, or mock cohort data.
  // =========================================================================
  if (!staffId) {
    return (
      <div className="space-y-6">
        {/* Welcome Header with Authenticated Identity */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-md">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-3 font-medium">
              <span className="font-mono text-[11px] tracking-wider uppercase text-amber-400">
                Account Unlinked
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="capitalize text-slate-300">Faculty Terminal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Educator Workspace: {userName}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              You are signed in with verified Supabase credentials (<span className="text-white font-mono">{user?.email}</span>).
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-violet-600 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking Link Status...' : 'Check Link Status'}</span>
              </button>
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-medium transition-all border border-rose-400/20 flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-900/20 via-slate-900/40 to-transparent pointer-events-none" />
        </div>

        {/* Clear Unlinked Staff Profile Empty State Card */}
        <UnlinkedTeacherCard title="Educator Workspace" onRefresh={handleManualRefresh} />
      </div>
    );
  }

  // =========================================================================
  // CASE 2: staff_id is linked
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Welcome & Teacher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
            <span className="font-mono text-[11px] tracking-wider uppercase text-slate-400">Faculty Terminal</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-mono">Linked Staff #{staffId}</span>
            {cohortStats.total > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-blue-300 font-medium">{cohortStats.total} Students Assigned</span>
              </>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Educator Workspace: {staffInfo?.staff_name || userName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
            {staffInfo?.subject ? `Department / Subject: ${staffInfo.subject}` : 'Verified faculty terminal.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAssignedCohort}
            disabled={loadingCohort}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh assigned cohort"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${loadingCohort ? 'animate-spin' : ''}`} />
            <span>{loadingCohort ? 'Loading...' : 'Refresh Cohort'}</span>
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-medium transition-all border border-rose-400/20 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Staff Record Overview */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-3">Staff Profile Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 font-medium">Staff ID</span>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{staffId}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 font-medium">Subject Specialization</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">{staffInfo?.subject || 'Assigned Subject'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 font-medium">Faculty Attendance</span>
            <p className="text-base font-bold text-emerald-600 font-mono mt-0.5">
              {staffInfo?.overall_attendance_percentage ? `${staffInfo.overall_attendance_percentage}%` : '85%'}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loadingCohort && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
          <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800">Loading Assigned Student Cohort...</h4>
          <p className="text-xs text-slate-500">Querying verified assignments for Staff #{staffId} under Row-Level Security.</p>
        </div>
      )}

      {/* Error State */}
      {!loadingCohort && cohortError && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span className="text-sm font-bold">Error Loading Assigned Students</span>
          </div>
          <p className="text-xs text-rose-700">{cohortError}</p>
          <button
            onClick={loadAssignedCohort}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State: Mapped to staff_id, but NO students assigned */}
      {!loadingCohort && !cohortError && assignedStudents.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto space-y-4 my-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Students Assigned Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Your account is successfully linked to Faculty record <span className="font-mono font-semibold text-slate-700">#{staffId}</span>, but no students are currently assigned to your roster.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 text-left space-y-1.5">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Next Steps:</span>
            </p>
            <p>1. Contact an administrator to assign students to your courses in the Faculty Assignment management portal.</p>
            <p>2. Once assigned, your permitted student roster, grades, attendance, and risk metrics will populate here automatically.</p>
          </div>
          <button
            onClick={loadAssignedCohort}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Refresh Roster
          </button>
        </div>
      )}

      {/* Populated State: Students ARE assigned */}
      {!loadingCohort && !cohortError && assignedStudents.length > 0 && (
        <div className="space-y-6">
          {/* Cohort KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Students
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {cohortStats.total}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Roster Scope:</span>
                <span className="font-semibold text-indigo-600">Enrolled Cohort</span>
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cohort Mean Score
                </span>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {cohortStats.avgScore}%
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Assessment:</span>
                <span className="font-semibold text-emerald-700">Coursework & Exams</span>
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mean Attendance
                </span>
                <div className="text-2xl font-black text-blue-600 font-mono mt-1">
                  {cohortStats.avgAttendance}%
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Engagement:</span>
                <span className="font-semibold text-blue-700">Classroom Rate</span>
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Students at Risk
                </span>
                <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                  {cohortStats.highRisk} High · {cohortStats.moderateRisk} Mod
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Priority:</span>
                <span className="font-semibold text-rose-700">Intervention Support</span>
              </p>
            </div>
          </div>

          {/* Assigned Subjects Overview */}
          {subjectGroups.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Assigned Course Sections & Subjects
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {subjectGroups.map((g) => (
                  <div
                    key={g.subject}
                    className="px-3.5 py-2 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 flex items-center gap-2 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-900">{g.subject}</span>
                    <span className="text-indigo-700 font-mono font-medium text-xs">
                      · {g.count} {g.count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Students Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Assigned Student Cohort</span>
                  <span className="text-xs text-slate-500 font-mono font-normal">
                    ({filteredStudents.length} / {assignedStudents.length})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Access restricted to students explicitly assigned to Staff #{staffId}.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assigned student..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                  <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
                  {(['all', 'High', 'Moderate', 'Low'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilterRisk(lvl)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        filterRisk === lvl
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {lvl === 'all' ? 'All Risks' : lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Student</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Weak Subject</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No assigned students match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.Student_ID} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-900">
                          {s.Name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                          #{s.Student_ID}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`font-mono font-bold ${
                            (s.Overall_Score || 0) >= 75 ? 'text-emerald-600' : (s.Overall_Score || 0) >= 60 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {s.Overall_Score ?? '—'}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {s.Attendance_Percent ?? '—'}%
                        </td>
                        <td className="py-3.5 px-4">
                          <RiskBadge level={s.Risk_Level} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span
                            title="Suggested subject based on academic profile"
                            className={`cursor-help ${s.Weak_Subject && s.Weak_Subject !== 'Not assessed' && s.Weak_Subject !== 'None' ? 'font-medium text-rose-700' : 'text-slate-400 italic'}`}
                          >
                            {s.Weak_Subject && s.Weak_Subject !== 'None' ? s.Weak_Subject : 'Not assessed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => onSelectStudentDetails(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredStudents.length} assigned records</span>
              <button
                onClick={() => onNavigate('students')}
                className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Roster View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
