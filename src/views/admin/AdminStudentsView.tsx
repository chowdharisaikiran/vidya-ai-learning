import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { calculateAcademicPrediction } from '../../services/mlModel';
import { StudentData } from '../../types';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react';
import { apiUrl, parseApiResponse } from '../../lib/apiConfig';
import { getActiveAuthToken } from '../../services/vidyaDatabaseService';
import { AdminStudentDetailView } from './AdminStudentDetailView';

export interface AdminStudentsViewProps {
  initialStudentId?: string | number | null;
  onNavigate?: (tab: string) => void;
}

export const AdminStudentsView: React.FC<AdminStudentsViewProps> = ({
  initialStudentId,
}) => {
  const { allStudents, refreshStudents, studentsLoading, studentsError } = useAuth();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'High' | 'Moderate' | 'Low'>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper to extract student ID from query params or route
  const getInitialSelectedId = (): string | number | null => {
    if (initialStudentId) return initialStudentId;
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const qId = params.get('id') || params.get('studentId');
    if (qId) return qId;
    const match = window.location.pathname.match(/\/students\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return null;
  };

  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(getInitialSelectedId);

  // Synchronize browser history (back/forward) with selected student
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setSelectedStudentId(getInitialSelectedId());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectStudent = (id: string | number) => {
    setSelectedStudentId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('id', String(id));
      window.history.pushState({ studentId: id }, '', url.pathname + url.search);
    }
  };

  const handleBackToStudents = () => {
    setSelectedStudentId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      url.searchParams.delete('studentId');
      window.history.pushState(null, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    Student_ID: `STU-${1000 + allStudents.length + 1}`,
    Name: '',
    Email: '',
    Age: 17,
    Gender: 'Male' as const,
    Education_Level: 'High School' as const,
    Class_Grade: 'Grade 11-A',
    Attendance_Percent: 88,
    Study_Hours_Per_Day: 3.5,
    Assignment_Score: 78,
    Quiz_Score: 76,
    Previous_Score: 75,
    Sleep_Hours: 7.0,
    Motivation_Level: 'Medium' as const,
    Learning_Style: 'Visual' as const,
    Internet_Access: 'Yes' as const,
    Parental_Support: 'Medium' as const,
    Tutoring: 'No' as const,
    Extracurricular_Activity: 'Yes' as const,
    Stress_Level: 'Medium' as const,
    Weak_Subject: 'Not assessed',
  });

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const filtered = allStudents.filter((s) => {
    const matchesSearch =
      s.Name.toLowerCase().includes(search.toLowerCase()) ||
      s.Student_ID.toLowerCase().includes(search.toLowerCase()) ||
      (s.Weak_Subject ? s.Weak_Subject.toLowerCase().includes(search.toLowerCase()) : false);
    const matchesRisk = riskFilter === 'all' || s.Risk_Level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Pagination state & calculation
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedStudents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleExportCSV = async () => {
    setActionError(null);
    try {
      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl('/api/admin/dataset/export'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setActionError(errJson.error || `Export failed with status ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'vidya_live_students_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setActionSuccess('Successfully exported authorized public.students dataset.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to download authenticated export.');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Name) return;

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl('/api/admin/students'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.Name,
          email: formData.Email || undefined,
          age: formData.Age,
          gender: formData.Gender,
          class_grade: formData.Class_Grade,
          attendance_percent: formData.Attendance_Percent,
          study_hours_per_day: formData.Study_Hours_Per_Day,
          previous_score: formData.Previous_Score,
          quiz_score: formData.Quiz_Score,
          assignment_score: formData.Assignment_Score,
          sleep_hours: formData.Sleep_Hours,
          motivation_level: formData.Motivation_Level,
          parental_support: formData.Parental_Support,
          tutoring: formData.Tutoring,
          internet_access: formData.Internet_Access,
          stress_level: formData.Stress_Level,
          weak_subject: formData.Weak_Subject,
          risk_level: 'Low',
        }),
      });

      const parsed = await parseApiResponse<{ success: boolean; student: any }>(res, '/api/admin/students');
      if (!parsed.ok || !parsed.data?.success) {
        throw new Error(parsed.error || `Failed to create student (Status ${res.status})`);
      }

      await refreshStudents();
      setActionSuccess(`Student "${formData.Name}" successfully added to student registry.`);
      setShowAddModal(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Error creating student record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentIdStr: string, name: string) => {
    const numericId = parseInt(studentIdStr.replace(/\D/g, ''), 10);
    if (isNaN(numericId)) {
      setActionError(`Cannot delete record with non-numeric ID: ${studentIdStr}`);
      return;
    }

    if (!confirm(`Are you sure you want to delete student #${numericId} (${name})?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl(`/api/admin/students/${numericId}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const parsed = await parseApiResponse<{ success: boolean; message?: string }>(res, `/api/admin/students/${numericId}`);
      if (!parsed.ok || !parsed.data?.success) {
        throw new Error(parsed.error || `Delete failed with status ${res.status}`);
      }

      await refreshStudents();
      setActionSuccess(`Student #${numericId} (${name}) removed from student registry.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete student.');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    setActionError(null);
    setActionSuccess(null);

    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert('Invalid format. Please provide a non-empty array of student objects.');
        return;
      }

      const token = await getActiveAuthToken();
      const res = await fetch(apiUrl('/api/admin/students/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ students: parsed }),
      });

      const result = await parseApiResponse<{ success: boolean; count: number }>(res, '/api/admin/students/import');
      if (!result.ok || !result.data?.success) {
        throw new Error(result.error || `Import failed with status ${res.status}`);
      }

      await refreshStudents();
      setImportSuccessMsg(`Successfully imported ${result.data.count} student records into student registry.`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccessMsg(null);
        setImportText('');
      }, 1500);
    } catch (err: any) {
      setActionError(err?.message || 'Invalid JSON format or server import error.');
    }
  };

  // If a student is currently selected, render the dedicated Student Dashboard view
  if (selectedStudentId !== null && selectedStudentId !== undefined) {
    return (
      <AdminStudentDetailView
        studentId={selectedStudentId}
        onBack={handleBackToStudents}
        onNavigateToAnotherStudent={handleSelectStudent}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>Student Information System & Data Science Registry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            23 Data Science fields mapped for verified cohort analysis, ML early warning, and bulk CSV ingestion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            Verified Registry: {allStudents.length} Scholars
          </span>

          <button
            onClick={() => refreshStudents()}
            disabled={studentsLoading}
            className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh student roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${studentsLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Connect Real Dataset</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Scholar</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Action Notice</span>
            <p className="mt-0.5 text-rose-700 leading-relaxed">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold flex-1">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {studentsError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Database Connection Error</span>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{studentsError}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Mock-data fallback is disabled. Please check your connection and retry.</p>
            </div>
          </div>
          <button
            onClick={() => refreshStudents()}
            disabled={studentsLoading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${studentsLoading ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student ID, name, or weak subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="High">High Risk Only</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="Low">Low Risk</option>
          </select>
          <span className="text-xs text-slate-500 font-semibold">
            Showing <b>{filtered.length}</b> of {allStudents.length} records
          </span>
        </div>
      </div>

      {/* Complete Data Science Student Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Age/Gender</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Study Hrs/Day</th>
                <th className="py-3 px-4">Assign / Quiz</th>
                <th className="py-3 px-4">Prior Score</th>
                <th className="py-3 px-4">Sleep / Stress</th>
                <th className="py-3 px-4">Learning Style</th>
                <th className="py-3 px-4">Weak Subject</th>
                <th className="py-3 px-4">Exam Score</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 whitespace-nowrap">
              {studentsLoading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-indigo-500 animate-spin" />
                    <p className="font-semibold text-slate-700 text-xs">Querying institutional student registry...</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Fetching verified records from database.</p>
                  </td>
                </tr>
              ) : studentsError ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                    <p className="font-semibold text-slate-800 text-xs">Failed to load student registry</p>
                    <p className="text-[11px] text-rose-600 mt-0.5 max-w-md mx-auto">{studentsError}</p>
                    <button
                      onClick={() => refreshStudents()}
                      disabled={studentsLoading}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${studentsLoading ? 'animate-spin' : ''}`} />
                      <span>Retry Connection</span>
                    </button>
                  </td>
                </tr>
              ) : allStudents.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-xs">No student records found in registry</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">The database student table currently has zero records. Use 'Add New Scholar' to enroll students.</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-xs">No matching students found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different name, student ID, or weak subject.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => (
                  <tr key={s.Student_ID} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.Student_ID}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.Name}</td>
                    <td className="py-3 px-4 text-slate-500">{s.Age} / {s.Gender}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{s.Class_Grade}</td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span className={s.Attendance_Percent !== null && s.Attendance_Percent !== undefined && s.Attendance_Percent < 75 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                        {s.Attendance_Percent !== null && s.Attendance_Percent !== undefined ? `${s.Attendance_Percent}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {s.Study_Hours_Per_Day !== null && s.Study_Hours_Per_Day !== undefined ? `${s.Study_Hours_Per_Day} hrs` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.Assignment_Score !== null && s.Assignment_Score !== undefined && s.Quiz_Score !== null && s.Quiz_Score !== undefined
                        ? `${s.Assignment_Score}% / ${s.Quiz_Score}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {s.Previous_Score !== undefined && s.Previous_Score !== null ? `${s.Previous_Score}%` : <span className="text-slate-400 italic">Not available</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.Sleep_Hours !== null && s.Sleep_Hours !== undefined ? `${s.Sleep_Hours}h` : '—'} / {s.Stress_Level || 'Not assessed'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{s.Learning_Style || 'Not assessed'}</td>
                    <td className="py-3 px-4">
                      <span
                        title="Suggested subject based on academic profile"
                        className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-help ${
                          s.Weak_Subject && s.Weak_Subject !== 'Not assessed' && s.Weak_Subject !== 'None'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                        }`}
                      >
                        {s.Weak_Subject && s.Weak_Subject !== 'None' ? s.Weak_Subject : 'Not assessed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {s.Exam_Score !== null && s.Exam_Score !== undefined ? `${s.Exam_Score}%` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {s.Overall_Score !== null && s.Overall_Score !== undefined ? `${s.Overall_Score}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={s.Risk_Level} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSelectStudent(s.Student_ID)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-indigo-200/60"
                          title={`View dynamic student dashboard for ${s.Name} (${s.Student_ID})`}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Dashboard</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.Student_ID, s.Name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete student record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <span>
                Showing <strong className="font-mono text-slate-900">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="font-mono text-slate-900">{Math.min(currentPage * pageSize, filtered.length)}</strong> of{' '}
                <strong className="font-mono text-slate-900">{filtered.length}</strong> scholars
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Scholar to VIDYA SIS</h3>
                  <p className="text-xs text-slate-500">Live ML model will classify risk and predict scores upon submission.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    value={formData.Student_ID}
                    onChange={(e) => setFormData({ ...formData, Student_ID: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arjun Mehta"
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class Grade</label>
                  <select
                    value={formData.Class_Grade}
                    onChange={(e) => setFormData({ ...formData, Class_Grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Grade 11-A">Grade 11-A</option>
                    <option value="Grade 11-B">Grade 11-B</option>
                    <option value="Grade 11-C">Grade 11-C</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.Gender}
                    onChange={(e) => setFormData({ ...formData, Gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="14"
                    max="22"
                    value={formData.Age}
                    onChange={(e) => setFormData({ ...formData, Age: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attendance % (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.Attendance_Percent}
                    onChange={(e) => setFormData({ ...formData, Attendance_Percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Daily Study Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    step="0.5"
                    value={formData.Study_Hours_Per_Day}
                    onChange={(e) => setFormData({ ...formData, Study_Hours_Per_Day: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weak Subject</label>
                  <select
                    value={formData.Weak_Subject}
                    onChange={(e) => setFormData({ ...formData, Weak_Subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Not assessed">Not assessed</option>
                    <option value="Python Programming">Python Programming</option>
                    <option value="Database Management Systems">Database Management Systems</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Statistics">Statistics</option>
                    <option value="Computer Networks">Computer Networks</option>
                    <option value="Web Technologies">Web Technologies</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assignment Score %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.Assignment_Score}
                    onChange={(e) => setFormData({ ...formData, Assignment_Score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quiz Score %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.Quiz_Score}
                    onChange={(e) => setFormData({ ...formData, Quiz_Score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previous Score %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.Previous_Score}
                    onChange={(e) => setFormData({ ...formData, Previous_Score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Learning Style</label>
                  <select
                    value={formData.Learning_Style}
                    onChange={(e) => setFormData({ ...formData, Learning_Style: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Visual">Visual</option>
                    <option value="Auditory">Auditory</option>
                    <option value="Kinesthetic">Kinesthetic</option>
                    <option value="Reading/Writing">Reading/Writing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motivation</label>
                  <select
                    value={formData.Motivation_Level}
                    onChange={(e) => setFormData({ ...formData, Motivation_Level: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stress Level</label>
                  <select
                    value={formData.Stress_Level}
                    onChange={(e) => setFormData({ ...formData, Stress_Level: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Classify & Save Scholar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect Real Dataset Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">Connect Real Student Dataset</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccessMsg ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">{importSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleImportSubmit} className="mt-4 space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Paste JSON dataset array matching the VIDYA Data Science schema (Student_ID, Attendance_Percent, Study_Hours_Per_Day, etc.). The ML inference engine will automatically evaluate risk levels.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">JSON Student Dataset Payload</label>
                  <textarea
                    rows={8}
                    required
                    placeholder={`[\n  {\n    "Student_ID": "STU-5001",\n    "Name": "Kavita Rao",\n    "Attendance_Percent": 89,\n    "Study_Hours_Per_Day": 4.5,\n    "Overall_Score": 86,\n    "Weak_Subject": "Python Programming"\n  }\n]`}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Load Dataset into Platform</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
