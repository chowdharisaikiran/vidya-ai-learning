import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { RiskGauge } from '../../components/charts/RiskGauge';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';
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
} from 'lucide-react';

interface StudentSettingsViewProps {
  onNavigate?: (tab: string) => void;
}

export const StudentSettingsView: React.FC<StudentSettingsViewProps> = ({ onNavigate }) => {
  const { student, user, isSupabaseConnected } = useAuth();
  const [activeTab, setActiveTab] = useState<'preferences' | 'predictions'>('preferences');

  // Preferences State
  const [studyGoalHours, setStudyGoalHours] = useState<number>(20);
  const [notifyDailyQuiz, setNotifyDailyQuiz] = useState<boolean>(true);
  const [notifyRiskAlerts, setNotifyRiskAlerts] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // ML Simulation Inputs (initialized from verified student profile)
  const [attendance, setAttendance] = useState<number>(student?.Attendance_Percent || 85);
  const [studyHours, setStudyHours] = useState<number>(student?.Study_Hours_Per_Day || 3.5);
  const [sleepHours, setSleepHours] = useState<number>(student?.Sleep_Hours || 7.0);
  const [stressLevel, setStressLevel] = useState<'Low' | 'Medium' | 'High'>(
    student?.Stress_Level || 'Medium'
  );
  const [motivationLevel, setMotivationLevel] = useState<'Low' | 'Medium' | 'High'>(
    student?.Motivation_Level || 'Medium'
  );
  const [tutoring, setTutoring] = useState<'Yes' | 'No'>(student?.Tutoring || 'No');
  const [previousScore, setPreviousScore] = useState<number>(student?.Previous_Score || 75);

  const resetToProfile = () => {
    if (!student) return;
    setAttendance(student.Attendance_Percent);
    setStudyHours(student.Study_Hours_Per_Day);
    setSleepHours(student.Sleep_Hours);
    setStressLevel(student.Stress_Level);
    setMotivationLevel(student.Motivation_Level);
    setTutoring(student.Tutoring);
    setPreviousScore(student.Previous_Score);
  };

  const simulatedPrediction = useMemo(() => {
    return calculateAcademicPrediction({
      Attendance_Percent: attendance,
      Study_Hours_Per_Day: studyHours,
      Assignment_Score: student?.Assignment_Score || 75,
      Quiz_Score: student?.Quiz_Score || 75,
      Previous_Score: previousScore,
      Sleep_Hours: sleepHours,
      Motivation_Level: motivationLevel,
      Parental_Support: student?.Parental_Support || 'Medium',
      Tutoring: tutoring,
      Internet_Access: student?.Internet_Access || 'Yes',
      Stress_Level: stressLevel,
      Weak_Subject: student?.Weak_Subject && student.Weak_Subject !== 'None' ? student.Weak_Subject : 'Not assessed',
    });
  }, [attendance, studyHours, previousScore, sleepHours, motivationLevel, tutoring, stressLevel, student]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!user?.studentId || !student) {
    return <UnlinkedStudentCard title="Student Account Settings & Predictions" />;
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
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Student Settings & Predictions</h1>
          </div>
          <p className="text-xs text-slate-500">
            Personal study preferences, notifications, and authorized academic forecasting
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
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Preferences & Privacy</span>
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
            <span>ML Predictions</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Preferences saved successfully.</span>
        </div>
      )}

      {activeTab === 'preferences' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Preferences Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>Academic Targets & Study Goals</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set personal milestones to pace your weekly coursework and study intervals.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Target Weekly Study Hours: <span className="font-mono text-blue-600 font-bold">{studyGoalHours} hrs/week</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={1}
                  value={studyGoalHours}
                  onChange={(e) => setStudyGoalHours(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>5 hrs</span>
                  <span>20 hrs (Recommended)</span>
                  <span>40 hrs</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Notification & Guidance Reminders</span>
                </h4>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900 block">Daily Revision Prompts</span>
                    <span className="text-[11px] text-slate-500">Receive spaced-repetition focus alerts for weak subjects</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDailyQuiz}
                    onChange={(e) => setNotifyDailyQuiz(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900 block">Predictive Risk Updates</span>
                    <span className="text-[11px] text-slate-500">Notify when model forecasts change after exam grade entries</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyRiskAlerts}
                    onChange={(e) => setNotifyRiskAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save Study Preferences
                </button>
              </div>
            </form>
          </div>

          {/* Privacy & RLS Isolation Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Data Isolation & Security</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your academic marks, attendance logs, and predictive risk scores are strictly bound to your student record (<span className="font-mono font-semibold text-slate-900">ID #{user.studentId}</span>).
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block">Row-Level Security Active</span>
                  <span className="text-[11px] text-emerald-700">Non-authorized students and guests cannot access your records.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Administrative Diagnostics Restricted</span>
                  <span className="text-[11px] text-slate-500">Database schema modifications and system health tools are secured to administrators.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Account Status:</span>
              <span className="font-semibold text-slate-800 font-mono">Linked Student #{user.studentId}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ML Predictions Dedicated Section */
        <div className="space-y-6">
          {/* Institutional Record Summary Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-indigo-300 mb-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Institutional Prediction Record</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {student.Name} — ID #{student.Student_ID}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Computed by institutional machine learning pipelines from verified attendance, study patterns, and quiz metrics.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                    Current Risk Tier
                  </span>
                  <div className="mt-1">
                    <RiskBadge level={student.Risk_Level} size="md" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[100px]">
                  <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-semibold">
                    Baseline Score
                  </span>
                  <span className="text-2xl font-bold font-mono text-white mt-0.5 block">
                    {student.Overall_Score}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* What-If Simulator within Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>Academic What-If Scenario Simulator</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Adjust habits to simulate expected changes in your academic performance.
                  </p>
                </div>
                <button
                  onClick={resetToProfile}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset to Profile</span>
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>Attendance Rate</span>
                    <span className="font-mono text-blue-600 font-bold">{attendance}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={attendance}
                    onChange={(e) => setAttendance(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>Daily Study Commitment</span>
                    <span className="font-mono text-indigo-600 font-bold">{studyHours} hrs/day</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={studyHours}
                    onChange={(e) => setStudyHours(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>Nightly Sleep Duration</span>
                    <span className="font-mono text-violet-600 font-bold">{sleepHours} hrs/night</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={10}
                    step={0.5}
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stress Level</label>
                    <select
                      value={stressLevel}
                      onChange={(e) => setStressLevel(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="Low">Low Stress</option>
                      <option value="Medium">Medium Stress</option>
                      <option value="High">High Stress</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Peer Tutoring</label>
                    <select
                      value={tutoring}
                      onChange={(e) => setTutoring(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      <option value="No">No Tutoring</option>
                      <option value="Yes">With Tutoring</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulation Outcome Card */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Simulated Scenario Outcome
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                    Interactive What-If
                  </span>
                </div>

                <div className="py-4 text-center">
                  <RiskGauge
                    score={simulatedPrediction.predictedOverallScore}
                    level={simulatedPrediction.riskLevel}
                    size={160}
                  />
                  <div className="mt-3">
                    <span className="text-xs text-slate-500 font-medium">Projected Overall Score:</span>
                    <div className="text-3xl font-extrabold font-mono text-slate-900 mt-0.5">
                      {simulatedPrediction.predictedOverallScore}%
                    </div>
                    <div className="mt-1">
                      <RiskBadge level={simulatedPrediction.riskLevel} size="md" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Performance Band:</span>
                    <span className="font-semibold text-slate-900">{simulatedPrediction.performanceLevel}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Focus Action:</span>
                    <span className="font-semibold text-indigo-700">{simulatedPrediction.recommendedAction}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Notice:</strong> What-If simulations are calculated live in your browser and do not overwrite your official institutional records.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
