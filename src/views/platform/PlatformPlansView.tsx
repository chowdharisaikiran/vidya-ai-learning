import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  PLATFORM_PLANS,
  formatCurrency,
} from '../../services/platformService';

interface PlatformPlansViewProps {
  currency: string;
}

export const PlatformPlansView: React.FC<PlatformPlansViewProps> = ({ currency }) => {
  const [plans] = useState(PLATFORM_PLANS);
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Plans & Feature Entitlements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional SaaS tiers, feature gates, quotas, and pricing.
          </p>
        </div>

        {/* Annual / Monthly Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Billing (Save ~16%)
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

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price =
            currency === 'INR'
              ? billingCycle === 'annual'
                ? plan.annualPriceINR
                : plan.monthlyPriceINR
              : billingCycle === 'annual'
              ? plan.annualPriceUSD
              : plan.monthlyPriceUSD;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                plan.recommended
                  ? 'bg-white border-violet-400 shadow-lg ring-2 ring-violet-500/10'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name} Tier</h3>
                  {plan.recommended && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {formatCurrency(price, currency)}
                  </span>
                  <span className="text-xs text-slate-500"> / {billingCycle === 'annual' ? 'year' : 'month'}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-6">{plan.description}</p>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Included Entitlements
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    plan.recommended
                      ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  Configure Entitlement Rules
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Matrix Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Feature Comparison Matrix</h3>
          <p className="text-xs text-slate-500">Cross-tenant capability gates enforced across school portals.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Feature / Capability</th>
                <th className="py-3 px-4">Basic</th>
                <th className="py-3 px-4">Professional</th>
                <th className="py-3 px-4">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-semibold">Student Quota per Tenant</td>
                <td className="py-3 px-4 font-mono">250</td>
                <td className="py-3 px-4 font-mono font-bold text-indigo-700">750</td>
                <td className="py-3 px-4 font-mono font-bold text-purple-700">2,500+</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">AI Academic Risk Forecasting (22 Feature Vectors)</td>
                <td className="py-3 px-4 text-slate-400">Disabled</td>
                <td className="py-3 px-4 font-bold text-emerald-600">Included</td>
                <td className="py-3 px-4 font-bold text-emerald-600">Included (Custom Weights)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Custom Domain & White-Label Branding</td>
                <td className="py-3 px-4 text-slate-400">Disabled</td>
                <td className="py-3 px-4 text-slate-400">Disabled</td>
                <td className="py-3 px-4 font-bold text-emerald-600">Included</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Dedicated Tenant Isolation</td>
                <td className="py-3 px-4">Shared</td>
                <td className="py-3 px-4">Logical RLS</td>
                <td className="py-3 px-4 font-bold text-purple-700">Dedicated Tenant RLS</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">SLA & Support</td>
                <td className="py-3 px-4">Email (48h)</td>
                <td className="py-3 px-4">Priority (12h)</td>
                <td className="py-3 px-4 font-bold text-emerald-600">24/7 Dedicated Rep (1h)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
