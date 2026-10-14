import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentData, UserAccount, UserRole, UserProfileRow } from '../types';
import { INITIAL_STUDENTS, INITIAL_USERS } from '../data/mockData';
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
    staffId?: string | null
  ) => Promise<{ success: boolean; error?: string; isSetupError?: boolean }>;
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
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
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
      if (result.source === 'database' && result.data.length > 0) {
        setAllStudents(result.data);
      } else if (result.error) {
        setStudentsError(result.error);
        // Preserves mock data fallback as guaranteed by fetchStudentsFromSupabase
      }
    } catch (err: any) {
      setStudentsError(err?.message || 'Error loading students');
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

        const studentId = actualRole === 'student' ? (profile.student_id ?? null) : null;
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
        // Profile row in public.user_profiles is MISSING for this authenticated user's UUID!
        // Display clear safe profile-not-found / role pending state and never invent an admin role.
        const missingAccount: UserAccount = {
          id: authUser.id,
          username: authUser.email ? authUser.email.split('@')[0] : '',
          email: authUser.email || '',
          name: authUser.email || 'Profile not found',
          role: 'pending',
          studentId: null,
          staffId: null,
          isProfileMissing: true,
        };

        setUser(missingAccount);
        localStorage.setItem('vidya_user', JSON.stringify(missingAccount));
        setSelectedStudentId(null);
        return missingAccount;
      }
    } catch (err) {
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
        refreshStudents();
      }
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
    staffId?: string | null
  ): Promise<{ success: boolean; error?: string; isSetupError?: boolean }> => {
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
        }),
      });

      const parsed = await parseApiResponse<{ success: boolean; isSetupError?: boolean }>(
        res,
        'POST /api/admin/users/:id/role-mapping'
      );

      if (!parsed.ok || !parsed.data?.success) {
        return {
          success: false,
          error: parsed.error || `Server update failed with status ${res.status}.`,
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

      const studentId = 'STU-' + authUser.id.replace(/-/g, '').slice(0, 4).toUpperCase();
      const account: UserAccount = {
        id: authUser.id,
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        name: cleanName,
        role: 'student',
        studentId,
      };

      // If session is active immediately (e.g. email confirmation off or auto-confirmed)
      if (data.session) {
        let confirmedRole: UserRole = 'pending';
        try {
          await client.from('user_profiles').upsert({
            id: authUser.id,
            full_name: cleanName,
            email: cleanEmail,
            role: 'student',
            updated_at: new Date().toISOString(),
          });

          const { data: prof } = await client.from('user_profiles').select('role').eq('id', authUser.id).maybeSingle();
          if (prof?.role === 'student' || prof?.role === 'teacher' || prof?.role === 'admin') {
            confirmedRole = prof.role;
          }
        } catch (profileErr) {
          console.warn('Profile sync note:', profileErr);
          confirmedRole = 'pending';
        }

        account.role = confirmedRole;

        if (confirmedRole === 'student') {
          // Add corresponding student analytics record to local state
          const newStudentRecord: StudentData = {
            Student_ID: studentId,
            Name: cleanName,
            Email: cleanEmail,
            Age: 17,
            Gender: 'Non-Binary',
            Education_Level: 'High School',
            Class_Grade: 'Grade 11-A',
            Attendance_Percent: 94.0,
            Study_Hours_Per_Day: 3.5,
            Assignment_Score: 85,
            Quiz_Score: 84,
            Previous_Score: 82,
            Exam_Score: 86,
            Overall_Score: 85,
            Sleep_Hours: 7.5,
            Motivation_Level: 'High',
            Learning_Style: 'Visual',
          Internet_Access: 'Yes',
          Parental_Support: 'High',
          Tutoring: 'No',
          Extracurricular_Activity: 'Yes',
          Stress_Level: 'Low',
          Weak_Subject: 'None',
          Performance_Level: 'Good',
          Risk_Level: 'Low',
          Recommended_Action: 'Explore advanced STEM modules and maintain regular coursework review.',
          Subjects: [
            { subject: 'Mathematics', assignment: 88, quiz: 85, exam: 86, overall: 86, grade: 'A', trend: 'up' },
            { subject: 'Physics', assignment: 84, quiz: 82, exam: 85, overall: 84, grade: 'A-', trend: 'stable' },
            { subject: 'Computer Science', assignment: 92, quiz: 90, exam: 94, overall: 93, grade: 'A+', trend: 'up' },
          ],
          History: [
            { month: 'Jan', quizScore: 82, assignmentScore: 84, overallScore: 83, attendance: 93 },
            { month: 'Feb', quizScore: 84, assignmentScore: 85, overallScore: 85, attendance: 94 },
          ],
          Last_Updated: new Date().toISOString().split('T')[0],
        };

          addStudent(newStudentRecord);
          setSelectedStudentId(studentId);
        }

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
