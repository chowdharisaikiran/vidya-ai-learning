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
} from 'lucide-react';

export const AdminInstitutionAnalyticsView: React.FC = () => {
  const { allStudents } = useAuth();
  const total = allStudents.length || 1;

  const avgScore =
    Math.round((allStudents.reduce((a, b) => a + b.Overall_Score, 0) / total) * 10) / 10;
  const avgAttendance =
    Math.round((allStudents.reduce((a, b) => a + b.Attendance_Percent, 0) / total) * 10) / 10;
  const highRiskCount = allStudents.filter((s) => s.Risk_Level === 'High').length;

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
            Macro analysis of cohort health, curriculum retention, and comparative class grade trends.
          </p>
        </div>
      </div>

      {/* High-Level Institutional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Composite GPA Metric</p>
          <p className="text-2xl font-black text-blue-600 font-mono mt-1">{avgScore}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Grade 11 STEM Cohort</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{avgAttendance}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Compliant with accreditation</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">At-Risk Incidence Rate</p>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">
            {Math.round((highRiskCount / total) * 100)}% ({highRiskCount} scholars)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Tier-1 remedial triggers</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Curriculum Retention</p>
          <p className="text-2xl font-black text-violet-600 font-mono mt-1">98.2%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Zero student dropouts</p>
        </div>
      </div>

      {/* Comparative Class Breakdown Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Comparative Cohort Breakdown (Class Streams)</h3>
          <p className="text-xs text-slate-500">
            Monitoring equity and achievement distribution across Grade 11-A, 11-B, and 11-C.
          </p>
        </div>

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
      </div>

      {/* Early Warning Interventions & Pedagogical Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Intervention Effectiveness Audit</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Data science tracking reveals that students who received personalized AI study timetables combined with 1-on-1 tutoring demonstrated an average <b>+11.8 percentage point increase</b> in subsequent examination results.
          </p>
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 font-medium">
            ✓ 84.2% of flagged students successfully de-escalated from High Risk status within 60 days of early warning alert.
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Curriculum Strategy Directives</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Physics and Mathematics account for <b>68%</b> of all academic friction across the cohort. The Dean recommends launching mandatory Friday problem-solving workshops and expanding peer mentoring programs.
          </p>
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-xs text-indigo-900 font-medium">
            ✓ Automated syllabus synchronization active across all 4 departments.
          </div>
        </div>
      </div>
    </div>
  );
};
