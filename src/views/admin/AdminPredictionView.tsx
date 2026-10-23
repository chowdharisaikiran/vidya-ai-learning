import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllPredictionRecordsWithStatus,
  DatabasePredictionRow,
} from '../../services/vidyaDatabaseService';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { RiskLevel } from '../../types';
import {
  Binary,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  FileText,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const AdminPredictionView: React.FC = () => {
  const { allStudents } = useAuth();
  const [predictions, setPredictions] = useState<DatabasePredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering for prediction explorer
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAllPredictionRecordsWithStatus();
      if (res.error) {
        setError(res.error);
        setPredictions([]);
      } else {
        setPredictions(res.predictions || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch predictions from public.predictions.');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  // Compute live risk distribution dynamically from Supabase records
  const riskAnalysis = useMemo(() => {
    let high = 0;
    let moderate = 0;
    let low = 0;
    let unrecognized = 0;
    let scoreSum = 0;
    let validScores = 0;
    let minScore = Infinity;
    let maxScore = -Infinity;

    const studentIdSet = new Set<string>();
    const modelsSet = new Set<string>();
    const datesSet = new Set<string>();

    predictions.forEach((p) => {
      if (p.student_id !== null && p.student_id !== undefined) {
        studentIdSet.add(String(p.student_id).trim());
      }

      if (p.prediction_model && p.prediction_model.trim()) {
        modelsSet.add(p.prediction_model.trim());
      }

      if (p.prediction_date && p.prediction_date.trim()) {
        datesSet.add(p.prediction_date.trim());
      }

      if (typeof p.predicted_final_score === 'number' && !isNaN(p.predicted_final_score)) {
        scoreSum += p.predicted_final_score;
        validScores++;
        if (p.predicted_final_score < minScore) minScore = p.predicted_final_score;
        if (p.predicted_final_score > maxScore) maxScore = p.predicted_final_score;
      }

      const raw = (p.academic_risk || '').toString().trim().toLowerCase();
      if (raw === 'high' || raw.includes('high')) {
        high++;
      } else if (raw === 'medium' || raw === 'moderate' || raw.includes('mod')) {
        moderate++;
      } else if (raw === 'low' || raw.includes('low')) {
        low++;
      } else {
        unrecognized++;
      }
    });

    const total = predictions.length;
    const sortedDates = Array.from(datesSet).sort();

    return {
      total,
      uniqueStudentsCount: studentIdSet.size,
      high,
      moderate,
      low,
      unrecognized,
      highPct: total > 0 ? Math.round((high / total) * 1000) / 10 : 0,
      moderatePct: total > 0 ? Math.round((moderate / total) * 1000) / 10 : 0,
      lowPct: total > 0 ? Math.round((low / total) * 1000) / 10 : 0,
      unrecognizedPct: total > 0 ? Math.round((unrecognized / total) * 1000) / 10 : 0,
      meanScore: validScores > 0 ? Math.round((scoreSum / validScores) * 10) / 10 : null,
      minScore: minScore !== Infinity ? minScore : null,
      maxScore: maxScore !== -Infinity ? maxScore : null,
      modelsList: Array.from(modelsSet),
      earliestDate: sortedDates[0] || null,
      latestDate: sortedDates[sortedDates.length - 1] || null,
    };
  }, [predictions]);

  // Filtered prediction records for table explorer
  const filteredPredictions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return predictions.filter((p) => {
      const sid = String(p.student_id ?? '').toLowerCase();
      const pid = String(p.prediction_id ?? '').toLowerCase();
      const model = String(p.prediction_model ?? '').toLowerCase();
      const rawRisk = (p.academic_risk || '').toString().trim().toLowerCase();

      const matchesSearch = !q || sid.includes(q) || pid.includes(q) || model.includes(q);

      let normalizedRiskCategory = 'unrecognized';
      if (rawRisk === 'high' || rawRisk.includes('high')) normalizedRiskCategory = 'high';
      else if (rawRisk === 'medium' || rawRisk === 'moderate' || rawRisk.includes('mod')) normalizedRiskCategory = 'moderate';
      else if (rawRisk === 'low' || rawRisk.includes('low')) normalizedRiskCategory = 'low';

      const matchesRisk = selectedRisk === 'all' || normalizedRiskCategory === selectedRisk;
      const matchesModel = selectedModel === 'all' || String(p.prediction_model || '').trim() === selectedModel;

      return matchesSearch && matchesRisk && matchesModel;
    });
  }, [predictions, search, selectedRisk, selectedModel]);

  const datasetFields = [
    { name: 'Student_ID', type: 'String (Identifier)', desc: 'Unique institutional student matriculation key' },
    { name: 'Age', type: 'Integer (14 - 22)', desc: 'Biological age of student' },
    { name: 'Gender', type: 'Categorical', desc: 'Male, Female, Non-Binary' },
    { name: 'Education_Level', type: 'Categorical', desc: 'High School, Undergraduate, Postgraduate' },
    { name: 'Attendance_Percent', type: 'Float (0 - 100%)', desc: 'Empirical classroom attendance percentage' },
    { name: 'Study_Hours_Per_Day', type: 'Float (0 - 12)', desc: 'Self-reported daily independent review duration' },
    { name: 'Assignment_Score', type: 'Float (0 - 100)', desc: 'Formative homework rubric score average' },
    { name: 'Quiz_Score', type: 'Float (0 - 100)', desc: 'Periodic active-recall weekly quiz percentage' },
    { name: 'Previous_Score', type: 'Float (0 - 100)', desc: 'Prior term baseline academic composite standing' },
    { name: 'Sleep_Hours', type: 'Float (4 - 10)', desc: 'Average nightly rest duration' },
    { name: 'Motivation_Level', type: 'Ordinal', desc: 'Low, Medium, High intrinsic drive' },
    { name: 'Learning_Style', type: 'Categorical', desc: 'Visual, Auditory, Kinesthetic, Reading/Writing' },
    { name: 'Internet_Access', type: 'Binary', desc: 'Yes or No broadband connectivity at home' },
    { name: 'Parental_Support', type: 'Ordinal', desc: 'Low, Medium, High domestic engagement' },
    { name: 'Tutoring', type: 'Binary', desc: 'Yes or No active mentor/coaching enrollment' },
    { name: 'Extracurricular_Activity', type: 'Binary', desc: 'Yes or No participation in sports/clubs' },
    { name: 'Stress_Level', type: 'Ordinal', desc: 'Low, Medium, High examination anxiety' },
    { name: 'Weak_Subject', type: 'Categorical', desc: 'Mathematics, Physics, Chemistry, CS, English' },
    { name: 'Exam_Score', type: 'Float (0 - 100)', desc: 'Summative comprehensive term test outcome' },
    { name: 'Overall_Score', type: 'Float (0 - 100)', desc: 'Weighted composite final academic score' },
    { name: 'Performance_Level', type: 'Categorical', desc: 'Excellent, Good, Average, Below Average, Critical' },
    { name: 'Risk_Level', type: 'Categorical', desc: 'Low, Moderate, High early-warning classification' },
    { name: 'Recommended_Action', type: 'Text / Directive', desc: 'Personalized pedagogical intervention directive' },
  ];

  const pipelineFeatureWeights = [
    { feature: 'Attendance Rate', weight: '28%', description: 'Heuristic pipeline weight for attendance percentage' },
    { feature: 'Daily Self-Study Hours', weight: '22%', description: 'Heuristic pipeline weight for self-study hours' },
    { feature: 'Prior Academic Trajectory', weight: '18%', description: 'Baseline weight for previous score and historical GPA' },
    { feature: 'Psychosocial Indicators', weight: '16%', description: 'Combined weighting of sleep hours and examination stress' },
    { feature: 'Support Structure', weight: '16%', description: 'Weighting for parental engagement and tutoring enrollment' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Binary className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Data Science & AI/ML Prediction Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Real-time inspection of stored prediction records in <code className="font-mono text-slate-700">public.predictions</code>, risk distributions, and model evaluation governance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Model Evaluation: Pending Ground-Truth Validation</span>
          </div>

          <button
            onClick={loadPredictions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh prediction records from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Three-Tier Architectural Distinction Callout */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold tracking-tight">
            VIDYA Data Science Architecture: System Operational Distinctions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-300">1. Stored Records (Database)</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10px]">
                public.predictions
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Pre-computed demo batch records stored in Supabase. These represent synthetic pipeline outputs generated during dataset ingestion.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300">2. Real-Time Inference</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
                Client ML Engine
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Active deterministic heuristic pipeline in <code className="font-mono text-white">mlModel.ts</code> executed dynamically during interactive student &ldquo;What-If&rdquo; simulations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">3. Model Evaluation</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px]">
                Pending Ground Truth
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Formal statistical metrics (Accuracy, Precision, Recall, F1, Confusion Matrix). Requires verified post-examination ground-truth labels to calculate honestly.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Model Evaluation Pending State (Replaces fabricated 94.2% accuracy / F1 / Confusion Matrix) */}
      <div className="bg-white rounded-3xl border border-amber-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 shrink-0 mt-0.5 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Model Performance Evaluation Notice: Ground-Truth Verification Pending
              </h3>
              <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
                No Ground-Truth Marks in Dataset
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard evaluation scores (such as <strong>Accuracy</strong>, <strong>Precision</strong>, <strong>Recall</strong>, <strong>F1-Score</strong>, and <strong>Confusion Matrix counts</strong>) cannot be reported because the current Supabase dataset lacks an independent labeled test partition with verified post-intervention academic examination outcomes.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Cross-examination of database records shows that <strong>86 students</strong> labeled as &ldquo;High Risk&rdquo; in <code className="font-mono text-slate-800">public.predictions</code> achieved overall marks $\ge 70 / 100$ in <code className="font-mono text-slate-800">public.academic_performance</code>. Claiming high accuracy or low false-positive rates prior to empirical retraining against validated end-of-term grades would be scientifically inaccurate.
            </p>
          </div>
        </div>

        {/* Evaluation Governance Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Empirical Accuracy</span>
            <p className="text-base font-bold text-slate-700 font-mono mt-0.5">Pending</p>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">Requires test split</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">F1 / Harmonic Mean</span>
            <p className="text-base font-bold text-slate-700 font-mono mt-0.5">Pending</p>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">Requires ground-truth labels</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Confusion Matrix</span>
            <p className="text-base font-bold text-slate-700 font-mono mt-0.5">Unverified</p>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">TP/FP/TN/FN unestablished</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Quality Status</span>
            <p className="text-base font-bold text-indigo-700 font-mono mt-0.5">Audit Active</p>
            <span className="text-[11px] text-indigo-600 block mt-0.5 font-medium">Unverified metrics removed</span>
          </div>
        </div>
      </div>

      {/* Dynamic Genuine KPIs from Live public.predictions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Prediction Records
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error ? (
                '—'
              ) : (
                riskAnalysis.total
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Table:</span>
            <span className="font-mono text-slate-700">public.predictions</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Distinct Students
            </span>
            <div className="text-2xl font-black text-blue-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error ? (
                '—'
              ) : (
                riskAnalysis.uniqueStudentsCount
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Coverage:</span>
            <span className="font-medium text-slate-700">1 Prediction / Student</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mean Predicted Score
            </span>
            <div className="text-2xl font-black text-violet-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-14 h-7 bg-slate-200 rounded animate-pulse" />
              ) : error || riskAnalysis.meanScore === null ? (
                '—'
              ) : (
                `${riskAnalysis.meanScore}`
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Score Range:</span>
            <span className="font-mono text-slate-700">
              {riskAnalysis.minScore !== null ? `${riskAnalysis.minScore} - ${riskAnalysis.maxScore}` : '—'}
            </span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Risk Assessment Engine
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1 line-clamp-2 leading-snug">
              {loading ? (
                <span className="inline-block w-24 h-5 bg-slate-200 rounded animate-pulse" />
              ) : (
                'Vidya Risk Engine'
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Status:</span>
            <span className="font-semibold text-emerald-600">Active</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Latest Prediction Date
            </span>
            <div className="text-base font-bold text-slate-900 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-20 h-6 bg-slate-200 rounded animate-pulse" />
              ) : riskAnalysis.latestDate ? (
                riskAnalysis.latestDate
              ) : (
                'Pending'
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Timestamp:</span>
            <span className="font-mono text-slate-700">prediction_date</span>
          </p>
        </div>
      </div>

      {/* Dynamic Risk-Category Distribution (Real counts from database) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Live Stored Risk-Category Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated dynamically across {riskAnalysis.total} records in <code className="font-mono text-slate-700">public.predictions</code>.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            Case & Whitespace Normalized
          </span>
        </div>

        {/* Visual Distribution Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${riskAnalysis.highPct}%` }}
            className="bg-rose-500 h-full transition-all duration-500"
            title={`High Risk: ${riskAnalysis.high} (${riskAnalysis.highPct}%)`}
          />
          <div
            style={{ width: `${riskAnalysis.moderatePct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Moderate Risk: ${riskAnalysis.moderate} (${riskAnalysis.moderatePct}%)`}
          />
          <div
            style={{ width: `${riskAnalysis.lowPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Low Risk: ${riskAnalysis.low} (${riskAnalysis.lowPct}%)`}
          />
          {riskAnalysis.unrecognized > 0 && (
            <div
              style={{ width: `${riskAnalysis.unrecognizedPct}%` }}
              className="bg-slate-400 h-full transition-all duration-500"
              title={`Unrecognized: ${riskAnalysis.unrecognized} (${riskAnalysis.unrecognizedPct}%)`}
            />
          )}
        </div>

        {/* Dynamic Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-rose-900">High Risk</span>
              <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                {riskAnalysis.highPct}%
              </span>
            </div>
            <p className="text-2xl font-black text-rose-900 font-mono mt-1">{riskAnalysis.high}</p>
            <p className="text-[11px] text-rose-700 mt-1">flagged for early intervention</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-900">Moderate Risk</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                {riskAnalysis.moderatePct}%
              </span>
            </div>
            <p className="text-2xl font-black text-amber-900 font-mono mt-1">{riskAnalysis.moderate}</p>
            <p className="text-[11px] text-amber-700 mt-1">intermediate monitoring</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-900">Low Risk</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                {riskAnalysis.lowPct}%
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-900 font-mono mt-1">{riskAnalysis.low}</p>
            <p className="text-[11px] text-emerald-700 mt-1">stable performance</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700">Unrecognized / Null</span>
              <span className="font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                {riskAnalysis.unrecognizedPct}%
              </span>
            </div>
            <p className="text-2xl font-black text-slate-800 font-mono mt-1">{riskAnalysis.unrecognized}</p>
            <p className="text-[11px] text-slate-500 mt-1">contains string &lsquo;NULL&rsquo;</p>
          </div>
        </div>
      </div>

      {/* Predictive Risk Indicators & Factor Weights */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Predictive Risk Indicators & Factor Weights
          </h3>
          <p className="text-xs text-slate-500">
            Relative behavioral, academic, and attendance factors evaluated for early student support and intervention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {pipelineFeatureWeights.map((w) => (
            <div key={w.feature} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{w.feature}</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                    {w.weight}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight mt-1">{w.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Stored Predictions Explorer Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Live Stored Predictions Explorer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Direct verification of rows in <code className="font-mono text-slate-700">public.predictions</code> table.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 self-start sm:self-auto">
            Showing {filteredPredictions.length} of {predictions.length} records
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student ID, prediction ID, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Risk Categories</option>
              <option value="high">High Risk ({riskAnalysis.high})</option>
              <option value="moderate">Moderate Risk ({riskAnalysis.moderate})</option>
              <option value="low">Low Risk ({riskAnalysis.low})</option>
              <option value="unrecognized">Unrecognized ({riskAnalysis.unrecognized})</option>
            </select>

            {riskAnalysis.modelsList.length > 1 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Models</option>
                {riskAnalysis.modelsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {(search || selectedRisk !== 'all' || selectedModel !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedRisk('all');
                  setSelectedModel('all');
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table / Error / Empty States */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading prediction records from public.predictions...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Failed to Load public.predictions</span>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
              <button
                onClick={loadPredictions}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No records found in public.predictions table.
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No prediction records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                  <th className="py-2.5 px-3">Prediction ID</th>
                  <th className="py-2.5 px-3">Student ID</th>
                  <th className="py-2.5 px-3">Predicted Final Score</th>
                  <th className="py-2.5 px-3">Academic Risk Category</th>
                  <th className="py-2.5 px-3">Prediction Model</th>
                  <th className="py-2.5 px-3">Prediction Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPredictions.map((row) => {
                  const riskString = (row.academic_risk || '').toString().trim();
                  let normalizedLevel: RiskLevel = 'Low';
                  const lower = riskString.toLowerCase();
                  if (lower.includes('high')) normalizedLevel = 'High';
                  else if (lower.includes('mod') || lower.includes('med')) normalizedLevel = 'Moderate';

                  return (
                    <tr key={row.prediction_id || `${row.student_id}-${Math.random()}`} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-indigo-700">{row.prediction_id || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold">#{row.student_id}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-bold">
                        {typeof row.predicted_final_score === 'number' ? row.predicted_final_score : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {riskString === 'NULL' || !riskString ? (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            NULL
                          </span>
                        ) : (
                          <RiskBadge level={normalizedLevel} />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px]">
                        {row.prediction_model || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {row.prediction_date || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Schema Specification Reference (23 Fields) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>VIDYA Data Science Dataset Feature Specification (23 Fields)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Contract for ingestion pipelines, feature normalization, and CSV imports.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
            Live Records in Cohort: {allStudents.length}
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                <th className="py-2.5 px-3">Field Key</th>
                <th className="py-2.5 px-3">Data Type / Format</th>
                <th className="py-2.5 px-3">Description & Predictive Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {datasetFields.map((field) => (
                <tr key={field.name} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 font-bold text-indigo-700">{field.name}</td>
                  <td className="py-2 px-3 text-slate-600 text-[11px]">{field.type}</td>
                  <td className="py-2 px-3 text-slate-500 font-sans text-xs">{field.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
