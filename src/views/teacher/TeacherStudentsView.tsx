import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UnlinkedTeacherCard } from '../../components/common/UnlinkedTeacherCard';
import { RiskBadge } from '../../components/charts/RiskBadge';
import { StudentData } from '../../types';
import {
  fetchTeacherAssignedCohort,
  DatabaseFacultyAssignment,
} from '../../services/vidyaDatabaseService';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Eye,
  X,
  BookOpen,
  Award,
  CalendarCheck,
  CheckCircle2,
  BrainCircuit,
  GraduationCap,
} from 'lucide-react';

export const TeacherStudentsView: React.FC = () => {
  const { user } = useAuth();
  const staffId = user?.staffId;

  const [students, setStudents] = useState<StudentData[]>([]);
  const [assignments, setAssignments] = useState<DatabaseFacultyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'High' | 'Moderate' | 'Low'>('all');

  // Selected student modal
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  const loadCohort = async () => {
    if (!staffId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTeacherAssignedCohort();
      if (res.error) {
        setError(res.error);
        setStudents([]);
        setAssignments([]);
      } else {
        setStudents(res.students || []);
        setAssignments(res.assignments || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load assigned students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      loadCohort();
    }
  }, [staffId]);

  // Enforce staff_id mapping: if unmapped, do not show any students
  if (!staffId) {
    return <UnlinkedTeacherCard title="Student Roster & Advising Directory" />;
  }

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.Name.toLowerCase().includes(q) ||
        String(s.Student_ID).toLowerCase().includes(q);

      const matchesRisk = riskFilter === 'all' || s.Risk_Level === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [students, search, riskFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Assigned Student Roster</span>
            {students.length > 0 && (
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Staff #{staffId}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access behavioral profiles, grades, and risk analysis exclusively for students assigned to your courses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCohort}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Roster'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800">Loading Assigned Student Cohort...</h4>
          <p className="text-xs text-slate-500">Querying verified assignments under Row-Level Security.</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h4 className="text-sm font-bold">Failed to Load Student Roster</h4>
          </div>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={loadCohort}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State: Mapped to staff_id, but NO students assigned */}
      {!loading && !error && students.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto space-y-3 my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Student Roster Assigned</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are currently no students assigned to your faculty profile (Staff #{staffId}). Under Row-Level Security, broad institutional rosters are restricted until an administrator assigns students to your course sections.
          </p>
          <div className="pt-2">
            <button
              onClick={loadCohort}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              Check for Assignments
            </button>
          </div>
        </div>
      )}

      {/* Populated State: Students ARE assigned */}
      {!loading && !error && students.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredStudents.length} of {students.length} Assigned Students
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name or ID..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
                {(['all', 'High', 'Moderate', 'Low'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setRiskFilter(lvl)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      riskFilter === lvl
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lvl === 'all' ? 'All Risks' : lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Grade & Demographic</th>
                  <th className="py-3 px-4">Overall Score</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Academic Risk</th>
                  <th className="py-3 px-4">Focus Subject</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No assigned students match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.Student_ID} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {s.Name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        #{s.Student_ID}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {s.Class_Grade || 'Undergraduate'} · {s.Gender}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-mono font-bold ${
                          (s.Overall_Score || 0) >= 75 ? 'text-emerald-600' : (s.Overall_Score || 0) >= 60 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {s.Overall_Score ?? '—'}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {s.Attendance_Percent ?? '—'}%
                      </td>
                      <td className="py-3.5 px-4">
                        <RiskBadge level={s.Risk_Level} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {s.Weak_Subject || 'Mathematics'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-all flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Profile</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">{selectedStudent.Name}</h3>
                <span className="font-mono text-xs text-slate-500">#{selectedStudent.Student_ID}</span>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">Overall Score</span>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{selectedStudent.Overall_Score}%</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">Attendance</span>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">{selectedStudent.Attendance_Percent}%</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">Risk Level</span>
                <div className="mt-1"><RiskBadge level={selectedStudent.Risk_Level} /></div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 font-medium">Focus Subject</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">{selectedStudent.Weak_Subject || 'Mathematics'}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Score Breakdown:</span>
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div>Quiz Avg: <span className="font-bold">{selectedStudent.Quiz_Score || 75}%</span></div>
                <div>Midterm: <span className="font-bold">{selectedStudent.Assignment_Score || 22}/25</span></div>
                <div>Final Exam: <span className="font-bold">{selectedStudent.Exam_Score || 40}/50</span></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
