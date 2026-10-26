import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/charts/MetricCard';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { RiskGauge } from '../../components/charts/RiskGauge';
import { fetchStudentLinkedRecords } from '../../services/vidyaDatabaseService';
import type { LinkedStudentData } from '../../services/vidyaDatabaseService';
import { getActiveAuthToken } from '../../lib/supabase';
import type { RiskLevel } from '../../types';
import {
  Award,
  CalendarCheck,
  ShieldAlert,
  Sparkles,
  Clock,
  ArrowRight,
  BrainCircuit,
  LogOut,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserX,
  BookOpen,
  Target,
  BarChart2,
  Beaker,
  Moon,
  Activity,
  Flame,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, logout, refreshUserRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentData, setStudentData] = useState<LinkedStudentData | null>(null);
  const [showAllPredictions, setShowAllPredictions] = useState(false);

  // Authenticated user identity from AuthContext / public.user_profiles
  const userName = user?.name || user?.email?.split('@')[0] || 'Student Scholar';
  const userRole = user?.role || 'student';
  const studentId = user?.studentId;

  const loadData = async (idToFetch: string | number) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getActiveAuthToken();
      const result = await fetchStudentLinkedRecords(idToFetch, token || undefined);
      if (result) {
        setStudentData(result);
        if (result.error) {
          setError(result.error);
        }
      } else {
        setStudentData(null);
      }
    } catch (err: any) {
      console.error('Failed to load authenticated student records:', err);
      setError(err?.message || 'Failed to fetch student data from Supabase.');
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load student data when role = 'student' and student_id is not NULL
    if (userRole === 'student' && studentId !== undefined && studentId !== null && studentId !== '') {
      loadData(studentId);
    } else {
      setLoading(false);
      setStudentData(null);
    }
  }, [studentId, userRole]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserRole();
      if (user?.studentId) {
        await loadData(user.studentId);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================================================
  // REQUIREMENT 1: If student_id is NULL, show clear empty state.
  // "Your student profile is not linked yet. Please contact your administrator."
  // Never assign a random student ID or use preview student data as fallback.
  // =========================================================================
  if (!studentId || userRole !== 'student') {
    return (
      <div className="space-y-6">
        {/* Welcome Header with Authenticated User Profile */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-md">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-3 font-medium">
              <span className="font-mono text-[11px] tracking-wider uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                Account Unlinked
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="capitalize text-slate-300">Student Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Welcome, {userName}
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
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
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

        {/* Clear Unlinked Student Profile Empty State Card */}
        <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
            <UserX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Your student profile is not linked yet. Please contact your administrator.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              Your authenticated account does not currently have an assigned student record ID in the institutional dataset.
              Supabase Row-Level Security restricts access to student performance, attendance, and predictive metrics until your profile is linked.
            </p>
          </div>

          {/* Account Verification Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Account Name</span>
              <span className="font-semibold text-slate-800">{userName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Email</span>
              <span className="font-mono text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Role</span>
              <span className="capitalize font-semibold text-slate-800">{userRole}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Student ID Mapping</span>
              <span className="font-mono text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded">
                NULL (Unmapped)
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Profile Status'}</span>
            </button>
            <button
              onClick={logout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Loading State
  // =========================================================================
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-3xl bg-slate-200" />
          <div className="h-72 rounded-3xl bg-slate-200" />
        </div>
        <p className="text-center text-xs text-slate-500 font-medium pt-2">
          Loading live Supabase data for Student ID #{studentId}...
        </p>
      </div>
    );
  }

  // =========================================================================
  // Live Mapped Data Processing
  // =========================================================================
  const studentRecord = studentData?.student;
  const perfRecord = studentData?.performance;
  const attRecord = studentData?.attendance;
  const learningRecord = studentData?.learningProfile;
  const predRecord = studentData?.prediction;
  const allPredictionsList = studentData?.predictions || [];
  const recommendationsList = studentData?.recommendations || [];

  const displayName = studentRecord?.name || userName;

  // Real academic performance metrics from `academic_performance` table
  let quizAvg: number | null = null;
  let midtermScore: number | null = null;
  let finalExamScore: number | null = null;
  let previousGpa: number | null = null;

  if (perfRecord) {
    quizAvg =
      perfRecord.quiz_average !== null && perfRecord.quiz_average !== undefined
        ? Number(perfRecord.quiz_average.toFixed(1))
        : perfRecord.quiz1_marks !== null && perfRecord.quiz1_marks !== undefined
        ? Number(
            (
              ((perfRecord.quiz1_marks || 0) +
                (perfRecord.quiz2_marks || 0) +
                (perfRecord.quiz3_marks || 0)) /
              3
            ).toFixed(1)
          )
        : null;

    midtermScore =
      perfRecord.midterm_marks !== null && perfRecord.midterm_marks !== undefined
        ? Number(perfRecord.midterm_marks.toFixed(1))
        : null;

    finalExamScore =
      perfRecord.final_marks !== null && perfRecord.final_marks !== undefined
        ? Number(perfRecord.final_marks.toFixed(1))
        : null;

    previousGpa =
      perfRecord.previous_gpa !== null && perfRecord.previous_gpa !== undefined
        ? Number(perfRecord.previous_gpa.toFixed(2))
        : null;
  }

  // Real attendance metrics from `student_attendance` table
  const lectureAttendance =
    attRecord?.attendance_percentage !== null && attRecord?.attendance_percentage !== undefined
      ? Number(attRecord.attendance_percentage.toFixed(1))
      : null;

  const labAttendance =
    attRecord?.lab_attendance_percentage !== null && attRecord?.lab_attendance_percentage !== undefined
      ? Number(attRecord.lab_attendance_percentage.toFixed(1))
      : null;

  // Real learning profile metrics from `learning_profile` table
  const studyHours =
    learningRecord?.study_hours_per_day !== null && learningRecord?.study_hours_per_day !== undefined
      ? Number(learningRecord.study_hours_per_day.toFixed(1))
      : null;

  const sleepHours =
    learningRecord?.sleep_hours !== null && learningRecord?.sleep_hours !== undefined
      ? Number(learningRecord.sleep_hours.toFixed(1))
      : null;

  const selfPracticeHours =
    learningRecord?.self_practice_hours !== null && learningRecord?.self_practice_hours !== undefined
      ? Number(learningRecord.self_practice_hours.toFixed(1))
      : null;

  const learningStyle = learningRecord?.learning_style || null;
  const motivationLevel = learningRecord?.motivation_level || null;

  // Real ML predictions from `predictions` table
  // Do NOT fabricate values; if missing, show null / N/A
  const riskLevel: RiskLevel | null =
    predRecord?.academic_risk === 'High'
      ? 'High'
      : predRecord?.academic_risk === 'Moderate'
      ? 'Moderate'
      : predRecord?.academic_risk === 'Low'
      ? 'Low'
      : null;

  const predictedScore =
    predRecord?.predicted_final_score !== null && predRecord?.predicted_final_score !== undefined
      ? Math.round(predRecord.predicted_final_score)
      : null;

  const primaryFocusArea = recommendationsList[0]?.focus_area || null;

  return (
    <div className="space-y-6">
      {/* Permission / Fetch warning banner if applicable */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Database notice:</strong> {error}
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-amber-900 font-semibold underline cursor-pointer ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3 font-medium">
            <span className="font-mono text-[11px] uppercase tracking-wider text-blue-400">Student Portal</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-300">ID #{studentId}</span>
            {studentRecord?.age && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">{studentRecord.age} yrs</span>
              </>
            )}
            {studentRecord?.gender && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">{studentRecord.gender}</span>
              </>
            )}
            {studentRecord && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400">Verified Database Profile</span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Welcome back, {displayName}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {predictedScore !== null ? (
              <>
                Your machine-learning predicted final score is{' '}
                <span className="text-white font-mono font-semibold">{predictedScore}%</span>
                {riskLevel ? (
                  <> with <span className="font-semibold text-white">{riskLevel} academic risk</span></>
                ) : null}
                {primaryFocusArea ? (
                  <>
                    . Key developmental focus: <span className="text-white font-semibold underline decoration-amber-400 decoration-1 underline-offset-2">{primaryFocusArea}</span>.
                  </>
                ) : (
                  '.'
                )}
              </>
            ) : (
              <>
                Authenticated student profile linked to verified dataset ID <span className="font-mono text-white font-semibold">#{studentId}</span>.
                Review your real marks, attendance logs, learning profile, and predictions below.
              </>
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('ai-recommendations')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Study Recommendations ({recommendationsList.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ai-prediction')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-slate-300" />
              <span>Simulate What-If</span>
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-xs font-medium transition-all border border-rose-400/20 flex items-center gap-1.5 ml-auto cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-blue-900/40 via-indigo-900/20 to-transparent pointer-events-none" />
      </div>

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Academic Marks */}
        <MetricCard
          title="Exam & Quiz Performance"
          value={
            finalExamScore !== null
              ? `${finalExamScore}%`
              : quizAvg !== null
              ? `${quizAvg}%`
              : 'N/A'
          }
          subtext={
            perfRecord
              ? `Final: ${finalExamScore !== null ? `${finalExamScore}%` : 'N/A'} · Midterm: ${midtermScore !== null ? `${midtermScore}%` : 'N/A'}`
              : 'No academic records found'
          }
          trend={{
            value: previousGpa !== null ? `GPA: ${previousGpa}/4.0` : 'Verified DB',
            isPositive: finalExamScore !== null ? finalExamScore >= 70 : undefined,
            isNeutral: finalExamScore === null,
          }}
          icon={Award}
          accentColor="blue"
          progress={finalExamScore ?? (quizAvg ?? 0)}
        />

        {/* Metric 2: Attendance */}
        <MetricCard
          title="Lecture Attendance"
          value={lectureAttendance !== null ? `${lectureAttendance}%` : 'N/A'}
          subtext={
            attRecord
              ? `Lectures: ${attRecord.lectures_attended ?? 'N/A'}/${attRecord.total_lectures ?? 'N/A'} · Lab: ${labAttendance !== null ? `${labAttendance}%` : 'N/A'}`
              : 'No attendance logs found'
          }
          trend={{
            value:
              lectureAttendance !== null
                ? lectureAttendance >= 80
                  ? 'Compliant'
                  : 'Low Attendance'
                : 'No Logs',
            isPositive: lectureAttendance !== null ? lectureAttendance >= 80 : undefined,
            isNeutral: lectureAttendance === null,
          }}
          icon={CalendarCheck}
          accentColor={lectureAttendance !== null && lectureAttendance >= 80 ? 'emerald' : 'rose'}
          progress={lectureAttendance ?? 0}
        />

        {/* Metric 3: Study Profile */}
        <MetricCard
          title="Daily Study Hours"
          value={studyHours !== null ? `${studyHours} hrs/day` : 'N/A'}
          subtext={
            learningRecord
              ? `Sleep: ${sleepHours !== null ? `${sleepHours}h` : 'N/A'} · Practice: ${selfPracticeHours !== null ? `${selfPracticeHours}h` : 'N/A'}`
              : 'No profile metrics recorded'
          }
          trend={{
            value: learningStyle ? `Style: ${learningStyle}` : motivationLevel ? `Motivation: ${motivationLevel}` : 'Standard',
            isNeutral: true,
          }}
          icon={Clock}
          accentColor="violet"
          progress={studyHours !== null ? Math.min(100, Math.round((studyHours / 8) * 100)) : 0}
        />

        {/* Metric 4: Academic Risk & Predicted Final */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted Risk</p>
            <div className="mt-2">
              {riskLevel ? (
                <RiskBadge level={riskLevel} size="lg" />
              ) : (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  N/A (No Prediction)
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {predictedScore !== null ? (
                <>
                  Predicted Final:{' '}
                  <span className="font-semibold text-slate-800 font-mono">{predictedScore}%</span>
                </>
              ) : (
                'Pending ML evaluation'
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <ShieldAlert
              className={`w-6 h-6 ${
                riskLevel === 'High'
                  ? 'text-rose-500'
                  : riskLevel === 'Moderate'
                  ? 'text-amber-500'
                  : riskLevel === 'Low'
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Row 1: Academic Marks Breakdown & Attendance Dual Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assessment Performance Composition (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <span>Academic Performance & Assessment Marks</span>
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Continuous assessment, midterm evaluations, and final marks
                </p>
              </div>
              <button
                onClick={() => onNavigate('my-performance')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {perfRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Quiz 1</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {perfRecord.quiz1_marks !== null && perfRecord.quiz1_marks !== undefined ? `${perfRecord.quiz1_marks}` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Quiz 2</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {perfRecord.quiz2_marks !== null && perfRecord.quiz2_marks !== undefined ? `${perfRecord.quiz2_marks}` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Quiz 3</span>
                    <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                      {perfRecord.quiz3_marks !== null && perfRecord.quiz3_marks !== undefined ? `${perfRecord.quiz3_marks}` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
                    <span className="text-[11px] text-blue-700 font-medium block">Quiz Average</span>
                    <div className="text-lg font-bold font-mono text-blue-900 mt-1">
                      {quizAvg !== null ? `${quizAvg}` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-violet-50/70 border border-violet-100">
                    <span className="text-[11px] text-violet-700 font-medium block">Midterm Marks</span>
                    <div className="text-xl font-bold font-mono text-violet-900 mt-1">
                      {midtermScore !== null ? `${midtermScore}` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-violet-600 block mt-0.5">Scale: 0 - 50</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                    <span className="text-[11px] text-indigo-700 font-medium block">Final Marks</span>
                    <div className="text-xl font-bold font-mono text-indigo-900 mt-1">
                      {finalExamScore !== null ? `${finalExamScore}` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-indigo-600 block mt-0.5">Scale: 0 - 50</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                    <span className="text-[11px] text-emerald-700 font-medium block">Previous GPA</span>
                    <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
                      {previousGpa !== null ? `${previousGpa}` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Cumulative / 4.00</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BarChart2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No academic performance records found for Student ID #{studentId}.</p>
              </div>
            )}
          </div>

          {perfRecord && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified academic performance records</span>
              </span>
              <span className="font-mono text-slate-400">ID #{studentId}</span>
            </div>
          )}
        </div>

        {/* Attendance (Lectures + Labs) Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Attendance Record</span>
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Lecture and laboratory session tracking
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Log #{attRecord?.attendance_id ?? 'N/A'}
              </span>
            </div>

            {attRecord ? (
              <div className="space-y-4">
                {/* Lecture Attendance Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Lecture Attendance</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {lectureAttendance !== null ? `${lectureAttendance}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        lectureAttendance !== null && lectureAttendance >= 80
                          ? 'bg-emerald-500'
                          : lectureAttendance !== null && lectureAttendance >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, lectureAttendance ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Lectures Attended: <strong className="text-slate-800">{attRecord.lectures_attended ?? 'N/A'}</strong>
                    </span>
                    <span>
                      Total Lectures: <strong className="text-slate-800">{attRecord.total_lectures ?? 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                {/* Lab Sessions Attendance Box */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                      <Beaker className="w-3.5 h-3.5 text-blue-600" />
                      <span>Laboratory Sessions</span>
                    </span>
                    <span className="text-sm font-bold font-mono text-blue-900">
                      {labAttendance !== null ? `${labAttendance}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        labAttendance !== null && labAttendance >= 80
                          ? 'bg-blue-600'
                          : labAttendance !== null && labAttendance >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, labAttendance ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-700/80">
                    <span>
                      Labs Attended: <strong className="text-blue-950">{attRecord.labs_attended ?? 'N/A'}</strong>
                    </span>
                    <span>
                      Total Lab Sessions: <strong className="text-blue-950">{attRecord.total_lab_sessions ?? 'N/A'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No attendance records logged for Student ID #{studentId}.</p>
              </div>
            )}
          </div>

          {attRecord && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status: {lectureAttendance !== null && lectureAttendance >= 75 ? 'Satisfactory' : 'Attendance Risk'}</span>
              <span className="font-semibold text-emerald-700">Verified attendance records</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Learning Profile Deep Dive & Predictive Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Learning Profile Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-600" />
                  <span>Personalized Learning Profile</span>
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Personal study commitment, rest cycles, and pedagogical preferences
                </p>
              </div>
              <span className="text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full">
                {learningStyle || 'Profile Live'}
              </span>
            </div>

            {learningRecord ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Daily Study Hours */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Study Hours
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-2">
                      {studyHours !== null ? `${studyHours} h` : 'N/A'}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2">Daily commitment</span>
                </div>

                {/* 2. Learning Style */}
                <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-violet-700 font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-violet-600" />
                      Learning Style
                    </span>
                    <div className="text-base font-bold text-violet-950 mt-2 truncate">
                      {learningStyle || 'N/A'}
                    </div>
                  </div>
                  <span className="text-[10px] text-violet-600/80 mt-2">Pedagogical preference</span>
                </div>

                {/* 3. Motivation Level */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      Motivation
                    </span>
                    <div className="text-base font-bold text-amber-950 mt-2">
                      {motivationLevel || 'N/A'}
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-700/80 mt-2">Academic drive</span>
                </div>

                {/* 4. Nightly Sleep Hours */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-indigo-700 font-medium flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      Sleep Hours
                    </span>
                    <div className="text-xl font-bold font-mono text-indigo-950 mt-2">
                      {sleepHours !== null ? `${sleepHours} h` : 'N/A'}
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-600/80 mt-2">Nightly rest</span>
                </div>

                {/* 5. Self-Practice Hours */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between sm:col-span-2">
                  <div>
                    <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      Independent Self-Practice
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-950 mt-2">
                      {selfPracticeHours !== null ? `${selfPracticeHours} hrs/day` : 'N/A'}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700/80 mt-2">Self-directed problem solving outside lectures</span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No learning profile records found for Student ID #{studentId}.</p>
              </div>
            )}
          </div>

          {learningRecord && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                <span>Verified learning habits</span>
              </span>
              <span className="font-mono text-slate-400">ID #{studentId}</span>
            </div>
          )}
        </div>

        {/* Predictive Analytics & Risk Assessment Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-600" />
                  <span>AI Predictive Analytics</span>
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Institutional ML forecasting and academic risk classification
                </p>
              </div>
              {allPredictionsList.length > 1 && (
                <button
                  onClick={() => setShowAllPredictions(!showAllPredictions)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  {showAllPredictions ? 'Show Latest' : `All (${allPredictionsList.length})`}
                </button>
              )}
            </div>

            {predRecord ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-2">
                  <RiskGauge
                    score={predictedScore ?? (riskLevel === 'High' ? 80 : riskLevel === 'Moderate' ? 50 : 20)}
                    level={riskLevel ?? 'Low'}
                    size={160}
                  />
                  <div className="mt-2 text-center">
                    <span className="text-xs text-slate-500">Predicted Final Score:</span>
                    <div className="text-2xl font-bold font-mono text-slate-900">
                      {predictedScore !== null ? `${predictedScore}%` : 'N/A'}
                    </div>
                    <div className="mt-1">
                      {riskLevel ? <RiskBadge level={riskLevel} size="md" /> : null}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Prediction ID</span>
                    <span className="font-mono font-semibold text-slate-900">{predRecord.prediction_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Model Engine</span>
                    <span className="font-semibold text-slate-900">{predRecord.prediction_model || 'Random Forest'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Evaluated On</span>
                    <span className="font-mono text-slate-900">{predRecord.prediction_date || 'N/A'}</span>
                  </div>
                </div>

                {/* Multiple Predictions breakdown if available */}
                {showAllPredictions && allPredictionsList.length > 1 && (
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-bold text-blue-900 block">
                      All Prediction Runs ({allPredictionsList.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {allPredictionsList.map((p, idx) => (
                        <div
                          key={p.prediction_id || idx}
                          className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-blue-100"
                        >
                          <span className="font-mono font-medium text-slate-800">{p.prediction_id} ({p.prediction_date || 'N/A'})</span>
                          <span className="font-mono font-bold text-blue-700">{p.predicted_final_score}% · {p.academic_risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BrainCircuit className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No prediction records found for Student ID #{studentId}.</p>
              </div>
            )}
          </div>

          {predRecord && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-slate-400">Model: {predRecord.prediction_model}</span>
              <span className="font-semibold text-indigo-700">Verified ML prediction record</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Personalized Recommendations from `recommendations` table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Personalized Pedagogical Directives &amp; Action Plan
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Targeted recommendations from the verified <code className="font-mono text-slate-700">recommendations</code> database table
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {recommendationsList.length} Directive{recommendationsList.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => onNavigate('ai-recommendations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Full Study Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recommendationsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendationsList.map((rec, index) => {
              const isHigh = rec.priority === 'High';
              const isMed = rec.priority === 'Medium';
              return (
                <div
                  key={rec.recommendation_id || index}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    isHigh
                      ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                      : isMed
                      ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Target
                          className={`w-4 h-4 ${
                            isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-blue-600'
                          }`}
                        />
                        <span>{rec.focus_area || 'Curriculum Goal'}</span>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide border ${
                          isHigh
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : isMed
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {rec.priority || 'Normal'} Priority
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {rec.recommended_action}
                    </p>
                  </div>

                  {rec.reason && (
                    <div className="pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Diagnosis:</span> {rec.reason}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                    <span>Rec #{rec.recommendation_id || index + 1}</span>
                    <span>Student #{studentId}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No customized recommendation records found for Student ID #{studentId} in Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
};
