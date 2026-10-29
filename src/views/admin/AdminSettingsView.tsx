import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { testSupabaseConnection } from '../../lib/supabase';
import {
  fetchDatabaseTablesHealth,
  TABLE_METADATA,
  ExpectedTableName,
  DatabaseTablesHealthResponse,
} from '../../services/databaseHealthService';
import { getActiveAuthToken } from '../../lib/supabase';
import { apiUrl } from '../../lib/apiConfig';
import { SupabaseConnectionModal } from '../../components/SupabaseConnectionModal';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Lock,
  Download,
  Layers,
  Search,
  Settings,
  ShieldCheck,
  ArrowLeft,
  Server,
  Key,
  Activity,
  ShieldAlert,
  BrainCircuit,
  CreditCard,
} from 'lucide-react';
import { AdminPredictionView } from './AdminPredictionView';

interface AdminSettingsViewProps {
  onNavigate?: (tab: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onNavigate }) => {
  const { role, user, isSupabaseConnected, setSupabaseConnected } = useAuth();
  const [settingsTab, setSettingsTab] = useState<'system-health' | 'predictions'>('system-health');

  const [healthStatus, setHealthStatus] = useState<{
    checking: boolean;
    result: {
      success: boolean;
      message: string;
      timestamp: string;
      url: string;
      table?: string;
      count?: number;
    } | null;
  }>({
    checking: false,
    result: null,
  });

  const [tablesHealth, setTablesHealth] = useState<{
    checking: boolean;
    result: DatabaseTablesHealthResponse | null;
    error: string | null;
  }>({
    checking: false,
    result: null,
    error: null,
  });

  const [tableFilter, setTableFilter] = useState<'all' | 'verified' | 'issues'>('all');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Direct connection check
  const runConnectionCheck = useCallback(async () => {
    setHealthStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await testSupabaseConnection();
      setHealthStatus({ checking: false, result: res });
      setSupabaseConnected(res.success);
    } catch {
      setHealthStatus({
        checking: false,
        result: {
          success: false,
          message: 'Connection check failed. Verify Supabase availability.',
          timestamp: new Date().toLocaleTimeString(),
          url: '',
        },
      });
      setSupabaseConnected(false);
    }
  }, [setSupabaseConnected]);

  // Full 12-table database schema health check via authorized admin endpoint
  const runFullDatabaseHealthCheck = useCallback(async () => {
    setTablesHealth((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const token = await getActiveAuthToken();
      const res = await fetchDatabaseTablesHealth(token);
      setTablesHealth({
        checking: false,
        result: res,
        error: res.success ? null : res.error || 'Failed to complete full database check',
      });
      if (res.isDatabaseConnected) {
        setSupabaseConnected(true);
      }
    } catch (err: any) {
      setTablesHealth({
        checking: false,
        result: null,
        error: err?.message || 'Database health check could not reach the server.',
      });
    }
  }, [setSupabaseConnected]);

  const runAllHealthChecks = useCallback(async () => {
    await Promise.allSettled([runConnectionCheck(), runFullDatabaseHealthCheck()]);
  }, [runConnectionCheck, runFullDatabaseHealthCheck]);

  useEffect(() => {
    if (role === 'admin') {
      runConnectionCheck();
      runFullDatabaseHealthCheck();
    }
  }, [role, runConnectionCheck, runFullDatabaseHealthCheck]);

  const exportCSV = async () => {
    setExportingCsv(true);
    try {
      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl('/api/admin/dataset/export'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || `Export failed with status ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'vidya_live_students_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err?.message || 'CSV export failed.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Defense-in-depth: Unauthorized access guard
  if (role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          System health diagnostics and database configuration are restricted to authenticated institution administrators.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>
    );
  }

  const isChecking = healthStatus.checking || tablesHealth.checking;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
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
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">System & Database Settings</h1>
          </div>
          <p className="text-xs text-slate-500">
            Supabase cloud connectivity, PostgreSQL schema verification, and database health diagnostics
          </p>
        </div>

        {/* Tab Switcher & Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setSettingsTab('system-health')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                settingsTab === 'system-health'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>System Health & DB</span>
            </button>
            <button
              onClick={() => setSettingsTab('predictions')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                settingsTab === 'predictions'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              <span>ML Predictions</span>
            </button>
          </div>

          {settingsTab === 'system-health' && (
            <>
              <button
                onClick={runAllHealthChecks}
                disabled={isChecking}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Verifying...' : 'Refresh All Checks'}</span>
              </button>
              <button
                onClick={() => setSupabaseModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Configure Credentials</span>
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('subscription')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Subscription & Plans</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {settingsTab === 'predictions' ? (
        <AdminPredictionView />
      ) : (
        <div className="space-y-6">

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Connection Status
              </span>
              <div
                className={`p-2 rounded-xl ${
                  isSupabaseConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-base font-bold text-slate-900">
                {healthStatus.checking
                  ? 'Verifying...'
                  : isSupabaseConnected
                  ? 'Connected & Verified'
                  : 'Unconfirmed / Offline'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              {healthStatus.result?.message || 'Production PostgreSQL cloud database connection.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Table:</span>
            <span className="font-mono font-semibold text-slate-700">
              {healthStatus.result?.table || 'students'}
            </span>
          </div>
        </div>

        {/* Schema Integrity Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Schema Integrity
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tablesHealth.checking ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              ) : tablesHealth.result?.allTablesVerified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span className="text-base font-bold text-slate-900">
                {tablesHealth.checking
                  ? 'Verifying 12 Tables...'
                  : tablesHealth.result
                  ? tablesHealth.result.allTablesVerified
                    ? 'All 12 Tables Verified'
                    : `${tablesHealth.result.verifiedCount} / ${tablesHealth.result.totalTables} Verified`
                  : 'Pending Check'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Read-only exact row counts for all institutional schemas.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Last Verified:</span>
            <span className="font-mono text-slate-700 text-[11px]">
              {tablesHealth.result?.timestamp
                ? new Date(tablesHealth.result.timestamp).toLocaleTimeString()
                : healthStatus.result?.timestamp || 'Pending check'}
            </span>
          </div>
        </div>

        {/* Security & Access Architecture */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Access & Governance
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-base font-bold text-slate-900">Admin Role Verified</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-normal">
              Server-side JWT verification against verified profile in <code className="font-mono text-slate-700">user_profiles</code>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Caller Identity:</span>
            <span className="font-mono text-slate-700 text-[11px] truncate max-w-[160px]">
              {user?.email || 'admin'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Schema Verification Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Institutional PostgreSQL Schema Tables
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              12 primary relational tables verified via secure backend diagnostic proxy.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setTableFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  tableFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({tablesHealth.result?.tables.length ?? 12})
              </button>
              <button
                onClick={() => setTableFilter('verified')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  tableFilter === 'verified'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Verified ({tablesHealth.result?.verifiedCount ?? 0})
              </button>
              {tablesHealth.result && tablesHealth.result.verifiedCount < tablesHealth.result.totalTables && (
                <button
                  onClick={() => setTableFilter('issues')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    tableFilter === 'issues'
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Issues ({tablesHealth.result.totalTables - tablesHealth.result.verifiedCount})
                </button>
              )}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search table name..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {tablesHealth.error && !tablesHealth.result && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Health Verification Error</span>
                  <p className="mt-0.5 text-rose-700">{tablesHealth.error}</p>
                </div>
              </div>
              <button
                onClick={runFullDatabaseHealthCheck}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Table List Container */}
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
          {tablesHealth.checking && !tablesHealth.result ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-700 font-semibold">Querying 12 expected institutional tables...</p>
              <p className="text-[11px] text-slate-400">Executing safe, read-only exact count checks</p>
            </div>
          ) : (
            (() => {
              const rawList = tablesHealth.result?.tables || [];
              const filtered = rawList.filter((item) => {
                if (tableFilter === 'verified' && item.status !== 'Verified') return false;
                if (tableFilter === 'issues' && item.status === 'Verified') return false;
                if (
                  tableSearchQuery.trim() &&
                  !item.table.toLowerCase().includes(tableSearchQuery.toLowerCase().trim())
                ) {
                  return false;
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No tables matched the current filter or search criteria.
                  </div>
                );
              }

              return filtered.map((item) => {
                const meta = TABLE_METADATA[item.table as ExpectedTableName];
                const isVerified = item.status === 'Verified';
                const isDenied = item.status === 'Access Denied';
                const isMissing = item.status === 'Missing';

                return (
                  <div
                    key={item.table}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-slate-900 text-[12px]">
                          public.{item.table}
                        </span>
                        {meta && (
                          <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-sans">
                            {meta.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {meta?.description || 'Institutional schema record'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDenied
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : isMissing
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isDenied && <Lock className="w-3 h-3 text-amber-600" />}
                        {isMissing && <XCircle className="w-3 h-3 text-rose-600" />}
                        {!isVerified && !isDenied && !isMissing && (
                          <AlertCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span>{item.status}</span>
                      </span>

                      {/* Row Count */}
                      <div className="text-right min-w-[70px]">
                        {item.rowCount !== null && typeof item.rowCount === 'number' ? (
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            {item.rowCount.toLocaleString()}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">rows</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono italic block">
                            {isDenied ? 'Restricted' : 'N/A'}
                          </span>
                        )}
                        {item.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {item.latencyMs}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Action strip inside table panel */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>
              All table checks execute server-side with zero service-role credential disclosure to client.
            </span>
          </div>
          <button
            onClick={exportCSV}
            disabled={exportingCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exportingCsv ? 'Exporting...' : 'Export Dataset (CSV)'}</span>
          </button>
        </div>
      </div>
      </div>
      )}

      {/* Supabase Connection Test Modal */}
      <SupabaseConnectionModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConnectionStatusChange={setSupabaseConnected}
      />
    </div>
  );
};
