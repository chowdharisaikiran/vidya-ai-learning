import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VidyaLogo } from '../common/VidyaLogo';
import { SupabaseConnectionModal } from '../SupabaseConnectionModal';
import {
  LogOut,
  Bell,
  Search,
  GraduationCap,
  ShieldAlert,
  UserCheck,
  Database,
} from 'lucide-react';

interface NavbarProps {
  onMobileMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMobileMenuToggle }) => {
  const {
    user,
    role,
    student,
    allStudents,
    selectedStudentId,
    setSelectedStudentId,
    isSupabaseConnected,
    setSupabaseConnected,
    logout,
  } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const roleBadgeConfig = {
    student: {
      label: 'Student Portal',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: GraduationCap,
    },
    teacher: {
      label: 'Educator Workspace',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-200',
      icon: UserCheck,
    },
    admin: {
      label: 'Admin Director',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: ShieldAlert,
    },
    pending: {
      label: 'Pending Role',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: ShieldAlert,
    },
  };

  const currentRoleBadge = role ? roleBadgeConfig[role] : roleBadgeConfig.student;
  const RoleIcon = currentRoleBadge.icon;

  const mockNotifications = [
    {
      id: 1,
      title: 'AI Prediction Alert',
      message: 'Weekly risk assessment recalculated for all STEM cohorts.',
      time: '12m ago',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Study Plan Generated',
      message: 'Gemini synthesized a new 7-day revision schedule.',
      time: '1h ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'Attendance Milestone',
      message: 'Cohort 11-A attendance stabilized at 91.2%.',
      time: '3h ago',
      type: 'success',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <VidyaLogo
            size="md"
            showText={true}
            showTagline={true}
            subtitle="Personalized Learning & Performance Analytics"
          />
        </div>

        {/* Center: Persona / Identity indicator in Navbar */}
        <div className="hidden md:flex items-center gap-3">
          {role === 'admin' ? (
            user?.isProfileMissing ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[11px] text-rose-600 uppercase tracking-wider font-semibold">Admin profile not found:</span>
                <span className="font-semibold text-slate-900">{user?.email || 'Missing Profile'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 rounded-xl px-3 py-1.5 text-xs text-indigo-900">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[11px] text-indigo-600 uppercase tracking-wider font-semibold">Administrator:</span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
                <span className="text-slate-500 text-[11px]">({user?.email})</span>
              </div>
            )
          ) : role === 'teacher' ? (
            user?.staffId ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Faculty:</span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">(Staff #{user.staffId})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[11px] text-amber-600 uppercase tracking-wider font-semibold">Unlinked Faculty:</span>
                <span className="font-semibold text-slate-900">{user?.name || user?.email}</span>
              </div>
            )
          ) : user?.studentId ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Active:</span>
              <span className="font-semibold text-slate-900">{user?.name}</span>
              <span className="text-slate-400 font-mono text-[11px]">(ID: #{user.studentId})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[11px] text-amber-600 uppercase tracking-wider font-semibold">Unlinked Profile:</span>
              <span className="font-semibold text-slate-900">{user?.name || user?.email}</span>
            </div>
          )}
        </div>

        {/* Right: Supabase Status, Notifications, Role Pill & User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Supabase Live Status Pill */}
          <button
            onClick={() => setShowSupabaseModal(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
            }`}
            title="Supabase Cloud Database Status · Click to view details and SQL tables"
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="hidden lg:inline text-[11px] font-bold">
              {isSupabaseConnected ? 'Supabase Connected' : 'Supabase Setup'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </button>

          {/* Role badge */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRoleBadge.bg} ${currentRoleBadge.text} ${currentRoleBadge.border}`}
          >
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{currentRoleBadge.label}</span>
          </div>

          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-2">
                  <span className="text-xs font-bold text-slate-800">System Notifications</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">Mark all read</span>
                </div>
                <div className="space-y-2 mt-2">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User profile button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name.charAt(0) : 'V'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                {user?.isProfileMissing ? (
                  <>
                    <p className="text-xs font-bold text-rose-600 leading-tight">Admin profile not found</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">{user?.email}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || user?.email || 'User'}</p>
                    <p className="text-[10px] text-slate-400 font-medium capitalize">{user?.role || 'Guest'}</p>
                  </>
                )}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50">
                <div className="p-2 border-b border-slate-100">
                  {user?.isProfileMissing ? (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-1.5">
                      <p className="font-bold">Admin profile not found</p>
                      <p className="text-[10px] text-rose-600">No profile row in user_profiles</p>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  )}
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                    Role: <span className="capitalize">{user?.role}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Database Connection Modal */}
      <SupabaseConnectionModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        onConnectionStatusChange={(connected) => setSupabaseConnected(connected)}
      />
    </header>
  );
};
