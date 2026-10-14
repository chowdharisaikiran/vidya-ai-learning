import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { VidyaLogo } from '../common/VidyaLogo';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  BrainCircuit,
  User,
  Users,
  LineChart,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Binary,
  LogOut,
  ChevronRight,
  Database,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { role, user, logout } = useAuth();

  // Navigation definition tailored strictly to the prompt requirements
  const getNavItems = () => {
    if (role === 'student') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'my-performance', label: 'My Performance', icon: BarChart3 },
        { id: 'ai-recommendations', label: 'AI Recommendations', icon: Sparkles },
        { id: 'ai-prediction', label: 'AI Prediction', icon: BrainCircuit },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }

    if (role === 'teacher') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'performance-analytics', label: 'Performance Analytics', icon: LineChart },
        { id: 'ai-prediction', label: 'AI Prediction', icon: BrainCircuit },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }

    // Admin role
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'user-roles', label: 'User & Role Access', icon: ShieldCheck },
      { id: 'assignments', label: 'Faculty Assignments', icon: UserCheck },
      { id: 'students', label: 'Students', icon: GraduationCap },
      { id: 'teachers', label: 'Teachers', icon: BookOpen },
      { id: 'institution-analytics', label: 'Institution Analytics', icon: TrendingUp },
      { id: 'ai-prediction', label: 'AI Prediction', icon: Binary },
      { id: 'profile', label: 'Profile', icon: User },
    ];
  };

  const navItems = getNavItems();

  const handleItemClick = (id: string) => {
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <VidyaLogo
            size="sm"
            showText={true}
            subtitle={role ? `${role.toUpperCase()} WORKSPACE` : 'WORKSPACE'}
          />
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
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

          {/* Data Science connection badge */}
          <div className="pt-6 px-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-violet-50/80 border border-blue-100/80">
              <div className="flex items-center gap-2 text-blue-900 text-xs font-bold mb-1">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Dataset Model Active</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                22 ML feature vectors connected for student risk forecasting.
              </p>
            </div>
          </div>
        </div>

        {/* User preview & Logout footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full ${
                  user?.isProfileMissing ? 'bg-rose-600' : 'bg-indigo-600'
                } text-white flex items-center justify-center font-bold text-xs`}
              >
                {user?.isProfileMissing ? '!' : (user?.name ? user.name.charAt(0) : 'U')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {user?.isProfileMissing ? (
                <>
                  <p className="text-xs font-bold text-rose-600 truncate">Admin profile not found</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || user?.email || 'User'}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">
                    {user?.email || (user?.username ? `@${user.username}` : '')}
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition-colors border border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
