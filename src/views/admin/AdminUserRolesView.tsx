import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfileRow, UserRole, CandidateStudent } from '../../types';
import {
  fetchAllDatabaseStudents,
  fetchAllStaffRecords,
  getActiveAuthToken,
  DatabaseStudentRow,
  DatabaseStaffRow,
} from '../../services/vidyaDatabaseService';
import { apiUrl, parseApiResponse } from '../../lib/apiConfig';
import {
  ShieldCheck,
  Users,
  Search,
  Filter,
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Edit2,
  X,
  Code,
  Copy,
  Database,
  Lock,
  UserX,
  UserMinus,
  Check,
  Info,
  Server,
  Key,
  ArrowRight,
  ArrowLeft,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react';

export const AdminUserRolesView: React.FC = () => {
  const {
    fetchAllUserProfiles,
    updateUserRoleAndMapping,
    unlinkStudentAccount,
    searchAdminStudents,
    user: currentAdmin,
  } = useAuth();

  const [profiles, setProfiles] = useState<UserProfileRow[]>([]);
  const [students, setStudents] = useState<DatabaseStudentRow[]>([]);
  const [staff, setStaff] = useState<DatabaseStaffRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Server configuration status
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; message: string } | null>(null);

  // Safe testing workflow banner toggle
  const [showWorkflowGuide, setShowWorkflowGuide] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student' | 'pending'>('all');
  const [mappingFilter, setMappingFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfileRow | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [confirmingMapping, setConfirmingMapping] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  // Real-Student Candidate Search & Conflict Resolution States
  const [candidateStudents, setCandidateStudents] = useState<CandidateStudent[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<{
    conflictingUser: { id: string; email: string; fullName: string };
    student: any;
    message: string;
  } | null>(null);
  const [unlinkingUserId, setUnlinkingUserId] = useState<string | null>(null);

  // Migration SQL Modal
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Live Candidate Search Query Hook
  useEffect(() => {
    if (editingUser && newRole === 'student') {
      let active = true;
      setSearchingCandidates(true);
      const timer = setTimeout(async () => {
        const res = await searchAdminStudents(studentSearch);
        if (active) {
          if (res.success) {
            setCandidateStudents(res.students);
          }
          setSearchingCandidates(false);
        }
      }, 250);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [editingUser, newRole, studentSearch]);

  // Check server configuration status
  const checkServerConfig = async () => {
    try {
      const token = await getActiveAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(apiUrl('/api/admin/config-status'), { headers });
      const parsed = await parseApiResponse<{ configured: boolean; message?: string }>(res, '/api/admin/config-status');
      if (parsed.ok && parsed.data) {
        setServerStatus({ configured: parsed.data.configured, message: parsed.data.message || '' });
        if (!parsed.data.configured) {
          setSetupError(
            'Secure server-side operation is not fully configured (SUPABASE_SECRET_KEY missing in environment). Privileged role changes are locked until configured.'
          );
        } else {
          setSetupError(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await checkServerConfig();

      const [profilesRes, studentsList, staffList] = await Promise.all([
        fetchAllUserProfiles(),
        fetchAllDatabaseStudents(),
        fetchAllStaffRecords(),
      ]);

      if (profilesRes.error) {
        if (profilesRes.isSetupError) {
          setSetupError(profilesRes.error);
        } else {
          setError(profilesRes.error);
        }
      } else {
        setProfiles(profilesRes.profiles);
      }
      setStudents(studentsList);
      setStaff(staffList);
    } catch (err: any) {
      setError(err?.message || 'Error loading user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if current user is an admin
  if (currentAdmin && currentAdmin.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-3xl border border-rose-200 shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted: Administrators Only</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The User Management &amp; Role Authorization portal is strictly reserved for verified institutional administrators.
          Your current account role is <span className="font-semibold capitalize text-slate-800">{currentAdmin.role}</span>.
        </p>
      </div>
    );
  }

  const handleOpenEdit = (profile: UserProfileRow) => {
    setEditingUser(profile);
    setConfirmingMapping(false);
    setConflictModalData(null);
    setNewRole(profile.role);
    setSelectedStudentId(profile.student_id !== undefined && profile.student_id !== null ? profile.student_id : '');
    setSelectedStaffId(profile.staff_id || '');
    setStudentSearch('');
    setStaffSearch('');
    setSuccessMessage(null);
    setError(null);
  };

  // Switch role handler: Clears incompatible mappings when switching roles (Requirement 6)
  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    setConfirmingMapping(false);
    setConflictModalData(null);
    if (role === 'student') {
      setSelectedStaffId(''); // Clear staff mapping
    } else if (role === 'teacher') {
      setSelectedStudentId(''); // Clear student mapping
    } else if (role === 'admin') {
      setSelectedStudentId(''); // Clear student mapping
      setSelectedStaffId(''); // Clear staff mapping
    }
  };

  const handleSaveRole = async (overrideConflict = false) => {
    if (!editingUser) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Enforce role isolation (Requirement 6 & 7)
    const targetStudentId =
      newRole === 'student' && selectedStudentId !== '' ? Number(selectedStudentId) : null;
    const targetStaffId =
      newRole === 'teacher' && selectedStaffId.trim() !== '' ? selectedStaffId.trim() : null;

    const res = await updateUserRoleAndMapping(
      editingUser.id,
      newRole,
      targetStudentId,
      targetStaffId,
      overrideConflict
    );
    setSaving(false);

    if (res.isConflict && res.conflictingUser) {
      setConflictModalData({
        conflictingUser: res.conflictingUser,
        student: activeSelectedStudent,
        message: res.error || 'This student record is already mapped to another user account.',
      });
      return;
    }

    if (res.success) {
      const mappingSummary =
        newRole === 'student'
          ? (targetStudentId ? `student_id #${targetStudentId} (${activeSelectedStudent?.name || 'Selected Student'})` : 'unmapped (NULL)')
          : newRole === 'teacher'
          ? (targetStaffId ? `staff_id ${targetStaffId} (${activeSelectedStaff?.staff_name || 'Selected Faculty'})` : 'unmapped (NULL)')
          : 'administrator (isolated)';

      setSuccessMessage(
        `Role (${newRole}) and dataset mapping (${mappingSummary}) for ${editingUser.email} successfully updated and saved.`
      );
      setEditingUser(null);
      setConfirmingMapping(false);
      setConflictModalData(null);
      await loadData();
    } else {
      if (res.isSetupError) {
        setSetupError(res.error || 'Server-side configuration error: SUPABASE_SECRET_KEY missing.');
      } else {
        setError(res.error || 'Failed to update user role and dataset mapping.');
      }
    }
  };

  const handleConfirmConflictResolution = async () => {
    if (!editingUser || !conflictModalData) return;
    await handleSaveRole(true);
  };

  const handleUnlinkStudent = async (profile: UserProfileRow) => {
    setUnlinkingUserId(profile.id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await unlinkStudentAccount(profile.id);
      if (res.success) {
        setSuccessMessage(`Account ${profile.email} unlinked successfully (student_id set to NULL).`);
        await loadData();
      } else {
        setError(res.error || 'Failed to unlink student account.');
      }
    } finally {
      setUnlinkingUserId(null);
    }
  };

  // Filtered profiles
  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q) ||
      (p.student_id && String(p.student_id).includes(q)) ||
      (p.staff_id && p.staff_id.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' ? true : p.role === roleFilter;

    let matchesMapping = true;
    if (mappingFilter === 'mapped') {
      matchesMapping = Boolean(p.student_id || p.staff_id);
    } else if (mappingFilter === 'unmapped') {
      matchesMapping = p.role !== 'admin' && !p.student_id && !p.staff_id;
    }

    return matchesSearch && matchesRole && matchesMapping;
  });

  // Filtered students for dropdown search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        String(s.student_id).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.gender.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // Filtered staff for dropdown search
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staff;
    const q = staffSearch.toLowerCase().trim();
    return staff.filter(
      (st) =>
        st.staff_id.toLowerCase().includes(q) ||
        st.staff_name.toLowerCase().includes(q) ||
        st.subject.toLowerCase().includes(q)
    );
  }, [staff, staffSearch]);

  // Selected student preview object
  const activeSelectedStudent = useMemo(() => {
    if (selectedStudentId === '') return null;
    return students.find((s) => s.student_id === Number(selectedStudentId)) || null;
  }, [students, selectedStudentId]);

  // Selected staff preview object
  const activeSelectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staff.find((st) => st.staff_id === selectedStaffId) || null;
  }, [staff, selectedStaffId]);

  // Metrics
  const totalUsers = profiles.length;
  const totalStudents = profiles.filter((p) => p.role === 'student').length;
  const mappedStudents = profiles.filter((p) => p.role === 'student' && p.student_id).length;
  const totalTeachers = profiles.filter((p) => p.role === 'teacher').length;
  const mappedTeachers = profiles.filter((p) => p.role === 'teacher' && p.staff_id).length;
  const totalAdmins = profiles.filter((p) => p.role === 'admin').length;

  const sqlMigrationCode = `-- ==============================================================================
-- VIDYA PLATFORM: SECURE ROLE-BASED ACCESS CONTROL & DATASET MAPPING MIGRATION
-- ==============================================================================

-- 1. EXTEND public.user_profiles WITH DATASET MAPPING COLUMNS
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES public.students(student_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) REFERENCES public.staff(staff_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_id ON public.user_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON public.user_profiles(staff_id);

-- 2. ENFORCE DEFAULT STUDENT ROLE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''), 'Student Scholar'),
    new.email,
    'student',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ENABLE ROW LEVEL SECURITY ON ALL 11 TABLES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;
`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
                Admin User Management &amp; Dataset Mapping
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Manage roles (Admin, Teacher, Student) and link accounts to verified records in <code>public.students</code> &amp; <code>public.staff</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-blue-200 shadow-2xs"
          >
            <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
            <span>Safe Test Workflow</span>
            {showWorkflowGuide ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
          >
            <Code className="w-3.5 h-3.5 text-slate-600" />
            <span>Database Schema SQL</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Users</span>
          </button>
        </div>
      </div>

      {/* Alert banner if admin profile is missing */}
      {currentAdmin?.isProfileMissing && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-rose-900">Admin profile not found</h4>
            <p className="mt-0.5 text-rose-700 leading-relaxed">
              Your active session (<span className="font-mono font-semibold">{currentAdmin?.email}</span>, UUID: <span className="font-mono">{currentAdmin?.id}</span>) does not have a corresponding record in <span className="font-mono">public.user_profiles</span>.
            </p>
          </div>
        </div>
      )}

      {/* Safe Testing Workflow & Account Preservation Card (Requirement 1, 2, 4, 6, 7) */}
      {showWorkflowGuide && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/90 shadow-xs space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-600 text-white">
                <FlaskConical className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Safe Test Workflow: Verifying Admin Mapping &amp; Account Preservation
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
              Preserving Baseline Account
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Rule 1: sai account preservation */}
            <div className="p-3.5 rounded-2xl bg-white border border-blue-100/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1. Verified Administrator</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <code>chowdharisaikiran@gmail.com</code> (<strong>sai</strong>) is verified as <span className="font-semibold text-indigo-700">admin</span> with <code className="text-slate-700 font-mono">student_id: NULL</code> &amp; <code className="text-slate-700 font-mono">staff_id: NULL</code> for full administrative governance.
              </p>
            </div>

            {/* Rule 2: Dedicated test account creation */}
            <div className="p-3.5 rounded-2xl bg-white border border-blue-100/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px]">
                <UserPlus className="w-3.5 h-3.5" />
                <span>2. Create Dedicated Test Account</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                To test dataset mapping without altering <code>sai</code>, open an incognito window, use standard <strong>Sign Up</strong> to create a test user (e.g. <code>test.scholar@vidya.local</code>), and return here to map it explicitly.
              </p>
            </div>

            {/* Rule 3: Real records & explicit confirmation */}
            <div className="p-3.5 rounded-2xl bg-white border border-blue-100/80 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                <Database className="w-3.5 h-3.5" />
                <span>3. Live Records &amp; Confirmation</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The student selector loads all <strong>{students.length} real records</strong> from <code>public.students</code> (with name, age, gender). Saving requires an explicit confirmation modal displaying the target user and selected student record.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Setup Error Banner (Requirement 9) */}
      {setupError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-950">Privileged Server Operation Setup Error</h4>
            <p className="text-rose-800 leading-relaxed">{setupError}</p>
            <p className="text-rose-700 text-[11px]">
              Direct client-side privilege escalation is strictly denied by Row-Level Security. To enable role updates, ensure <code>SUPABASE_SECRET_KEY</code> is configured on the backend server.
            </p>
          </div>
        </div>
      )}

      {/* Regular Error Alert */}
      {error && !setupError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-amber-800 hover:text-amber-950 text-xs font-bold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 text-xs font-bold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalUsers}</div>
            <span className="text-[11px] text-slate-500">Registered Supabase users</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Student Scholars</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalStudents}</div>
            <span className="text-[11px] text-blue-600 font-medium">
              {mappedStudents} linked ({totalStudents - mappedStudents} unlinked)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider">Faculty Teachers</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalTeachers}</div>
            <span className="text-[11px] text-violet-600 font-medium">
              {mappedTeachers} linked ({totalTeachers - mappedTeachers} unlinked)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Administrators</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalAdmins}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Full institutional access</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, UUID, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer text-[11px] ${
                  roleFilter === r ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Mapping Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['all', 'mapped', 'unmapped'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMappingFilter(m)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer text-[11px] ${
                  mappingFilter === m ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'all' ? 'All Links' : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">User Profiles (public.user_profiles)</h2>
            <p className="text-[11px] text-slate-500">
              Showing {filteredProfiles.length} of {profiles.length} total user accounts
            </p>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>Privileged server operations enabled</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Full Name &amp; Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Dataset Mapping</th>
                <th className="py-3 px-4">Auth UUID (id)</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading authenticated user profiles from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UserX className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>No matching user profiles found in <code>public.user_profiles</code>.</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const roleConfig = {
                    admin: { label: 'Admin', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: ShieldAlert },
                    teacher: { label: 'Teacher', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: UserCheck },
                    student: { label: 'Student', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: GraduationCap },
                    pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
                  }[p.role] || { label: p.role, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: Users };

                  const RoleIcon = roleConfig.icon;

                  // Find mapped student or staff details
                  const linkedStudent = p.student_id ? students.find((s) => s.student_id === p.student_id) : null;
                  const linkedStaff = p.staff_id ? staff.find((st) => st.staff_id === p.staff_id) : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.full_name || 'Scholar User'}</span>
                            <span className="text-[11px] text-slate-500 font-normal font-mono">{p.email || 'No email registered'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.role === 'student' ? (
                          p.student_id ? (
                            <div className="text-slate-900">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                                student_id: #{p.student_id}
                              </span>
                              {linkedStudent && (
                                <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                                  ({linkedStudent.name}, Age {linkedStudent.age})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-700 font-mono text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                              NULL (Unmapped)
                            </span>
                          )
                        ) : p.role === 'teacher' ? (
                          p.staff_id ? (
                            <div className="text-slate-900">
                              <span className="font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 text-[11px]">
                                staff_id: {p.staff_id}
                              </span>
                              {linkedStaff && (
                                <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                                  ({linkedStaff.staff_name} — {linkedStaff.subject})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-700 font-mono text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                              NULL (Unmapped)
                            </span>
                          )
                        ) : p.role === 'admin' ? (
                          <span className="text-indigo-700 font-medium text-[11px] flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                            <span>Administrator (No dataset mapping)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Awaiting role verification</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded" title={p.id}>
                          {p.id.slice(0, 8)}...{p.id.slice(-4)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.role === 'student' && p.student_id && (
                            <button
                              type="button"
                              onClick={() => handleUnlinkStudent(p)}
                              disabled={unlinkingUserId === p.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                              title="Unlink this student record (sets student_id to NULL)"
                            >
                              <UserMinus className="w-3 h-3 text-rose-600" />
                              <span>{unlinkingUserId === p.id ? 'Unlinking...' : 'Unlink'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Assign Role &amp; Mapping</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role & Mapping Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${confirmingMapping ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {confirmingMapping ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <ShieldCheck className="w-4 h-4 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {confirmingMapping ? 'Step 2: Confirm Role & Dataset Mapping' : 'Step 1: Authorize Role & Dataset Mapping'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {confirmingMapping
                      ? 'Verify target user email and dataset link before executing server-side update'
                      : 'Assign institutional role and select verified record from public.students / public.staff'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setConfirmingMapping(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmingMapping ? (
              /* STEP 2: CLEAR CONFIRMATION VIEW (Requirement 3) */
              <div className="space-y-4 text-xs animate-in fade-in">
                {/* Notice banner */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Please Confirm Server-Side Update</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Review the exact target email and dataset record below. Confirming will update <code>public.user_profiles</code> via the verified administrative backend.
                  </p>
                </div>

                {/* Target User Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target User Account</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">User Name</span>
                      <span className="font-bold text-slate-900">{editingUser.full_name || 'Scholar User'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">User Email</span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                        {editingUser.email}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-[11px]">Auth UUID</span>
                      <span className="font-mono text-[10px] text-slate-500">{editingUser.id}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed Role & Dataset Mapping */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assignment Details</span>
                  
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Institutional Role:</span>
                    <div className="flex items-center gap-2">
                      {newRole !== editingUser.role ? (
                        <>
                          <span className="line-through text-slate-400 text-xs uppercase">{editingUser.role}</span>
                          <span className="font-bold text-xs text-amber-600">→</span>
                          <span className="font-bold uppercase text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {newRole} (Modified)
                          </span>
                        </>
                      ) : (
                        <span className="font-bold uppercase text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {newRole} (Preserved)
                        </span>
                      )}
                    </div>
                  </div>

                  {newRole !== editingUser.role && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Role Modification Warning:</strong>
                        <p className="mt-0.5 leading-relaxed">
                          You are explicitly modifying this user&apos;s role from <span className="font-bold uppercase">{editingUser.role}</span> to <span className="font-bold uppercase">{newRole}</span>. Any prior incompatible dataset mappings will be cleared.
                        </p>
                      </div>
                    </div>
                  )}

                  {newRole === 'student' && (
                    <div className="space-y-2">
                      <span className="text-slate-600 font-medium block">Dataset Record (public.students):</span>
                      {activeSelectedStudent ? (
                        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{activeSelectedStudent.name}</span>
                            <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs">
                              student_id: #{activeSelectedStudent.student_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-3">
                            <span>Age: <strong className="text-slate-800">{activeSelectedStudent.age} yrs</strong></span>
                            <span>•</span>
                            <span>Gender: <strong className="text-slate-800">{activeSelectedStudent.gender}</strong></span>
                          </div>
                          <p className="text-[11px] text-blue-700 pt-1.5 border-t border-blue-100 leading-relaxed">
                            ✓ Account <strong>{editingUser.email}</strong> will be granted access to this student's grades, attendance, and recommendations under Row-Level Security.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1">
                          <span className="font-bold text-slate-700 block">No Student Record Mapped (NULL)</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            This account will remain unlinked. Upon signing in, this user will see the unmapped empty state on their student dashboard.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {newRole === 'teacher' && (
                    <div className="space-y-2">
                      <span className="text-slate-600 font-medium block">Dataset Record (public.staff):</span>
                      {activeSelectedStaff ? (
                        <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{activeSelectedStaff.staff_name}</span>
                            <span className="font-mono font-bold text-violet-700 bg-white px-2 py-0.5 rounded border border-violet-200 text-xs">
                              staff_id: {activeSelectedStaff.staff_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Subject: <strong className="text-slate-800">{activeSelectedStaff.subject}</strong> · Attendance: {activeSelectedStaff.overall_attendance_percentage}%
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                          <span className="font-bold text-slate-700 block">No Staff Record Mapped (NULL)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {newRole === 'admin' && (
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <span className="font-bold block">Administrator Role Oversight</span>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Any existing student or staff mappings will be cleared to NULL to maintain strict administrative account isolation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Account preservation warning if modifying sai */}
                {editingUser.email === 'chowdharisaikiran@gmail.com' && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Verified Administrator Account (sai)</span>
                    </div>
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                      <code>chowdharisaikiran@gmail.com</code> is configured with the <strong>Admin</strong> role (student_id = NULL, staff_id = NULL) with full institutional governance authority.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 1: CONFIGURATION VIEW */
              <div className="space-y-4 text-xs">
                {/* Account summary */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target User Account</span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{editingUser.full_name || 'Scholar User'}</p>
                      <p className="font-mono text-xs text-indigo-700 font-semibold">{editingUser.email}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                      UUID: {editingUser.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* sai preservation alert in Step 1 */}
                {editingUser.email === 'chowdharisaikiran@gmail.com' && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Administrator Account:</strong> <code>chowdharisaikiran@gmail.com</code> has verified administrative privileges (student_id = NULL, staff_id = NULL).
                    </p>
                  </div>
                )}

                {/* Role selection (Requirement 3) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    1. Assign Institutional Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['student', 'teacher', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs capitalize border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          newRole === r
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {r === 'student' && <GraduationCap className="w-4 h-4" />}
                        {r === 'teacher' && <UserCheck className="w-4 h-4" />}
                        {r === 'admin' && <ShieldAlert className="w-4 h-4" />}
                        <span>{r}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Dataset Link: Student (Requirement 4, 6, 7) */}
                {newRole === 'student' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>2. Link Institutional Student Record (public.students)</span>
                      </label>
                      <span className="text-[10px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded font-semibold">
                        {students.length} Total Records
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Search and select a verified student candidate. An account must be explicitly verified and confirmed before access to protected grades and attendance is granted.
                    </p>

                    {/* Live Candidate Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search candidates by name, Student ID (e.g. 1001), or class..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
                      />
                      {searchingCandidates && (
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Candidate Selection List (Scrollable) */}
                    <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 bg-white p-2">
                      {/* Unmapped Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId('')}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          selectedStudentId === ''
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400 text-blue-900'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserX className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold">Unmapped / No Student Record (NULL)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">student_id: NULL</span>
                      </button>

                      {/* Candidate Student Cards */}
                      {candidateStudents.length > 0 ? (
                        candidateStudents.map((cand) => {
                          const isSelected = selectedStudentId === cand.student_id;
                          const isMappedToOther = cand.isMapped && cand.mappedUser && cand.mappedUser.id !== editingUser.id;
                          const isMappedToSelf = cand.isMapped && cand.mappedUser && cand.mappedUser.id === editingUser.id;

                          return (
                            <button
                              key={cand.student_id}
                              type="button"
                              onClick={() => setSelectedStudentId(cand.student_id)}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer space-y-1 ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{cand.name}</span>
                                  <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.2 rounded">
                                    #{cand.student_id}
                                  </span>
                                </div>

                                {/* Mapping Status Badge */}
                                {isMappedToOther ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Conflict: Linked</span>
                                  </span>
                                ) : isMappedToSelf ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                                    Currently Linked
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    Available
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span>Grade: <strong className="text-slate-700">{cand.class_grade || 'Unassigned'}</strong></span>
                                <span>Age: <strong className="text-slate-700">{cand.age}</strong> ({cand.gender})</span>
                                {cand.current_gpa !== null && (
                                  <span>GPA: <strong className="text-slate-700">{cand.current_gpa}</strong></span>
                                )}
                                {cand.risk_level && (
                                  <span className={`font-semibold capitalize ${
                                    cand.risk_level.toLowerCase() === 'high' ? 'text-rose-600' :
                                    cand.risk_level.toLowerCase() === 'moderate' ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {cand.risk_level} Risk
                                  </span>
                                )}
                              </div>

                              {/* Show conflicting account detail */}
                              {isMappedToOther && cand.mappedUser && (
                                <p className="text-[10px] text-amber-700 font-medium pt-1 border-t border-amber-100">
                                  Currently linked to {cand.mappedUser.fullName} ({cand.mappedUser.email})
                                </p>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        filteredStudents.map((s) => {
                          const isSelected = selectedStudentId === s.student_id;
                          return (
                            <button
                              key={s.student_id}
                              type="button"
                              onClick={() => setSelectedStudentId(s.student_id)}
                              className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <span className="font-semibold">#{s.student_id} - {s.name} ({s.age} yrs, {s.gender})</span>
                              <span className="font-mono text-[10px] text-blue-600">Select</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Student Candidate Details Card */}
                    {activeSelectedStudent && (
                      <div className="p-3 rounded-2xl bg-white border border-blue-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Candidate Selected for Linking</span>
                            <h4 className="font-bold text-slate-900 text-sm">{activeSelectedStudent.name}</h4>
                          </div>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 text-xs">
                            student_id: #{activeSelectedStudent.student_id}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <div>Age: <strong className="text-slate-800">{activeSelectedStudent.age} yrs</strong></div>
                          <div>Gender: <strong className="text-slate-800">{activeSelectedStudent.gender}</strong></div>
                        </div>

                        {/* Check Conflict with existing user */}
                        {profiles.some((p) => p.student_id === activeSelectedStudent.student_id && p.id !== editingUser.id) && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block">Mapping Collision Alert</strong>
                              <span>
                                This student record is already linked to another registered account. Submitting will require administrator conflict confirmation.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional Dataset Link: Teacher (Requirement 5, 6, 7) */}
                {newRole === 'teacher' && (
                  <div className="space-y-2 p-3.5 rounded-2xl bg-violet-50/40 border border-violet-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-violet-600" />
                        <span>2. Map to public.staff (staff_id)</span>
                      </label>
                      <span className="text-[10px] text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded font-semibold">
                        {staff.length} Faculty
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Select an explicit staff record. Linking grants this educator access to their assigned cohort.
                    </p>

                    {/* Staff Search Filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search faculty by name, subject, or ID..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    >
                      <option value="">-- None / Unmapped (NULL) --</option>
                      {filteredStaff.map((st) => (
                        <option key={st.staff_id} value={st.staff_id}>
                          {st.staff_id} - {st.staff_name} ({st.subject})
                        </option>
                      ))}
                    </select>

                    {/* Selected Staff Preview */}
                    {activeSelectedStaff && (
                      <div className="p-2.5 rounded-xl bg-white border border-violet-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{activeSelectedStaff.staff_name}</span>
                          <span className="text-[11px] text-slate-500">
                            Subject: {activeSelectedStaff.subject} · Attendance: {activeSelectedStaff.overall_attendance_percentage}%
                          </span>
                        </div>
                        <span className="font-mono text-violet-700 font-bold bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                          staff_id: {activeSelectedStaff.staff_id}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Isolation Notice (Requirement 6) */}
                {newRole === 'admin' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Administrator Account Isolation</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Institutional administrators possess full system oversight and are not associated with individual student or teacher performance records. Any prior mappings will be cleared automatically to <code>NULL</code>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {confirmingMapping ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingMapping(false)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveRole(false)}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Server-Side...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Apply Server-Side Update</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setConfirmingMapping(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingMapping(true)}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>Review &amp; Confirm Mapping</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explicit Administrator Conflict Resolution Modal (Requirement 5) */}
      {conflictModalData && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Resolve Mapping Collision</h3>
                <p className="text-xs text-slate-500">Explicit Administrator Confirmation Required</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-amber-950">
                {conflictModalData.message}
              </p>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px] space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Currently Mapped User:</span>
                  <strong className="text-slate-900">{conflictModalData.conflictingUser.fullName}</strong>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span>Email:</span>
                  <span className="text-slate-600">{conflictModalData.conflictingUser.email}</span>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If you confirm reassignment, the student record will be detached from <strong>{conflictModalData.conflictingUser.email}</strong> (their student mapping will be set to NULL) and assigned to <strong>{editingUser.email}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel &amp; Keep Existing
              </button>
              <button
                type="button"
                onClick={handleConfirmConflictResolution}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Reassign Student Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Schema SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supabase SQL Schema &amp; RLS Policies</h3>
                <p className="text-[11px] text-slate-500">
                  SQL migration required in the Supabase SQL editor for role-based security
                </p>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
                {sqlMigrationCode}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-500">
                Execute in your project SQL Editor at <code className="font-mono text-slate-700">supabase.com/dashboard</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlMigrationCode);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Migration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
