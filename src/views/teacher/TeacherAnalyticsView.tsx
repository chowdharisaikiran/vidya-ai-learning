import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { StudentData } from '../../types';
import { fetchTeacherAssignedCohort } from '../../services/vidyaDatabaseService';
import {
  LineChart,
  RefreshCw,
  AlertTriangle,
  Award,
  Users,
  Activity,
  BookOpen,
} from 'lucide-react';

export const TeacherAnalyticsView: React.FC = () => {
  const { user } = useAuth();
  const staffId = user?.staffId;

  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading cohort analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadData();
    }
  }, [staffId]);

  // Enforce staff_id mapping
  if (!staffId) {
    return <UnlinkedTeacherCard title="Cohort Performance Analytics & Data Insights" />;
  }

  // Compute metrics if students assigned
  const analytics = useMemo(() => {
    if (students.length === 0) return null;
    const total = students.length;
    const avgScore = Math.round((students.reduce((acc, s) => acc + (s.Overall_Score || 0), 0) / total) * 10) / 10;
    const avgAtt = Math.round((students.reduce((acc, s) => acc + (s.Attendance_Percent || 0), 0) / total) * 10) / 10;
    const highRisk = students.filter((s) => s.Risk_Level === 'High').length;
    const modRisk = students.filter((s) => s.Risk_Level === 'Moderate').length;
    const lowRisk = students.filter((s) => s.Risk_Level === 'Low').length;

    return { total, avgScore, avgAtt, highRisk, modRisk, lowRisk };
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LineChart className="w-6 h-6 text-violet-600" />
            <span>Cohort Performance Analytics & Data Insights</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data science cohort distributions exclusively for students assigned to Staff #{staffId}.
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
          <h4 className="text-sm font-semibold text-slate-800">Calculating Assigned Cohort Metrics...</h4>
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h4 className="text-sm font-bold">Failed to Load Cohort Analytics</h4>
          </div>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto space-y-3 my-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <LineChart className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Student Cohort Enrolled</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are currently no students assigned to your faculty profile (Staff #{staffId}). Under Row-Level Security, broad institutional analytics are restricted.
          </p>
        </div>
      )}

      {!loading && !error && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Size</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">{analytics.total}</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cohort Mean Score</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{analytics.avgScore}%</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cohort Attendance</span>
              <div className="text-2xl font-black text-blue-600 font-mono mt-1">{analytics.avgAtt}%</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">High Risk Students</span>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">{analytics.highRisk}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Risk Level Distribution in Assigned Cohort</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <span className="text-xs font-semibold text-rose-800">High Risk</span>
                <p className="text-xl font-black text-rose-600 font-mono mt-1">{analytics.highRisk}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <span className="text-xs font-semibold text-amber-800">Moderate Risk</span>
                <p className="text-xl font-black text-amber-600 font-mono mt-1">{analytics.modRisk}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs font-semibold text-emerald-800">Low Risk</span>
                <p className="text-xl font-black text-emerald-600 font-mono mt-1">{analytics.lowRisk}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
