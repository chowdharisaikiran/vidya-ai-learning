import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RadarChart } from '../../components/charts/RadarChart';
import { PerformanceBarChart } from '../../components/charts/PerformanceBarChart';
import { TrendLineChart } from '../../components/charts/TrendLineChart';
import {
  fetchStudentAcademicPerformance,
  mapRowsToSubjectScores,
  SupabaseAcademicPerformanceRow,
} from '../../services/academicPerformanceService';
import {
  getStudentAttendanceOverview,
  ComputedAttendanceOverview,
} from '../../services/attendanceService';
import type { SubjectScore } from '../../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  Layers,
  CheckCircle,
  HelpCircle,
  Database,
  RefreshCw,
  Info,
  CalendarCheck,
  Calendar,
} from 'lucide-react';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';

export const StudentPerformanceView: React.FC = () => {
  const { student, user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>(
    student?.Subjects?.[0]?.subject || 'Python Programming'
  );
  
  // Database academic_performance state
  const [dbPerformance, setDbPerformance] = useState<{
    subjects: SubjectScore[];
    overallScore: number;
    performanceLevel: string;
    weakSubject: string;
    source: 'database' | 'fallback';
    loading: boolean;
    error: string | null;
  }>({
    subjects: student?.Subjects || [],
    overallScore: student?.Overall_Score || 0,
    performanceLevel: student?.Performance_Level || 'Average',
    weakSubject: student?.Weak_Subject && student.Weak_Subject !== 'None' ? student.Weak_Subject : 'Not assessed',
    source: 'fallback',
    loading: false,
    error: null,
  });

  // Database attendance state (student_attendance & attendance_summary)
  const [attendanceData, setAttendanceData] = useState<ComputedAttendanceOverview>({
    attendancePercentage: student?.Attendance_Percent || 85,
    totalClasses: 60,
    classesAttended: 52,
    classesAbsent: 8,
    classesLate: 0,
    classesExcused: 0,
    recentLogs: [],
    monthlyBreakdown: [],
    source: 'fallback',
  });

  const loadAllData = async () => {
    if (!student?.Student_ID) return;
    setDbPerformance((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [perfRes, attOverview] = await Promise.all([
        fetchStudentAcademicPerformance(student.Student_ID),
        getStudentAttendanceOverview(
          student.Student_ID,
          student.Attendance_Percent,
          student.History
        ),
      ]);

      if (perfRes.source === 'database' && perfRes.records.length > 0) {
        const mapped = mapRowsToSubjectScores(perfRes.records);
        setDbPerformance({
          subjects: mapped.subjects,
          overallScore: mapped.avgOverall,
          performanceLevel:
            mapped.avgOverall >= 90
              ? 'Excellent'
              : mapped.avgOverall >= 80
              ? 'Good'
              : mapped.avgOverall >= 70
              ? 'Average'
              : mapped.avgOverall >= 60
              ? 'Below Average'
              : 'Critical',
          weakSubject: mapped.weakSubject,
          source: 'database',
          loading: false,
          error: null,
        });
      } else {
        // Empty DB or query error -> maintain existing mock data as fallback
        setDbPerformance({
          subjects: student.Subjects,
          overallScore: student.Overall_Score,
          performanceLevel: student.Performance_Level,
          weakSubject: student.Weak_Subject,
          source: 'fallback',
          loading: false,
          error: perfRes.error || null,
        });
      }

      setAttendanceData(attOverview);
    } catch (err: any) {
      setDbPerformance({
        subjects: student.Subjects,
        overallScore: student.Overall_Score,
        performanceLevel: student.Performance_Level,
        weakSubject: student.Weak_Subject,
        source: 'fallback',
        loading: false,
        error: err?.message || 'Error fetching performance data',
      });
    }
  };

  useEffect(() => {
    loadAllData();
  }, [student?.Student_ID, student?.Attendance_Percent, student?.History]);

  if (!user?.studentId || !student) {
    return <UnlinkedStudentCard title="Academic Performance Analytics" />;
  }

  const activeSubjects = dbPerformance.subjects.length > 0 ? dbPerformance.subjects : student.Subjects;
  const activeOverallScore = dbPerformance.source === 'database' ? dbPerformance.overallScore : student.Overall_Score;
  const activePerformanceLevel = dbPerformance.source === 'database' ? dbPerformance.performanceLevel : student.Performance_Level;
  const activeWeakSubject = dbPerformance.source === 'database' ? dbPerformance.weakSubject : student.Weak_Subject;

  const subjectData = activeSubjects.find((s: any) => s.subject === selectedSubject) || activeSubjects[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-sans">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Academic Performance Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Multivariate breakdown of assignment mastery, quiz retention, and examination outcomes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Data source indicators */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium border ${
              dbPerformance.source === 'database'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={
              dbPerformance.source === 'database'
                ? 'Displaying live academic records from Supabase academic_performance table'
                : 'academic_performance table is empty or unpopulated; safely using mock fallback'
            }
          >
            {dbPerformance.source === 'database' ? (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>DB: academic_performance</span>
              </>
            ) : (
              <>
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Scores: Mock Fallback</span>
              </>
            )}
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium border ${
              attendanceData.source === 'database'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={
              attendanceData.source === 'database'
                ? 'Displaying live attendance records from Supabase student_attendance and attendance_summary'
                : 'student_attendance table is empty or unpopulated; safely using mock fallback'
            }
          >
            {attendanceData.source === 'database' ? (
              <>
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>DB: student_attendance</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Attendance: Mock Fallback</span>
              </>
            )}
          </div>

          <button
            onClick={loadAllData}
            disabled={dbPerformance.loading}
            className="p-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh academic & attendance data from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbPerformance.loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <span className="text-xs font-medium text-slate-500 px-1">Overall Standing:</span>
            <span className="text-xs font-mono font-semibold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
              {activeOverallScore}% ({activePerformanceLevel})
            </span>
          </div>
        </div>
      </div>

      {/* Subject Score Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {activeSubjects.map((sub: any) => {
          const isWeak = Boolean(
            activeWeakSubject &&
            activeWeakSubject !== 'Not assessed' &&
            sub.subject.toLowerCase() === activeWeakSubject.toLowerCase()
          );
          const isSelected = sub.subject === selectedSubject;

          return (
            <div
              key={sub.subject}
              onClick={() => setSelectedSubject(sub.subject)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative ${
                isSelected
                  ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-1 ring-blue-400'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              {isWeak && (
                <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-mono font-semibold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Weak
                </span>
              )}

              <p className="text-xs font-semibold text-slate-800 truncate pr-14">{sub.subject}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{sub.overall}%</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  Grade {sub.grade}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                <span>Trend:</span>
                <span
                  className={`font-semibold flex items-center gap-0.5 ${
                    sub.trend === 'up'
                      ? 'text-emerald-600'
                      : sub.trend === 'down'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {sub.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : sub.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {sub.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Subject Deep-Dive & Component Breakdown */}
      {subjectData && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{subjectData.subject} Performance Deep Dive</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Overall: {subjectData.overall}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed split between formative (Assignments, Quizzes) and summative (Exams) assessments.
              </p>
            </div>

            {Boolean(
              activeWeakSubject &&
              activeWeakSubject !== 'Not assessed' &&
              subjectData.subject.toLowerCase() === activeWeakSubject.toLowerCase()
            ) && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Identified as your Primary Weak Subject. Focus on weekly remedial problem sets.</span>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Assignments (30% weight)</span>
                <span className="font-mono text-blue-600">{subjectData.assignment}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${subjectData.assignment}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Homework completion and project rubrics demonstrate steady conceptual comprehension.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Quizzes (30% weight)</span>
                <span className="font-mono text-violet-600">{subjectData.quiz}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-violet-600 h-2 rounded-full"
                  style={{ width: `${subjectData.quiz}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Short-term active recall reflects {subjectData.quiz >= 75 ? 'solid' : 'lagging'} retention under timed pressure.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Term Examination (40% weight)</span>
                <span className="font-mono text-indigo-700">{subjectData.exam}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-700 h-2 rounded-full"
                  style={{ width: `${subjectData.exam}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Summative examination synthesis testing multi-chapter problem solving and derivations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Dual Column: Cross-Subject Comparison & Cognitive Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Cross-Subject Score Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">
            Component breakdown comparison across all 5 core subjects
          </p>
          <PerformanceBarChart subjects={activeSubjects} height={230} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center">
          <div className="w-full text-left mb-2">
            <h3 className="text-base font-bold text-slate-900">Holistic Academic & Behavioral Radar</h3>
            <p className="text-xs text-slate-500">
              Multivariate assessment combining study habits, attendance, and testing metrics
            </p>
          </div>
          <RadarChart student={student} size={250} />
        </div>
      </div>

      {/* Historical Score Progression Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">Historical Milestone Log (Last 5 Months)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking empirical consistency across quizzes, assignments, and classroom attendance.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Academic Month</th>
                <th className="py-3 px-4">Quiz Score</th>
                <th className="py-3 px-4">Assignment Score</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Status Trajectory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {student.History.map((h, i) => (
                <tr key={h.month} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-800">{h.month} 2025-26</td>
                  <td className="py-3 px-4 font-mono">{h.quizScore}%</td>
                  <td className="py-3 px-4 font-mono">{h.assignmentScore}%</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{h.overallScore}%</td>
                  <td className="py-3 px-4 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        h.attendance >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {h.attendance}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Recorded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Attendance Log & Attendance Summary Verification */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Attendance Verification & Session Logs
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  attendanceData.source === 'database'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {attendanceData.source === 'database' ? 'Live Supabase Tables' : 'Mock Fallback Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data fed directly from Supabase <code className="font-mono text-slate-700">attendance_summary</code> and <code className="font-mono text-slate-700">student_attendance</code> tables.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Attendance Rate</p>
              <p className="text-lg font-bold font-mono text-slate-900">{attendanceData.attendancePercentage}%</p>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Total Scheduled</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">{attendanceData.totalClasses} classes</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="text-[11px] text-emerald-700 uppercase tracking-wider block">Classes Attended</span>
            <span className="text-lg font-bold font-mono text-emerald-900 mt-0.5 block">{attendanceData.classesAttended} classes</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70">
            <span className="text-[11px] text-rose-700 uppercase tracking-wider block">Absences</span>
            <span className="text-lg font-bold font-mono text-rose-900 mt-0.5 block">{attendanceData.classesAbsent} classes</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70">
            <span className="text-[11px] text-amber-700 uppercase tracking-wider block">Late / Excused</span>
            <span className="text-lg font-bold font-mono text-amber-900 mt-0.5 block">{attendanceData.classesLate + attendanceData.classesExcused} classes</span>
          </div>
        </div>

        {/* Recent Session Logs from student_attendance */}
        {attendanceData.recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="text-xs font-semibold text-slate-700 mb-2">Recent Database Session Records:</p>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Attendance Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Subject ID</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceData.recentLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-800">{log.attendance_date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          log.status?.toLowerCase() === 'present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.status?.toLowerCase() === 'late'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{log.subject_id || 'All Sessions'}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Individual daily session logs in Supabase <code className="font-mono text-slate-700">student_attendance</code> are currently unpopulated for <code className="font-mono font-semibold">{student.Student_ID}</code>. Aggregate metrics are derived from <code className="font-mono text-slate-700">attendance_summary</code> or mock fallback.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
