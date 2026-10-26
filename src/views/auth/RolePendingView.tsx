import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VidyaLogo } from '../../components/common/VidyaLogo';
import campusBg from '../../assets/images/vidya_academic_campus_bg.svg';
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Database,
  ArrowRight,
} from 'lucide-react';

export const RolePendingView: React.FC = () => {
  const { user, refreshUserRole, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'warning' | 'success';
    text: string;
  } | null>(null);

  const handleRefreshRole = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      const updatedRole = await refreshUserRole();
      if (updatedRole === 'student' || updatedRole === 'teacher' || updatedRole === 'admin') {
        setStatusMessage({
          type: 'success',
          text: `Role assigned successfully: ${updatedRole.toUpperCase()}. Redirecting to your workspace...`,
        });
      } else {
        setStatusMessage({
          type: 'warning',
          text: 'Role assignment is still pending in public.user_profiles. Please contact your institutional administrator.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'warning',
        text: 'Could not query public.user_profiles. The table may not be created or role is still pending.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const sqlSnippet = user?.id
    ? `-- Run in Supabase SQL Editor:
UPDATE public.user_profiles 
SET role = 'student' 
WHERE id = '${user.id}';`
    : '';

  const handleCopySql = () => {
    if (sqlSnippet) {
      navigator.clipboard.writeText(sqlSnippet);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden selection:bg-blue-600 selection:text-white bg-slate-50 font-sans">
      {/* Light Academic Campus Background Image */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img
          src={campusBg}
          alt="VIDYA Academic Campus & AI Learning Analytics Environment"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100/90 via-white/80 to-white/90" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        {/* Branding */}
        <div className="text-center flex flex-col items-center mb-6">
          <VidyaLogo
            size="lg"
            variant="default"
            showText={true}
            showTagline={true}
            tagline="Academic Intelligence & Role Governance"
            className="flex-col !gap-2"
          />
        </div>

        {/* Security Notice Card */}
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-xl shadow-slate-900/10 rounded-3xl border border-slate-200/90 space-y-6">
          {/* Status Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Account Awaiting Role Assignment</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Institutional Role Setup Incomplete
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your account is successfully authenticated via Supabase Auth, but your institutional role in{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800 text-[11px]">
                  public.user_profiles
                </code>{' '}
                has not yet been assigned or verified.
              </p>
            </div>
          </div>

          {/* Privacy & Compliance Explanation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Data Protection & Privacy Policy</span>
            </div>
            <p className="leading-relaxed">
              To protect student privacy and ensure compliance with institutional data governance, dashboard access to student records, educator gradebooks, and administrative metrics is strictly restricted until an administrator assigns a verified role (<span className="font-semibold text-slate-700">student</span>, <span className="font-semibold text-slate-700">teacher</span>, or <span className="font-semibold text-slate-700">admin</span>).
            </p>
          </div>

          {/* Account Details Box */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Authenticated Session Credentials
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Full Name</span>
                <span className="font-semibold text-slate-900">{user?.name || 'Scholar'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email</span>
                <span className="font-semibold text-slate-900">{user?.email || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Supabase User ID (UUID)</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 break-all select-all flex-1">
                    {user?.id || 'N/A'}
                  </span>
                  <button
                    onClick={handleCopyUserId}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Error Banner if RLS or Query Error occurred */}
          {user?.errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Database Query Diagnostic</span>
              </div>
              <p className="text-rose-700 leading-relaxed font-mono text-[11px] break-all">{user.errorMessage}</p>
            </div>
          )}

          {/* Feedback banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Administrator Setup Instructions Callout */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>For Institutional Administrators</span>
              </span>
              <button
                onClick={handleCopySql}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied SQL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-normal">
              To grant access, execute this SQL query in your Supabase project editor to assign a role to this account:
            </p>
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
              <code>{sqlSnippet}</code>
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleRefreshRole}
              disabled={checking}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md shadow-blue-500/20 transition-all disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Role Status Again'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
