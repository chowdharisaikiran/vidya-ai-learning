import React from 'react';
import {
  BarChart3,
  Activity,
  BrainCircuit,
  Database,
  Users,
  Building2,
  TrendingUp,
  Cpu,
  Clock,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { platformService } from '../../services/platformService';

interface PlatformAnalyticsViewProps {
  currency: string;
}

export const PlatformAnalyticsView: React.FC<PlatformAnalyticsViewProps> = () => {
  const institutions = platformService.getInstitutions();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Business Analytics & Platform Usage</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          System telemetry, AI inference workloads, storage consumption, and cross-institution engagement.
        </p>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Predictions Computed</span>
            <BrainCircuit className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">18,450</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            ↑ 24% vs last exam cycle
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Daily Active Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">2,890</div>
          <p className="text-[11px] text-slate-500 mt-0.5">82% engagement retention</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Storage Consumed</span>
            <HardDrive className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">154.2 GB</div>
          <p className="text-[11px] text-slate-500 mt-0.5">39.5% of 390 GB platform quota</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Model Inference Latency</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">38 ms</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">99.98% uptime SLA</p>
        </div>
      </div>

      {/* Cross-Institution Workload Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Tenant Compute & Workload Utilization</h3>
          <p className="text-xs text-slate-500">Resource allocation and telemetry per subscribed school/college.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Enrolled Students</th>
                <th className="py-3 px-4">AI Inferences Run</th>
                <th className="py-3 px-4">Storage Usage</th>
                <th className="py-3 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{inst.name}</td>
                  <td className="py-3 px-4 font-mono">{inst.studentsCount}</td>
                  <td className="py-3 px-4 font-mono font-bold text-violet-700">
                    {inst.aiPredictionsEnabled ? (inst.studentsCount * 14).toLocaleString() : 'N/A (Basic Plan)'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {inst.storageUsedGB} GB / {inst.totalStorageGB} GB
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Optimal</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
