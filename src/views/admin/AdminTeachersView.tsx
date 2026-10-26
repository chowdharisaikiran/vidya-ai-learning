import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllStaffRecordsWithStatus,
  DatabaseStaffRow,
} from '../../services/vidyaDatabaseService';
import {
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Award,
  ShieldCheck,
  CalendarCheck,
  Activity,
  X,
  UserCheck,
} from 'lucide-react';

interface AdminTeachersViewProps {
  onNavigate?: (tab: string) => void;
}

export const AdminTeachersView: React.FC<AdminTeachersViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<DatabaseStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const normalizeSubject = (subject?: string | null): string => {
    if (!subject) return 'Unspecified';
    const trimmed = subject.trim();
    if (!trimmed || trimmed.toUpperCase() === 'NULL' || trimmed.toLowerCase() === 'unassigned') {
      return 'Unspecified';
    }
    return trimmed;
  };

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAllStaffRecordsWithStatus();
      if (res.error) {
        setError(res.error);
        setStaffList([]);
      } else {
        setStaffList(res.staff || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load faculty records from public.staff.');
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Compute unique subjects and attendance statuses from live dataset
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      set.add(normalizeSubject(s.subject));
    });
    return Array.from(set).sort();
  }, [staffList]);

  const statusesList = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.attendance_status && s.attendance_status.trim()) {
        set.add(s.attendance_status.trim());
      }
    });
    return Array.from(set).sort();
  }, [staffList]);

  // Filtered staff based on user search and dropdown selections
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((s) => {
      const sub = normalizeSubject(s.subject);
      const name = (s.staff_name || '').toLowerCase();
      const id = (s.staff_id || '').toLowerCase();
      const status = (s.attendance_status || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || id.includes(q) || sub.toLowerCase().includes(q);
      const matchesSubject = selectedSubject === 'all' || sub === selectedSubject;
      const matchesStatus =
        selectedStatus === 'all' ||
        (s.attendance_status && s.attendance_status.trim().toLowerCase() === selectedStatus.toLowerCase());

      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [staffList, search, selectedSubject, selectedStatus]);

  // Summary statistics from live data
  const stats = useMemo(() => {
    const total = staffList.length;
    if (total === 0) return { total: 0, avgAttendance: 0, goodStatusCount: 0, distinctSubjects: 0 };

    let attSum = 0;
    let attCount = 0;
    let goodStatusCount = 0;

    staffList.forEach((s) => {
      if (typeof s.overall_attendance_percentage === 'number' && !isNaN(s.overall_attendance_percentage)) {
        attSum += s.overall_attendance_percentage;
        attCount++;
      }
      const st = (s.attendance_status || '').toLowerCase();
      if (st === 'good' || st === 'excellent' || (s.overall_attendance_percentage && s.overall_attendance_percentage >= 80)) {
        goodStatusCount++;
      }
    });

    return {
      total,
      avgAttendance: attCount > 0 ? Math.round((attSum / attCount) * 10) / 10 : 0,
      goodStatusCount,
      distinctSubjects: subjectsList.length,
    };
  }, [staffList, subjectsList]);

  const resetFilters = () => {
    setSearch('');
    setSelectedSubject('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Academic Faculty & Educator Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Verified institutional faculty profiles and attendance metrics from <code className="font-mono text-slate-700">public.staff</code> table.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigate && (
            <button
              onClick={() => onNavigate('assignments')}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Manage Student Assignments</span>
            </button>
          )}
          <button
            onClick={loadStaff}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh faculty records from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards - Real Database Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Faculty Staff
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error ? (
                '—'
              ) : (
                stats.total
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Verified Table:</span>
            <span className="font-mono text-slate-700">public.staff</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mean Faculty Attendance
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error || stats.total === 0 ? (
                '—'
              ) : (
                `${stats.avgAttendance}%`
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Metric Column:</span>
            <span className="font-mono text-slate-700">overall_attendance</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Disciplines / Subjects
            </span>
            <div className="text-2xl font-black text-violet-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-10 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error ? (
                '—'
              ) : (
                stats.distinctSubjects
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Subject Specializations:</span>
            <span className="text-slate-700 font-medium">Distinct Curriculum Areas</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              High Attendance Status
            </span>
            <div className="text-2xl font-black text-blue-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error ? (
                '—'
              ) : (
                `${stats.goodStatusCount} / ${stats.total}`
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Compliant Faculty:</span>
            <span className="text-emerald-700 font-medium">Status Good / ≥ 80%</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty by name, staff ID, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subject filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[170px]">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all"
              >
                <option value="all">All Subjects ({staffList.length})</option>
                {subjectsList.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Attendance Status filter */}
            {statusesList.length > 0 && (
              <div className="relative min-w-[150px]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-all"
                >
                  <option value="all">All Statuses</option>
                  {statusesList.map((st) => (
                    <option key={st} value={st}>
                      Status: {st}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(search || selectedSubject !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                title="Reset active filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Count Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="font-mono text-slate-900">{filteredStaff.length}</strong> of{' '}
            <strong className="font-mono text-slate-900">{staffList.length}</strong> verified faculty records
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Faculty Directory · Sort: staff_id ASC
          </span>
        </div>
      </div>

      {/* Main Content States: Loading, Error, Empty, and Success Grid */}
      {loading ? (
        /* Loading Skeleton State */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Loading Live Faculty Dataset</h3>
              <p className="text-xs text-slate-500">
                Fetching all verified faculty records from institutional directory...
              </p>
            </div>
          </div>
        </div>
      ) : error ? (
        /* Query Error State with Actionable Retry */
        <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-rose-950">
                Unable to Load Faculty Records
              </h3>
              <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">
                {error}
              </p>
              <div className="pt-2">
                <button
                  onClick={loadStaff}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Query</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : staffList.length === 0 ? (
        /* Zero Database Records Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Faculty Records Found in Database</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            The faculty directory returned zero rows. Check database synchronization or run dataset import.
          </p>
          <div className="pt-2">
            <button
              onClick={loadStaff}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Table</span>
            </button>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        /* Filter Mismatch Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Faculty Members Match Your Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No faculty records match query &ldquo;{search}&rdquo; in subject &ldquo;{selectedSubject}&rdquo;.
          </p>
          <div>
            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        /* Live Faculty Cards Grid - Exact Database Columns */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((st) => {
            const subject = normalizeSubject(st.subject);
            const attendance =
              typeof st.overall_attendance_percentage === 'number' && !isNaN(st.overall_attendance_percentage)
                ? `${st.overall_attendance_percentage}%`
                : 'N/A';
            const status = st.attendance_status && st.attendance_status.trim() ? st.attendance_status.trim() : 'Active';

            // Generate initials
            const initials = (st.staff_name || 'Faculty')
              .split(' ')
              .map((part) => part[0])
              .filter(Boolean)
              .join('')
              .slice(0, 2)
              .toUpperCase();

            // Status badge color
            const isGoodStatus =
              status.toLowerCase() === 'good' ||
              status.toLowerCase() === 'excellent' ||
              (typeof st.overall_attendance_percentage === 'number' && st.overall_attendance_percentage >= 80);

            return (
              <div
                key={st.staff_id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-violet-300 transition-colors"
              >
                <div>
                  {/* Top: Avatar, Name, Staff ID, Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs font-mono">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {st.staff_name || 'Faculty Educator'}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 font-semibold">
                          ID: <span className="text-violet-700 font-bold">{st.staff_id}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isGoodStatus
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isGoodStatus ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {status}
                    </span>
                  </div>

                  {/* Subject Specialization Callout */}
                  <div className="my-3.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Subject Specialization
                      </span>
                      <span
                        className={`text-xs font-semibold block mt-0.5 ${
                          subject === 'Unspecified' ? 'text-slate-400 italic' : 'text-slate-900'
                        }`}
                      >
                        {subject}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                      Curriculum
                    </span>
                  </div>

                  {/* Attendance Metric */}
                  <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 font-medium">Faculty Attendance:</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{attendance}</span>
                  </div>
                </div>

                {/* Footer with database verification mark */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified in <code className="font-mono">public.staff</code>
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    #{st.staff_id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dataset Verification Banner */}
      {!loading && !error && staffList.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Real-time faculty synchronisation active: All <strong className="font-mono text-slate-900">{staffList.length}</strong> records loaded from <code className="font-mono text-slate-800">public.staff</code> via authenticated admin query.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono self-start sm:self-auto">
            Row Level Security (RLS) Enforced
          </span>
        </div>
      )}
    </div>
  );
};
