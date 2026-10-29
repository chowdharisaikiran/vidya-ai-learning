import React, { useState } from 'react';
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { platformService } from '../../services/platformService';
import { PlatformSupportTicket } from '../../types/platform';

export const PlatformSupportView: React.FC = () => {
  const [tickets, setTickets] = useState<PlatformSupportTicket[]>(() =>
    platformService.getSupportTickets()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<PlatformSupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, status: PlatformSupportTicket['status']) => {
    platformService.updateTicketStatus(id, status, replyText || undefined);
    setTickets(platformService.getSupportTickets());
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket({ ...selectedTicket, status, lastReply: replyText || selectedTicket.lastReply });
    }
    setReplyText('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institutional Support Desk</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage technical support tickets, onboarding issues, and SLA compliance across schools.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject, institution..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-violet-300 transition-all cursor-pointer"
            onClick={() => setSelectedTicket(t)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-violet-700 text-xs">{t.ticketNumber}</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-900 text-xs">{t.institutionName}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    t.priority === 'Urgent'
                      ? 'bg-rose-100 text-rose-800'
                      : t.priority === 'High'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.priority}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                  t.status === 'Resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : t.status === 'In Progress'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {t.status}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-slate-900 mb-1">{t.subject}</h4>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span>Category: {t.category}</span>
              <span>Submitted by: {t.submittedBy}</span>
              <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
            </div>

            {t.lastReply && (
              <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                <span className="font-bold text-violet-700">Latest Note: </span>
                <span>{t.lastReply}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Ticket Response & Status Update */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-100 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-violet-700 font-bold">{selectedTicket.ticketNumber}</span>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">{selectedTicket.subject}</h3>
                <p className="text-slate-500 text-[11px]">
                  {selectedTicket.institutionName} • {selectedTicket.contactEmail}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Add Operational Note / Reply</label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type investigation response or resolution details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'In Progress')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'Resolved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    Mark Resolved
                  </button>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
