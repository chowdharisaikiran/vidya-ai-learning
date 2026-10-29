import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Eye,
  Filter,
  DollarSign,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  platformService,
  formatCurrency,
} from '../../services/platformService';
import { PlatformInvoice, InvoiceStatus, PlatformInstitution } from '../../types/platform';

interface PlatformInvoicesViewProps {
  currency: string;
}

export const PlatformInvoicesView: React.FC<PlatformInvoicesViewProps> = ({ currency }) => {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>(() =>
    platformService.getInvoices()
  );
  const [institutions] = useState<PlatformInstitution[]>(() =>
    platformService.getInstitutions()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);

  // Issue Invoice Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    institutionId: institutions[0]?.id || '',
    planName: 'Professional Annual Subscription',
    amount: 499990,
    dueDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    billingContactEmail: '',
    notes: 'Standard 20-day institutional payment terms.',
  });

  // Verify Payment Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyInvoice, setVerifyInvoice] = useState<PlatformInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PlatformInvoice['paymentMethod']>('Bank Wire (NEFT/RTGS)');
  const [transactionRef, setTransactionRef] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.transactionReference &&
          inv.transactionReference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find((i) => i.id === issueForm.institutionId);
    if (!inst) return;

    const newInv = platformService.createInvoice({
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      institutionId: inst.id,
      institutionName: inst.name,
      subscriptionId: `SUB-${inst.id}`,
      planName: issueForm.planName,
      amount: Number(issueForm.amount),
      currency,
      issueDate: new Date().toISOString(),
      dueDate: new Date(issueForm.dueDate).toISOString(),
      status: 'pending',
      billingContactEmail: issueForm.billingContactEmail || inst.contactEmail,
      taxAmount: Math.round(Number(issueForm.amount) * 0.18), // 18% standard GST
      notes: issueForm.notes,
    });

    setInvoices(platformService.getInvoices());
    setShowIssueModal(false);
    setSelectedInvoice(newInv);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    if (!verifyInvoice || !transactionRef.trim()) {
      setVerifyError('Please enter a valid bank transaction reference.');
      return;
    }

    platformService.markInvoicePaid(verifyInvoice.id, paymentMethod, transactionRef.trim());
    setInvoices(platformService.getInvoices());
    setShowVerifyModal(false);
    setVerifyInvoice(null);
    setTransactionRef('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Issue Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue invoices, track accounts receivable, and verify payment settlements.
          </p>
        </div>

        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, institution, reference..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Invoice Statuses</option>
            <option value="paid">Paid & Verified</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div>{inv.institutionName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{inv.planName}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(inv.issueDate).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatCurrency(inv.amount, currency)}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status === 'paid' && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                      {inv.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setVerifyInvoice(inv);
                            setShowVerifyModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                        >
                          Verify Payment
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors cursor-pointer"
                      >
                        View Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Printable Official Tax Invoice */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 text-xs animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Invoice Top Header */}
            <div className="flex justify-between items-start pb-5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-600 text-white font-bold flex items-center justify-center text-xs">
                    V
                  </div>
                  <span className="font-black text-slate-900 text-base">Vidya EdTech Solutions</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Plot 44, Cyber City, Madhapur, Hyderabad, Telangana 500081<br />
                  GSTIN: 36AABCU9603R1ZM • support@vidya.edu
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${
                    selectedInvoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedInvoice.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedInvoice.status}
                </span>
                <div className="text-base font-black text-slate-900 mt-2 font-mono">
                  {selectedInvoice.invoiceNumber}
                </div>
              </div>
            </div>

            {/* Billed To & Dates */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Billed To
                </span>
                <div className="font-bold text-slate-900 text-sm">{selectedInvoice.institutionName}</div>
                <div className="text-slate-600 mt-0.5">{selectedInvoice.billingContactEmail}</div>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <span className="text-slate-400">Issue Date:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {selectedInvoice.paidDate && (
                  <div>
                    <span className="text-emerald-700 font-bold">Paid on:</span>{' '}
                    <span className="font-semibold text-emerald-800">
                      {new Date(selectedInvoice.paidDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-4">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-3 font-semibold">{selectedInvoice.planName}</td>
                    <td className="py-3 text-right font-mono font-bold">
                      {formatCurrency(selectedInvoice.amount, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.amount, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax (18% included):</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.taxAmount || Math.round(selectedInvoice.amount * 0.18), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Payable:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.amount, currency)}</span>
                </div>
              </div>
            </div>

            {/* Transaction Ref if Paid */}
            {selectedInvoice.transactionReference && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-[11px]">
                <strong>Settlement Reference:</strong> {selectedInvoice.paymentMethod} •{' '}
                <span className="font-mono">{selectedInvoice.transactionReference}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Issue New Invoice */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-100 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Issue Official Invoice</h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Institution *</label>
                <select
                  value={issueForm.institutionId}
                  onChange={(e) => setIssueForm({ ...issueForm, institutionId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Item Description *</label>
                <input
                  type="text"
                  required
                  value={issueForm.planName}
                  onChange={(e) => setIssueForm({ ...issueForm, planName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    required
                    value={issueForm.amount}
                    onChange={(e) => setIssueForm({ ...issueForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={issueForm.dueDate}
                    onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Email (optional)</label>
                <input
                  type="email"
                  value={issueForm.billingContactEmail}
                  onChange={(e) => setIssueForm({ ...issueForm, billingContactEmail: e.target.value })}
                  placeholder="accounts@institution.edu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Generate & Send Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify Payment Receipt */}
      {showVerifyModal && verifyInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-100 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-emerald-700 pb-3 border-b border-slate-100 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Verify Bank Settlement</span>
            </div>

            <form onSubmit={handleVerifySubmit} className="py-4 space-y-3">
              {verifyError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {verifyError}
                </div>
              )}
              <p className="text-slate-600">
                You are verifying received payment for <strong>{verifyInvoice.invoiceNumber}</strong> (
                {verifyInvoice.institutionName}) in the amount of{' '}
                <strong>{formatCurrency(verifyInvoice.amount, currency)}</strong>.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Settlement Channel *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PlatformInvoice['paymentMethod'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="Bank Wire (NEFT/RTGS)">Bank Wire (NEFT/RTGS)</option>
                  <option value="UPI / NetBanking">UPI / NetBanking (Razorpay / Instant)</option>
                  <option value="Corporate ACH">Corporate ACH / Standing Order</option>
                  <option value="Credit Card">Corporate Credit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank Transaction Reference / UTR *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-HDFC-9928172635"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Verify & Clear Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
