import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlatformSidebar, PlatformTab } from '../../components/platform/PlatformSidebar';
import { PlatformNavbar } from '../../components/platform/PlatformNavbar';
import { PlatformOverviewView } from './PlatformOverviewView';
import { PlatformInstitutionsView } from './PlatformInstitutionsView';
import { PlatformSubscriptionsView } from './PlatformSubscriptionsView';
import { PlatformRevenueView } from './PlatformRevenueView';
import { PlatformInvoicesView } from './PlatformInvoicesView';
import { PlatformPlansView } from './PlatformPlansView';
import { PlatformAnalyticsView } from './PlatformAnalyticsView';
import { PlatformSupportView } from './PlatformSupportView';
import { PlatformAuditLogsView } from './PlatformAuditLogsView';
import { PlatformSettingsView } from './PlatformSettingsView';
import { platformService } from '../../services/platformService';
import { ShieldAlert } from 'lucide-react';

interface PlatformOwnerDashboardProps {
  onSwitchToInstitutionalAdmin?: () => void;
  onSwitchRole?: (role: 'platform_owner' | 'admin' | 'teacher' | 'student') => void;
}

export const PlatformOwnerDashboard: React.FC<PlatformOwnerDashboardProps> = ({
  onSwitchToInstitutionalAdmin,
  onSwitchRole,
}) => {
  const { user, logout, verifyPlatformOwnerAuthorization } = useAuth();
  const [currentTab, setCurrentTab] = useState<PlatformTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<string>(() => platformService.getActiveCurrency());
  const [isVerifiedMode, setIsVerifiedMode] = useState<boolean>(
    () => platformService.getLedgerMode() === 'verified'
  );

  const [verifyingServerAuth, setVerifyingServerAuth] = useState<boolean>(true);
  const [serverAuthorized, setServerAuthorized] = useState<boolean>(false);
  const [serverAuthError, setServerAuthError] = useState<string | null>(null);

  // Secondary defense-in-depth: Verify server-side authorization token with /api/platform/auth/verify
  useEffect(() => {
    let isMounted = true;
    const verifyWithServer = async () => {
      try {
        const res = await verifyPlatformOwnerAuthorization();
        if (!isMounted) return;
        if (res.isAuthorized) {
          setServerAuthorized(true);
          setServerAuthError(null);
        } else {
          setServerAuthorized(false);
          setServerAuthError(res.error || 'Server rejected Platform Owner privileges.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setServerAuthorized(false);
        setServerAuthError(err?.message || 'Failed to verify authorization with backend.');
      } finally {
        if (isMounted) setVerifyingServerAuth(false);
      }
    };

    verifyWithServer();
    return () => { isMounted = false; };
  }, []);

  const handleCurrencyChange = (newCurr: string) => {
    platformService.setActiveCurrency(newCurr);
    setCurrency(newCurr);
  };

  const handleToggleVerifiedMode = () => {
    const next = !isVerifiedMode;
    setIsVerifiedMode(next);
    platformService.setLedgerMode(next ? 'verified' : 'demo');
  };

  const handleSelectTab = (tab: PlatformTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState({ tab }, '', `/platform/${tab}`);
    }
  };

  // Sync tab with URL on mount / popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/institutions')) setCurrentTab('institutions');
    else if (path.includes('/subscriptions')) setCurrentTab('subscriptions');
    else if (path.includes('/revenue')) setCurrentTab('revenue');
    else if (path.includes('/invoices')) setCurrentTab('invoices');
    else if (path.includes('/plans')) setCurrentTab('plans');
    else if (path.includes('/analytics') || path.includes('/usage')) setCurrentTab('business-analytics');
    else if (path.includes('/support')) setCurrentTab('support');
    else if (path.includes('/audit')) setCurrentTab('audit-logs');
    else if (path.includes('/settings')) setCurrentTab('settings');

    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('/institutions')) setCurrentTab('institutions');
      else if (p.includes('/subscriptions')) setCurrentTab('subscriptions');
      else if (p.includes('/revenue')) setCurrentTab('revenue');
      else if (p.includes('/invoices')) setCurrentTab('invoices');
      else if (p.includes('/plans')) setCurrentTab('plans');
      else if (p.includes('/analytics')) setCurrentTab('business-analytics');
      else if (p.includes('/support')) setCurrentTab('support');
      else if (p.includes('/audit')) setCurrentTab('audit-logs');
      else if (p.includes('/settings')) setCurrentTab('settings');
      else setCurrentTab('overview');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const getTabTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'Overview';
      case 'institutions':
        return 'Institution Management';
      case 'subscriptions':
        return 'Subscription Plans';
      case 'revenue':
        return 'Revenue & Billing';
      case 'invoices':
        return 'Invoices';
      case 'plans':
        return 'Plans & Entitlements';
      case 'business-analytics':
      case 'platform-usage':
        return 'Business Analytics & Usage';
      case 'support':
        return 'Support Tickets';
      case 'audit-logs':
        return 'Audit Logs';
      case 'settings':
        return 'Platform Settings';
      default:
        return 'Platform Dashboard';
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <PlatformOverviewView
            onNavigate={handleSelectTab}
            currency={currency}
            isVerifiedMode={isVerifiedMode}
          />
        );
      case 'institutions':
        return (
          <PlatformInstitutionsView
            currency={currency}
            onNavigateToSubscriptions={() => handleSelectTab('subscriptions')}
            onNavigateToInvoices={() => handleSelectTab('invoices')}
          />
        );
      case 'subscriptions':
        return <PlatformSubscriptionsView currency={currency} />;
      case 'revenue':
        return (
          <PlatformRevenueView
            currency={currency}
            isVerifiedMode={isVerifiedMode}
            onNavigateToInvoices={() => handleSelectTab('invoices')}
          />
        );
      case 'invoices':
        return <PlatformInvoicesView currency={currency} />;
      case 'plans':
        return <PlatformPlansView currency={currency} />;
      case 'business-analytics':
      case 'platform-usage':
        return <PlatformAnalyticsView currency={currency} />;
      case 'support':
        return <PlatformSupportView />;
      case 'audit-logs':
        return <PlatformAuditLogsView />;
      case 'settings':
        return (
          <PlatformSettingsView
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
            isVerifiedMode={isVerifiedMode}
            onToggleVerifiedMode={handleToggleVerifiedMode}
          />
        );
      default:
        return (
          <PlatformOverviewView
            onNavigate={handleSelectTab}
            currency={currency}
            isVerifiedMode={isVerifiedMode}
          />
        );
    }
  };

  if (verifyingServerAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
          Verifying Server Authorization...
        </h2>
        <p className="text-xs text-slate-400 mt-1">Validating cryptographic credentials with institutional authority</p>
      </div>
    );
  }

  if (!serverAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
            403 Forbidden
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Authorization Denied
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            {serverAuthError || 'The server rejected this session for Platform Owner privileges.'}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            {onSwitchToInstitutionalAdmin && (
              <button
                type="button"
                onClick={onSwitchToInstitutionalAdmin}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                Return to Institutional Portal
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs transition-colors border border-slate-700/80 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-900 font-sans selection:bg-violet-600 selection:text-white">
      {/* Top Navigation */}
      <PlatformNavbar
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        activeCurrency={currency}
        onCurrencyChange={handleCurrencyChange}
        isVerifiedMode={isVerifiedMode}
        onToggleVerifiedMode={handleToggleVerifiedMode}
        onSwitchRole={onSwitchRole}
        activeTabTitle={getTabTitle()}
      />

      {/* Main Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <PlatformSidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          isVerifiedMode={isVerifiedMode}
          onToggleVerifiedMode={handleToggleVerifiedMode}
          onSwitchToInstitutionalView={onSwitchToInstitutionalAdmin}
          onLogout={logout}
          ownerName={user?.name || 'Platform Administrator'}
          ownerEmail={user?.email || 'platform.owner@vidya.edu'}
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};
