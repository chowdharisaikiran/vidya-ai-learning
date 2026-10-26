import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentData, UserAccount, UserRole, UserProfileRow, CandidateStudent } from '../types';
import {
  testSupabaseConnection,
  ConnectionTestResult,
  getSupabaseClient,
  getActiveAuthToken as getActiveAuthTokenFromSupabase,
  refreshSupabaseSession,
} from '../lib/supabase';
import { fetchStudentsFromSupabase } from '../services/studentService';
import { apiUrl, parseApiResponse } from '../lib/apiConfig';

interface AuthContextType {
  user: UserAccount | null;
  role: UserRole | null;
  student: StudentData | null;
  allStudents: StudentData[];
  selectedStudentId: string | null;
  isSupabaseConnected: boolean;
  studentsLoading: boolean;
  studentsError: string | null;
  setSupabaseConnected: (connected: boolean) => void;
  checkSupabase: (key?: string) => Promise<ConnectionTestResult>;
  refreshStudents: () => Promise<void>;
  refreshUserRole: () => Promise<UserRole>;
  refreshSession: () => Promise<string | null>;
  getActiveAuthToken: () => Promise<string | null>;
  fetchAllUserProfiles: () => Promise<{ profiles: UserProfileRow[]; error?: string; isSetupError?: boolean }>;
  updateUserRoleAndMapping: (
    targetUserId: string,
    newRole: UserRole,
    studentId?: number | null,
    staffId?: string | null,
    overrideExisting?: boolean
  ) => Promise<{
    success: boolean;
    error?: string;
    isConflict?: boolean;
    conflictingUser?: { id: string; email: string; fullName: string };
    isSetupError?: boolean;
  }>;
  unlinkStudentAccount: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  searchAdminStudents: (query?: string) => Promise<{ success: boolean; students: CandidateStudent[]; error?: string }>;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
    needsEmailConfirmation?: boolean;
    user?: UserAccount;
  }>;
  logout: () => void;
  setSelectedStudentId: (id: string | number) => void;
  updateStudent: (student: StudentData) => void;
  addStudent: (student: StudentData) => void;
  deleteStudent: (studentId: string) => void;
  reloadDataset: (newStudents: StudentData[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('vidya_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Cleanse any hardcoded demo identities or fallback names from previous sessions
      if (
        parsed.name === 'Prof. Rajesh Iyer' ||
        parsed.username === 'admin01' ||
        parsed.username === 'Admin01' ||
        parsed.username === 'student01' ||
        parsed.username === 'teacher01' ||
        parsed.id === 'usr_a01' ||
        parsed.id === 'usr_s01' ||
        parsed.id === 'usr_t01' ||
        parsed.email === 'rajesh.iyer@vidya.edu'
      ) {
        localStorage.removeItem('vidya_user');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('vidya_user');
      return null;
    }
  });

  const [allStudents, setAllStudents] = useState<StudentData[]>(() => {
    const saved = localStorage.getItem('vidya_students');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Cleanse any stale mock data previously saved in localStorage
      if (Array.isArray(parsed) && parsed.length > 0 && String(parsed[0]?.Student_ID).startsWith('STU-100')) {
        localStorage.removeItem('vidya_students');
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem('vidya_students');
      return [];
    }
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    const savedUser = localStorage.getItem('vidya_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.studentId) return String(u.studentId);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return localStorage.getItem('vidya_supabase_connected') === 'true';
  });

  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const refreshStudents = async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const result = await fetchStudentsFromSupabase();
      if (result.error) {
        setStudentsError(result.error);
        // Strictly never fall back to mock data on error in production
        setAllStudents([]);
      } else {
        setStudentsError(null);
        setAllStudents(result.data || []);
      }
    } catch (err: any) {
      setStudentsError(err?.message || 'Error loading students from database.');
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  /**
   * Syncs authenticated Supabase user profile from public.user_profiles
   * Requirements:
   * 1. Get currently authenticated Supabase user's identity from active Auth session.
   * 2. Fetch matching user_profiles row using authenticated user's UUID.
   * 3. Display actual full_name, email, and role from the authenticated profile.
   * 4. Never use hardcoded demo identities or fallback admin names.
   * 5. If profile is missing, set clear 'Admin profile not found' state.
   */
  const syncSupabaseUserProfile = async (
    authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> },
    client: any
  ): Promise<UserAccount> => {
    try {
      // 1. Primary secure path: Query authenticated server endpoint using session bearer token.
      // This bypasses client-side PostgreSQL RLS recursion while strictly verifying the caller JWT
      // and checking public.user_profiles using the verified authUser.id (UUID).
      try {
        const token = await getActiveAuthTokenFromSupabase();
        if (token) {
          const res = await fetch(apiUrl('/api/auth/me'), {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const parsed = await parseApiResponse<{
            success: boolean;
            isProfileMissing: boolean;
            user: UserAccount;
          }>(res, '/api/auth/me');

          if (parsed.ok && parsed.data?.success && parsed.data.user) {
            const serverUser = parsed.data.user;
            setUser(serverUser);
            localStorage.setItem('vidya_user', JSON.stringify(serverUser));

            if (serverUser.role === 'student') {
              setSelectedStudentId(serverUser.studentId ? String(serverUser.studentId) : null);
            } else {
              setSelectedStudentId(null);
            }
            return serverUser;
          }
        }
      } catch (endpointErr) {
        console.warn('Backend /api/auth/me failed, falling back to direct client query:', endpointErr);
      }

      // 2. Fallback path: Direct PostgREST client query
      const { data: profile, error: profileErr } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile && !profileErr) {
        // Verified database profile row exists
        const actualRole: UserRole =
          profile.role === 'admin' || profile.role === 'teacher' || profile.role === 'student'
            ? profile.role
            : 'pending';

        const actualName = profile.full_name?.trim() || authUser.email || '';
        const actualEmail = profile.email || authUser.email || '';
        const username = actualEmail.includes('@')
          ? actualEmail.split('@')[0]
          : actualName.toLowerCase().replace(/\s+/g, '');

        const studentId =
          actualRole === 'student' && profile.student_id !== null && profile.student_id !== undefined
            ? Number(profile.student_id)
            : null;
        const staffId = actualRole === 'teacher' ? (profile.staff_id ?? null) : null;

        const updatedAccount: UserAccount = {
          id: authUser.id,
          username,
          email: actualEmail,
          name: actualName,
          role: actualRole,
          studentId,
          staffId,
          isProfileMissing: false,
        };

        setUser(updatedAccount);
        localStorage.setItem('vidya_user', JSON.stringify(updatedAccount));

        if (actualRole === 'student') {
          setSelectedStudentId(studentId ? String(studentId) : null);
        } else if (actualRole === 'teacher') {
          setSelectedStudentId(null);
        }
        return updatedAccount;
      } else {
        // Profile row in public.user_profiles is MISSING or could not be verified for this authenticated user's UUID!
        const missingAccount: UserAccount = {
          id: authUser.id,
          username: authUser.email ? authUser.email.split('@')[0] : '',
          email: authUser.email || '',
          name: authUser.email || 'Profile not found',
          role: 'pending',
          studentId: null,
          staffId: null,
          isProfileMissing: !profileErr,
          errorMessage: profileErr ? profileErr.message : undefined,
        };

        setUser(missingAccount);
        localStorage.setItem('vidya_user', JSON.stringify(missingAccount));
        setSelectedStudentId(null);
        return missingAccount;
      }
    } catch (err: any) {
      console.warn('Error querying user_profiles for UUID:', authUser.id, err);
      const fallbackAccount: UserAccount = {
        id: authUser.id,
        username: authUser.email ? authUser.email.split('@')[0] : '',
        email: authUser.email || '',
        name: authUser.email || 'Profile not found',
        role: 'pending',
        studentId: null,
        staffId: null,
        isProfileMissing: true,
        errorMessage: err?.message,
      };
      setUser(fallbackAccount);
      return fallbackAccount;
    }
  };

  useEffect(() => {
    // Initial verification and student sync
    testSupabaseConnection().then((res) => {
      setIsSupabaseConnected(res.success);
      if (res.success) {
        localStorage.setItem('vidya_supabase_connected', 'true');
      }
      refreshStudents();
    });

    // Supabase Auth listener & immediate session sync
    const client = getSupabaseClient();
    if (client) {
      // Check current session on mount and ensure user profile is fully synced
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user) {
          const saved = localStorage.getItem('vidya_user');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (
                parsed.name === 'Prof. Rajesh Iyer' ||
                parsed.username === 'admin01' ||
                parsed.username === 'Admin01' ||
                parsed.username === 'student01' ||
                parsed.username === 'teacher01' ||
                parsed.id === 'usr_a01' ||
                parsed.id === 'usr_s01' ||
                parsed.id === 'usr_t01' ||
                parsed.email === 'rajesh.iyer@vidya.edu'
              ) {
                setUser(null);
                localStorage.removeItem('vidya_user');
              }
            } catch {
              setUser(null);
              localStorage.removeItem('vidya_user');
            }
          }
        } else {
          // Sync current authenticated Supabase session on mount
          await syncSupabaseUserProfile(session.user, client);
        }
      });

      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('vidya_user');
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          await syncSupabaseUserProfile(session.user, client);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const refreshUserRole = async (): Promise<UserRole> => {
    const client = getSupabaseClient();
    if (!client) return 'pending';

    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return 'pending';

    const updatedAccount = await syncSupabaseUserProfile(session.user, client);
    return updatedAccount.role;
  };

  const refreshSession = async (): Promise<string | null> => {
    return await refreshSupabaseSession();
  };

  const getActiveAuthToken = async (): Promise<string | null> => {
    return await getActiveAuthTokenFromSupabase();
  };

  const fetchAllUserProfiles = async (): Promise<{ profiles: UserProfileRow[]; error?: string; isSetupError?: boolean }> => {
    try {
      const token = await getActiveAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/admin/users'), { headers });
      const parsed = await parseApiResponse<{ users: UserProfileRow[]; isSetupError?: boolean }>(res, '/api/admin/users');

      if (!parsed.ok || !parsed.data) {
        return {
          profiles: [],
          error: parsed.error || `Error fetching user profiles (${res.status})`,
          isSetupError: res.status === 503 || Boolean(parsed.data?.isSetupError),
        };
      }

      return { profiles: parsed.data.users || [], error: undefined };
    } catch (err: any) {
      return { profiles: [], error: err?.message || 'Error fetching user profiles from server.' };
    }
  };

  const updateUserRoleAndMapping = async (
    targetUserId: string,
    newRole: UserRole,
    studentId?: number | null,
    staffId?: string | null,
    overrideExisting?: boolean
  ): Promise<{
    success: boolean;
    error?: string;
    isConflict?: boolean;
    conflictingUser?: { id: string; email: string; fullName: string };
    isSetupError?: boolean;
  }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only institutional administrators can manage user roles.' };
    }

    try {
      const token = await getActiveAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Authentication error: No active administrator session token found. Please sign in again.',
        };
      }

      const res = await fetch(apiUrl(`/api/admin/users/${targetUserId}/role-mapping`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: newRole,
          studentId: studentId ?? null,
          staffId: staffId ?? null,
          overrideExisting: Boolean(overrideExisting),
        }),
      });

      const parsed = await parseApiResponse<{
        success: boolean;
        isConflict?: boolean;
        conflictingUser?: { id: string; email: string; fullName: string };
        isSetupError?: boolean;
      }>(res, 'POST /api/admin/users/:id/role-mapping');

      if (!parsed.ok || !parsed.data?.success) {
        return {
          success: false,
          error: parsed.error || `Server update failed with status ${res.status}.`,
          isConflict: res.status === 409 || Boolean(parsed.data?.isConflict),
          conflictingUser: parsed.data?.conflictingUser,
          isSetupError: res.status === 503 || Boolean(parsed.data?.isSetupError),
        };
      }

      // If updating current administrator's own profile, synchronize active state
      if (user?.id === targetUserId) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role: newRole,
                studentId: studentId !== undefined ? (studentId ?? null) : prev.studentId,
                staffId: staffId !== undefined ? (staffId ?? null) : prev.staffId,
              }
            : null
        );
        await refreshUserRole();
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user role via secure server endpoint.' };
    }
  };

  const unlinkStudentAccount = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only institutional administrators can unlink student accounts.' };
    }

    try {
      const token = await getActiveAuthToken();
      if (!token) {
        return { success: false, error: 'Authentication error: No active administrator session token found.' };
      }

      const res = await fetch(apiUrl(`/api/admin/users/${targetUserId}/unlink-student`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const parsed = await parseApiResponse<{ success: boolean }>(res, 'POST /api/admin/users/:id/unlink-student');
      if (!parsed.ok || !parsed.data?.success) {
        return { success: false, error: parsed.error || 'Failed to unlink student account on server.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error unlinking student account.' };
    }
  };

  const searchAdminStudents = async (
    query = ''
  ): Promise<{ success: boolean; students: CandidateStudent[]; error?: string }> => {
    try {
      const token = await getActiveAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      params.set('limit', '50');

      const url = apiUrl(`/api/admin/students/search?${params.toString()}`);
      const res = await fetch(url, { headers });
      const parsed = await parseApiResponse<{ success: boolean; students: CandidateStudent[] }>(
        res,
        '/api/admin/students/search'
      );

      if (!parsed.ok || !parsed.data) {
        return { success: false, students: [], error: parsed.error || `Error searching students (${res.status})` };
      }

      return { success: true, students: parsed.data.students || [] };
    } catch (err: any) {
      return { success: false, students: [], error: err?.message || 'Network error searching students.' };
    }
  };

  const checkSupabase = async (key?: string): Promise<ConnectionTestResult> => {
    const res = await testSupabaseConnection(key);
    setIsSupabaseConnected(res.success);
    if (res.success) {
      localStorage.setItem('vidya_supabase_connected', 'true');
    }
    return res;
  };

  const setSupabaseConnected = (connected: boolean) => {
    setIsSupabaseConnected(connected);
    localStorage.setItem('vidya_supabase_connected', connected ? 'true' : 'false');
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('vidya_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vidya_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('vidya_students', JSON.stringify(allStudents));
  }, [allStudents]);

  /**
   * Real Supabase Student Self-Registration:
   * Calls supabase.auth.signUp(), sets full name metadata, strictly enforces 'student' role,
   * creates/ensures profile in public.user_profiles, and handles email confirmation status.
   */
  const signUp = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    error?: string;
    needsEmailConfirmation?: boolean;
    user?: UserAccount;
  }> => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'A valid email address is required.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase client could not be initialized.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role: 'student', // Public self-registration is strictly restricted to student role
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please sign in.',
          };
        }
        return { success: false, error: error.message };
      }

      const authUser = data.user;
      if (!authUser) {
        return { success: false, error: 'Registration failed. No user record was returned.' };
      }

      // Check whether email confirmation is required by project settings
      const needsConfirmation = !data.session || (authUser.identities && authUser.identities.length === 0);

      // Real-student onboarding: Newly registered accounts have studentId: null (unmapped)
      // until an authorized administrator explicitly links their account to an existing verified student record.
      const account: UserAccount = {
        id: authUser.id,
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        name: cleanName,
        role: 'student',
        studentId: null,
      };

      // If session is active immediately (e.g. email confirmation off or auto-confirmed)
      if (data.session) {
        let confirmedRole: UserRole = 'student';
        try {
          await client.from('user_profiles').upsert({
            id: authUser.id,
            full_name: cleanName,
            email: cleanEmail,
            role: 'student',
            student_id: null,
            updated_at: new Date().toISOString(),
          });

          const { data: prof } = await client.from('user_profiles').select('role, student_id').eq('id', authUser.id).maybeSingle();
          if (prof?.role === 'student' || prof?.role === 'teacher' || prof?.role === 'admin') {
            confirmedRole = prof.role;
          }
          if (prof?.student_id) {
            account.studentId = prof.student_id;
          }
        } catch (profileErr) {
          console.warn('Profile sync note:', profileErr);
        }

        account.role = confirmedRole;
        setSelectedStudentId(account.studentId ? String(account.studentId) : null);
        setUser(account);
      }

      return {
        success: true,
        needsEmailConfirmation: needsConfirmation,
        user: account,
      };
    } catch (err: any) {
      console.error('Sign up error:', err);
      return { success: false, error: err?.message || 'An unexpected error occurred during registration.' };
    }
  };

  /**
   * Supabase Auth Login:
   * Authenticates strictly through the real Supabase client.
   * If a username is provided instead of an email, resolves the username
   * to the real account email via /api/auth/resolve-email before authenticating.
   */
  const login = async (usernameOrEmail: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const query = usernameOrEmail.trim();
    if (!query) {
      return { success: false, error: 'Please enter your email address or username.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Database service is temporarily unavailable. Please try again shortly.' };
    }

    let targetEmail = query;
    // If not an email, securely resolve username to real Supabase account email
    if (!query.includes('@')) {
      try {
        const res = await fetch(apiUrl('/api/auth/resolve-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: query }),
        });
        const parsed = await parseApiResponse<{ email: string | null }>(res, '/api/auth/resolve-email');
        if (parsed.ok && parsed.data?.email) {
          targetEmail = parsed.data.email;
        } else {
          // Non-existent identifier fails cleanly through Supabase Auth
          targetEmail = `${query.replace(/[^a-zA-Z0-9._-]/g, '')}@vidya.invalid`;
        }
      } catch {
        targetEmail = `${query.replace(/[^a-zA-Z0-9._-]/g, '')}@vidya.invalid`;
      }
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: targetEmail.toLowerCase(),
        password,
      });

      if (!error && data.user) {
        await syncSupabaseUserProfile(data.user, client);
        return { success: true };
      }

      if (error) {
        // Special case: unconfirmed email
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return {
            success: false,
            error: 'Email address not yet confirmed. Please verify your email via the confirmation link sent to your inbox before signing in.',
          };
        }

        // Generic error for invalid credentials (does not reveal user existence)
        return {
          success: false,
          error: 'Invalid email/username or password. Please verify your credentials and try again.',
        };
      }

      return {
        success: false,
        error: 'Invalid email/username or password. Please verify your credentials and try again.',
      };
    } catch (authErr: any) {
      console.warn('Supabase signInWithPassword note:', authErr);
      return {
        success: false,
        error: 'Invalid email/username or password. Please verify your credentials and try again.',
      };
    }
  };

  const logout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
    localStorage.removeItem('vidya_user');
  };

  const updateStudent = (updatedStudent: StudentData) => {
    setAllStudents((prev) =>
      prev.map((s) => (s.Student_ID === updatedStudent.Student_ID ? updatedStudent : s))
    );
  };

  const addStudent = (newStudent: StudentData) => {
    setAllStudents((prev) => [newStudent, ...prev]);
  };

  const deleteStudent = (studentId: string) => {
    setAllStudents((prev) => prev.filter((s) => s.Student_ID !== studentId));
  };

  const reloadDataset = (newStudents: StudentData[]) => {
    setAllStudents(newStudents);
    if (newStudents.length > 0) {
      setSelectedStudentId(newStudents[0].Student_ID);
    }
  };

  const currentStudent = React.useMemo(() => {
    if (user?.role === 'student') {
      if (!user.studentId) return null;
      return allStudents.find((s) => String(s.Student_ID) === String(user.studentId)) || null;
    }
    if (selectedStudentId) {
      return (
        allStudents.find(
          (s) => String(s.Student_ID).toUpperCase() === String(selectedStudentId).toUpperCase()
        ) || null
      );
    }
    return null;
  }, [user?.role, user?.studentId, selectedStudentId, allStudents]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        student: currentStudent,
        allStudents,
        selectedStudentId,
        isSupabaseConnected,
        studentsLoading,
        studentsError,
        setSupabaseConnected,
        checkSupabase,
        refreshStudents,
        refreshUserRole,
        refreshSession,
        getActiveAuthToken,
        fetchAllUserProfiles,
        updateUserRoleAndMapping,
        unlinkStudentAccount,
        searchAdminStudents,
        login,
        signUp,
        logout,
        setSelectedStudentId: (id: string | number) => setSelectedStudentId(String(id)),
        updateStudent,
        addStudent,
        deleteStudent,
        reloadDataset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
