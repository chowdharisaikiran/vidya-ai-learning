import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PerformanceBarChart } from '../../components/charts/PerformanceBarChart';
import {
  TrendingUp,
  Award,
  Layers,
  ShieldCheck,
  Building,
  Target,
  BarChart,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const AdminInstitutionAnalyticsView: React.FC = () => {
  const { allStudents, studentsLoading, studentsError, refreshStudents } = useAuth();
  const total = allStudents.length || 1;

  const avgScore =
    allStudents.length > 0
      ? Math.round((allStudents.reduce((a, b) => a + b.Overall_Score, 0) / total) * 10) / 10
      : 0;
  const avgAttendance =
    allStudents.length > 0
      ? Math.round((allStudents.reduce((a, b) => a + b.Attendance_Percent, 0) / total) * 10) / 10
      : 0;
  const highRiskCount = allStudents.filter((s) => s.Risk_Level === 'High').length;

  // Passing scholars (score >= 50%)
  const passingCount = allStudents.filter((s) => s.Overall_Score >= 50).length;
  const passingRate = allStudents.length > 0 ? Math.round((passingCount / total) * 100) : 0;

  // Weak subject breakdown calculated from live data
  const weakSubjectCounts: Record<string, number> = {};
  allStudents.forEach((s) => {
    if (s.Weak_Subject) {
      weakSubjectCounts[s.Weak_Subject] = (weakSubjectCounts[s.Weak_Subject] || 0) + 1;
    }
  });
  const weakSubjectList = Object.entries(weakSubjectCounts)
    .map(([subject, count]) => ({
      subject,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const topWeak = weakSubjectList[0] || { subject: 'None recorded', count: 0, percent: 0 };

  // Tutoring & Support distribution
  const tutoredCount = allStudents.filter((s) => s.Tutoring === 'Yes').length;
  const tutoredPercent = allStudents.length > 0 ? Math.round((tutoredCount / total) * 100) : 0;
  const highParentSupport = allStudents.filter((s) => s.Parental_Support === 'High').length;
  const medParentSupport = allStudents.filter((s) => s.Parental_Support === 'Medium').length;
  const lowParentSupport = allStudents.filter((s) => s.Parental_Support === 'Low').length;

  const classes = Array.from(new Set(allStudents.map((s) => s.Class_Grade)));
  const classStats = classes.map((cls) => {
    const list = allStudents.filter((s) => s.Class_Grade === cls);
    const count = list.length || 1;
    const score = Math.round((list.reduce((a, b) => a + b.Overall_Score, 0) / count) * 10) / 10;
    const att = Math.round((list.reduce((a, b) => a + b.Attendance_Percent, 0) / count) * 10) / 10;
    const highRisk = list.filter((s) => s.Risk_Level === 'High').length;

    return {
      classGrade: cls,
      count: list.length,
      averageScore: score,
      averageAttendance: att,
      highRiskCount: highRisk,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <span>Institution-Wide Academic Intelligence & Benchmarks</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Macro analysis of cohort health, verified passing rates, and comparative class grade trends.
          </p>
        </div>
      </div>

      {studentsError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">Database Connection Issue</p>
              <p className="text-[11px] text-amber-700">{studentsError}</p>
            </div>
          </div>
          <button
            onClick={() => refreshStudents()}
            disabled={studentsLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${studentsLoading ? 'animate-spin' : ''}`} />
            {studentsLoading ? 'Reconnecting...' : 'Retry Connection'}
          </button>
        </div>
      )}

      {/* High-Level Institutional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Composite GPA Metric</p>
          <p className="text-2xl font-black text-blue-600 font-mono mt-1">{avgScore}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Average across {allStudents.length} enrolled scholars</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{avgAttendance}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Verified database attendance average</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">At-Risk Incidence Rate</p>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">
            {Math.round((highRiskCount / total) * 100)}% ({highRiskCount} scholars)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">High-risk tier needing intervention</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cohort Passing Rate</p>
          <p className="text-2xl font-black text-violet-600 font-mono mt-1">{passingRate}%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{passingCount} of {allStudents.length} scholars &ge; 50% score</p>
        </div>
      </div>

      {/* Comparative Class Breakdown Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Comparative Cohort Breakdown (Class Streams)</h3>
          <p className="text-xs text-slate-500">
            Achievement distribution across active academic sections.
          </p>
        </div>

        {allStudents.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="font-semibold text-slate-700 text-xs">No active class streams found in registry</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Enrolled scholars will appear categorized by stream once available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classStats.map((cls) => (
              <div key={cls.classGrade} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{cls.classGrade}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {cls.count} scholars
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Average Score:</span>
                  <span className="font-mono font-bold text-blue-600">{cls.averageScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attendance:</span>
                  <span className="font-mono font-bold text-slate-800">{cls.averageAttendance}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">High Risk Count:</span>
                  <span className="font-mono font-bold text-rose-600">{cls.highRiskCount} scholars</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${cls.averageScore}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Early Warning Interventions & Pedagogical Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Tutoring & Academic Support Audit</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Live cohort records indicate that <b>{tutoredCount} scholars ({tutoredPercent}%)</b> are currently enrolled in supplementary tutoring. Parental support breakdown: <b>{highParentSupport} High</b>, <b>{medParentSupport} Medium</b>, and <b>{lowParentSupport} Low</b>.
          </p>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Note: Longitudinal intervention gain metrics require multiple historical exam cycles to establish verified statistical attribution.
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Curriculum Strategy Directives</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <b>{topWeak.subject}</b> represents the primary academic bottleneck in the cohort, flagged as the weakest subject for <b>{topWeak.count} students ({topWeak.percent}%)</b>. Recommended institutional focus: targeted concept review sessions and structured peer study circles.
          </p>
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-xs text-indigo-900 font-medium">
            Active curriculum review recommended for top friction subject: {topWeak.subject}.
          </div>
        </div>
      </div>
    </div>
  );
};
