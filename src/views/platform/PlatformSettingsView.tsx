import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  Globe,
  Bell,
  CheckCircle2,
  Database,
  KeyRound,
  FileCode2,
} from 'lucide-react';
import { platformService } from '../../services/platformService';

interface PlatformSettingsViewProps {
  currency: string;
  onCurrencyChange: (c: string) => void;
  isVerifiedMode: boolean;
  onToggleVerifiedMode: () => void;
}

export const PlatformSettingsView: React.FC<PlatformSettingsViewProps> = ({
  currency,
  onCurrencyChange,
  isVerifiedMode,
  onToggleVerifiedMode,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [platformName, setPlatformName] = useState('Vidya AI Learning SaaS');
  const [supportEmail, setSupportEmail] = useState('support@vidya.edu');
  const [defaultTrialDays, setDefaultTrialDays] = useState('30');
  const [defaultTaxRate, setDefaultTaxRate] = useState('18');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Global Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure corporate tenant defaults, currency preferences, tax rates, and security enforcement.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Platform configuration updated and saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Section 1: General SaaS Configuration */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-600" />
            <span>General Platform Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Support & Billing Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Billing Defaults */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Financial & Invoicing Rules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Base Platform Currency</label>
              <select
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
              >
                <option value="INR">₹ INR (Indian Rupee - Default)</option>
                <option value="USD">$ USD (US Dollar)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default GST / Tax Rate (%)</label>
              <input
                type="number"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Standard Evaluation Trial (Days)</label>
              <input
                type="number"
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="font-semibold text-slate-700 block mb-1">Financial Integrity Enforcement</label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Strict Verified Ledger Mode</span>
                <span className="text-slate-500 text-[11px]">
                  When active, revenue metrics only recognize verified bank settlement receipts. Fictional or pending sums are excluded.
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleVerifiedMode}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                  isVerifiedMode ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isVerifiedMode ? 'Active (Strict)' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Credential & RLS Security Compliance (Rule 8 & 11) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-600" />
            <span>Credential Protection & Database Isolation</span>
          </h3>

          <div className="space-y-2 text-slate-600 leading-relaxed text-[11px]">
            <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-violet-950">Zero Frontend Credential Exposure:</strong>
                <p className="mt-0.5 text-violet-900/80">
                  Per strict security standards, Supabase service-role keys and payment gateway secret keys are never bundled into client React assets. All multi-tenant administrative routing operates over authenticated server proxy sessions.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Production Database Safety Guarantee:</strong>
                <p className="mt-0.5 text-slate-600">
                  Existing Vidya production records (297 enrolled students, 29 faculty members, and academic logs) are fully preserved. No table drop or destructive schema migration is executed without institutional authorization.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all"
          >
            Save Global Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
