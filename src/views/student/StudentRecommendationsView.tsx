import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AIRecommendationPlan } from '../../types';
import {
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  Target,
  Brain,
  CheckCircle2,
  RefreshCw,
  Zap,
  Lightbulb,
  HeartHandshake,
  Check,
  ShieldCheck,
  Database,
  Info,
} from 'lucide-react';
import { UnlinkedStudentCard } from '../../components/common/UnlinkedStudentCard';
import { apiUrl, parseApiResponse } from '../../lib/apiConfig';
import {
  fetchStudentLinkedRecords,
  getActiveAuthToken,
  DatabaseRecommendationRow,
} from '../../services/vidyaDatabaseService';

export const StudentRecommendationsView: React.FC = () => {
  const { student, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [plan, setPlan] = useState<AIRecommendationPlan | null>(null);
  const [dbRecommendations, setDbRecommendations] = useState<DatabaseRecommendationRow[]>([]);

  // Key completion states to user.id in localStorage (live public.recommendations has no completion column)
  const [completedDays, setCompletedDays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`vidya_completed_days_${user?.id}`);
      return saved ? JSON.parse(saved) : ['Monday'];
    } catch {
      return ['Monday'];
    }
  });

  const [completedRecIds, setCompletedRecIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`vidya_completed_recs_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadDatabaseRecommendations = async () => {
    if (!student?.Student_ID) return;
    setDbLoading(true);
    try {
      const records = await fetchStudentLinkedRecords(student.Student_ID);
      if (records && records.recommendations) {
        setDbRecommendations(records.recommendations);
      }
    } catch (err) {
      console.warn('Failed to load DB recommendations:', err);
    } finally {
      setDbLoading(false);
    }
  };

  const fetchAIRecommendations = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const token = await getActiveAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/ai/recommendations'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentId: student.Student_ID,
          student,
        }),
      });
      const parsed = await parseApiResponse<AIRecommendationPlan>(res, '/api/ai/recommendations');
      if (parsed.ok && parsed.data) {
        setPlan(parsed.data);
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseRecommendations();
    fetchAIRecommendations();
  }, [student?.Student_ID]);

  const toggleDayComplete = (day: string) => {
    const updated = completedDays.includes(day)
      ? completedDays.filter((d) => d !== day)
      : [...completedDays, day];
    setCompletedDays(updated);
    if (user?.id) {
      try {
        localStorage.setItem(`vidya_completed_days_${user.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const toggleRecComplete = (id: string | number) => {
    const strId = String(id);
    const updated = completedRecIds.includes(strId)
      ? completedRecIds.filter((d) => d !== strId)
      : [...completedRecIds, strId];
    setCompletedRecIds(updated);
    if (user?.id) {
      try {
        localStorage.setItem(`vidya_completed_recs_${user.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  if (!user?.studentId || !student) {
    return <UnlinkedStudentCard title="Pedagogical Directives & AI Study Plan" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Personalized Learning & Study Roadmap
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Data Science synthesized weekly timetable calibrated for {student.Learning_Style} cognition.
          </p>
        </div>

        <button
          onClick={fetchAIRecommendations}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium tracking-tight shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Synthesizing with AI...' : 'Regenerate Plan'}</span>
        </button>
      </div>

      {/* Diagnostic AI Synthesis Callout */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-white/10 text-blue-300 border border-white/10 shrink-0 mt-0.5">
            <Brain className="w-5 h-5" />
          </div>
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-300">
                Diagnostic Synthesis • {student.Name}
              </span>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                Style: {student.Learning_Style}
              </span>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Weak Subject: {student.Weak_Subject}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {plan?.summary ||
                `${student.Name} is currently operating with a ${student.Risk_Level.toLowerCase()} academic risk profile. The highest return interventions target rebuilding fluency in ${student.Weak_Subject} with structured daily practice of ${student.Study_Hours_Per_Day} hours.`}
            </p>
            {plan?.pedagogicalTip && (
              <div className="mt-3 text-xs font-medium text-slate-200 bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{plan.pedagogicalTip}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Institutional Recommendations from public.recommendations */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Official Institutional Directives</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                public.recommendations ({dbRecommendations.length})
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Directives issued by faculty. Check off actions locally as completed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/60">
              {completedRecIds.length} / {dbRecommendations.length || 0} Complete
            </span>
          </div>
        </div>

        {dbLoading ? (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>Loading institutional directives from Supabase...</span>
          </div>
        ) : dbRecommendations.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
            No institutional advisory directives currently logged for student #{student.Student_ID}.
          </div>
        ) : (
          <div className="space-y-3">
            {dbRecommendations.map((rec) => {
              const isDone = completedRecIds.includes(String(rec.recommendation_id));
              const priorityColor =
                rec.priority === 'High'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : rec.priority === 'Medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <div
                  key={rec.recommendation_id}
                  onClick={() => toggleRecComplete(rec.recommendation_id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isDone
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{rec.focus_area}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColor}`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">#{rec.recommendation_id}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{rec.recommended_action}</p>
                    {rec.reason && (
                      <p className="text-[11px] text-slate-500 italic">Rationale: {rec.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 mt-1 ${
                      isDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-transparent bg-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly 7-Day Personalized Timetable */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Adaptive 7-Day Study Schedule</span>
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Personalized checklist calibrated to optimize cognitive recall without causing study fatigue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/60">
              {completedDays.length} / 7 Completed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(plan?.studySchedule || []).map((slot) => {
            const isCompleted = completedDays.includes(slot.day);

            return (
              <div
                key={slot.day}
                onClick={() => toggleDayComplete(slot.day)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-300/80'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {slot.day}
                    </span>
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-transparent bg-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 leading-snug mb-1">{slot.focus}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{slot.techniques}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Target
                  </span>
                  <span className="font-mono text-xs font-medium text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {slot.hours} hrs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remedial Interventions & Lifestyle Balance Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Remedial Action */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Targeted Subject Remediation: {student.Weak_Subject}
                </h3>
                <p className="text-xs text-slate-500 font-normal">Root-cause conceptual recovery path</p>
              </div>
            </div>

            {(plan?.subjectInterventions || []).map((intervention, i) => (
              <div key={i} className="space-y-3 mt-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Identified Focus Area</p>
                  <p className="text-slate-700 leading-relaxed">{intervention.gapAnalysis}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/60 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-1">Recommended Action</p>
                  <p className="text-slate-700 leading-relaxed">{intervention.suggestedAction}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-medium text-slate-600">Recovery Objective:</span>
                  <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {intervention.targetScore}% Target
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive Recovery & Sleep/Stress Balance */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Lifestyle & Habit Optimization</h3>
                <p className="text-xs text-slate-500 font-normal">Addressing sleep, fatigue, and focus drivers</p>
              </div>
            </div>

            <div className="space-y-3 mt-3">
              {(plan?.lifestyleAdjustments || []).map((adj, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-800">{adj.category} Optimization</span>
                    <span className="text-[10px] font-mono font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {adj.expectedImpact}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-normal">{adj.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
