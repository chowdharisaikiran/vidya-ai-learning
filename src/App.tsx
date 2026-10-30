/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/auth/SignupView';
import { RolePendingView } from './views/auth/RolePendingView';
import { LandingPage } from './views/LandingPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { VidyaChatbot } from './components/VidyaChatbot';
import { PlatformOwnerDashboard } from './views/platform/PlatformOwnerDashboard';
import { ShieldAlert } from 'lucide-react';

// Student Views
import { StudentDashboard } from './views/student/StudentDashboard';
import { StudentPerformanceView } from './views/student/StudentPerformanceView';
import { StudentRecommendationsView } from './views/student/StudentRecommendationsView';
import { StudentPredictionView } from './views/student/StudentPredictionView';
import { StudentProfileView } from './views/student/StudentProfileView';
import { StudentSettingsView } from './views/student/StudentSettingsView';

// Teacher Views
import { TeacherDashboard } from './views/teacher/TeacherDashboard';
import { TeacherStudentsView } from './views/teacher/TeacherStudentsView';
import { TeacherAnalyticsView } from './views/teacher/TeacherAnalyticsView';
import { TeacherPredictionView } from './views/teacher/TeacherPredictionView';
import { TeacherProfileView } from './views/teacher/TeacherProfileView';
import { TeacherSettingsView } from './views/teacher/TeacherSettingsView';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { AdminUserRolesView } from './views/admin/AdminUserRolesView';
import { AdminAssignmentsView } from './views/admin/AdminAssignmentsView';
import { AdminStudentsView } from './views/admin/AdminStudentsView';
import { AdminTeachersView } from './views/admin/AdminTeachersView';
import { AdminInstitutionAnalyticsView } from './views/admin/AdminInstitutionAnalyticsView';
import { AdminPredictionView } from './views/admin/AdminPredictionView';
import { AdminProfileView } from './views/admin/AdminProfileView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminSubscriptionView } from './views/admin/AdminSubscriptionView';

// Helper to map pathname to authenticated dashboard tab
function getTabFromPath(pathname: string, role: string): string {
  const clean = pathname.toLowerCase().replace(/^\/+/, '').split('/')[0] || 'dashboard';
  
  if (clean === '' || clean === 'dashboard' || clean === 'admin' || clean === 'teacher' || clean === 'student') {
    return 'dashboard';
  }

  // Student specific
  if (role === 'student') {
    if (clean === 'performance' || clean === 'my-performance') return 'my-performance';
    if (clean === 'recommendations' || clean === 'ai-recommendations') return 'ai-recommendations';
    if (clean === 'prediction' || clean === 'predictions' || clean === 'ai-prediction') return 'ai-prediction';
    if (clean === 'profile') return 'profile';
    if (clean === 'settings') return 'settings';
  }

  // Teacher specific
  if (role === 'teacher') {
    if (clean === 'students') return 'students';
    if (clean === 'analytics' || clean === 'performance-analytics') return 'performance-analytics';
    if (clean === 'prediction' || clean === 'predictions' || clean === 'ai-prediction') return 'ai-prediction';
    if (clean === 'profile') return 'profile';
    if (clean === 'settings') return 'settings';
  }

  // Admin specific
  if (role === 'admin' || role === 'institution_admin') {
    if (clean === 'user-roles' || clean === 'roles') return 'user-roles';
    if (clean === 'assignments') return 'assignments';
    if (clean === 'students') return 'students';
    if (clean === 'teachers') return 'teachers';
    if (clean === 'analytics' || clean === 'institution-analytics') return 'institution-analytics';
    if (clean === 'prediction' || clean === 'predictions' || clean === 'ai-prediction') return 'ai-prediction';
    if (clean === 'subscription' || clean === 'subscriptions' || clean === 'billing') return 'subscription';
    if (clean === 'profile') return 'profile';
    if (clean === 'settings') return 'settings';
  }

  return 'dashboard';
}

const MainLayout: React.FC = () => {
  const { user, role, setSelectedStudentId } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getTabFromPath(window.location.pathname, role || 'student');
    }
    return 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Sync tab with browser URL history
  const handleNavigate = (tab: string, pushHistory = true) => {
    setCurrentTab(tab);
    if (pushHistory && typeof window !== 'undefined') {
      const targetPath = tab === 'dashboard' ? '/dashboard' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  // Listen for browser Back/Forward navigation
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure initial URL reflects authenticated status if at root or /login
    if (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/signup') {
      window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
    }

    const handlePopState = () => {
      const tabFromUrl = getTabFromPath(window.location.pathname, role || 'student');
      setCurrentTab(tabFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [role]);

  // If unauthenticated, AppContent handles LoginView
  if (!user || !role) {
    return null;
  }

  // Render role-specific views
  const renderContent = () => {
    // 1. Student Views
    if (role === 'student') {
      switch (currentTab) {
        case 'dashboard':
          return <StudentDashboard onNavigate={handleNavigate} />;
        case 'performance':
        case 'my-performance':
          return <StudentPerformanceView />;
        case 'recommendations':
        case 'ai-recommendations':
          return <StudentRecommendationsView />;
        case 'prediction':
        case 'predictions':
        case 'ai-prediction':
          return <StudentPredictionView />;
        case 'profile':
          return <StudentProfileView />;
        case 'settings':
          return <StudentSettingsView onNavigate={handleNavigate} />;
        default:
          return <StudentDashboard onNavigate={handleNavigate} />;
      }
    }

    // 2. Teacher Views
    if (role === 'teacher') {
      switch (currentTab) {
        case 'dashboard':
          return (
            <TeacherDashboard
              onNavigate={handleNavigate}
              onSelectStudentDetails={(s) => {
                setSelectedStudentId(s.Student_ID);
                handleNavigate('students');
              }}
            />
          );
        case 'students':
          return <TeacherStudentsView />;
        case 'analytics':
        case 'performance-analytics':
          return <TeacherAnalyticsView />;
        case 'prediction':
        case 'predictions':
        case 'ai-prediction':
          return <TeacherPredictionView />;
        case 'profile':
          return <TeacherProfileView />;
        case 'settings':
          return <TeacherSettingsView onNavigate={handleNavigate} />;
        default:
          return (
            <TeacherDashboard
              onNavigate={handleNavigate}
              onSelectStudentDetails={(s) => {
                setSelectedStudentId(s.Student_ID);
                handleNavigate('students');
              }}
            />
          );
      }
    }

    // 3. Admin Views
    if (role === 'admin' || role === 'institution_admin') {
      switch (currentTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={handleNavigate} />;
        case 'user-roles':
        case 'roles':
          return <AdminUserRolesView />;
        case 'assignments':
          return <AdminAssignmentsView />;
        case 'students':
          return <AdminStudentsView onNavigate={handleNavigate} />;
        case 'teachers':
          return <AdminTeachersView onNavigate={handleNavigate} />;
        case 'analytics':
        case 'institution-analytics':
          return <AdminInstitutionAnalyticsView />;
        case 'prediction':
        case 'predictions':
        case 'ai-prediction':
          return <AdminPredictionView />;
        case 'subscription':
        case 'subscriptions':
        case 'billing':
          return <AdminSubscriptionView onNavigate={handleNavigate} />;
        case 'profile':
          return <AdminProfileView />;
        case 'settings':
          return <AdminSettingsView onNavigate={handleNavigate} />;
        default:
          return <AdminDashboard onNavigate={handleNavigate} />;
      }
    }

    return <div className="p-8 text-center text-slate-500">Unrecognized user role.</div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {/* Main Shell: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleNavigate}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Scrollable Main Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

const getInitialPublicView = (): 'landing' | 'login' | 'signup' => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase();
  if (path === '/login' || path.startsWith('/login/')) return 'login';
  if (path === '/signup' || path === '/register' || path.startsWith('/signup/')) return 'signup';
  // If navigating directly to protected /platform route while logged out, default immediately to login
  if (path === '/platform' || path.startsWith('/platform/')) return 'login';
  return 'landing';
};

const AppContent: React.FC = () => {
  const { user, role, authLoading, logout, switchTestRole } = useAuth();
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'signup'>(getInitialPublicView);
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Sync public URL on state changes or popstate
  const navigatePublic = (view: 'landing' | 'login' | 'signup', pushHistory = true) => {
    setPublicView(view);
    if (pushHistory && typeof window !== 'undefined') {
      const targetPath = view === 'landing' ? '/' : `/${view}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
        setCurrentPath(targetPath);
      }
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setPublicView(getInitialPublicView());
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isPlatformRoute = currentPath.startsWith('/platform');

  // 1. Session verification loading state for /platform/* routes
  // Shows clean loading screen rather than briefly flashing protected dashboard
  if (authLoading && isPlatformRoute) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
          Verifying Platform Authorization...
        </h2>
        <p className="text-xs text-slate-400 mt-1">Checking secure session and tenant management credentials</p>
      </div>
    );
  }

  // 2. Unauthenticated user attempting to access /platform/* routes
  // Redirect to login page immediately without rendering the protected dashboard
  if (!user && isPlatformRoute) {
    return (
      <>
        <LoginView
          onBackToLanding={() => navigatePublic('landing')}
          onGoToSignup={() => navigatePublic('signup')}
        />
        <VidyaChatbot />
      </>
    );
  }

  // 3. Authenticated flow
  if (user) {
    if (isPlatformRoute) {
      // Strictly verify platform_owner role
      if (role === 'platform_owner') {
        return (
          <>
            <PlatformOwnerDashboard
              onSwitchToInstitutionalAdmin={() => {
                if (window.location.pathname.startsWith('/platform')) {
                  window.history.pushState({ tab: 'dashboard' }, '', '/dashboard');
                  setCurrentPath('/dashboard');
                }
                switchTestRole('admin');
              }}
              onSwitchRole={(r) => {
                if (r !== 'platform_owner' && window.location.pathname.startsWith('/platform')) {
                  window.history.pushState({ tab: 'dashboard' }, '', '/dashboard');
                  setCurrentPath('/dashboard');
                }
                switchTestRole(r);
              }}
            />
            <VidyaChatbot />
          </>
        );
      }

      // Access Denied: User is authenticated, but NOT a platform_owner
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
              Access Denied
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Your account (<span className="text-slate-200 font-mono font-medium">{user.email}</span>) is authenticated as <span className="text-white font-semibold capitalize">{user.role || role}</span>, but does not have verified <span className="text-violet-400 font-semibold">Platform Owner</span> privileges.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({ tab: 'dashboard' }, '', '/dashboard');
                  setCurrentPath('/dashboard');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                Return to {((user.role || role || 'institutional') as string).toUpperCase()} Dashboard
              </button>
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

    // Platform Owner navigating to root or /dashboard
    if (role === 'platform_owner') {
      return (
        <>
          <PlatformOwnerDashboard
            onSwitchToInstitutionalAdmin={() => switchTestRole('admin')}
            onSwitchRole={(r) => switchTestRole(r)}
          />
          <VidyaChatbot />
        </>
      );
    }

    // If user's institutional role setup is incomplete or pending, show safe access screen
    if (
      role === 'pending' ||
      !role ||
      (role !== 'admin' && role !== 'institution_admin' && role !== 'teacher' && role !== 'student')
    ) {
      return (
        <>
          <RolePendingView />
          <VidyaChatbot />
        </>
      );
    }

    // Role is assigned: route to appropriate institutional dashboard
    return (
      <>
        <MainLayout />
        <VidyaChatbot />
      </>
    );
  }

  // Unauthenticated flow
  return (
    <>
      {publicView === 'landing' && (
        <LandingPage
          onGoToLogin={() => navigatePublic('login')}
          onGoToSignup={() => navigatePublic('signup')}
        />
      )}
      {publicView === 'login' && (
        <LoginView
          onBackToLanding={() => navigatePublic('landing')}
          onGoToSignup={() => navigatePublic('signup')}
        />
      )}
      {publicView === 'signup' && (
        <SignupView
          onBackToLanding={() => navigatePublic('landing')}
          onGoToLogin={() => navigatePublic('login')}
        />
      )}
      {/* Floating VIDYA AI Learning Assistant accessible across landing & portal */}
      <VidyaChatbot />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
