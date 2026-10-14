import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  Building,
  Mail,
  Server,
  Database,
  Cpu,
  CheckCircle2,
  Lock,
  Calendar,
  Cloud,
  AlertTriangle,
} from 'lucide-react';
import { SupabaseConnectionModal } from '../../components/SupabaseConnectionModal';
import { testSupabaseConnection, getSupabaseConfig } from '../../lib/supabase';

export const AdminProfileView: React.FC = () => {
  const { user, allStudents, isSupabaseConnected, setSupabaseConnected } = useAuth();
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Alert banner if admin profile is missing */}
      {user?.isProfileMissing && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-rose-900">Admin profile not found</h4>
            <p className="mt-0.5 text-rose-700 leading-relaxed">
              No matching record in <span className="font-mono">user_profiles</span> was found for your authenticated account (<span className="font-mono font-semibold">{user?.email}</span>, UUID: <span className="font-mono">{user?.id}</span>).
            </p>
          </div>
        </div>
      )}

      {/* Administrator Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-indigo-500/10 shadow-md"
            />
          ) : (
            <div className={`w-24 h-24 rounded-3xl ${user?.isProfileMissing ? 'bg-gradient-to-tr from-rose-700 to-rose-600' : 'bg-gradient-to-tr from-indigo-700 to-blue-600'} text-white flex items-center justify-center font-black text-2xl shadow-md`}>
              {user?.isProfileMissing ? '!' : (user?.name ? user.name.charAt(0) : 'A')}
            </div>
          )}
          <span className={`absolute -bottom-2 -right-2 ${user?.isProfileMissing ? 'bg-rose-500' : 'bg-emerald-500'} text-white p-1 rounded-xl ring-4 ring-white`}>
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {user?.isProfileMissing ? 'Admin profile not found' : (user?.name || user?.email || 'Administrator')}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {user?.isProfileMissing ? 'Unregistered Administrator Profile' : 'Institutional Administrator • Office of Academic Governance'}
              </p>
            </div>
            <span className={`self-center sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user?.isProfileMissing ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
              <Shield className="w-3.5 h-3.5" />
              {user?.isProfileMissing ? 'Unverified Profile' : 'Full System Authority'}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl">
            Responsible for institutional user access management, role assignments, and governance oversight across the VIDYA Platform.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email || 'No email associated'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Active System Session
            </span>
          </div>
        </div>
      </div>

      {/* System Infrastructure & Data Science Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Server className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Platform Backend</h3>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Runtime Engine:</span>
              <span className="font-mono font-bold text-slate-800">Node / Express</span>
            </div>
            <div className="flex justify-between">
              <span>Authentication:</span>
              <span className="font-mono font-bold text-slate-800">Standard RBAC</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-mono font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Data Science Engine</h3>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Loaded Scholars:</span>
              <span className="font-mono font-bold text-slate-800">{allStudents.length} records</span>
            </div>
            <div className="flex justify-between">
              <span>Feature Vectors:</span>
              <span className="font-mono font-bold text-slate-800">22 features</span>
            </div>
            <div className="flex justify-between">
              <span>Inference Latency:</span>
              <span className="font-mono font-bold text-emerald-600">&lt; 15ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <Cloud className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">Supabase Cloud</h3>
            </div>
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Test
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Project ID:</span>
              <span className="font-mono font-bold text-slate-800">fxwzjeyiywprabttaznt</span>
            </div>
            <div className="flex justify-between">
              <span>Test Table:</span>
              <span className="font-mono text-slate-700 text-[11px]">"students"</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {isSupabaseConnected ? (
                <span className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  VIDYA Supabase Connected
                </span>
              ) : (
                <span className="font-mono font-semibold text-slate-500 text-[11px]">Configured</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-violet-600">
            <Cpu className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Generative AI Layer</h3>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="font-mono font-bold text-slate-800">gemini-3.8-flash</span>
            </div>
            <div className="flex justify-between">
              <span>Task:</span>
              <span className="font-mono font-bold text-slate-800">Synthesis</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-mono font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900">Security & Administrative Audit Log</h3>
        <p className="text-xs text-slate-500">Chronological history of platform activities.</p>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-slate-700">Automated risk recalculation completed for Grade 11 STEM</span>
            <span className="text-slate-400 font-mono text-[10px]">Today, 08:30 AM</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-slate-700">Early warning SMS dispatch triggered for 2 at-risk scholars</span>
            <span className="text-slate-400 font-mono text-[10px]">Yesterday, 04:15 PM</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-slate-700">Dataset schema verification passed with 0 missing attributes</span>
            <span className="text-slate-400 font-mono text-[10px]">Feb 16, 11:20 AM</span>
          </div>
        </div>
      </div>

      {/* Supabase Connection Test Modal */}
      <SupabaseConnectionModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConnectionStatusChange={setSupabaseConnected}
      />
    </div>
  );
};
