import React from 'react';
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
} from 'lucide-react';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';

export const StudentProfileView: React.FC = () => {
  const { student, user } = useAuth();

  if (!user?.studentId || !student) {
    return <UnlinkedStudentCard title="Student Scholar Profile" />;
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={student.Name}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-100 shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {student.Name.charAt(0)}
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-xl ring-4 ring-white shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{student.Name}</h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {student.Class_Grade} • {student.Education_Level} • ID: <span className="font-mono text-slate-700">{student.Student_ID}</span>
              </p>
            </div>
            <div className="self-center sm:self-auto flex items-center gap-2">
              {student.isLiveDatabaseRecord && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl font-medium shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Institutional Record
                </span>
              )}
              <RiskBadge level={student.Risk_Level} size="lg" />
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl font-normal">
            Enrolled scholar in the VIDYA Academic Framework. Profile synchronized with active ML prediction models and attendance trackers.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {student.Email}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Age {student.Age} ({student.Gender})
            </span>
            <span className="inline-flex items-center gap-1.5 bg-blue-50/60 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200/60 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Learning Affinity: {student.Learning_Style}
            </span>
          </div>
        </div>
      </div>

      {/* Behavioral & Study Environment Attributes Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-0.5">
          Data Science Student Profile Attributes (22 Vectors)
        </h3>
        <p className="text-xs text-slate-500 font-normal mb-5">
          Core indicators utilized by the VIDYA ensemble model for academic performance and risk forecasting.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Attendance Consistency</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">{student.Attendance_Percent}%</span>
            <span className="text-[11px] text-slate-400">Benchmark: 80%</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Daily Self-Study</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">{student.Study_Hours_Per_Day} hrs</span>
            <span className="text-[11px] text-slate-400">Target: 3.5 - 5 hrs</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Sleep Duration</span>
            <span className="text-lg font-bold text-slate-900 font-mono mt-1 block tracking-tight">{student.Sleep_Hours} hrs</span>
            <span className="text-[11px] text-slate-400">Optimal: 7.5 hrs/night</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Motivation Level</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">{student.Motivation_Level}</span>
            <span className="text-[11px] text-slate-400">Intrinsic drive</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Stress / Anxiety Level</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">{student.Stress_Level}</span>
            <span className="text-[11px] text-slate-400">Exam pressure index</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Parental Support</span>
            <span className="text-lg font-semibold text-slate-900 capitalize mt-1 block tracking-tight">{student.Parental_Support}</span>
            <span className="text-[11px] text-slate-400">Home study environment</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Tutoring Support</span>
            <span className="text-lg font-semibold text-slate-900 mt-1 block tracking-tight">{student.Tutoring}</span>
            <span className="text-[11px] text-slate-400">External scaffolding</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Internet & Device Access</span>
            <span className="text-lg font-semibold text-slate-900 mt-1 block tracking-tight">{student.Internet_Access}</span>
            <span className="text-[11px] text-slate-400">Digital connectivity</span>
          </div>
        </div>
      </div>

      {/* Intervention Notes Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-0.5">Intervention History & Advising Log</h3>
        <p className="text-xs text-slate-500 font-normal mb-4">
          Recorded interactions, mentoring meetings, and pedagogical adjustments.
        </p>

        <div className="space-y-2.5">
          {(student.Intervention_Notes || ['Profile established in VIDYA platform']).map((note, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <p className="text-xs text-slate-700 leading-relaxed font-normal">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
