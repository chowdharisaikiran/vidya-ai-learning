import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { getSupabaseClient } from '../../lib/supabase';
import { apiUrl, parseApiResponse } from '../../lib/apiConfig';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Mail,
  Star,
  Clock,
  Check,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface StaffData {
  staff_id: string;
  staff_name: string;
  subject: string;
  overall_attendance_percentage: number;
  attendance_status: string;
}

interface AttendanceSummaryData {
  staff_id: string;
  total_working_days: number;
  days_present: number;
  overall_attendance_percentage: number;
}

interface StaffAttendanceRecord {
  attendance_id: string;
  date: string;
  status: string;
}

interface TeacherProfileApiResponse {
  success: boolean;
  staff_id: string | null;
  isLinked: boolean;
  staff: StaffData | null;
  attendance_summary: AttendanceSummaryData | null;
  staff_attendance: StaffAttendanceRecord[];
  assigned_subjects: string[];
  primary_subject: string;
  message?: string;
}

export const TeacherProfileView: React.FC = () => {
  const { user, getActiveAuthToken } = useAuth();
  const staffId = user?.staffId;
  const displayName = user?.name || user?.email?.split('@')[0] || 'Faculty Member';
  const displayEmail = user?.email || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [staffRecord, setStaffRecord] = useState<StaffData | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [primarySubject, setPrimarySubject] = useState<string>('Unassigned Subject');

  const fetchProfileData = async (isManualRefresh = false) => {
    if (!staffId) {
      setLoading(false);
      return;
    }

    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    // 1. Primary secure path: Fetch from authenticated backend endpoint with service-role bridge
    try {
      const token = await getActiveAuthToken();
      if (token) {
        const res = await fetch(apiUrl('/api/teacher/profile'), {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const parsed = await parseApiResponse<TeacherProfileApiResponse>(res, '/api/teacher/profile');

        if (parsed.ok && parsed.data?.success) {
          const d = parsed.data;
          setStaffRecord(d.staff);
          setAttendanceSummary(d.attendance_summary);
          setAttendanceRecords(d.staff_attendance || []);
          setAssignedSubjects(d.assigned_subjects || []);
          setPrimarySubject(d.primary_subject || d.staff?.subject || 'Unassigned Subject');
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
    } catch (endpointErr) {
      console.warn('Backend /api/teacher/profile fetch failed, attempting client fallback:', endpointErr);
    }

    // 2. Client-side fallback path via direct Supabase queries
    try {
      const client = getSupabaseClient();
      if (client && staffId) {
        const [staffRes, summRes, attRes] = await Promise.all([
          client
            .from('staff')
            .select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status')
            .eq('staff_id', staffId)
            .maybeSingle(),
          client
            .from('attendance_summary')
            .select('staff_id, total_working_days, days_present, overall_attendance_percentage')
            .eq('staff_id', staffId)
            .maybeSingle(),
          client
            .from('staff_attendance')
            .select('attendance_id, date, status')
            .eq('staff_id', staffId)
            .order('date', { ascending: false }),
        ]);

        if (staffRes.data) {
          setStaffRecord(staffRes.data);
          const subj = staffRes.data.subject || 'Unassigned Subject';
          setPrimarySubject(subj);
          setAssignedSubjects([subj]);
        }
        if (summRes.data) {
          setAttendanceSummary(summRes.data);
        }
        if (attRes.data) {
          setAttendanceRecords(attRes.data);
        }
      }
    } catch (clientErr: any) {
      console.warn('Client fallback query error:', clientErr);
      setError(clientErr?.message || 'Could not load complete profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [staffId]);

  // If staff_id is NULL or unmapped, show clear safe empty state
  if (!staffId) {
    return <UnlinkedTeacherCard title="Educator Faculty Profile" />;
  }

  // Calculated attendance rates from available data
  const attendancePercentage =
    staffRecord?.overall_attendance_percentage ??
    attendanceSummary?.overall_attendance_percentage ??
    null;

  const totalWorkingDays = attendanceSummary?.total_working_days ?? attendanceRecords.length;
  const daysPresent =
    attendanceSummary?.days_present ??
    attendanceRecords.filter((r) => r.status?.toLowerCase() === 'present').length;
  const daysAbsent = totalWorkingDays - daysPresent;

  const latestRecord = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

  return (
    <div className="space-y-6">
      {/* Teacher Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-violet-500/10 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-xl ring-4 ring-white">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {displayName}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Staff ID: <span className="font-mono text-violet-700 font-bold">{staffId}</span>
                {staffRecord?.staff_name && staffRecord.staff_name !== displayName && (
                  <> • Institutional Roster: <span className="text-slate-700">{staffRecord.staff_name}</span></>
                )}
                {' '}• {primarySubject}
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-violet-600" />
                Verified Faculty
              </span>
              <button
                onClick={() => fetchProfileData(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Profile Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl">
            Authenticated educator account linked to Supabase institutional staff record #{staffId}.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 font-mono text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {displayEmail}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Attendance Status: <span className="text-emerald-700 font-bold">{staffRecord?.attendance_status || 'Good'}</span>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Faculty Performance Indicators from staff dataset */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Staff Attendance */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <p className="text-xs font-bold uppercase tracking-wider">Staff Attendance</p>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-emerald-600 font-mono mt-2">
              {attendancePercentage !== null ? `${attendancePercentage}%` : 'Not recorded'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Working Days Present:</span>
            <span className="font-mono font-bold text-slate-700">
              {totalWorkingDays > 0 ? `${daysPresent} / ${totalWorkingDays} days` : 'Not recorded'}
            </span>
          </div>
        </div>

        {/* Card 2: Attendance Status */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <p className="text-xs font-bold uppercase tracking-wider">Attendance Status</p>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-600 font-mono mt-2">
              {staffRecord?.attendance_status || (attendancePercentage && attendancePercentage >= 80 ? 'Good' : 'Not available')}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Latest Logged Day:</span>
            <span className="font-medium text-slate-700">
              {latestRecord ? (
                <span className={latestRecord.status === 'Present' ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {latestRecord.status} ({latestRecord.date})
                </span>
              ) : (
                'None recorded'
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Assigned Subject */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <p className="text-xs font-bold uppercase tracking-wider">Assigned Subject</p>
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2 leading-tight">
              {primarySubject}
            </p>
            {assignedSubjects.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {assignedSubjects.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Specialization:</span>
            <span className="text-slate-700 font-medium truncate max-w-[150px]">
              {staffRecord?.subject || primarySubject}
            </span>
          </div>
        </div>
      </div>

      {/* Staff Attendance Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Staff Attendance Log
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified daily attendance register records from <code className="font-mono text-slate-700">staff_attendance</code> table.
            </p>
          </div>

          {attendanceRecords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                Total Days: <span className="font-bold text-slate-800">{attendanceRecords.length}</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Present: <span className="font-bold">{daysPresent}</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                Absent: <span className="font-bold">{daysAbsent > 0 ? daysAbsent : 0}</span>
              </span>
            </div>
          )}
        </div>

        {attendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-xl">Attendance ID</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Staff ID</th>
                  <th className="py-2.5 px-4 rounded-r-xl">Daily Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.slice(0, 15).map((record) => {
                  const isPresent = record.status?.toLowerCase() === 'present';
                  return (
                    <tr key={record.attendance_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                        {record.attendance_id}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {record.date}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {staffId}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPresent ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {attendanceRecords.length > 15 && (
              <p className="text-[11px] text-slate-400 text-center mt-3">
                Showing latest 15 of {attendanceRecords.length} recorded daily attendance entries
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No Attendance Records Found</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              No daily entries have been logged in <code className="font-mono text-slate-600">staff_attendance</code> for staff record #{staffId}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
