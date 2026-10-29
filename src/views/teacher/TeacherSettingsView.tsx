import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { StudentData } from '../../types';
import { fetchTeacherAssignedCohort } from '../../services/vidyaDatabaseService';
import {
  Settings,
  User,
  BrainCircuit,
  Sliders,
  ShieldCheck,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  Lock,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Info,
  Users,
  Lightbulb,
} from 'lucide-react';

interface TeacherSettingsViewProps {
  onNavigate?: (tab: string) => void;
}

export const TeacherSettingsView: React.FC<TeacherSettingsViewProps> = ({ onNavigate }) => {
  const { user, isSupabaseConnected } = useAuth();
  const staffId = user?.staffId;
  const [activeTab, setActiveTab] = useState<'preferences' | 'predictions'>('preferences');

  // Preferences State
  const [notifyAtRiskAlerts, setNotifyAtRiskAlerts] = useState<boolean>(true);
  const [notifyWeeklyRosterSummary, setNotifyWeeklyRosterSummary] = useState<boolean>(true);
  const [gradeDisplayFormat, setGradeDisplayFormat] = useState<'percentage' | 'letter'>('percentage');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Cohort Prediction Data
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loadingCohort, setLoadingCohort] = useState<boolean>(false);
  const [cohortError, setCohortError] = useState<string | null>(null);

  // Selected student for simulation
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studyHoursOffset, setStudyHoursOffset] = useState<number>(0);
  const [attendanceOffset, setAttendanceOffset] = useState<number>(0);
  const [tutoringEnabled, setTutoringEnabled] = useState<boolean>(false);

  const loadData = async () => {
    if (!staffId) return;
    setLoadingCohort(true);
    setCohortError(null);
    try {
      const res = await fetchTeacherAssignedCohort();
      if (res.error) {
        setCohortError(res.error);
        setStudents([]);
      } else {
        setStudents(res.students || []);
        if (res.students && res.students.length > 0) {
          setSelectedStudentId(String(res.students[0].Student_ID));
        }
      }
    } catch (err: any) {
      setCohortError(err?.message || 'Error loading cohort predictions.');
    } finally {
      setLoadingCohort(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadData();
    }
  }, [staffId]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => String(s.Student_ID) === selectedStudentId);
  }, [students, selectedStudentId]);

  const simulatedPrediction = useMemo(() => {
    if (!selectedStudent) return null;

    const baseAttendance = selectedStudent.Attendance_Percent || 80;
    const baseStudy = selectedStudent.Study_Hours_Per_Day || 3.0;

    return calculateAcademicPrediction({
      Attendance_Percent: Math.min(100, Math.max(30, baseAttendance + attendanceOffset)),
      Study_Hours_Per_Day: Math.min(10, Math.max(0.5, baseStudy + studyHoursOffset)),
      Assignment_Score: selectedStudent.Assignment_Score || 70,
      Quiz_Score: selectedStudent.Quiz_Score || 70,
      Previous_Score: selectedStudent.Previous_Score || 70,
      Sleep_Hours: selectedStudent.Sleep_Hours || 7.0,
      Motivation_Level: selectedStudent.Motivation_Level || 'Medium',
      Parental_Support: selectedStudent.Parental_Support || 'Medium',
      Tutoring: tutoringEnabled ? 'Yes' : selectedStudent.Tutoring || 'No',
      Internet_Access: selectedStudent.Internet_Access || 'Yes',
      Stress_Level: selectedStudent.Stress_Level || 'Medium',
      Weak_Subject: selectedStudent.Weak_Subject && selectedStudent.Weak_Subject !== 'None' ? selectedStudent.Weak_Subject : 'Not assessed',
    });
  }, [selectedStudent, attendanceOffset, studyHoursOffset, tutoringEnabled]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!staffId) {
    return <UnlinkedTeacherCard title="Educator Settings & Cohort Predictions" />;
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Return to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Educator Settings & Predictions</h1>
          </div>
          <p className="text-xs text-slate-500">
            Teaching preferences, notification settings, and authorized cohort prediction tools
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-violet-600" />
            <span>Preferences & Authorization</span>
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'predictions'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cohort Predictions</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Teaching preferences updated successfully.</span>
        </div>
      )}

      {activeTab === 'preferences' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Teaching Preferences Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-600" />
                  <span>Instructional Preferences</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure alerts and grading metrics for your assigned student sections.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Assessment Grade Presentation Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGradeDisplayFormat('percentage')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gradeDisplayFormat === 'percentage'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block text-xs">Continuous Percentage (0 - 100%)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Precise numeric examination and quiz scores</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeDisplayFormat('letter')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      gradeDisplayFormat === 'letter'
                        ? 'border-violet-600 bg-violet-50/60 text-violet-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block text-xs">Letter Bands (A, B, C, D, F)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Standard collegiate letter grade bands</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Cohort Intervention Alerts</span>
                </h4>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900 block">High-Risk Early Warning Flag</span>
                    <span className="text-[11px] text-slate-500">Alert when an assigned student drops into High academic risk</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAtRiskAlerts}
                    onChange={(e) => setNotifyAtRiskAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 accent-violet-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900 block">Weekly Attendance Digest</span>
                    <span className="text-[11px] text-slate-500">Summary of students with attendance falling below 75% threshold</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyWeeklyRosterSummary}
                    onChange={(e) => setNotifyWeeklyRosterSummary(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 accent-violet-600 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save Instructional Preferences
                </button>
              </div>
            </form>
          </div>

          {/* Authorization & Security Boundaries Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-violet-600">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Educator Authorization</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your educator workspace is verified under faculty identifier <span className="font-mono font-semibold text-slate-900">Staff #{staffId}</span>.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block">Assigned Cohort Access</span>
                  <span className="text-[11px] text-emerald-700">You are authorized to view marks, attendance, and predictions for students in your sections.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">System Health Diagnostics Restricted</span>
                  <span className="text-[11px] text-slate-500">Database schema configuration, technical table testing, and credential management are restricted to administrators.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Account Status:</span>
              <span className="font-semibold text-slate-800 font-mono">Verified Faculty #{staffId}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Dedicated Cohort ML Predictions Section */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-violet-300 mb-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Authorized Cohort Risk Modeling</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Student Intervention Simulator — Staff #{staffId}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Simulate pedagogical interventions for your assigned students and evaluate projected academic improvements before implementing study plans.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[120px]">
                  <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-semibold">
                    Assigned Cohort
                  </span>
                  <span className="text-2xl font-bold font-mono text-white mt-0.5 block">
                    {students.length} Students
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loadingCohort ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80">
              Loading assigned student cohort...
            </div>
          ) : cohortError ? (
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <span className="font-bold block">Error</span>
              <p className="mt-1">{cohortError}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200/80">
              No students are currently assigned to your faculty roster. Contact an administrator to link students.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-violet-600" />
                      <span>Intervention Controls</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust parameters to simulate targeted pedagogical outcomes.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setStudyHoursOffset(0);
                      setAttendanceOffset(0);
                      setTutoringEnabled(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Student Selector */}
                <div className="text-xs">
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Select Target Student in Cohort
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {students.map((s) => (
                      <option key={s.Student_ID} value={s.Student_ID}>
                        {s.Name} (ID: #{s.Student_ID}) — Baseline: {s.Overall_Score}% ({s.Risk_Level} Risk)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Baseline Score</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{selectedStudent.Overall_Score}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Weak Subject</span>
                      <span className={`text-sm ${selectedStudent.Weak_Subject && selectedStudent.Weak_Subject !== 'Not assessed' && selectedStudent.Weak_Subject !== 'None' ? 'font-semibold text-rose-700' : 'text-slate-400 italic'}`}>
                        {selectedStudent.Weak_Subject && selectedStudent.Weak_Subject !== 'None' ? selectedStudent.Weak_Subject : 'Not assessed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Risk</span>
                      <div className="mt-0.5">
                        <RiskBadge level={selectedStudent.Risk_Level} size="sm" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Intervention Offsets */}
                <div className="space-y-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between font-semibold text-slate-800 mb-1">
                      <span>Additional Daily Study Intervention</span>
                      <span className="font-mono text-violet-600 font-bold">
                        {studyHoursOffset > 0 ? `+${studyHoursOffset}` : studyHoursOffset} hrs/day
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-2}
                      max={4}
                      step={0.5}
                      value={studyHoursOffset}
                      onChange={(e) => setStudyHoursOffset(Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-800 mb-1">
                      <span>Attendance Recovery Target</span>
                      <span className="font-mono text-blue-600 font-bold">
                        {attendanceOffset > 0 ? `+${attendanceOffset}` : attendanceOffset}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-15}
                      max={25}
                      step={5}
                      value={attendanceOffset}
                      onChange={(e) => setAttendanceOffset(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60 cursor-pointer hover:bg-slate-100/60">
                    <div>
                      <span className="font-semibold text-slate-900 block">Assign Structured Peer Tutoring</span>
                      <span className="text-[11px] text-slate-500">Weekly remedial sessions with high-performing classmate</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tutoringEnabled}
                      onChange={(e) => setTutoringEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 accent-violet-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Simulation Result Column */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
                {simulatedPrediction && selectedStudent ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Intervention Projection
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold">
                          What-If Simulation
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center my-3">
                        <span className="text-xs text-slate-500 font-medium">Projected Overall Score</span>
                        <div className="text-4xl font-extrabold font-mono text-slate-900 mt-1">
                          {simulatedPrediction.predictedOverallScore}%
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <RiskBadge level={simulatedPrediction.riskLevel} size="md" />
                          {simulatedPrediction.predictedOverallScore > selectedStudent.Overall_Score ? (
                            <span className="text-xs font-bold text-emerald-600 font-mono">
                              +{simulatedPrediction.predictedOverallScore - selectedStudent.Overall_Score}% gain
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-indigo-950 block">Recommended Action</span>
                            <span className="text-indigo-800 text-[11px] leading-relaxed">
                              {simulatedPrediction.recommendedAction}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span>Predicted Exam Score:</span>
                            <span className="font-mono font-bold text-slate-900">{simulatedPrediction.predictedExamScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance Tier:</span>
                            <span className="font-semibold text-slate-900">{simulatedPrediction.performanceLevel}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>Notice:</strong> This projection is generated for pedagogical guidance and does not alter the student's official database record.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Select a student to run the simulation.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
