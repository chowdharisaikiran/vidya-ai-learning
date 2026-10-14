import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { RiskGauge } from '../../components/charts/RiskGauge';
import { FeatureImportanceChart } from '../../components/charts/FeatureImportanceChart';
import {
  BrainCircuit,
  Sliders,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Zap,
  Info,
} from 'lucide-react';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';

export const StudentPredictionView: React.FC = () => {
  const { student, user } = useAuth();

  if (!user?.studentId || !student) {
    return <UnlinkedStudentCard title="Academic Risk & Performance Predictor" />;
  }

  // Interactive What-If simulation inputs initialized to active student's metrics
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
  const [internet, setInternet] = useState<'Yes' | 'No'>(student?.Internet_Access || 'Yes');
  const [previousScore, setPreviousScore] = useState<number>(student?.Previous_Score || 75);

  const resetToProfile = () => {
    if (!student) return;
    setAttendance(student.Attendance_Percent);
    setStudyHours(student.Study_Hours_Per_Day);
    setSleepHours(student.Sleep_Hours);
    setStressLevel(student.Stress_Level);
    setMotivationLevel(student.Motivation_Level);
    setTutoring(student.Tutoring);
    setInternet(student.Internet_Access);
    setPreviousScore(student.Previous_Score);
  };

  // Run ML model in real-time on slider changes
  const mlOutput = useMemo(() => {
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
      Internet_Access: internet,
      Stress_Level: stressLevel,
      Weak_Subject: student?.Weak_Subject || 'Mathematics',
    });
  }, [
    attendance,
    studyHours,
    sleepHours,
    stressLevel,
    motivationLevel,
    tutoring,
    internet,
    previousScore,
    student,
  ]);

  const scoreDelta = student ? mlOutput.predictedOverallScore - student.Overall_Score : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <BrainCircuit className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Academic Risk & Performance Predictor
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Interactive ML What-If simulation engine. Tweak behavioral parameters to forecast exam score & risk.
          </p>
        </div>

        <button
          onClick={resetToProfile}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Current Profile</span>
        </button>
      </div>

      {/* Main Layout: Simulator Controls (Left) vs Real-Time Predictions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Sliders */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span>Simulated Behavioral & Academic Variables</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Live ML Calculation</span>
          </div>

          {/* Attendance Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-700">Attendance Rate</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                {attendance}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="1"
              value={attendance}
              onChange={(e) => setAttendance(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>40% (Chronic Absenteeism)</span>
              <span>75% (Minimum Standard)</span>
              <span>100% (Perfect)</span>
            </div>
          </div>

          {/* Daily Study Hours Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-700">Daily Independent Study Hours</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                {studyHours} hrs/day
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={studyHours}
              onChange={(e) => setStudyHours(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1.0 hr (Low)</span>
              <span>3.5 hrs (Target)</span>
              <span>8.0 hrs (Max)</span>
            </div>
          </div>

          {/* Sleep Hours Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-700">Nightly Sleep Duration</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                {sleepHours} hrs/night
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="10"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>4.0 hrs (Severe Fatigue)</span>
              <span>7.5 - 8 hrs (Optimal Recall)</span>
              <span>10.0 hrs</span>
            </div>
          </div>

          {/* Previous Score Baseline Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-700">Historical Knowledge Baseline</span>
              <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                {previousScore}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="1"
              value={previousScore}
              onChange={(e) => setPreviousScore(Number(e.target.value))}
              className="w-full accent-slate-700 cursor-pointer"
            />
          </div>

          {/* Stress & Motivation Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Academic Stress Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setStressLevel(lvl)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      stressLevel === lvl
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Motivation Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setMotivationLevel(lvl)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      motivationLevel === lvl
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tutoring & Internet Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tutoring Mentorship</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Yes', 'No'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTutoring(opt)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      tutoring === opt
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'Yes' ? 'Active Tutoring' : 'Self-Study'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">High-Speed Internet Access</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Yes', 'No'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setInternet(opt)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      internet === opt
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'Yes' ? 'Available' : 'Restricted'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Model Forecast & Explainability */}
        <div className="lg:col-span-5 space-y-6">
          {/* Prediction Output Hero Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs text-center space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-semibold text-slate-800">Predictive Model Output</span>
              <span className="font-mono text-xs font-medium text-blue-600">Confidence: {mlOutput.confidenceScore}%</span>
            </div>

            <div className="py-2">
              <RiskGauge score={mlOutput.riskProbability} level={mlOutput.riskLevel} size={160} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Forecasted Exam</span>
                <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-0.5 block">
                  {mlOutput.predictedExamScore}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Summative Test</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-200/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 block">Composite Overall</span>
                <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-0.5 block">
                  {mlOutput.predictedOverallScore}%
                </span>
                <span
                  className={`text-[10px] font-semibold block mt-0.5 ${
                    scoreDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {scoreDelta >= 0 ? `+${scoreDelta}% vs Current` : `${scoreDelta}% vs Current`}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-left text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Recommended Action</p>
              <p className="text-slate-700 leading-relaxed font-normal">{mlOutput.recommendedAction}</p>
            </div>
          </div>

          {/* Feature Importance / SHAP-style breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Feature Attribution (SHAP)</h4>
              <span className="text-[10px] text-slate-400 font-mono">Relative Weight</span>
            </div>
            <FeatureImportanceChart contributions={mlOutput.featureContributions} />
          </div>
        </div>
      </div>
    </div>
  );
};
