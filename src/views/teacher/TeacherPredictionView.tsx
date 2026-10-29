import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { StudentData } from '../../types';
import { fetchTeacherAssignedCohort } from '../../services/vidyaDatabaseService';
import {
  BrainCircuit,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  Info,
  Target,
  Sparkles,
  Award,
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

  // Check required baseline academic data
  const hasValidAttendance = typeof currentStudent?.Attendance_Percent === 'number' && !isNaN(currentStudent.Attendance_Percent) && currentStudent.Attendance_Percent >= 0;
  const hasValidStudyHours = typeof currentStudent?.Study_Hours_Per_Day === 'number' && !isNaN(currentStudent.Study_Hours_Per_Day) && currentStudent.Study_Hours_Per_Day >= 0;
  const hasValidOverallScore = typeof currentStudent?.Overall_Score === 'number' && !isNaN(currentStudent.Overall_Score) && currentStudent.Overall_Score >= 0;

  const hasValidBaselineData = Boolean(currentStudent && hasValidAttendance && hasValidStudyHours && hasValidOverallScore);

  // Calculate clamped effective inputs (offsets range from 0 upwards)
  const baseAttendance = currentStudent?.Attendance_Percent ?? 0;
  const baseStudyHours = currentStudent?.Study_Hours_Per_Day ?? 0;
  const baselineScore = Math.round(currentStudent?.Overall_Score ?? 0);

  const adjustedAttendance = Math.min(100, Math.max(0, baseAttendance + Math.max(0, attendanceOffset)));
  const adjustedStudyHours = Math.min(24, Math.max(0, baseStudyHours + Math.max(0, studyHoursOffset)));

  // Transparent, documented demo simulation model
  const simulationModel = useMemo(() => {
    if (!hasValidBaselineData || !currentStudent) return null;

    // 1. Attendance improvement contribution: each +5 percentage points contributes +2.0 projected score points
    const attendanceGain = (Math.max(0, attendanceOffset) / 5) * 2.0;

    // 2. Daily study increase contribution: +3.0 score pts per additional hr, diminishing returns above 3 additional hrs (+1.5 for 4th hr)
    let studyGain = 0;
    const hours = Math.max(0, studyHoursOffset);
    if (hours >= 1) studyGain += 3.0;
    if (hours >= 2) studyGain += 3.0;
    if (hours >= 3) studyGain += 3.0;
    if (hours >= 4) studyGain += 1.5;

    // 3. Academic Tutoring contribution: +4.0 score pts when enabled
    const tutoringGain = tutoringEnabled ? 4.0 : 0.0;

    // Combined score gain
    const totalScoreGain = Math.round((attendanceGain + studyGain + tutoringGain) * 10) / 10;

    // Projected score clamped between baselineScore and 100
    const projectedScore = Math.min(100, Math.round(baselineScore + totalScoreGain));
    const scoreDifference = Math.round((projectedScore - baselineScore) * 10) / 10;

    // ML ensemble prediction for risk badge & recommendations
    const simFeatures = {
      Attendance_Percent: adjustedAttendance,
      Study_Hours_Per_Day: adjustedStudyHours,
      Assignment_Score: currentStudent.Assignment_Score ?? currentStudent.Overall_Score ?? 75,
      Quiz_Score: currentStudent.Quiz_Score ?? currentStudent.Overall_Score ?? 75,
      Previous_Score: currentStudent.Previous_Score ?? currentStudent.Overall_Score ?? 75,
      Sleep_Hours: currentStudent.Sleep_Hours ?? 7.0,
      Motivation_Level: currentStudent.Motivation_Level || 'Medium',
      Parental_Support: currentStudent.Parental_Support || 'Medium',
      Tutoring: tutoringEnabled ? 'Yes' : (currentStudent.Tutoring || 'No'),
      Internet_Access: currentStudent.Internet_Access || 'Yes',
      Stress_Level: currentStudent.Stress_Level || 'Medium',
    };

    const simPred = calculateAcademicPrediction(simFeatures);

    // Performance level based on projected score
    let performanceLevel = 'Average';
    if (projectedScore >= 88) performanceLevel = 'Excellent';
    else if (projectedScore >= 75) performanceLevel = 'Good';
    else if (projectedScore >= 60) performanceLevel = 'Average';
    else if (projectedScore >= 45) performanceLevel = 'Below Average';
    else performanceLevel = 'Critical';

    return {
      baselineScore,
      projectedScore,
      scoreDifference,
      attendanceGain: Math.round(attendanceGain * 10) / 10,
      studyGain: Math.round(studyGain * 10) / 10,
      tutoringGain: Math.round(tutoringGain * 10) / 10,
      performanceLevel,
      riskLevel: simPred.riskLevel,
      recommendedAction: simPred.recommendedAction,
      isSimulated: attendanceOffset > 0 || studyHoursOffset > 0 || tutoringEnabled,
    };
  }, [
    currentStudent,
    hasValidBaselineData,
    baseAttendance,
    baseStudyHours,
    baselineScore,
    adjustedAttendance,
    adjustedStudyHours,
    attendanceOffset,
    studyHoursOffset,
    tutoringEnabled,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Predictive early warning analysis and intervention simulation exclusively for students assigned to Staff #{staffId}.
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

      {!loading && !error && students.length > 0 && currentStudent && (
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
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-violet-600 bg-white cursor-pointer"
              >
                {students.map((s) => (
                  <option key={s.Student_ID} value={String(s.Student_ID)}>
                    {s.Name} (#{s.Student_ID}) — {s.Risk_Level || 'Unassessed'} Risk
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-violet-600" />
                  <span>Intervention Simulation</span>
                </h4>
                {(attendanceOffset > 0 || studyHoursOffset > 0 || tutoringEnabled) && (
                  <button
                    onClick={() => {
                      setAttendanceOffset(0);
                      setStudyHoursOffset(0);
                      setTutoringEnabled(false);
                    }}
                    className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Baseline</span>
                  </button>
                )}
              </div>

              {/* Attendance improvement slider (0 to +20) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Improve Attendance</span>
                  <span className="font-mono font-semibold text-violet-600">
                    {attendanceOffset === 0 ? '0 percentage points' : `+${attendanceOffset} percentage points`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={attendanceOffset}
                  onChange={(e) => setAttendanceOffset(Math.max(0, Number(e.target.value)))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                {hasValidAttendance && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                    <span>Baseline ({baseAttendance}%)</span>
                    <span className="font-semibold text-slate-600">Simulated: {adjustedAttendance}%</span>
                    <span>+20 pts</span>
                  </div>
                )}
              </div>

              {/* Daily study hours slider (0 to +4) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Increase Daily Study Hours</span>
                  <span className="font-mono font-semibold text-violet-600">
                    {studyHoursOffset === 0 ? '0h' : `+${studyHoursOffset}h`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={studyHoursOffset}
                  onChange={(e) => setStudyHoursOffset(Math.max(0, Number(e.target.value)))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                {hasValidStudyHours && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                    <span>Baseline ({baseStudyHours}h)</span>
                    <span className="font-semibold text-slate-600">Simulated: {adjustedStudyHours} hrs/day</span>
                    <span>+4 hrs</span>
                  </div>
                )}
              </div>

              {/* Academic Tutoring Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-xs font-medium text-slate-700">Add Academic Tutoring</span>
                <input
                  type="checkbox"
                  checked={tutoringEnabled}
                  onChange={(e) => setTutoringEnabled(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded cursor-pointer"
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
              {simulationModel ? (
                <RiskBadge level={simulationModel.riskLevel} />
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Baseline data unavailable
                </span>
              )}
            </div>

            {!hasValidBaselineData ? (
              <div className="p-6 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Baseline Data Unavailable</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Required baseline academic data (attendance, study hours, or assessment scores) is unavailable for {currentStudent.Name}. A reliable simulation projection cannot be calculated until baseline student records are completed.
                </p>
              </div>
            ) : simulationModel ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Current Score</span>
                    <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                      {simulationModel.baselineScore}%
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
                    <span className="text-[11px] font-medium text-violet-700 font-semibold uppercase tracking-wider block">Projected Score (Simulation)</span>
                    <p className="text-xl font-bold text-violet-700 font-mono mt-0.5">
                      {simulationModel.projectedScore}%
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[11px] font-medium text-emerald-700 font-semibold uppercase tracking-wider block">Difference</span>
                    <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                      +{simulationModel.scoreDifference} points
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Performance Level</span>
                    <p className="text-xs font-bold text-slate-800 mt-2">{simulationModel.performanceLevel}</p>
                  </div>
                </div>

                {/* Baseline vs Simulated comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Attendance (Baseline → Simulated):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {baseAttendance}% → <span className="text-violet-700 font-bold">{adjustedAttendance}%</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Study Hours (Baseline → Simulated):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {baseStudyHours}h → <span className="text-violet-700 font-bold">{adjustedStudyHours}h</span>
                    </span>
                  </div>
                </div>

                {/* Simulation Contributions Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <span>Simulation Contributions Breakdown:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className={`px-2.5 py-1 rounded-xl border font-medium ${attendanceOffset > 0 ? 'bg-violet-100 text-violet-800 border-violet-200 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>
                      Attendance Improvement: {attendanceOffset === 0 ? '+0.0 pts' : `+${simulationModel.attendanceGain} pts`}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl border font-medium ${studyHoursOffset > 0 ? 'bg-violet-100 text-violet-800 border-violet-200 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>
                      Study Increase: {studyHoursOffset === 0 ? '+0.0 pts' : `+${simulationModel.studyGain} pts`}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl border font-medium ${tutoringEnabled ? 'bg-violet-100 text-violet-800 border-violet-200 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>
                      Academic Tutoring: {tutoringEnabled ? `+${simulationModel.tutoringGain} pts` : '+0.0 pts'}
                    </span>
                  </div>
                </div>

                {/* Weak subject display */}
                {currentStudent.Weak_Subject && currentStudent.Weak_Subject !== 'Not assessed' && (
                  <div className="p-3 rounded-2xl bg-violet-50/70 border border-violet-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-violet-600" />
                      <span className="text-slate-700 font-medium">Weak Subject Focus:</span>
                      <span className="font-bold text-violet-900">{currentStudent.Weak_Subject}</span>
                    </div>
                    {currentStudent.Weak_Subject_Label && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                        {currentStudent.Weak_Subject_Label}
                      </span>
                    )}
                  </div>
                )}

                {/* Recommended Educator Action */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Recommended Educator Action:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{simulationModel.recommendedAction}</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
