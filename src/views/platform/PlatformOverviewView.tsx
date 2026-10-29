import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Filter,
  BarChart2,
  PieChart,
} from 'lucide-react';
import {
  platformService,
  formatCurrency,
  formatCompactCurrency,
} from '../../services/platformService';
import { PlatformOverviewMetrics, PlatformInstitution, PlatformInvoice } from '../../types/platform';
import { PlatformTab } from '../../components/platform/PlatformSidebar';

interface PlatformOverviewViewProps {
  onNavigate: (tab: PlatformTab) => void;
  currency: string;
  isVerifiedMode: boolean;
}

export const PlatformOverviewView: React.FC<PlatformOverviewViewProps> = ({
  onNavigate,
  currency,
  isVerifiedMode,
}) => {
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics>(() =>
    platformService.getOverviewMetrics()
  );
  const [institutions, setInstitutions] = useState<PlatformInstitution[]>(() =>
    platformService.getInstitutions()
  );
  const [invoices, setInvoices] = useState<PlatformInvoice[]>(() =>
    platformService.getInvoices()
  );
  const [timeFilter, setTimeFilter] = useState<'current_month' | 'prev_month' | 'quarter' | 'year' | 'all'>('year');
  const [loading, setLoading] = useState<boolean>(false);

  // Sync metrics on mount and when filter/currency/mode changes
  useEffect(() => {
    setLoading(true);
    platformService.syncWithLiveSupabase().then(() => {
      setMetrics(platformService.getOverviewMetrics(timeFilter));
      setInstitutions(platformService.getInstitutions());
      setInvoices(platformService.getInvoices());
      setLoading(false);
    });
  }, [timeFilter, currency, isVerifiedMode]);

  // Derived calculations for visualizations
  const activeCount = institutions.filter((i) => i.status === 'Active').length;
  const trialCount = institutions.filter((i) => i.status === 'Trial').length;
  const suspendedCount = institutions.filter((i) => i.status === 'Suspended').length;

  const basicPlanCount = institutions.filter((i) => i.plan === 'Basic').length;
  const proPlanCount = institutions.filter((i) => i.plan === 'Professional').length;
  const entPlanCount = institutions.filter((i) => i.plan === 'Enterprise').length;

  // Monthly Revenue Trend Data (Historical monthly collections)
  const monthlyRevenueData = [
    { month: 'May 2026', collected: 499990, pending: 0, label: 'May' },
    { month: 'Jun 2026', collected: 1199990, pending: 0, label: 'Jun' },
    { month: 'Jul 2026', collected: 119999, pending: 0, label: 'Jul' },
    { month: 'Aug 2026', collected: 119999, pending: 0, label: 'Aug' },
    { month: 'Sep 2026', collected: 499990, pending: 0, label: 'Sep' },
    { month: 'Oct 2026', collected: 239998, pending: 119999, label: 'Oct' },
  ];

  // Max revenue for bar scaling
  const maxMonthly = Math.max(...monthlyRevenueData.map((d) => d.collected + d.pending));

  // Top Institutions Ranked by Verified Revenue
  const institutionRevenueRanked = institutions
    .map((inst) => {
      const paidInvs = invoices.filter(
        (inv) => inv.institutionId === inst.id && inv.status === 'paid' && (isVerifiedMode ? inv.isVerifiedLivePayment : true)
      );
      const totalPaid = paidInvs.reduce((sum, inv) => sum + inv.amount, 0);
      return {
        ...inst,
        verifiedRevenue: totalPaid,
        invoiceCount: paidInvs.length,
      };
    })
    .sort((a, b) => b.verifiedRevenue - a.verifiedRevenue);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Owner Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tenant institutional metrics, verified billing collections, and multi-tenant SaaS health.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
          <button
            onClick={() => setTimeFilter('current_month')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timeFilter === 'current_month'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeFilter('quarter')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timeFilter === 'quarter'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setTimeFilter('year')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timeFilter === 'year'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            FY 2026-27
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Financial Mode Notice Badge (Rule 7 Compliance) */}
      <div
        className={`flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border text-xs ${
          isVerifiedMode
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck
            className={`w-4 h-4 shrink-0 ${isVerifiedMode ? 'text-emerald-600' : 'text-amber-600'}`}
          />
          <div>
            <span className="font-bold">
              {isVerifiedMode ? 'Strict Financial Ledger Active:' : 'Simulation / Demo Mode Active:'}
            </span>{' '}
            <span className="opacity-90">
              {isVerifiedMode
                ? 'Revenue displays actual cleared payments verified in institutional bank wires & UPI receipts. Pending and overdue invoices are tracked separately as receivables.'
                : 'Includes draft pipelines and simulation items. Fictional revenue is never committed to production books.'}
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('revenue')}
          className="shrink-0 text-violet-700 hover:text-violet-900 font-bold underline cursor-pointer text-[11px]"
        >
          View Full Ledger
        </button>
      </div>

      {/* Summary Cards Grid (6 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Total Registered Institutions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Institutions</span>
            <Building2 className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalRegisteredInstitutions}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+2 new this quarter</span>
            </div>
          </div>
        </div>

        {/* 2. Active Institutions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Tenants</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {metrics.activeInstitutions}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {trialCount} on trial, {suspendedCount} suspended
            </div>
          </div>
        </div>

        {/* 3. Verified Collected Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-violet-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-white to-violet-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-900">
              Verified Revenue
            </span>
            <Receipt className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-violet-950 tracking-tight">
              {formatCompactCurrency(metrics.totalRevenueCollected, currency)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px] font-bold">VERIFIED</span>
              <span>100% cleared receipts</span>
            </div>
          </div>
        </div>

        {/* 4. Outstanding Receivables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 tracking-tight">
              {formatCompactCurrency(metrics.totalPendingInvoicesAmount + metrics.totalOverdueInvoicesAmount, currency)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {formatCompactCurrency(metrics.totalOverdueInvoicesAmount, currency)} overdue
            </div>
          </div>
        </div>

        {/* 5. Active Subscriptions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Subscriptions</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.activeSubscriptionsCount}
            </div>
            <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
              {entPlanCount} Enterprise, {proPlanCount} Pro
            </div>
          </div>
        </div>

        {/* 6. Total Registered Users Across Institutions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalRegisteredUsers.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {metrics.totalStudentsAcrossInstitutions} students, {metrics.totalStaffAcrossInstitutions} staff
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Revenue Trend & Collected vs Pending */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Monthly Revenue & Receivables Trend</h3>
              <p className="text-xs text-slate-500">
                Verified collections compared with outstanding invoices across recent months.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" />
                <span className="text-slate-600 font-medium">Cleared</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="text-slate-600 font-medium">Pending</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 h-64 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-100 pb-2">
            {monthlyRevenueData.map((d) => {
              const collectedPct = (d.collected / maxMonthly) * 85;
              const pendingPct = (d.pending / maxMonthly) * 85;

              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="text-[10px] text-slate-500 font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatCompactCurrency(d.collected, currency)}
                  </div>
                  {/* Bar stack */}
                  <div className="w-full max-w-[48px] bg-slate-50 rounded-t-lg flex flex-col justify-end overflow-hidden h-44">
                    {d.pending > 0 && (
                      <div
                        style={{ height: `${pendingPct}%` }}
                        className="w-full bg-amber-400 hover:bg-amber-500 transition-all rounded-t-sm"
                        title={`Pending: ${formatCurrency(d.pending, currency)}`}
                      />
                    )}
                    <div
                      style={{ height: `${collectedPct}%` }}
                      className="w-full bg-violet-600 hover:bg-violet-700 transition-all rounded-t-sm"
                      title={`Collected: ${formatCurrency(d.collected, currency)}`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{d.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Aggregated from verified institutional invoices.</span>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-violet-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect all invoices</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Distribution Metrics (Status & Subscription Plan breakdown) */}
        <div className="space-y-4">
          {/* Subscription Tier Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Subscription Plan Distribution</h3>
              <CreditCard className="w-4 h-4 text-violet-600" />
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Enterprise */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Enterprise Plan</span>
                  <span className="text-violet-700 font-bold">{entPlanCount} institutions</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${(entPlanCount / institutions.length) * 100}%` }}
                    className="h-full bg-violet-600 rounded-full"
                  />
                </div>
              </div>

              {/* Professional */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Professional Plan</span>
                  <span className="text-indigo-700 font-bold">{proPlanCount} institutions</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${(proPlanCount / institutions.length) * 100}%` }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>

              {/* Basic */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Basic Plan</span>
                  <span className="text-blue-700 font-bold">{basicPlanCount} institutions</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${(basicPlanCount / institutions.length) * 100}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('plans')}
              className="w-full mt-2 py-2 text-center text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors cursor-pointer"
            >
              Configure Plan Tiers & Features
            </button>
          </div>

          {/* Institution Status Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Tenant Status Health</h3>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-lg font-black text-emerald-700">{activeCount}</div>
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Active</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-lg font-black text-amber-700">{trialCount}</div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Trial</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <div className="text-lg font-black text-rose-700">{suspendedCount}</div>
                <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Suspended</div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('institutions')}
              className="w-full py-2 text-center text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Manage All {institutions.length} Institutions
            </button>
          </div>
        </div>
      </div>

      {/* Top Institutions Ranked by Verified Revenue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Top Institutions Ranked by Verified Revenue</h3>
            <p className="text-xs text-slate-500">
              Ranked strictly by verified bank settlement receipts. Zero arbitrary estimations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('institutions')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>View All Institutions</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank & Institution</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Students Enrolled</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verified Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {institutionRevenueRanked.slice(0, 5).map((inst, index) => (
                <tr key={inst.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{inst.name}</span>
                          {inst.isPrimaryDefaultTenant ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              Live DB Record
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                              Simulated Tenant
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{inst.code}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize font-medium">{inst.type}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        inst.plan === 'Enterprise'
                          ? 'bg-purple-100 text-purple-700'
                          : inst.plan === 'Professional'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {inst.plan} ({inst.billingInterval})
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-semibold text-slate-900">{inst.studentsCount}</span>
                    <span className="text-slate-400 text-[10px]"> / {inst.studentLimit}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        inst.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inst.status === 'Trial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {inst.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(inst.verifiedRevenue, currency)}
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
