import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminStudentDashboardRecords,
  AdminStudentDashboardRecords,
} from '../../services/vidyaDatabaseService';
import { RiskBadge } from '../../components/charts/RiskBadge';
import {
  ArrowLeft,
  GraduationCap,
  Award,
  CalendarCheck,
  AlertTriangle,
  BrainCircuit,
  Sparkles,
  BookOpen,
  User,
  Activity,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  Target,
  BarChart2,
  Flame,
  Layers,
} from 'lucide-react';

interface AdminStudentDetailViewProps {
  studentId: number | string;
  onBack: () => void;
  onNavigateToAnotherStudent?: (studentId: number | string) => void;
}

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  studentId,
  onBack,
  onNavigateToAnotherStudent,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AdminStudentDashboardRecords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numStudentId =
    typeof studentId === 'number'
      ? studentId
      : parseInt(String(studentId).replace(/\D/g, ''), 10);

  const loadStudentRecords = useCallback(async () => {
    if (isNaN(numStudentId) || numStudentId <= 0) {
      setError(`Invalid numeric student ID: "${studentId}".`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminStudentDashboardRecords(numStudentId);
      setData(result);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load student dashboard records.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [numStudentId, studentId]);

  useEffect(() => {
    loadStudentRecords();
  }, [loadStudentRecords]);

  // Handle invalid student ID upfront
  if (isNaN(numStudentId) || numStudentId <= 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 max-w-xl mx-auto my-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Invalid Student ID</h2>
        <p className="text-xs text-slate-500">
          The requested student ID <span className="font-mono font-bold text-slate-800">"{studentId}"</span> is not a valid positive number.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Students List</span>
        </button>
      </div>
    );
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-12">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-9 h-9 bg-slate-200 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <div className="w-48 h-5 bg-slate-200 rounded" />
            <div className="w-64 h-3 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-44 rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-3xl bg-slate-200" />
          <div className="h-64 rounded-3xl bg-slate-200" />
        </div>
        <p className="text-center text-xs text-slate-400 font-medium">
          Loading live database records for Student #{numStudentId} from Supabase...
        </p>
      </div>
    );
  }

  // Not Found or Fatal Error State
  if (error || !data || !data.student) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 max-w-xl mx-auto my-12 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Record Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {error || `No institutional student record was found with ID #${numStudentId} in the student records registry.`}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </button>
          <button
            onClick={loadStudentRecords}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Load</span>
          </button>
        </div>
      </div>
    );
  }

  const { student, performance, attendance, learning_profile, predictions, recommendations, user_profile, assignments } = data;

  // Real academic marks calculation
  let quizAvg: number | null = null;
  if (performance) {
    if (performance.quiz_average !== null && performance.quiz_average !== undefined) {
      quizAvg = Number(performance.quiz_average.toFixed(1));
    } else if (performance.quiz1_marks !== null && performance.quiz1_marks !== undefined) {
      const q1 = performance.quiz1_marks || 0;
      const q2 = performance.quiz2_marks || 0;
      const q3 = performance.quiz3_marks || 0;
      quizAvg = Number(((q1 + q2 + q3) / 3).toFixed(1));
    }
  }

  const midtermScore = performance?.midterm_marks !== null && performance?.midterm_marks !== undefined ? Number(performance.midterm_marks.toFixed(1)) : null;
  const finalExamScore = performance?.final_marks !== null && performance?.final_marks !== undefined ? Number(performance.final_marks.toFixed(1)) : null;
  const previousGpa = performance?.previous_gpa !== null && performance?.previous_gpa !== undefined ? Number(performance.previous_gpa.toFixed(2)) : null;

  // Real Attendance metrics
  const lectureAttendance = attendance?.attendance_percentage !== null && attendance?.attendance_percentage !== undefined ? Number(attendance.attendance_percentage.toFixed(1)) : null;
  const labAttendance = attendance?.lab_attendance_percentage !== null && attendance?.lab_attendance_percentage !== undefined ? Number(attendance.lab_attendance_percentage.toFixed(1)) : null;
  const lecturesAttended = attendance?.lectures_attended;
  const totalLectures = attendance?.total_lectures;
  const labsAttended = attendance?.labs_attended;
  const totalLabs = attendance?.total_lab_sessions;

  // Real Predictions metrics
  const latestPrediction = predictions && predictions.length > 0 ? predictions[0] : null;
  const riskLevel = latestPrediction?.academic_risk || null;
  const predictedScore = latestPrediction?.predicted_final_score !== null && latestPrediction?.predicted_final_score !== undefined ? Math.round(latestPrediction.predicted_final_score) : null;

  // Real Learning Profile metrics
  const studyHours = learning_profile?.study_hours_per_day !== null && learning_profile?.study_hours_per_day !== undefined ? Number(learning_profile.study_hours_per_day.toFixed(1)) : null;
  const sleepHours = learning_profile?.sleep_hours !== null && learning_profile?.sleep_hours !== undefined ? Number(learning_profile.sleep_hours.toFixed(1)) : null;
  const selfPracticeHours = learning_profile?.self_practice_hours !== null && learning_profile?.self_practice_hours !== undefined ? Number(learning_profile.self_practice_hours.toFixed(1)) : null;
  const learningStyle = learning_profile?.learning_style || null;
  const motivationLevel = learning_profile?.motivation_level || null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shadow-2xs"
            title="Return to Student Registry"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Students</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span>Admin Workspace</span>
              <span>/</span>
              <button onClick={onBack} className="hover:text-slate-700 cursor-pointer">
                Students
              </button>
              <span>/</span>
              <span className="font-mono text-slate-700 font-bold">ID #{student.student_id}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
              <span>{student.name}</span>
              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Student ID: #{student.student_id}
              </span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadStudentRecords}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

      {/* Hero Student Identity Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-7 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-semibold border border-blue-400/30">
                Active SIS Scholar
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">Age: {student.age || '—'}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">Gender: {student.gender || '—'}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">{student.class_grade || 'Grade 11-A'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              {student.name}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Dedicated student performance profile loaded dynamically from Supabase database tables (<code className="text-blue-300 font-mono">students</code>, <code className="text-blue-300 font-mono">academic_performance</code>, <code className="text-blue-300 font-mono">student_attendance</code>, <code className="text-blue-300 font-mono">predictions</code>).
            </p>
          </div>

          {/* Account link status pill */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs min-w-[240px] text-xs space-y-1.5">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
              Portal Account Link
            </span>
            {user_profile ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Linked Account</span>
                </div>
                <p className="font-mono text-slate-200 text-[11px] truncate">{user_profile.email}</p>
                <p className="text-[10px] text-slate-400">Role: <span className="capitalize text-slate-300">{user_profile.role}</span></p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unlinked Profile</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">No user login currently mapped to Student #{student.student_id}.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top KPI Cards (Live Database Driven) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Academic Score */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Academic Score
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {quizAvg !== null || midtermScore !== null || finalExamScore !== null ? (
                <span>
                  {Math.round(((quizAvg || 0) * 10 + (midtermScore || 0) * (100 / 30) + (finalExamScore || 0) * (100 / 60)) / 3)}%
                </span>
              ) : (
                'N/A'
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {performance ? 'Computed from quiz, midterm & final marks' : 'No records in academic_performance'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Previous GPA:</span>
            <span className="font-medium text-slate-700 font-mono">
              {previousGpa !== null ? previousGpa : '—'}
            </span>
          </div>
        </div>

        {/* 2. Attendance Percentage */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Attendance Rate
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {lectureAttendance !== null ? `${lectureAttendance}%` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {attendance ? `${lecturesAttended ?? '—'} / ${totalLectures ?? '—'} lectures attended` : 'No records in student_attendance'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Lab Attendance:</span>
            <span className="font-medium text-slate-700 font-mono">
              {labAttendance !== null ? `${labAttendance}%` : '—'}
            </span>
          </div>
        </div>

        {/* 3. AI Risk Tier */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                AI Risk Classification
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {riskLevel ? (
                <RiskBadge level={riskLevel as any} size="md" />
              ) : (
                <span className="text-sm font-semibold text-slate-400">No Prediction</span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {latestPrediction ? `Predicted Final: ${predictedScore ?? '—'}%` : 'No row in predictions table'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Model:</span>
            <span className="font-medium text-slate-700 text-[10.5px] truncate max-w-[120px]">
              {latestPrediction?.prediction_model || 'Random Forest'}
            </span>
          </div>
        </div>

        {/* 4. Study Habits & Engagement */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-violet-200 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Study Profile
              </span>
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <BrainCircuit className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {studyHours !== null ? `${studyHours} hrs/day` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {learningStyle ? `Style: ${learningStyle}` : 'No row in learning_profile'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Motivation:</span>
            <span className="font-medium text-slate-700">
              {motivationLevel || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Academic Performance Details */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Academic Performance Records
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">public.academic_performance</span>
            </div>

            {performance ? (
              <div className="space-y-4">
                {/* Score component breakdown cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Quiz Average
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                      {quizAvg !== null ? `${quizAvg} / 10` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Q1: {performance.quiz1_marks ?? '—'} · Q2: {performance.quiz2_marks ?? '—'} · Q3: {performance.quiz3_marks ?? '—'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Midterm Marks
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                      {midtermScore !== null ? `${midtermScore} / 30` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">Benchmark exam</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Final Exam
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                      {finalExamScore !== null ? `${finalExamScore} / 60` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">Summative final</span>
                  </div>
                </div>

                {/* Performance Progress Bars */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Quiz Marks Normalized</span>
                      <span className="font-mono font-bold text-slate-900">{quizAvg !== null ? `${Math.round(quizAvg * 10)}%` : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, (quizAvg || 0) * 10))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Midterm Examination</span>
                      <span className="font-mono font-bold text-slate-900">{midtermScore !== null ? `${Math.round((midtermScore / 30) * 100)}%` : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, ((midtermScore || 0) / 30) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Final Exam Examination</span>
                      <span className="font-mono font-bold text-slate-900">{finalExamScore !== null ? `${Math.round((finalExamScore / 60) * 100)}%` : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, ((finalExamScore || 0) / 60) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <HelpCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No Academic Performance Records</p>
                <p className="text-[11px] text-slate-400 mt-0.5">This student does not have grades recorded in public.academic_performance.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Prior GPA: <strong className="text-slate-700 font-mono">{previousGpa ?? '—'}</strong></span>
            <span>Recorded ID: <strong className="text-slate-700 font-mono">#{student.student_id}</strong></span>
          </div>
        </div>

        {/* Right Column: Attendance Records & Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Attendance Metrics & Verification
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">public.student_attendance</span>
            </div>

            {attendance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Lecture Presence
                    </span>
                    <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                      {lectureAttendance !== null ? `${lectureAttendance}%` : '—'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {lecturesAttended ?? 0} attended out of {totalLectures ?? 0} total sessions
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Lab Practical Presence
                    </span>
                    <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                      {labAttendance !== null ? `${labAttendance}%` : '—'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {labsAttended ?? 0} attended out of {totalLabs ?? 0} laboratory sessions
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Verified Attendance Record</span>
                    <p className="text-[11px] text-emerald-700 leading-snug mt-0.5">
                      Attendance ID <code className="font-mono font-semibold">#{attendance.attendance_id}</code> verified with exact session presence counts.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <HelpCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No Attendance Records</p>
                <p className="text-[11px] text-slate-400 mt-0.5">This student does not have attendance rows in public.student_attendance.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Threshold benchmark: <strong className="text-slate-700">75% minimum</strong></span>
            <span>Status: <strong className={(lectureAttendance || 0) >= 75 ? 'text-emerald-600' : 'text-rose-600'}>{(lectureAttendance || 0) >= 75 ? 'Satisfactory' : 'Needs Attention'}</strong></span>
          </div>
        </div>
      </div>

      {/* Bottom Row: AI Predictions & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Risk Predictions Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Machine Learning Risk Forecasts ({predictions.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">public.predictions</span>
            </div>

            {predictions.length > 0 ? (
              <div className="space-y-2.5">
                {predictions.map((p, idx) => (
                  <div
                    key={p.prediction_id || idx}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={p.academic_risk as any} size="sm" />
                        <span className="font-mono text-slate-400 text-[10.5px]">
                          {p.prediction_date ? new Date(p.prediction_date).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Model: <span className="font-medium text-slate-700">{p.prediction_model || 'Random Forest'}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900 font-mono block">
                        {p.predicted_final_score !== null && p.predicted_final_score !== undefined
                          ? `${Math.round(p.predicted_final_score)}%`
                          : '—'}
                      </span>
                      <span className="text-[10px] text-slate-400">Forecast Score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BrainCircuit className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No Predictions Stored</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No prediction vector has been generated for Student #{student.student_id} yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Advisory Recommendations Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Personalized Advisory Recommendations ({recommendations.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">public.recommendations</span>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-2.5">
                {recommendations.map((r, idx) => (
                  <div
                    key={r.recommendation_id || idx}
                    className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{r.focus_area || 'Academic Intervention'}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.priority?.toLowerCase() === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {r.priority || 'Standard'}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs font-medium leading-relaxed">
                      {r.recommended_action}
                    </p>
                    {r.reason && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Rationale: {r.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No Specific Interventions Required</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Student performance meets institutional guidelines with no active advisories.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Faculty Assignments & Course Mappings (if present) */}
      {assignments && assignments.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                Assigned Faculty Educators ({assignments.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">public.faculty_class_assignments</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((a: any) => (
              <div
                key={a.assignment_id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {a.staff?.staff_name || a.staff_name || `Faculty #${a.staff_id}`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {a.subject?.subject_name || a.subject_name || a.subject_id || 'General Curriculum'}
                  </span>
                </div>
                <span className="font-mono text-slate-400 text-[10px] bg-white px-2 py-1 rounded border border-slate-200">
                  Staff #{a.staff_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
