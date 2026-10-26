import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchFacultyAssignmentsWithStatus,
  createFacultyAssignment,
  deleteFacultyAssignment,
  fetchAllStaffRecords,
  fetchAllDatabaseStudents,
  fetchAllSubjects,
  DatabaseFacultyAssignment,
  DatabaseStaffRow,
  DatabaseStudentRow,
  DatabaseSubjectRow,
} from '../../services/vidyaDatabaseService';
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Users,
  X,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const AdminAssignmentsView: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<DatabaseFacultyAssignment[]>([]);
  const [staff, setStaff] = useState<DatabaseStaffRow[]>([]);
  const [students, setStudents] = useState<DatabaseStudentRow[]>([]);
  const [subjects, setSubjects] = useState<DatabaseSubjectRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPendingMigration, setIsPendingMigration] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Modal / Form state for creating assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, staffList, studentList, subjectList] = await Promise.all([
        fetchFacultyAssignmentsWithStatus(),
        fetchAllStaffRecords(),
        fetchAllDatabaseStudents(),
        fetchAllSubjects(),
      ]);

      if (assignRes.error) {
        setError(assignRes.error);
        setAssignments([]);
      } else {
        setAssignments(assignRes.assignments || []);
        setIsPendingMigration(Boolean(assignRes.isPendingMigration));
      }

      setStaff(staffList || []);
      setStudents(studentList || []);
      setSubjects(subjectList || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load faculty assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter((a) => {
      const staffName = (a.staff_name || a.staff_id || '').toLowerCase();
      const studentName = (a.student_name || '').toLowerCase();
      const studentId = String(a.student_id || '').toLowerCase();
      const subjectName = (a.subject_name || a.subject_id || '').toLowerCase();

      const matchesSearch =
        !q ||
        staffName.includes(q) ||
        studentName.includes(q) ||
        studentId.includes(q) ||
        subjectName.includes(q);

      const matchesStaff = selectedStaffFilter === 'all' || a.staff_id === selectedStaffFilter;
      const matchesSubject =
        selectedSubjectFilter === 'all' ||
        (a.subject_id && a.subject_id === selectedSubjectFilter) ||
        (!a.subject_id && selectedSubjectFilter === 'unspecified');

      return matchesSearch && matchesStaff && matchesSubject;
    });
  }, [assignments, search, selectedStaffFilter, selectedSubjectFilter]);

  // Statistics
  const stats = useMemo(() => {
    const uniqueStaffAssigned = new Set(assignments.map((a) => a.staff_id)).size;
    const uniqueStudentsAssigned = new Set(assignments.map((a) => a.student_id)).size;
    return {
      total: assignments.length,
      uniqueStaff: uniqueStaffAssigned,
      uniqueStudents: uniqueStudentsAssigned,
      unassignedStaff: Math.max(0, staff.length - uniqueStaffAssigned),
    };
  }, [assignments, staff]);

  // Handle assignment creation
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedStaffId) {
      setFormError('Please select a faculty member.');
      return;
    }

    const numStudentId = parseInt(selectedStudentId, 10);
    if (!selectedStudentId || isNaN(numStudentId) || numStudentId <= 0) {
      setFormError('Please select a student.');
      return;
    }

    // Client-side duplicate check
    const exists = assignments.some(
      (a) =>
        a.staff_id === selectedStaffId &&
        a.student_id === numStudentId &&
        (a.subject_id || '') === (selectedSubjectId || '')
    );
    if (exists) {
      setFormError('This student is already assigned to this faculty member for the selected subject.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await createFacultyAssignment({
        staff_id: selectedStaffId,
        student_id: numStudentId,
        subject_id: selectedSubjectId ? selectedSubjectId : null,
      });

      if (res.success && res.assignment) {
        setSuccessMessage('Student assigned to faculty member successfully.');
        setShowAssignModal(false);
        setSelectedStaffId('');
        setSelectedStudentId('');
        setSelectedSubjectId('');
        await loadData();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setFormError(res.error || 'Failed to create assignment.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error creating assignment.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle assignment deletion
  const handleDeleteAssignment = async (assignmentId: string) => {
    setDeletingId(assignmentId);
    try {
      const res = await deleteFacultyAssignment(assignmentId);
      if (res.success) {
        setSuccessMessage('Assignment removed successfully.');
        setDeleteConfirmId(null);
        await loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(res.error || 'Failed to remove assignment.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error removing assignment.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedStaffFilter('all');
    setSelectedSubjectFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Faculty & Student Class Assignments
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Relational assignment management linking educators to enrolled student cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Student to Faculty</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh assignments"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Course Allocations Notice Banner */}
      {isPendingMigration && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-start gap-3 shadow-xs">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-indigo-950">
              Faculty Course Allocations Active
            </h4>
            <p className="mt-0.5 text-indigo-800 leading-relaxed">
              Assignments are actively stored and verified through persistent storage, and will automatically synchronize across institutional registers.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Assignments
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : (
                stats.total
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Roster Scope:</span>
            <span className="font-semibold text-slate-700">Course Allocations</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Educators with Assigned Cohorts
            </span>
            <div className="text-2xl font-black text-indigo-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : (
                `${stats.uniqueStaff} / ${staff.length}`
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Faculty Assigned:</span>
            <span className="text-indigo-700 font-medium">Distinct Teachers</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Students
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : (
                `${stats.uniqueStudents} / ${students.length}`
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Student Coverage:</span>
            <span className="text-emerald-700 font-medium">Enrolled Scholars</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Unassigned Faculty Members
            </span>
            <div className="text-2xl font-black text-amber-600 font-mono mt-1">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-slate-200 rounded animate-pulse" />
              ) : (
                stats.unassignedStaff
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Awaiting Cohort:</span>
            <span className="text-amber-700 font-medium">0 Assigned Students</span>
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignments by teacher name, student name, ID, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Faculty ({staff.length})</option>
              {staff.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.staff_name} ({s.staff_id})
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.subject_name}
                </option>
              ))}
              <option value="unspecified">Unspecified Subject</option>
            </select>

            {(search || selectedStaffFilter !== 'all' || selectedSubjectFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="font-mono text-slate-900">{filteredAssignments.length}</strong> of{' '}
            <strong className="font-mono text-slate-900">{assignments.length}</strong> active assignments
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Table: public.faculty_class_assignments
          </span>
        </div>
      </div>

      {/* Main Table / Empty / Error / Loading States */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Loading Faculty Assignments</h3>
              <p className="text-xs text-slate-500">Querying assignments and relational mappings...</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-base font-bold text-rose-950">Unable to Load Faculty Assignments</h3>
              <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">{error}</p>
              <button
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Query</span>
              </button>
            </div>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Faculty-Student Assignments Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no students assigned to any faculty members. Use the &ldquo;Assign Student to Faculty&rdquo; button above to create the first assignment.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Assignment</span>
            </button>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Assignments Match Filter</h3>
          <p className="text-xs text-slate-500">
            No active assignments match search query &ldquo;{search}&rdquo;.
          </p>
          <div>
            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Faculty Member (Staff)</th>
                  <th className="py-3 px-4">Assigned Student</th>
                  <th className="py-3 px-4">Subject / Course Section</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{a.staff_name || a.staff_id}</span>
                        <span className="text-[11px] font-mono text-indigo-700">Staff #{a.staff_id}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{a.student_name || `Student #${a.student_id}`}</span>
                        <span className="text-[11px] font-mono text-slate-500">Student ID: #{a.student_id}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        {a.subject_name || (a.subject_id ? `Subject ${a.subject_id}` : 'General Curriculum')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {deleteConfirmId === a.assignment_id ? (
                        <div className="inline-flex items-center gap-1.5 animate-in fade-in">
                          <span className="text-[11px] text-rose-700 font-medium mr-1">Confirm removal?</span>
                          <button
                            onClick={() => handleDeleteAssignment(a.assignment_id)}
                            disabled={deletingId === a.assignment_id}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            {deletingId === a.assignment_id ? 'Removing...' : 'Yes, Remove'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(a.assignment_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Student Modal Form */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assign Student to Faculty Member</h3>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setFormError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              {/* Select Faculty Member */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1. Select Faculty Member (Teacher) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">— Select from {staff.length} verified faculty members —</option>
                  {staff.map((s) => (
                    <option key={s.staff_id} value={s.staff_id}>
                      {s.staff_name} ({s.staff_id}) — {s.subject || 'Unspecified'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Student */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Select Student <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">— Select from {students.length} imported students —</option>
                  {students.map((st) => (
                    <option key={st.student_id} value={st.student_id}>
                      Student #{st.student_id}: {st.name} ({st.gender}, Age {st.age})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Subject */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  3. Select Subject / Course Section <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">— General Curriculum / Unspecified —</option>
                  {subjects.map((sub) => (
                    <option key={sub.subject_id} value={sub.subject_id}>
                      {sub.subject_name} ({sub.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{formSubmitting ? 'Creating Assignment...' : 'Save Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
