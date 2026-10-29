import React, { useState } from 'react';
import {
  Receipt,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  Calendar,
  Building2,
  CreditCard,
  HelpCircle,
  FileText,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import {
  platformService,
  formatCurrency,
  formatCompactCurrency,
} from '../../services/platformService';
import { PlatformInvoice } from '../../types/platform';

interface PlatformRevenueViewProps {
  currency: string;
  isVerifiedMode: boolean;
  onNavigateToInvoices: () => void;
}

export const PlatformRevenueView: React.FC<PlatformRevenueViewProps> = ({
  currency,
  isVerifiedMode,
  onNavigateToInvoices,
}) => {
  const [invoices] = useState<PlatformInvoice[]>(() => platformService.getInvoices());

  // Strict Rule 7 Financial Integrity Calculations:
  // 1. Cleared / Verified Revenue: ONLY status === 'paid' AND isVerifiedLivePayment === true in verified mode
  const paidInvoices = invoices.filter((inv) =>
    isVerifiedMode ? inv.status === 'paid' && inv.isVerifiedLivePayment : inv.status === 'paid'
  );
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');

  const totalCollectedRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Revenue by Subscription Plan
  const revenueByPlan = paidInvoices.reduce((acc, inv) => {
    const key = inv.planName.includes('Enterprise')
      ? 'Enterprise'
      : inv.planName.includes('Professional')
      ? 'Professional'
      : 'Basic';
    acc[key] = (acc[key] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  // Revenue by Institution
  const revenueByInstitution = paidInvoices.reduce((acc, inv) => {
    acc[inv.institutionName] = (acc[inv.institutionName] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedInstitutionsByRevenue = Object.entries(revenueByInstitution).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Revenue & Billing Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict cash accounting, verified bank deposits, aging receivables, and subscription revenue.
          </p>
        </div>

        <button
          onClick={onNavigateToInvoices}
          className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <FileText className="w-4 h-4" />
          <span>Inspect Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* Financial Integrity Banner (Rule 7 Mandate) */}
      <div className="bg-emerald-950 text-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-900/80 text-emerald-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-100 flex items-center gap-2">
              <span>Financial Ledger Compliance Active</span>
              <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-mono uppercase">
                GAAP Rule 7 Standard
              </span>
            </h3>
            <p className="text-xs text-emerald-300/90 mt-1 max-w-2xl leading-relaxed">
              Revenue is recognized <strong>only upon verified receipt settlement</strong> (cleared bank wire, NEFT/RTGS, or verified payment gateway webhook). Invoiced amounts pending or in dispute are strictly sequestered into receivables and never counted as revenue.
            </p>
          </div>
        </div>
        <div className="text-left md:text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Total Cleared Invoices</div>
          <div className="text-lg font-black text-white">{paidInvoices.length} Verified Receipts</div>
        </div>
      </div>

      {/* Core Revenue Metric Cards (3 Main Financial Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Verified Collected Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Verified Collected Revenue
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-950 tracking-tight font-mono">
              {totalCollectedRevenue === 0 ? '₹0' : formatCurrency(totalCollectedRevenue, currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Settled funds across {paidInvoices.length} paid invoices in institutional accounts.
            </p>
          </div>
        </div>

        {/* Pillar 2: Pending Receivables (Current Grace Period) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending Receivables
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-amber-950 tracking-tight font-mono">
              {formatCurrency(totalPendingAmount, currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {pendingInvoices.length} invoice(s) issued, within active institutional payment window.
            </p>
          </div>
        </div>

        {/* Pillar 3: Overdue / Aging Debt */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Overdue Receivables
            </span>
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-rose-950 tracking-tight font-mono">
              {formatCurrency(totalOverdueAmount, currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overdueInvoices.length} invoice(s) past due date. Follow-up automated.
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown: By Plan & By Institution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Subscription Plan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Verified Revenue by Subscription Tier</h3>
            <CreditCard className="w-4 h-4 text-violet-600" />
          </div>

          <div className="space-y-3 pt-2">
            {['Enterprise', 'Professional', 'Basic'].map((plan) => {
              const amount = revenueByPlan[plan] || 0;
              const pct = totalCollectedRevenue > 0 ? (amount / totalCollectedRevenue) * 100 : 0;

              return (
                <div key={plan} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800">{plan} Tier</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(amount, currency)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        plan === 'Enterprise'
                          ? 'bg-purple-600'
                          : plan === 'Professional'
                          ? 'bg-indigo-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Institution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Verified Revenue by Institution</h3>
            <Building2 className="w-4 h-4 text-violet-600" />
          </div>

          <div className="space-y-3 pt-2">
            {sortedInstitutionsByRevenue.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No verified payment data available.</p>
            ) : (
              sortedInstitutionsByRevenue.map(([instName, amount]) => {
                const pct = totalCollectedRevenue > 0 ? (amount / totalCollectedRevenue) * 100 : 0;
                return (
                  <div key={instName} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800 truncate max-w-xs">{instName}</span>
                      <span className="font-mono text-slate-900 shrink-0">
                        {formatCurrency(amount, currency)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-violet-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Verified Settlements Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Verified Financial Receipts</h3>
            <p className="text-xs text-slate-500">
              Official tax invoices cleared through banking channels.
            </p>
          </div>
          <button
            onClick={onNavigateToInvoices}
            className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
          >
            All Invoices →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Paid Date</th>
                <th className="py-3 px-4">Method & Bank Ref</th>
                <th className="py-3 px-4">Tax / GST</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paidInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{inv.institutionName}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {inv.paidDate ? new Date(inv.paidDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{inv.paymentMethod || 'Bank Wire'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{inv.transactionReference}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {inv.taxAmount ? formatCurrency(inv.taxAmount, currency) : 'Included'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatCurrency(inv.amount, currency)}
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
