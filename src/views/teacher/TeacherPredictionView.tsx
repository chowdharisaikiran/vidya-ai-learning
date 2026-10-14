import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { StudentData } from '../../types';
import { fetchTeacherAssignedCohort } from '../../services/vidyaDatabaseService';
import {
  BrainCircuit,
  Sparkles,
  Users,
  ShieldAlert,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export const TeacherPredictionView: React.FC = () => {
  const { user } = useAuth();
  const staffId = user?.staffId;

  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected student for simulation
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studyHoursOffset, setStudyHoursOffset] = useState<number>(0);
  const [attendanceOffset, setAttendanceOffset] = useState<number>(0);
  const [tutoringEnabled, setTutoringEnabled] = useState<boolean>(false);

  const loadData = async () => {
    if (!staffId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTeacherAssignedCohort();
      if (res.error) {
        setError(res.error);
        setStudents([]);
      } else {
        setStudents(res.students || []);
        if (res.students && res.students.length > 0) {
          setSelectedStudentId(String(res.students[0].Student_ID));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading cohort predictions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadData();
    }
  }, [staffId]);

  // If staff_id is NULL or unmapped, show clear safe empty state
  if (!staffId) {
    return <UnlinkedTeacherCard title="Educator AI Predictive Early Warning & Intervention Planner" />;
  }

  const currentStudent = students.find((s) => String(s.Student_ID) === selectedStudentId);

  // Run simulation if student selected
  const simulationResult = currentStudent
    ? calculateAcademicPrediction({
        Attendance_Percent: Math.min(100, Math.max(10, (currentStudent.Attendance_Percent || 80) + attendanceOffset)),
        Study_Hours_Per_Day: Math.min(10, Math.max(1, 4 + studyHoursOffset)),
        Assignment_Score: currentStudent.Assignment_Score || 75,
        Quiz_Score: currentStudent.Quiz_Score || 75,
        Previous_Score: currentStudent.Previous_Score || 75,
        Sleep_Hours: 7,
        Motivation_Level: 'Medium',
        Parental_Support: 'Medium',
        Tutoring: tutoringEnabled ? 'Yes' : 'No',
        Internet_Access: 'Yes',
        Stress_Level: 'Medium',
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Educator AI Predictive Early Warning & Intervention Planner
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate academic counseling, tutoring, and attendance impact exclusively for students assigned to Staff #{staffId}.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-violet-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800">Loading Assigned Student Cohort...</h4>
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h4 className="text-sm font-bold">Failed to Load Predictions</h4>
          </div>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto space-y-3 my-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Student Cohort Enrolled</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are currently no students assigned to your faculty profile (Staff #{staffId}). Under Row-Level Security, broad predictive simulations are restricted until an administrator assigns students to your course sections.
          </p>
        </div>
      )}

      {!loading && !error && students.length > 0 && currentStudent && simulationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Selector & Simulation Controls */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Select Assigned Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setStudyHoursOffset(0);
                  setAttendanceOffset(0);
                  setTutoringEnabled(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-600 bg-white"
              >
                {students.map((s) => (
                  <option key={s.Student_ID} value={String(s.Student_ID)}>
                    {s.Name} (#{s.Student_ID}) — {s.Risk_Level} Risk
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-violet-600" />
                <span>Intervention Simulation</span>
              </h4>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Attendance Adjustment</span>
                  <span className="font-mono font-semibold text-violet-600">{attendanceOffset >= 0 ? `+${attendanceOffset}%` : `${attendanceOffset}%`}</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={attendanceOffset}
                  onChange={(e) => setAttendanceOffset(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Daily Study Hours</span>
                  <span className="font-mono font-semibold text-violet-600">{studyHoursOffset >= 0 ? `+${studyHoursOffset}h` : `${studyHoursOffset}h`}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="4"
                  value={studyHoursOffset}
                  onChange={(e) => setStudyHoursOffset(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-xs font-medium text-slate-700">Add Academic Tutoring</span>
                <input
                  type="checkbox"
                  checked={tutoringEnabled}
                  onChange={(e) => setTutoringEnabled(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">{currentStudent.Name}</h3>
                <p className="text-xs text-slate-500">Student #{currentStudent.Student_ID} · Permitted Assigned Roster</p>
              </div>
              <RiskBadge level={simulationResult.riskLevel} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400">Baseline Score</span>
                <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{currentStudent.Overall_Score}%</p>
              </div>
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
                <span className="text-[11px] font-medium text-violet-700 font-semibold">Simulated Score</span>
                <p className="text-xl font-bold text-violet-700 font-mono mt-0.5">{simulationResult.predictedOverallScore}%</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] font-medium text-emerald-700 font-semibold">Performance Level</span>
                <p className="text-sm font-bold text-emerald-800 mt-1">{simulationResult.performanceLevel}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Recommended Educator Action:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{simulationResult.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
