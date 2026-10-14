import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  RefreshCw,
  X,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { testSupabaseConnection, getSupabaseConfig, ConnectionTestResult } from '../lib/supabase';
import { VIDYA_10_TABLES_SQL } from '../data/supabaseSql';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionStatusChange?: (connected: boolean) => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionStatusChange,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [anonKeyInput, setAnonKeyInput] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copied10Tables, setCopied10Tables] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  const config = getSupabaseConfig();

  useEffect(() => {
    if (isOpen) {
      setAnonKeyInput(config.anonKey);
      // Auto run connection test on open
      handleRunTest();
    }
  }, [isOpen]);

  const handleRunTest = async (overrideKey?: string) => {
    setLoading(true);
    const keyToUse = overrideKey !== undefined ? overrideKey : anonKeyInput;
    const testResult = await testSupabaseConnection(keyToUse);
    setResult(testResult);
    setLoading(false);
    if (onConnectionStatusChange) {
      onConnectionStatusChange(testResult.success);
    }
  };

  const handleCopySingleTableSql = () => {
    navigator.clipboard.writeText(
      'CREATE TABLE IF NOT EXISTS connection_test (id serial PRIMARY KEY, message text DEFAULT \'VIDYA Supabase Connected\', created_at timestamptz DEFAULT now());\nINSERT INTO connection_test (id, message) VALUES (1, \'VIDYA Supabase Connected\') ON CONFLICT (id) DO NOTHING;'
    );
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyAllTablesSql = () => {
    navigator.clipboard.writeText(VIDYA_10_TABLES_SQL);
    setCopied10Tables(true);
    setTimeout(() => setCopied10Tables(false), 2500);
  };

  if (!isOpen) return null;

  const isUrlEntered = anonKeyInput.startsWith('http://') || anonKeyInput.startsWith('https://');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase Connection</h3>
              <p className="text-xs text-slate-500">Live PostgreSQL diagnostics &amp; 10-table schema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
          {/* Honest Dynamic Status Badge */}
          {loading ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Testing Supabase Database Query...</h4>
                <p className="text-xs text-slate-500">Running authenticated query against database tables</p>
              </div>
            </div>
          ) : result?.success ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-emerald-600 text-white mt-0.5 shrink-0 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-emerald-950 tracking-tight">
                    VIDYA Supabase Connected
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Verified Active
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Real database query successful. Connected to project <strong>fxwzjeyiywprabttaznt</strong> ({result.table || 'students'} table verified).
                </p>
                {result.timestamp && (
                  <div className="text-[10px] text-emerald-700/80 font-mono mt-1">
                    Last verified: {result.timestamp}
                  </div>
                )}
              </div>
            </div>
          ) : result?.needsTables ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-amber-500 text-white mt-0.5 shrink-0 shadow-sm">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-amber-950 tracking-tight">
                    Supabase Authenticated · Tables Pending
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Authentication to Supabase project was successful, but database tables are not created yet. Copy and run the 10-table SQL schema script below in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-rose-600 text-white mt-0.5 shrink-0 shadow-sm">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-rose-950 tracking-tight">
                  Connection Not Verified
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {result?.error || result?.message || 'Could not reach Supabase database. Please verify API key.'}
                </p>
              </div>
            </div>
          )}

          {/* Direct Supabase Project Links Grid */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Direct Supabase Project Links
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                fxwzjeyiywprabttaznt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-between text-slate-100 font-semibold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Project Dashboard</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
              </a>

              <a
                href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-700/80 flex items-center justify-between text-indigo-100 font-semibold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Open SQL Editor ↗</span>
                </div>
                <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-300 transition-colors shrink-0" />
              </a>

              <a
                href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-between text-slate-100 font-semibold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">API Keys &amp; Tokens</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
              </a>

              <a
                href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-between text-slate-100 font-semibold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">Table Editor</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
              </a>
            </div>
          </div>

          {/* Configuration Overview */}
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Supabase Project URL:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {config.url}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Project Reference:</span>
                <span className="font-mono font-bold text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded">
                  fxwzjeyiywprabttaznt
                </span>
              </div>
            </div>

            {/* Anon Key Input & Helper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Supabase Anon Public Key (<span className="font-mono text-slate-500 font-normal">VITE_SUPABASE_ANON_KEY</span>)
                </label>
                <a
                  href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <span>Supabase API Keys</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Paste your anon public key"
                  value={anonKeyInput}
                  onChange={(e) => setAnonKeyInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {isUrlEntered && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Note:</strong> You pasted a URL into the key field. The public key is the string starting with <code className="font-mono text-[10px]">sb_publishable_...</code> or <code className="font-mono text-[10px]">eyJ...</code> under <em>Project Settings &gt; API</em>.
                  </p>
                </div>
              )}
            </div>

            {/* 10-Tables SQL Schema Copy Section */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs text-indigo-950">10 Core Database Tables Schema</span>
                </div>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  Ready to Execute
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Contains DDL, RLS policies, and seed data for: <em>Students, Staff, Subjects, Student_Attendance, Staff_Attendance, Academic_Performance, Learning_Profile, Predictions, Recommendations, Attendance_Summary</em>, plus <em>connection_test</em>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyAllTablesSql}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {copied10Tables ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied10Tables ? '10-Tables SQL Copied!' : 'Copy Full 10-Tables SQL Script'}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-300 font-semibold text-xs flex items-center gap-1 transition-all"
                >
                  <span>SQL Editor ↗</span>
                </a>
              </div>
            </div>

            {/* Diagnostics Quick Table Helper */}
            <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                onClick={() => setShowSqlGuide(!showSqlGuide)}
                className="w-full p-3 text-left flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Single Diagnostics Table SQL (connection_test)</span>
                </div>
                {showSqlGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showSqlGuide && (
                <div className="p-3 pt-0 border-t border-slate-200/50 space-y-2 text-[11px] text-slate-600">
                  <p className="text-[11px]">
                    To create only the minimal diagnostics table:
                  </p>
                  <div className="flex items-center justify-between bg-slate-900 text-emerald-300 p-2.5 rounded-xl text-[10px] font-mono">
                    <span className="truncate pr-2">
                      CREATE TABLE IF NOT EXISTS connection_test (id serial PRIMARY KEY, message text DEFAULT 'VIDYA Supabase Connected');
                    </span>
                    <button
                      onClick={handleCopySingleTableSql}
                      className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1 shrink-0 transition-colors"
                      title="Copy SQL"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px] font-sans">{copiedSql ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <a
            href="https://supabase.com/dashboard/project/fxwzjeyiywprabttaznt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => handleRunTest(anonKeyInput)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Verifying...' : 'Re-test Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
