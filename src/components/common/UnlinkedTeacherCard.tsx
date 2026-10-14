import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserX, RefreshCw, LogOut } from 'lucide-react';

interface UnlinkedTeacherCardProps {
  title?: string;
  onRefresh?: () => void;
}

export const UnlinkedTeacherCard: React.FC<UnlinkedTeacherCardProps> = ({ title, onRefresh }) => {
  const { user, logout, refreshUserRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserRole();
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Faculty Member';
  const displayEmail = user?.email || '';
  const displayRole = user?.role || 'teacher';

  return (
    <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-5 my-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
        <UserX className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
          Your staff profile is not linked yet. Please contact your administrator.
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          {title ? `${title}: ` : ''}Your authenticated account does not currently have an assigned staff record ID (<code className="font-mono text-amber-800 bg-amber-100/60 px-1 py-0.5 rounded">staff_id</code>) in the institutional dataset.
          Supabase Row-Level Security restricts access to student rosters, cohort analytics, and predictive intervention tools until your profile is linked.
        </p>
      </div>

      {/* Account Verification Summary */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left max-w-md mx-auto space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-500">
          <span>Account Name</span>
          <span className="font-semibold text-slate-800">{displayName}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Email</span>
          <span className="font-mono text-slate-800">{displayEmail}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Role</span>
          <span className="capitalize font-semibold text-slate-800">{displayRole}</span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Staff ID Mapping</span>
          <span className="font-mono text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded">
            NULL (Unmapped)
          </span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Profile Status'}</span>
        </button>
        <button
          onClick={logout}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
