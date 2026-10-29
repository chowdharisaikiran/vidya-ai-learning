import React, { useState } from 'react';
import {
  Search,
  Bell,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Globe,
  UserCheck,
  Menu,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../services/platformService';

interface PlatformNavbarProps {
  onMobileMenuToggle: () => void;
  activeCurrency: string;
  onCurrencyChange: (currency: string) => void;
  isVerifiedMode: boolean;
  onToggleVerifiedMode: () => void;
  onSwitchRole?: (role: 'platform_owner' | 'admin' | 'teacher' | 'student') => void;
  onSearchSelectTab?: (tab: string, query?: string) => void;
  activeTabTitle: string;
}

export const PlatformNavbar: React.FC<PlatformNavbarProps> = ({
  onMobileMenuToggle,
  activeCurrency,
  onCurrencyChange,
  isVerifiedMode,
  onToggleVerifiedMode,
  onSwitchRole,
  onSearchSelectTab,
  activeTabTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'Payment Received',
      desc: 'Vidya Institute of Technology verified ₹11,99,990 via NEFT.',
      time: '2 hours ago',
      unread: true,
      type: 'success',
    },
    {
      id: '2',
      title: 'Overdue Notice Issued',
      desc: 'Sri Krishna Vidyapeeth renewal is 90+ days past due.',
      time: '1 day ago',
      unread: true,
      type: 'warning',
    },
    {
      id: '3',
      title: 'New Evaluation Trial',
      desc: 'Apex Academy started 30-day Professional trial.',
      time: '3 days ago',
      unread: false,
      type: 'info',
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
            Platform Owner
          </span>
          <span className="text-slate-300">/</span>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">{activeTabTitle}</h1>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search institutions, invoices (INV-), tickets..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
        </div>
      </div>

      {/* Right Actions: Currency, Verified Mode, Notifications, Role Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Currency Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => onCurrencyChange('INR')}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              activeCurrency === 'INR'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ₹ INR
          </button>
          <button
            onClick={() => onCurrencyChange('USD')}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              activeCurrency === 'USD'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            $ USD
          </button>
        </div>

        {/* Financial Integrity Mode Pill */}
        <button
          onClick={onToggleVerifiedMode}
          title={isVerifiedMode ? 'Switch to Demo/Sandbox Mode' : 'Switch to Verified Ledger Mode'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
            isVerifiedMode
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isVerifiedMode ? 'Verified Books' : 'Demo Sandbox'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-violet-600 absolute top-1.5 right-1.5 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Platform Notifications</span>
                <span className="text-[10px] text-violet-600 font-semibold cursor-pointer">Mark all read</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 rounded-xl text-xs transition-colors ${
                      n.unread ? 'bg-violet-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher (Evaluation & Testing Helper) */}
        {onSwitchRole && (
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-violet-600" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-bold text-violet-700">Owner</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Test Workspaces
                </div>
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    onSwitchRole('platform_owner');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 flex items-center justify-between"
                >
                  <span>Platform Owner (HQ)</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                </button>
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    onSwitchRole('admin');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Institution Admin (College)
                </button>
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    onSwitchRole('teacher');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Teacher Workspace
                </button>
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    onSwitchRole('student');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Student Portal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
