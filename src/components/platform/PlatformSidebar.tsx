import React from 'react';
import { VidyaLogo } from '../common/VidyaLogo';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Sliders,
  BarChart3,
  Activity,
  LifeBuoy,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export type PlatformTab =
  | 'overview'
  | 'institutions'
  | 'subscriptions'
  | 'revenue'
  | 'invoices'
  | 'plans'
  | 'business-analytics'
  | 'platform-usage'
  | 'support'
  | 'audit-logs'
  | 'settings';

interface PlatformSidebarProps {
  currentTab: PlatformTab;
  onSelectTab: (tab: PlatformTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isVerifiedMode: boolean;
  onToggleVerifiedMode: () => void;
  onSwitchToInstitutionalView?: () => void;
  onLogout: () => void;
  ownerName?: string;
  ownerEmail?: string;
}

export const PlatformSidebar: React.FC<PlatformSidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  isVerifiedMode,
  onToggleVerifiedMode,
  onSwitchToInstitutionalView,
  onLogout,
  ownerName = 'Platform Administrator',
  ownerEmail = 'platform.owner@vidya.edu',
}) => {
  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'overview' as PlatformTab, label: 'Platform Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Platform Management',
      items: [
        { id: 'institutions' as PlatformTab, label: 'Institutions', icon: Building2 },
        { id: 'subscriptions' as PlatformTab, label: 'Subscriptions', icon: CreditCard },
        { id: 'revenue' as PlatformTab, label: 'Revenue & Billing', icon: Receipt },
        { id: 'invoices' as PlatformTab, label: 'Invoices', icon: FileSpreadsheet },
        { id: 'plans' as PlatformTab, label: 'Plans & Features', icon: Sliders },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'business-analytics' as PlatformTab, label: 'Business Analytics', icon: BarChart3 },
        { id: 'platform-usage' as PlatformTab, label: 'Platform Usage', icon: Activity },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'support' as PlatformTab, label: 'Support Tickets', icon: LifeBuoy },
        { id: 'audit-logs' as PlatformTab, label: 'Audit Logs', icon: ShieldCheck },
        { id: 'settings' as PlatformTab, label: 'Platform Settings', icon: Settings },
      ],
    },
  ];

  const handleItemClick = (id: PlatformTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-68 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xs font-black text-sm">
              VP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight">Vidya Platform</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 uppercase">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Platform Owner Console</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Financial Mode Badge (Rule 7 Compliance) */}
          <div className="pt-2 px-1">
            <div
              className={`p-3 rounded-xl border text-xs transition-all ${
                isVerifiedMode
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck
                    className={`w-3.5 h-3.5 ${isVerifiedMode ? 'text-emerald-600' : 'text-amber-600'}`}
                  />
                  {isVerifiedMode ? 'Verified Ledger Mode' : 'Sandbox / Demo Mode'}
                </span>
                <button
                  onClick={onToggleVerifiedMode}
                  className="text-[10px] underline font-medium cursor-pointer hover:opacity-80"
                >
                  Switch
                </button>
              </div>
              <p className="text-[10px] leading-tight opacity-80">
                {isVerifiedMode
                  ? 'Revenue computed strictly from verified bank & payment receipts.'
                  : 'Illustrative simulation including draft & sandbox telemetry.'}
              </p>
            </div>
          </div>

          {/* Quick jump to Institutional Admin workspace */}
          {onSwitchToInstitutionalView && (
            <div className="pt-1 px-1">
              <button
                onClick={onSwitchToInstitutionalView}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 transition-colors border border-indigo-100 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Go to School/College Admin</span>
                </div>
                <ExternalLink className="w-3 h-3 text-indigo-500" />
              </button>
            </div>
          )}
        </div>

        {/* Platform Owner Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-violet-200">
              PO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{ownerName}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono">{ownerEmail}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition-colors border border-rose-100 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
