import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Zap,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Users,
  BrainCircuit,
  Lock,
  Edit3,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  PLATFORM_PLANS,
  formatCurrency,
} from '../../services/platformService';
import { fetchAvailablePlans, updatePlanConfiguration, PlanFeatureDefinition } from '../../services/subscriptionService';

interface PlatformPlansViewProps {
  currency: string;
}

export const PlatformPlansView: React.FC<PlatformPlansViewProps> = ({ currency }) => {
  const [plans, setPlans] = useState<any[]>(PLATFORM_PLANS);
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit modal state
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const fetched = await fetchAvailablePlans();
      if (fetched && fetched.length > 0) {
        setPlans(fetched);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSavePlan = async (updatedPlan: any) => {
    // Validate max annual price <= 300,000
    if (updatedPlan.annualPriceINR > 300000) {
      setErrorMsg('Annual price cannot exceed ₹3,00,000.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const newPlans = plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p));
      const res = await updatePlanConfiguration(newPlans);
      if (res.success) {
        setPlans(newPlans);
        setSuccessMsg(`Plan "${updatedPlan.name}" successfully updated and synchronized across Landing Page & Institution Admin.`);
        setEditingPlan(null);
        setTimeout(() => setSuccessMsg(null), 6000);
      } else {
        setErrorMsg(res.error || res.message || 'Failed to save plan configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving plan configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Super Admin: Subscription Plans & Pricing</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official SaaS tier pricing, student quotas, and feature entitlements synchronized across the Public Landing Page and Institution Admin consoles.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Annual / Monthly Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Billing
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 text-xs shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Synchronization Successful</p>
            <p>{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Configuration Notice</p>
            <p>{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700">✕</button>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const annualINR = plan.annualPriceINR ?? 0;
          const monthlyINR = plan.monthlyPriceINR ?? 0;
          const price = currency === 'INR'
            ? (billingCycle === 'annual' ? annualINR : monthlyINR)
            : (billingCycle === 'annual' ? (plan.annualPriceUSD || Math.round(annualINR / 83)) : (plan.monthlyPriceUSD || Math.round(monthlyINR / 83)));

          const studentLimit = plan.studentLimit || plan.studentQuota || 250;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between transition-all bg-white ${
                plan.recommended
                  ? 'border-violet-500 shadow-md ring-2 ring-violet-500/10'
                  : 'border-slate-200/80 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                    Up to {studentLimit.toLocaleString()} students
                  </span>
                  {plan.recommended && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-slate-900">{plan.name} Tier</h3>

                <div className="my-3">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {formatCurrency(price, currency)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium"> / {billingCycle === 'annual' ? 'year' : 'month'}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-5">{plan.description}</p>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Included Entitlements
                  </div>
                  {plan.features?.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan({ ...plan })}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Configure {plan.name} Plan Pricing & Quota</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Configure {editingPlan.name} Plan</h3>
                  <p className="text-xs text-slate-500">Updates propagate instantly to Landing Page and Institution Admin.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Price (INR) [Max ₹3,00,000]</label>
                <input
                  type="number"
                  value={editingPlan.annualPriceINR}
                  onChange={(e) => setEditingPlan({ ...editingPlan, annualPriceINR: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Price (INR)</label>
                <input
                  type="number"
                  value={editingPlan.monthlyPriceINR}
                  onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPriceINR: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Quota / Limit</label>
                <input
                  type="number"
                  value={editingPlan.studentLimit || editingPlan.studentQuota}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setEditingPlan({ ...editingPlan, studentLimit: val, studentQuota: val });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-slate-900 font-bold focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSavePlan(editingPlan)}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? 'Saving & Synchronizing...' : 'Save & Publish Globally'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
