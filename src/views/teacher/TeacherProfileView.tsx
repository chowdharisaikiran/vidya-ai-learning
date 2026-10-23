import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { getSupabaseClient } from '../../lib/supabase';
import {
  User,
  BookOpen,
  GraduationCap,
  Mail,
  Calendar,
  Award,
  CheckCircle2,
  Users,
  Shield,
  Star,
} from 'lucide-react';

export const TeacherProfileView: React.FC = () => {
  const { user } = useAuth();
  const [staffRecord, setStaffRecord] = useState<{
    staff_id: string;
    staff_name: string;
    subject: string;
    overall_attendance_percentage: number;
    attendance_status: string;
  } | null>(null);

  const staffId = user?.staffId;
  const displayName = user?.name || user?.email?.split('@')[0] || 'Faculty Member';
  const displayEmail = user?.email || '';

  useEffect(() => {
    let isMounted = true;
    if (staffId) {
      const client = getSupabaseClient();
      if (client) {
        client
          .from('staff')
          .select('staff_id, staff_name, subject, overall_attendance_percentage, attendance_status')
          .eq('staff_id', staffId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (isMounted && !error && data) {
              setStaffRecord(data);
            }
          });
      }
    } else {
      setStaffRecord(null);
    }
    return () => {
      isMounted = false;
    };
  }, [staffId]);

  // If staff_id is NULL or unmapped, show clear safe empty state
  if (!staffId) {
    return <UnlinkedTeacherCard title="Educator Faculty Profile" />;
  }

  return (
    <div className="space-y-6">
      {/* Teacher Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-violet-500/10 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-xl ring-4 ring-white">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {staffRecord?.staff_name || displayName}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Staff ID: <span className="font-mono text-violet-700">{staffId}</span> • {staffRecord?.subject || 'Department Faculty'}
              </p>
            </div>
            <span className="self-center sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
              <Star className="w-3.5 h-3.5 fill-violet-600" />
              Verified Faculty
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-2xl">
            Authenticated educator account linked to Supabase institutional staff record #{staffId}.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {displayEmail}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Attendance Status: {staffRecord?.attendance_status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Faculty Performance Indicators from staff dataset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Attendance</p>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {staffRecord?.overall_attendance_percentage !== undefined && staffRecord?.overall_attendance_percentage !== null
              ? `${staffRecord.overall_attendance_percentage}%`
              : 'Not recorded'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Logged attendance benchmark</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Status</p>
          <p className="text-xl font-bold text-blue-600 font-mono mt-1">
            {staffRecord?.attendance_status || 'Not available'}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Faculty status in institutional register</p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Subject</p>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">
            {staffRecord?.subject || 'Unassigned Subject'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Primary academic specialization</p>
        </div>
      </div>
    </div>
  );
};
