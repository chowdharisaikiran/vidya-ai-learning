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
  if (role === 'admin') {
    if (clean === 'user-roles' || clean === 'roles') return 'user-roles';
    if (clean === 'assignments') return 'assignments';
    if (clean === 'students') return 'students';
    if (clean === 'teachers') return 'teachers';
    if (clean === 'analytics' || clean === 'institution-analytics') return 'institution-analytics';
    if (clean === 'prediction' || clean === 'predictions' || clean === 'ai-prediction') return 'ai-prediction';
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
    if (role === 'admin') {
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
  return 'landing';
};

const AppContent: React.FC = () => {
  const { user, role } = useAuth();
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'signup'>(getInitialPublicView);

  // Sync public URL on state changes or popstate
  const navigatePublic = (view: 'landing' | 'login' | 'signup', pushHistory = true) => {
    setPublicView(view);
    if (pushHistory && typeof window !== 'undefined') {
      const targetPath = view === 'landing' ? '/' : `/${view}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view }, '', targetPath);
      }
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setPublicView(getInitialPublicView());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Authenticated flow
  if (user) {
    // If user's institutional role setup is incomplete or pending, show safe access screen
    if (role === 'pending' || !role || (role !== 'admin' && role !== 'teacher' && role !== 'student')) {
      return (
        <>
          <RolePendingView />
          <VidyaChatbot />
        </>
      );
    }

    // Role is assigned: route to appropriate dashboard
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
