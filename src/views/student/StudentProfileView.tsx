import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RiskBadge } from '../../components/charts/RiskBadge';
import {
  User,
  GraduationCap,
  Calendar,
  Mail,
  Shield,
  BookOpen,
  Clock,
  Sparkles,
  Heart,
  Wifi,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';
import { fetchStudentLinkedRecords, LinkedStudentData } from '../../services/vidyaDatabaseService';

export const StudentProfileView: React.FC = () => {
  const { student, user, selectedStudentId, getActiveAuthToken } = useAuth();
  const [linkedData, setLinkedData] = useState<LinkedStudentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const targetStudentId = selectedStudentId || user?.studentId || student?.Student_ID;

  const loadLinkedProfile = useCallback(async () => {
    if (!targetStudentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getActiveAuthToken();
      const data = await fetchStudentLinkedRecords(targetStudentId, token || undefined);
      if (data) {
        setLinkedData(data);
        if (data.error) {
          setError(data.error);
        }
      } else {
        setError('Failed to retrieve student profile records from Supabase database.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to Supabase database.');
    } finally {
      setLoading(false);
    }
  }, [targetStudentId, getActiveAuthToken]);

  useEffect(() => {
    loadLinkedProfile();
  }, [loadLinkedProfile]);

  if (!user?.studentId && !selectedStudentId && !student && !loading) {
    return <UnlinkedStudentCard title="Student Scholar Profile" />;
  }

  const s = linkedData?.student;
  const lp = linkedData?.learningProfile;
  const att = linkedData?.attendance;
  const pred = linkedData?.prediction;
  const recs = linkedData?.recommendations || [];

  const studentName = s?.name || student?.Name || 'Not Provided';
  const studentIdStr = s?.student_id ? String(s.student_id) : (student?.Student_ID || 'Not Provided');
  const studentEmail = s?.email || student?.Email || 'Not Provided';
  const studentAge = s?.age ?? student?.Age ?? 'Not Provided';
  const studentGender = s?.gender || student?.Gender || 'Not Provided';
  const classGrade = s?.class_grade || student?.Class_Grade || 'Undergraduate';
  const learningStyle = lp?.learning_style || student?.Learning_Style || 'Not Assessed';
  const riskLevel = pred?.academic_risk || s?.risk_level || student?.Risk_Level || 'Low Risk';

  const attendancePercent = att?.attendance_percentage ?? s?.attendance_percent ?? student?.Attendance_Percent;
  const studyHours = lp?.study_hours_per_day ?? s?.study_hours_per_day ?? student?.Study_Hours_Per_Day;
  const sleepHours = lp?.sleep_hours ?? student?.Sleep_Hours;
  const motivationLevel = lp?.motivation_level || student?.Motivation_Level;
  const stressLevel = s?.stress_level || student?.Stress_Level;
  const parentalSupport = s?.parental_support || student?.Parental_Support;
  const tutoring = s?.tutoring || student?.Tutoring;
  const internetAccess = s?.internet_access || student?.Internet_Access;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && !linkedData && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800">Fetching student records from Supabase database...</h4>
        </div>
      )}

      {/* Error State Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Database Synchronization Notice</p>
            <p className="mt-0.5 text-amber-800">{error}</p>
          </div>
          <button
            onClick={loadLinkedProfile}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={studentName}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-100 shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {studentName.charAt(0)}
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-xl ring-4 ring-white shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{studentName}</h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {classGrade} • ID: <span className="font-mono text-slate-700">{studentIdStr}</span>
              </p>
            </div>
            <div className="self-center sm:self-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl font-medium shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Supabase Verified Record
              </span>
              <RiskBadge level={riskLevel as any} size="lg" />
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl font-normal">
            Enrolled scholar in the VIDYA Academic Framework. Profile synchronized with active Supabase tables (students, learning_profile, student_attendance, predictions).
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {studentEmail}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Age {studentAge} ({studentGender})
            </span>
            <span className="inline-flex items-center gap-1.5 bg-blue-50/60 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200/60 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Learning Affinity: {learningStyle}
            </span>
          </div>
        </div>
      </div>

      {/* Behavioral & Study Environment Attributes Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            Supabase Database Student Profile Attributes
          </h3>
          <button
            onClick={loadLinkedProfile}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 font-normal mb-5">
          Core vectors retrieved from Supabase tables: <code className="font-mono text-slate-700">students</code>, <code className="font-mono text-slate-700">learning_profile</code>, and <code className="font-mono text-slate-700">student_attendance</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Attendance Consistency</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">
              {attendancePercent !== null && attendancePercent !== undefined ? `${attendancePercent}%` : 'Not Assessed'}
            </span>
            <span className="text-[11px] text-slate-400">Source: student_attendance</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Daily Self-Study</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">
              {studyHours !== null && studyHours !== undefined ? `${studyHours} hrs` : 'Not Assessed'}
            </span>
            <span className="text-[11px] text-slate-400">Source: learning_profile</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Sleep Duration</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">
              {sleepHours !== null && sleepHours !== undefined ? `${sleepHours} hrs` : 'Not Provided'}
            </span>
            <span className="text-[11px] text-slate-400">Source: learning_profile</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Motivation Level</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">
              {motivationLevel || 'Not Assessed'}
            </span>
            <span className="text-[11px] text-slate-400">Source: learning_profile</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Stress / Anxiety Level</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">
              {stressLevel || 'Not Assessed'}
            </span>
            <span className="text-[11px] text-slate-400">Source: students table</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Parental Support</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">
              {parentalSupport || 'Not Provided'}
            </span>
            <span className="text-[11px] text-slate-400">Source: students table</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Tutoring Support</span>
            <span className="text-lg font-semibold text-slate-900 mt-1 block tracking-tight">
              {tutoring || 'Not Provided'}
            </span>
            <span className="text-[11px] text-slate-400">Source: students table</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Internet & Device Access</span>
            <span className="text-lg font-semibold text-slate-900 mt-1 block tracking-tight">
              {internetAccess || 'Not Provided'}
            </span>
            <span className="text-[11px] text-slate-400">Source: students table</span>
          </div>
        </div>
      </div>

      {/* Recommendations & Intervention Notes Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-0.5">Recommendations &amp; Mentorship Log</h3>
        <p className="text-xs text-slate-500 font-normal mb-4">
          Retrieved from Supabase <code className="font-mono text-slate-700">recommendations</code> table.
        </p>

        <div className="space-y-2.5">
          {recs.length > 0 ? (
            recs.map((rec) => (
              <div key={rec.recommendation_id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{rec.focus_area} ({rec.priority} Priority)</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal mt-0.5">{rec.recommended_action}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              No active recommendation records found in Supabase for this scholar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
