import React, { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Check,
  CheckCircle2,
  Clock,
  Filter,
  RotateCcw,
  Search,
  Ticket as TicketIcon,
  XCircle,
} from 'lucide-react';
import { Ticket } from '../types';

interface AttendeeListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onCheckIn: (idTiket: string) => void;
  onManualToggle: (idTiket: string, targetStatus: 'Tersedia' | 'Terpakai') => void;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  tickets,
  onSelectTicket,
  onCheckIn,
  onManualToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tersedia' | 'terpakai'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Filtered dataset
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Tab filter
      const status = (t['Status Tiket'] || '').toLowerCase();
      const terpakai = (t['Terpakai'] || '').toLowerCase();
      const isUsed = status === 'terpakai' || terpakai === 'terpakai';

      if (activeTab === 'tersedia' && isUsed) return false;
      if (activeTab === 'terpakai' && !isUsed) return false;

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = (t.Kategori || '').toLowerCase();
        if (!cat.includes(categoryFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (t['ID Tiket'] || '').toLowerCase().includes(q);
        const matchName = (t.Nama || '').toLowerCase().includes(q) ||
                          (t['Nama Kapital'] || '').toLowerCase().includes(q);
        const matchOrder = (t['Order ID'] || '').toLowerCase().includes(q);
        const matchEmail = (t.Email || '').toLowerCase().includes(q);
        const matchPhone = (t['No Hp'] || '').toLowerCase().includes(q);
        return matchId || matchName || matchOrder || matchEmail || matchPhone;
      }

      return true;
    });
  }, [tickets, activeTab, categoryFilter, searchQuery]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, categoryFilter, searchQuery]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage]);

  const getCategoryBadge = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('ppi')) {
      return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
    }
    if (c.includes('sis')) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
    }
    return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
  };

  const countAll = tickets.length;
  const countTerpakai = tickets.filter(
    t => (t['Status Tiket'] || '').toLowerCase() === 'terpakai' || (t['Terpakai'] || '').toLowerCase() === 'terpakai'
  ).length;
  const countTersedia = countAll - countTerpakai;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-amber-400" />
            <span>Attendee Log & Manifest Registry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Searchable gate check-in database with real-time status & supervisor override controls
          </p>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {['all', 'PPI', 'SIS', 'Non-Member'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Roles' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Radix Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <Tabs.List className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Tabs.Trigger
              value="all"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All Manifest</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300 tabular-nums">
                {countAll}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="tersedia"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'tersedia'
                  ? 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Tersedia</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 tabular-nums">
                {countTersedia}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="terpakai"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'terpakai'
                  ? 'bg-red-950/60 text-red-300 font-semibold border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Terpakai</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 tabular-nums">
                {countTerpakai}
              </span>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Quick Filter Search inside Tabs */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Table / Card View */}
        <div className="mt-2">
          {paginatedTickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No ticket records match current filter.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setActiveTab('all');
                }}
                className="mt-2 text-xs text-amber-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-3.5">ID Tiket</th>
                    <th className="py-3 px-3.5">Attendee Name</th>
                    <th className="py-3 px-3.5">Kategori</th>
                    <th className="py-3 px-3.5">Order ID</th>
                    <th className="py-3 px-3.5">Status Tiket</th>
                    <th className="py-3 px-3.5">Waktu Kedatangan</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {paginatedTickets.map((ticket) => {
                    const isUsed = (ticket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                                   (ticket['Terpakai'] || '').toLowerCase() === 'terpakai';
                    return (
                      <tr
                        key={ticket['ID Tiket']}
                        className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                        onClick={() => onSelectTicket(ticket)}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {ticket['ID Tiket']}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {ticket.Nama || ticket['Nama Kapital']}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Ticket {ticket.Counter || '1'} of {ticket.Jumlah || '1'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadge(ticket.Kategori)}`}>
                            {ticket.Kategori || 'Non-Member'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                          {ticket['Order ID'] || '—'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 w-fit ${
                              isUsed
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {isUsed ? (
                              <>
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span>Terpakai</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Tersedia</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                          {ticket['Waktu Kedatangan'] ? (
                            <span className="flex items-center gap-1 text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{ticket['Waktu Kedatangan']}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {!isUsed ? (
                            <button
                              onClick={() => onCheckIn(ticket['ID Tiket'])}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                            >
                              Check In
                            </button>
                          ) : (
                            <button
                              onClick={() => onManualToggle(ticket['ID Tiket'], 'Tersedia')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                              title="Supervisor Override: Mark as Available"
                            >
                              Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 mt-4 px-1">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredTickets.length)} of{' '}
                {filteredTickets.length} records
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
};
