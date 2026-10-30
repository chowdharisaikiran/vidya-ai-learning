import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Calendar,
  Users,
  ShieldCheck,
  Sparkles,
  Zap,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Check,
  Building,
  History,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  fetchInstitutionSubscription,
  changeInstitutionSubscription,
  createRazorpayOrder,
  verifyRazorpayPayment,
  AVAILABLE_PLANS,
  formatINR,
  getPlanTierRank,
  InstitutionSubscriptionDetails,
  PlanFeatureDefinition,
} from '../../services/subscriptionService';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AdminSubscriptionViewProps {
  onNavigate?: (tab: string) => void;
}

export const AdminSubscriptionView: React.FC<AdminSubscriptionViewProps> = ({ onNavigate }) => {
  const [subscription, setSubscription] = useState<InstitutionSubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Billing interval toggle for plan pricing display
  const [selectedCycle, setSelectedCycle] = useState<'Yearly' | 'Monthly'>('Yearly');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<PlanFeatureDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInstitutionSubscription();
      if (res.error && !res.data) {
        setError(res.error);
      } else if (res.data) {
        setSubscription(res.data);
        if (res.data.billingCycle) {
          setSelectedCycle(res.data.billingCycle);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleOpenModal = (plan: PlanFeatureDefinition) => {
    setTargetPlan(plan);
    setModalError(null);
    setShowModal(true);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleConfirmChange = async () => {
    if (!targetPlan || !subscription || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      // 1. Create secure order on backend
      const orderRes = await createRazorpayOrder(targetPlan.name, selectedCycle);

      if (!orderRes.success || !orderRes.orderId) {
        // Fallback to simulated change if order creation fails or offline
        const res = await changeInstitutionSubscription(targetPlan.name, selectedCycle);
        if (res.success) {
          setSuccessMessage(res.message || `Subscription successfully updated to ${targetPlan.name}.`);
          if (res.subscription) setSubscription(res.subscription);
          else await loadSubscription();
          setShowModal(false);
          setTargetPlan(null);
          setTimeout(() => setSuccessMessage(null), 6000);
        } else {
          setModalError(res.error || res.message || 'Operation failed.');
        }
        setIsSubmitting(false);
        return;
      }

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        // Fallback if Razorpay SDK fails to load
        const res = await changeInstitutionSubscription(targetPlan.name, selectedCycle);
        if (res.success) {
          setSuccessMessage(res.message || `Subscription updated to ${targetPlan.name} (Sandbox mode).`);
          if (res.subscription) setSubscription(res.subscription);
          else await loadSubscription();
          setShowModal(false);
          setTargetPlan(null);
        } else {
          setModalError('Failed to load Razorpay Checkout SDK.');
        }
        setIsSubmitting(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: orderRes.keyId || 'rzp_test_mockkeyid123',
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'Vidya EdTech Platform',
        description: `Institutional Plan: ${targetPlan.name} (${selectedCycle})`,
        order_id: orderRes.orderId,
        prefill: {
          name: subscription.institutionName || 'Vidya Admin',
          email: 'admin@vidya.edu',
          contact: '9999999999',
        },
        notes: {
          institutionId: subscription.institutionId,
          targetPlan: targetPlan.name,
          billingCycle: selectedCycle,
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              targetPlan: targetPlan.name,
              billingCycle: selectedCycle,
            });

            if (verifyRes.success) {
              setSuccessMessage(verifyRes.message || `Payment verified successfully! Plan updated to ${targetPlan.name}.`);
              if (verifyRes.subscription) {
                setSubscription(verifyRes.subscription);
              } else {
                await loadSubscription();
              }
              setShowModal(false);
              setTargetPlan(null);
              setTimeout(() => setSuccessMessage(null), 6000);
            } else {
              setModalError(verifyRes.error || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            setModalError(verifyErr?.message || 'Error processing payment verification.');
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setModalError(err?.message || 'A network error occurred while initiating payment.');
      setIsSubmitting(false);
    }
  };

  // Helper calculations
  const currentPlanName = subscription?.plan || 'Enterprise';
  const currentRank = getPlanTierRank(currentPlanName);
  const activeStudents = subscription?.activeStudents ?? 297;
  const studentLimit = subscription?.studentLimit ?? 2500;
  const usagePercentage = Math.min(100, Math.round((activeStudents / Math.max(1, studentLimit)) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Subscription & License Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional tier governance, active student quotas, billing periods, and plan transitions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadSubscription}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Reload subscription status"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Global Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 text-xs shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-900">Subscription Updated</p>
            <p className="mt-0.5 text-emerald-800">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900">Subscription Notice</p>
            <p className="mt-0.5 text-rose-800">{error}</p>
          </div>
          <button
            onClick={loadSubscription}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-rose-300 rounded-lg text-rose-800 hover:bg-rose-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !subscription && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800">Loading Institutional Subscription Details...</h4>
        </div>
      )}

      {/* SECTION 1: CURRENT SUBSCRIPTION SUMMARY CARD */}
      {subscription && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-7 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                    Current Plan: {subscription.plan}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      subscription.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        : subscription.status === 'Trial'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                    }`}
                  >
                    ● {subscription.status}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Billing Cycle: {subscription.billingCycle}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {subscription.institutionName}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tenant Code: <strong className="font-mono text-white">{subscription.institutionCode}</strong></span>
                  <span>·</span>
                  <span>ID: <strong className="font-mono text-white">{subscription.institutionId}</strong></span>
                </p>
              </div>

              {/* Price & Renewal Pill */}
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs text-right md:min-w-[220px]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Current Investment
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-0.5">
                  {formatINR(subscription.amount)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Renews: {new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics & Student Usage Bar */}
          <div className="p-6 sm:p-7 bg-slate-50/50 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Quota Usage */}
              <div className="md:col-span-2 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Active Student Roster Usage</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeStudents.toLocaleString()} / {studentLimit.toLocaleString()} Students ({usagePercentage}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercentage > 95
                        ? 'bg-rose-500'
                        : usagePercentage > 80
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, usagePercentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Headroom available: <strong className="text-slate-700 font-mono">{Math.max(0, studentLimit - activeStudents).toLocaleString()} student seats</strong>
                  </span>
                  {activeStudents > studentLimit && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Quota Exceeded
                    </span>
                  )}
                  {activeStudents <= studentLimit && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Within plan entitlement
                    </span>
                  )}
                </div>
              </div>

              {/* Start Date & Term */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs text-xs space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Contract Period
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Start Date:</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {new Date(subscription.startDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Next Renewal:</span>
                  <span className="font-medium text-slate-900 font-mono">
                    {new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-600">Auto-Renew:</span>
                  <span className="text-emerald-700 font-semibold font-mono">
                    {subscription.autoRenew ? 'Enabled (Annual)' : 'Manual Review'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-600">Payment Channel:</span>
                  {subscription.paymentGatewayConfigured ? (
                    <span className="text-emerald-700 font-semibold font-mono">Live Provider ({subscription.gatewayName || 'Verified'})</span>
                  ) : (
                    <span className="text-amber-700 font-medium font-mono">Sandbox (Simulated)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: AVAILABLE PLANS COMPARISON */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span>Available Institutional Plans</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select an institutional tier to upgrade capacity or modify your deployment footprint.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedCycle('Monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCycle === 'Monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle('Yearly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCycle === 'Yearly'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Yearly (Annual)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                selectedCycle === 'Yearly' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Save ~17%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = currentPlanName.toLowerCase() === plan.name.toLowerCase();
            const planRank = getPlanTierRank(plan.name);
            const isUpgrade = planRank > currentRank;
            const isDowngrade = planRank < currentRank;
            const price = selectedCycle === 'Yearly' ? plan.annualPriceINR : plan.monthlyPriceINR;
            const priceSub = selectedCycle === 'Yearly' ? '/ year' : '/ month';

            // Check if student count exceeds quota in case of downgrade
            const wouldExceedLimit = activeStudents > plan.studentLimit;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                  isCurrent
                    ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Header ribbon for Current or Recommended plan */}
                {isCurrent && (
                  <div className="bg-indigo-600 text-white text-center py-1 text-[11px] font-bold uppercase tracking-wider">
                    ★ Current Plan in Use
                  </div>
                )}
                {!isCurrent && plan.recommended && (
                  <div className="bg-slate-900 text-white text-center py-1 text-[11px] font-bold uppercase tracking-wider">
                    Most Popular for Colleges
                  </div>
                )}

                <div className="p-6 sm:p-7 space-y-5 flex-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {plan.name}
                      </h4>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        Up to {plan.studentLimit.toLocaleString()} students
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 font-mono">
                        {formatINR(price)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{priceSub}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-slate-400">
                        {selectedCycle === 'Yearly' ? 'Billed annually with volume entitlement' : 'Billed monthly recurring'}
                      </span>
                      {selectedCycle === 'Yearly' && (() => {
                        const annualTotalFromMonthly = plan.monthlyPriceINR * 12;
                        const savingsAmount = annualTotalFromMonthly - plan.annualPriceINR;
                        const savingsPct = savingsAmount > 0 ? Math.round((savingsAmount / annualTotalFromMonthly) * 100) : 0;
                        if (savingsPct <= 0) return null;
                        return (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Save {savingsPct}% ({formatINR(savingsAmount)})
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Included Capabilities
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button Section */}
                <div className="p-6 pt-0">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Current Plan</span>
                    </button>
                  ) : isUpgrade ? (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(plan)}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
                    >
                      <span>Upgrade to {plan.name}</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(plan)}
                      className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 border border-slate-300 shadow-2xs transition-all cursor-pointer group"
                    >
                      <span>Downgrade to {plan.name}</span>
                      <ArrowDownRight className="w-4 h-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                    </button>
                  )}

                  {!isCurrent && (
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                      {subscription?.paymentGatewayConfigured
                        ? 'Billed via live payment gateway'
                        : 'Simulated change · No payment required'}
                    </p>
                  )}

                  {wouldExceedLimit && !isCurrent && (
                    <p className="text-[11px] text-amber-700 mt-2 text-center font-medium">
                      ⚠️ Current roster ({activeStudents} students) exceeds this plan's {plan.studentLimit} limit.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SUBSCRIPTION HISTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-4 h-4 text-slate-700" />
              <span>Subscription & Plan Change History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of institutional plan enrollments, upgrades, downgrades, and billing cycles.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {subscription?.history?.length ?? 0} Recorded Event(s)
          </span>
        </div>

        {subscription?.history && subscription.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Date & Time</th>
                  <th className="pb-3 px-3">Action</th>
                  <th className="pb-3 px-3">Plan Transition</th>
                  <th className="pb-3 px-3">Billing Cycle</th>
                  <th className="pb-3 px-3">Contract Value</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscription.history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(item.date).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {item.action}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {item.previousPlan && item.previousPlan !== 'None' ? (
                          <>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {item.previousPlan}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </>
                        ) : null}
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60">
                          {item.newPlan}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {item.billingCycle || 'Yearly'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {formatINR(item.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ● {item.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={item.note}>
                      {item.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No historical subscription events recorded for this institutional workspace.
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR PLAN CHANGES */}
      {showModal && targetPlan && subscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  getPlanTierRank(targetPlan.name) > currentRank ? 'bg-indigo-600' : 'bg-slate-800'
                }`}>
                  {getPlanTierRank(targetPlan.name) > currentRank ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Confirm {getPlanTierRank(targetPlan.name) > currentRank ? 'Plan Upgrade' : 'Plan Change'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review institutional license change details before confirmation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && setShowModal(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Error in modal if any */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Change Failed</p>
                  <p>{modalError}</p>
                </div>
              </div>
            )}

            {/* Plan Comparison Summary */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
                <p className="font-bold text-slate-900 text-sm">{subscription.plan}</p>
                <p className="font-mono text-slate-600">{formatINR(subscription.amount)} / {subscription.billingCycle.toLowerCase()}</p>
                <p className="text-[11px] text-slate-500">Limit: {subscription.studentLimit.toLocaleString()} students</p>
              </div>

              <div className="space-y-1 pl-3 border-l border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Selected Plan</span>
                <p className="font-bold text-indigo-900 text-sm">{targetPlan.name}</p>
                <p className="font-mono font-semibold text-slate-900">
                  {formatINR(selectedCycle === 'Yearly' ? targetPlan.annualPriceINR : targetPlan.monthlyPriceINR)} / {selectedCycle.toLowerCase()}
                </p>
                <p className="text-[11px] text-slate-600">Limit: {targetPlan.studentLimit.toLocaleString()} students</p>
              </div>
            </div>

            {/* Price Difference & Calculation */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Price Difference:</span>
                <span className="font-mono font-bold text-slate-900">
                  {(() => {
                    const targetPrice = selectedCycle === 'Yearly' ? targetPlan.annualPriceINR : targetPlan.monthlyPriceINR;
                    const diff = targetPrice - subscription.amount;
                    if (diff > 0) return `+${formatINR(diff)} (${selectedCycle})`;
                    if (diff < 0) return `-${formatINR(Math.abs(diff))} (${selectedCycle})`;
                    return '₹0 (No price change)';
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Billing Interval:</span>
                <span className="font-semibold text-slate-800">{selectedCycle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Effective Date:</span>
                <span className="font-semibold text-slate-800">
                  {getPlanTierRank(targetPlan.name) > currentRank
                    ? 'Immediate (Upgrade)'
                    : `Next Renewal (${new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })})`}
                </span>
              </div>
            </div>

            {/* Effective explanation */}
            <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>When does this change take effect?</span>
              </p>
              {getPlanTierRank(targetPlan.name) > currentRank ? (
                <p>
                  <strong>Upgrades take effect immediately.</strong> Your institutional student limit increases to{' '}
                  <span className="font-semibold text-slate-900">{targetPlan.studentLimit.toLocaleString()} students</span>{' '}
                  with immediate access to higher-tier machine learning and analytics features.
                </p>
              ) : (
                <p>
                  <strong>Downgrades:</strong> Quota and billing changes align with your next renewal date ({new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}).
                </p>
              )}

              {activeStudents > targetPlan.studentLimit && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium text-[11px] mt-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Warning: Your current active student roster ({activeStudents}) exceeds the {targetPlan.name} limit of {targetPlan.studentLimit}.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChange}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSubmitting
                    ? 'Processing Change...'
                    : subscription.paymentGatewayConfigured
                    ? `Confirm & Pay for ${getPlanTierRank(targetPlan.name) > currentRank ? 'Upgrade' : 'Plan Change'}`
                    : `Confirm Simulated ${getPlanTierRank(targetPlan.name) > currentRank ? 'Upgrade' : 'Plan Change'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
