import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  History,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  platformService,
  formatCurrency,
  PLATFORM_PLANS,
} from '../../services/platformService';
import {
  PlatformSubscription,
  SubscriptionPlanTier,
  SubscriptionBillingInterval,
  SubscriptionStatus,
} from '../../types/platform';

interface PlatformSubscriptionsViewProps {
  currency: string;
}

export const PlatformSubscriptionsView: React.FC<PlatformSubscriptionsViewProps> = ({
  currency,
}) => {
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>(() =>
    platformService.getSubscriptions()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected subscription for Upgrade / Downgrade / Manage modal
  const [selectedSub, setSelectedSub] = useState<PlatformSubscription | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlanTier>('Enterprise');
  const [targetInterval, setTargetInterval] = useState<SubscriptionBillingInterval>('annual');

  // Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || sub.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleOpenManage = (sub: PlatformSubscription) => {
    setSelectedSub(sub);
    setTargetPlan(sub.plan);
    setTargetInterval(sub.billingInterval);
    setShowManageModal(true);
  };

  const handleConfirmPlanChange = () => {
    if (!selectedSub) return;
    platformService.upgradeSubscription(
      selectedSub.institutionId,
      targetPlan,
      targetInterval
    );
    setSubscriptions(platformService.getSubscriptions());
    setShowManageModal(false);
    setSelectedSub(null);
  };

  const handleConfirmCancel = () => {
    setCancelError(null);
    if (!selectedSub || !cancelReason.trim()) {
      setCancelError('Please state a reason for cancellation.');
      return;
    }
    platformService.cancelSubscription(selectedSub.institutionId, cancelReason);
    setSubscriptions(platformService.getSubscriptions());
    setShowCancelModal(false);
    setSelectedSub(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure plan tiers, monitor renewals, handle upgrades, and track institutional entitlements.
          </p>
        </div>
      </div>

      {/* Plans Overview Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORM_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`p-4 rounded-2xl border transition-all ${
              plan.recommended
                ? 'bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 border-violet-200 shadow-xs'
                : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
              {plan.recommended && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white uppercase">
                  Popular
                </span>
              )}
            </div>
            <div className="text-xl font-black text-slate-900 mb-1">
              {formatCurrency(currency === 'INR' ? plan.annualPriceINR : plan.annualPriceUSD, currency)}
              <span className="text-xs font-normal text-slate-500"> / year</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug mb-3">{plan.description}</p>
            <div className="text-[11px] font-semibold text-slate-700 space-y-1">
              <div>• Quota: {plan.studentQuota} Active Students</div>
              <div>• {plan.features[1]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions by institution..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Past Due">Past Due</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Subscription & Institution</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Pricing</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-bold text-slate-900">{sub.institutionName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sub.id}</div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        sub.plan === 'Enterprise'
                          ? 'bg-purple-100 text-purple-700'
                          : sub.plan === 'Professional'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {sub.plan}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 capitalize font-medium">{sub.billingInterval}</td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatCurrency(sub.amount, currency)}
                  </td>

                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-medium text-slate-800">
                        {new Date(sub.renewalDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sub.autoRenew ? 'Auto-renew enabled' : 'Manual renewal'}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        sub.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sub.status === 'Trial'
                          ? 'bg-amber-100 text-amber-800'
                          : sub.status === 'Past Due'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenManage(sub)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Manage Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manage Plan (Upgrade / Downgrade / Interval Change) */}
      {showManageModal && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-100 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Manage Subscription: {selectedSub.institutionName}
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Plan Tier</label>
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as SubscriptionPlanTier)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="Basic">Basic (Up to 250 Students)</option>
                  <option value="Professional">Professional (Up to 750 Students)</option>
                  <option value="Enterprise">Enterprise (Up to 2,500 Students)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Interval</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetInterval('annual')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      targetInterval === 'annual'
                        ? 'bg-violet-50 border-violet-500 text-violet-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Annual (Save ~16%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetInterval('monthly')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      targetInterval === 'monthly'
                        ? 'bg-violet-50 border-violet-500 text-violet-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* History Preview */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subscription Audit Trail</label>
                <div className="bg-slate-50 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1.5 text-[11px] border border-slate-100">
                  {selectedSub.history.length === 0 ? (
                    <span className="text-slate-400 italic">No previous modifications.</span>
                  ) : (
                    selectedSub.history.map((h) => (
                      <div key={h.id} className="text-slate-600">
                        <span className="text-slate-400 font-mono">{new Date(h.date).toLocaleDateString()}:</span>{' '}
                        <strong>{h.action}</strong> - {h.note}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setShowCancelModal(true);
                }}
                className="text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Cancel Subscription
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPlanChange}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save & Apply Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Subscription */}
      {showCancelModal && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-100 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Cancel Subscription</h3>
            </div>
            {cancelError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {cancelError}
              </div>
            )}
            <p className="text-slate-600 mb-3">
              Are you sure you want to cancel the subscription for{' '}
              <strong>{selectedSub.institutionName}</strong>? The institution's access will be
              suspended upon confirmation.
            </p>
            <div className="mb-4">
              <label className="font-semibold text-slate-700 block mb-1">Reason for cancellation *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Non-renewal, customer requested termination..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
