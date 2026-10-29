import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Users,
  GraduationCap,
  Sparkles,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Database,
  Sliders,
  DollarSign,
} from 'lucide-react';
import {
  platformService,
  formatCurrency,
  PLATFORM_PLANS,
} from '../../services/platformService';
import {
  PlatformInstitution,
  InstitutionStatus,
  InstitutionType,
  SubscriptionPlanTier,
  SubscriptionBillingInterval,
  PlatformInvoice,
} from '../../types/platform';

interface PlatformInstitutionsViewProps {
  currency: string;
  onNavigateToSubscriptions?: () => void;
  onNavigateToInvoices?: () => void;
}

export const PlatformInstitutionsView: React.FC<PlatformInstitutionsViewProps> = ({
  currency,
  onNavigateToSubscriptions,
  onNavigateToInvoices,
}) => {
  const [institutions, setInstitutions] = useState<PlatformInstitution[]>(() =>
    platformService.getInstitutions()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'studentsCount' | 'registrationDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Selected Institution Drawer/Modal
  const [selectedInst, setSelectedInst] = useState<PlatformInstitution | null>(null);

  // Add Institution Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    code: '',
    slug: '',
    type: 'college' as InstitutionType,
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    plan: 'Professional' as SubscriptionPlanTier,
    billingInterval: 'annual' as SubscriptionBillingInterval,
    subscriptionStartDate: new Date().toISOString().split('T')[0],
    subscriptionExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    studentsCount: 0,
    staffCount: 0,
    status: 'Active' as InstitutionStatus,
    studentLimit: 750,
    aiPredictionsEnabled: true,
    customBrandingEnabled: false,
    notes: '',
  });

  // Action Confirmation Modal (for destructive action e.g. Suspend)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate';
    institution: PlatformInstitution;
  } | null>(null);

  // Filtered and sorted data
  const filteredInstitutions = useMemo(() => {
    return institutions
      .filter((inst) => {
        const matchesSearch =
          inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inst.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inst.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inst.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;
        const matchesPlan = planFilter === 'all' || inst.plan === planFilter;
        const matchesType = typeFilter === 'all' || inst.type === typeFilter;

        return matchesSearch && matchesStatus && matchesPlan && matchesType;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortField === 'studentsCount') {
          return sortOrder === 'asc'
            ? a.studentsCount - b.studentsCount
            : b.studentsCount - a.studentsCount;
        }
        if (sortField === 'registrationDate') {
          return sortOrder === 'asc'
            ? new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()
            : new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
        }
        return 0;
      });
  }, [institutions, searchQuery, statusFilter, planFilter, typeFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredInstitutions.length / pageSize) || 1;
  const [modalError, setModalError] = useState<string | null>(null);

  const paginatedInstitutions = filteredInstitutions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!addForm.name || !addForm.code || !addForm.contactEmail) {
      setModalError('Please fill out Institution Name, Code, and Contact Email.');
      return;
    }

    const created = platformService.addInstitution({
      ...addForm,
      slug: addForm.slug || addForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    });

    setInstitutions(platformService.getInstitutions());
    setShowAddModal(false);
    setSelectedInst(created);
  };

  const handleStatusChangeConfirmed = () => {
    if (!confirmAction) return;
    const newStatus: InstitutionStatus = confirmAction.type === 'suspend' ? 'Suspended' : 'Active';
    platformService.setInstitutionStatus(confirmAction.institution.id, newStatus);
    setInstitutions(platformService.getInstitutions());
    if (selectedInst && selectedInst.id === confirmAction.institution.id) {
      setSelectedInst({ ...selectedInst, status: newStatus });
    }
    setConfirmAction(null);
  };

  // Helper for invoices of selected institution
  const selectedInvoices: PlatformInvoice[] = useMemo(() => {
    if (!selectedInst) return [];
    return platformService.getInvoicesByInstitutionId(selectedInst.id);
  }, [selectedInst]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institution Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register and manage schools, colleges, and universities on the Vidya SaaS platform.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Institution</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, code, contact person or email..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
              <option value="Suspended">Suspended</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="Basic">Basic Plan</option>
              <option value="Professional">Professional Plan</option>
              <option value="Enterprise">Enterprise Plan</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="school">School</option>
              <option value="college">College</option>
              <option value="university">University</option>
              <option value="coaching_institute">Coaching Institute</option>
            </select>
          </div>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Institution Name & ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Students / Quota</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No institutions match your search criteria.</p>
                    <p className="text-[11px] mt-1">Try clearing filters or search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{inst.name}</span>
                          {inst.isPrimaryDefaultTenant ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              Live DB Record
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                              Simulated Tenant
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>{inst.id}</span>
                          <span>•</span>
                          <span>{inst.code}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize">
                      <span className="font-medium text-slate-800">{inst.type}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-slate-900">{inst.contactPerson}</div>
                        <div className="text-[10px] text-slate-500">{inst.contactEmail}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            inst.plan === 'Enterprise'
                              ? 'bg-purple-100 text-purple-700'
                              : inst.plan === 'Professional'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {inst.plan} ({inst.billingInterval})
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Expires: {new Date(inst.subscriptionExpiryDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-900 font-semibold">
                        {inst.studentsCount} <span className="text-slate-400 text-[10px]">/ {inst.studentLimit}</span>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div
                          style={{ width: `${Math.min(100, (inst.studentsCount / inst.studentLimit) * 100)}%` }}
                          className={`h-full rounded-full ${
                            inst.studentsCount > inst.studentLimit * 0.9 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          inst.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inst.status === 'Trial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inst.status === 'Active'
                              ? 'bg-emerald-600'
                              : inst.status === 'Trial'
                              ? 'bg-amber-600'
                              : 'bg-rose-600'
                          }`}
                        />
                        {inst.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedInst(inst)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{paginatedInstitutions.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{filteredInstitutions.length}</span> institutions
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Institution Details Drawer / Modal (Section 8 Compliance) */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedInst.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      selectedInst.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedInst.status === 'Trial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedInst.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedInst.id} • Registered {new Date(selectedInst.registrationDate).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setSelectedInst(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Institutional Profile */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Profile & Location</h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Type:</span>
                    <span className="font-semibold text-slate-800 capitalize">{selectedInst.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Campus Location:</span>
                    <span className="font-semibold text-slate-800">{selectedInst.city}, {selectedInst.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Primary Contact:</span>
                    <span className="font-semibold text-slate-800">{selectedInst.contactPerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Official Email:</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedInst.contactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Subscription & Entitlements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Entitlement</h4>
                  {onNavigateToSubscriptions && (
                    <button
                      onClick={() => {
                        setSelectedInst(null);
                        onNavigateToSubscriptions();
                      }}
                      className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
                    >
                      Manage Plan
                    </button>
                  )}
                </div>
                <div className="bg-violet-50/60 border border-violet-100 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Current Plan:</span>
                    <span className="font-bold text-violet-900">{selectedInst.plan} Tier ({selectedInst.billingInterval})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Current Expiry:</span>
                    <span className="font-semibold text-slate-900">{new Date(selectedInst.subscriptionExpiryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">AI Risk Prediction Model:</span>
                    <span className={`font-semibold ${selectedInst.aiPredictionsEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {selectedInst.aiPredictionsEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Custom Domain & Branding:</span>
                    <span className={`font-semibold ${selectedInst.customBrandingEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {selectedInst.customBrandingEnabled ? 'Active' : 'Not Included'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Usage & Capacity</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-lg font-black text-slate-900">{selectedInst.studentsCount}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Students Enrolled</div>
                    <div className="text-[9px] text-slate-400">Limit: {selectedInst.studentLimit}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-lg font-black text-slate-900">{selectedInst.staffCount}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Teachers & Staff</div>
                    <div className="text-[9px] text-slate-400">Active accounts</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-lg font-black text-slate-900">{selectedInst.storageUsedGB} GB</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Storage Used</div>
                    <div className="text-[9px] text-slate-400">of {selectedInst.totalStorageGB} GB</div>
                  </div>
                </div>
              </div>

              {/* Invoicing History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Invoices</h4>
                  {onNavigateToInvoices && (
                    <button
                      onClick={() => {
                        setSelectedInst(null);
                        onNavigateToInvoices();
                      }}
                      className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  )}
                </div>
                {selectedInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No invoices issued for this tenant yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-500">{new Date(inv.issueDate).toLocaleDateString()} • {inv.planName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{formatCurrency(inv.amount, currency)}</div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform Security & Isolation Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <Database className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tenant Data Isolation Enforced:</strong> Detailed individual student grades, exam marks, and personal demographics remain strictly compartmentalized within the institution's tenant boundary per privacy policy.
                </span>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {selectedInst.status === 'Active' ? (
                <button
                  onClick={() => setConfirmAction({ type: 'suspend', institution: selectedInst })}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-200"
                >
                  Suspend Institution
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: 'activate', institution: selectedInst })}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer border border-emerald-200"
                >
                  Reactivate Institution
                </button>
              )}

              <button
                onClick={() => setSelectedInst(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Institution */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-900 text-sm">Register New Institution</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {modalError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Institution Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Hyderabad Institute of Technology"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Code / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HIT-HYD"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value as InstitutionType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="school">School</option>
                    <option value="college">College</option>
                    <option value="university">University</option>
                    <option value="coaching_institute">Coaching Institute</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={addForm.contactPerson}
                    onChange={(e) => setAddForm({ ...addForm, contactPerson: e.target.value })}
                    placeholder="e.g. Principal Dr. Roy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={addForm.contactEmail}
                    onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })}
                    placeholder="admin@school.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={addForm.state}
                    onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Plan</label>
                  <select
                    value={addForm.plan}
                    onChange={(e) => {
                      const p = e.target.value as SubscriptionPlanTier;
                      setAddForm({
                        ...addForm,
                        plan: p,
                        studentLimit: p === 'Enterprise' ? 2500 : p === 'Professional' ? 750 : 250,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="Basic">Basic (250 Students)</option>
                    <option value="Professional">Professional (750 Students)</option>
                    <option value="Enterprise">Enterprise (2500 Students)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Billing Interval</label>
                  <select
                    value={addForm.billingInterval}
                    onChange={(e) => setAddForm({ ...addForm, billingInterval: e.target.value as SubscriptionBillingInterval })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Confirm & Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmation for Destructive / Status Action */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-100 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">
                Confirm {confirmAction.type === 'suspend' ? 'Suspension' : 'Reactivation'}
              </h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              Are you sure you want to {confirmAction.type} <strong>{confirmAction.institution.name}</strong>?
              {confirmAction.type === 'suspend' &&
                ' Students and teachers from this school will be prevented from accessing AI predictions and class portals until restored.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChangeConfirmed}
                className={`px-4 py-2 text-white font-bold rounded-xl cursor-pointer shadow-xs ${
                  confirmAction.type === 'suspend' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
