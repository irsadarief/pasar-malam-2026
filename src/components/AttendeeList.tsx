import React, { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Check,
  CheckCircle2,
  Clock,
  Plus,
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
  onOpenAddAttendee?: () => void;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  tickets,
  onSelectTicket,
  onCheckIn,
  onManualToggle,
  onOpenAddAttendee,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tersedia' | 'terpakai'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Filtered dataset
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
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
        const matchPhone = (t['No Hp'] || '').includes(q);
        return matchId || matchName || matchOrder || matchEmail || matchPhone;
      }

      return true;
    });
  }, [tickets, activeTab, categoryFilter, searchQuery]);

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
      return 'bg-[#85362f]/10 border-[#85362f]/30 text-[#85362f] font-bold';
    }
    if (c.includes('sis')) {
      return 'bg-[#177f6b]/10 border-[#177f6b]/30 text-[#177f6b] font-bold';
    }
    return 'bg-[#fcc844]/25 border-[#fcc844]/60 text-stone-900 font-bold';
  };

  const countAll = tickets.length;
  const countTerpakai = tickets.filter(
    t => (t['Status Tiket'] || '').toLowerCase() === 'terpakai' || (t['Terpakai'] || '').toLowerCase() === 'terpakai'
  ).length;
  const countTersedia = countAll - countTerpakai;

  return (
    <div className="bg-white border border-[#e2e0cf] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-[#85362f]" />
            <span>Attendee Log &amp; Gate Manifest</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenAddAttendee && (
            <button
              onClick={onOpenAddAttendee}
              className="px-3 py-1.5 rounded-lg bg-[#177f6b] hover:bg-[#136a59] text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Attendee</span>
            </button>
          )}

          {/* Category Pill Filters */}
          <div className="flex items-center gap-1 bg-[#f8f8ec] p-1 rounded-xl border border-[#e2e0cf]">
            {['all', 'PPI', 'SIS', 'Non-Member'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-[#85362f] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat === 'all' ? 'All Roles' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Radix Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e2e0cf] pb-3">
          <Tabs.List className="flex items-center gap-1 bg-[#f8f8ec] p-1 rounded-xl border border-[#e2e0cf]">
            <Tabs.Trigger
              value="all"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-xs border border-[#e2e0cf]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>All Manifest</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-800 tabular-nums font-bold">
                {countAll}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="tersedia"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'tersedia'
                  ? 'bg-[#177f6b]/15 text-[#177f6b] shadow-xs border border-[#177f6b]/30'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#177f6b]" />
              <span>Tersedia</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#177f6b]/20 text-[#177f6b] tabular-nums font-bold">
                {countTersedia}
              </span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="terpakai"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'terpakai'
                  ? 'bg-[#85362f]/15 text-[#85362f] shadow-xs border border-[#85362f]/30'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#85362f]" />
              <span>Terpakai</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#85362f]/20 text-[#85362f] tabular-nums font-bold">
                {countTerpakai}
              </span>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Quick Filter Search inside Tabs */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, phone..."
              className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-800 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Table */}
        <div className="mt-2">
          {paginatedTickets.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <p className="text-sm font-medium">No ticket records match current filter.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setActiveTab('all');
                }}
                className="mt-2 text-xs text-[#85362f] font-bold hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e2e0cf]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f8ec] border-b border-[#e2e0cf] text-stone-600 font-bold">
                    <th className="py-3 px-3.5">ID Tiket</th>
                    <th className="py-3 px-3.5">Attendee Name</th>
                    <th className="py-3 px-3.5">Kategori</th>
                    <th className="py-3 px-3.5">Order ID</th>
                    <th className="py-3 px-3.5">Status Tiket</th>
                    <th className="py-3 px-3.5">Waktu Kedatangan</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e0cf] bg-white">
                  {paginatedTickets.map((ticket) => {
                    const isUsed = (ticket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                                   (ticket['Terpakai'] || '').toLowerCase() === 'terpakai';
                    return (
                      <tr
                        key={ticket['ID Tiket']}
                        className="hover:bg-[#f8f8ec]/80 transition-colors group cursor-pointer"
                        onClick={() => onSelectTicket(ticket)}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-[#85362f] whitespace-nowrap">
                          {ticket['ID Tiket']}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-stone-900 group-hover:text-[#85362f] transition-colors">
                            {ticket.Nama || ticket['Nama Kapital']}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            Ticket {ticket.Counter || '1'} of {ticket.Jumlah || '1'}
                            {ticket['No Hp'] && ` · ${ticket['No Hp']}`}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] border ${getCategoryBadge(ticket.Kategori)}`}>
                            {ticket.Kategori || 'Non-Member'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-stone-700 whitespace-nowrap">
                          {ticket['Order ID'] || '—'}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 w-fit ${
                              isUsed
                                ? 'bg-[#85362f]/10 text-[#85362f] border-[#85362f]/20'
                                : 'bg-[#177f6b]/10 text-[#177f6b] border-[#177f6b]/20'
                            }`}
                          >
                            {isUsed ? (
                              <>
                                <XCircle className="w-3 h-3 text-[#85362f]" />
                                <span>Terpakai</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-[#177f6b]" />
                                <span>Tersedia</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-stone-700 whitespace-nowrap">
                          {ticket['Waktu Kedatangan'] ? (
                            <span className="flex items-center gap-1 text-[#85362f] font-bold">
                              <Clock className="w-3 h-3 text-[#85362f]" />
                              <span>{ticket['Waktu Kedatangan']}</span>
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {!isUsed ? (
                            <button
                              onClick={() => onCheckIn(ticket['ID Tiket'])}
                              className="px-2.5 py-1 bg-[#177f6b] hover:bg-[#136a59] text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                            >
                              Check In
                            </button>
                          ) : (
                            <button
                              onClick={() => onManualToggle(ticket['ID Tiket'], 'Tersedia')}
                              className="px-2 py-1 bg-[#f8f8ec] hover:bg-stone-200 text-stone-700 border border-[#e2e0cf] rounded-lg text-xs font-bold transition-colors"
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
            <div className="flex items-center justify-between text-xs text-stone-600 mt-4 px-1">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredTickets.length)} of{' '}
                {filteredTickets.length} records
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] disabled:opacity-40 text-stone-700 font-bold"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-stone-800 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] disabled:opacity-40 text-stone-700 font-bold"
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
