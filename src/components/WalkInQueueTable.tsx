import React, { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, RefreshCw, Search, ShieldCheck, Smartphone, User } from 'lucide-react';
import { WalkInRegistration } from '../types';

interface WalkInQueueTableProps {
  registrations: WalkInRegistration[];
  isLoading: boolean;
  onRefresh: () => void;
  onVerify: (reg: WalkInRegistration) => void;
}

export const WalkInQueueTable: React.FC<WalkInQueueTableProps> = ({
  registrations,
  isLoading,
  onRefresh,
  onVerify,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [search, setSearch] = useState('');

  const filtered = registrations.filter(r => {
    if (filter === 'pending' && r.status !== 'PENDING_PAYMENT') return false;
    if (filter === 'approved' && r.status !== 'APPROVED') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.nama.toLowerCase().includes(q);
      const matchPhone = (r.phone || '').toLowerCase().includes(q);
      const matchId = r.id.toLowerCase().includes(q);
      return matchName || matchPhone || matchId;
    }
    return true;
  });

  const pendingCount = registrations.filter(r => r.status === 'PENDING_PAYMENT').length;

  return (
    <div className="bg-white border border-[#e2e0cf] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-stone-900 tracking-tight">
              Walk-in Swish Registrations
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85362f] text-white">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Self-registered visitors at <code className="bg-[#f8f8ec] px-1 py-0.5 rounded text-[#85362f] font-mono">/register</code> awaiting payment confirmation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Public Register link */}
          <a
            href="/register"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors"
            title="Open visitor registration link"
          >
            <span>Open /register</span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </a>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-700 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1 bg-[#f8f8ec] p-1 rounded-xl border border-[#e2e0cf]">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-[#85362f] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Pending Swish</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 tabular-nums">
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              filter === 'approved'
                ? 'bg-[#177f6b] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Approved ({registrations.filter(r => r.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({registrations.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search walk-in visitor name..."
            className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e0cf]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f8f8ec] border-b border-[#e2e0cf] text-stone-600 font-bold">
              <th className="py-2.5 px-3">Visitor Name</th>
              <th className="py-2.5 px-3">Ticket Breakdown</th>
              <th className="py-2.5 px-3">Amount (SEK)</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Assigned Tickets</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e0cf] bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                  No walk-in registrations found matching this filter.
                </td>
              </tr>
            ) : (
              filtered.map(reg => {
                const isPending = reg.status === 'PENDING_PAYMENT';
                return (
                  <tr key={reg.id} className="hover:bg-[#f8f8ec]/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-stone-900">{reg.nama}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {reg.phone || 'No phone'} · {new Date(reg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {reg.items.map(it => (
                          <span
                            key={it.category}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f8f8ec] border border-[#e2e0cf] text-stone-700"
                          >
                            {it.count}x {it.category}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-black text-sm text-[#85362f]">
                        {reg.totalCostSEK} SEK
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#fcc844]/20 border border-[#fcc844]/50 text-stone-900 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Pending Payment</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#177f6b]/10 border border-[#177f6b]/30 text-[#177f6b] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved & Issued</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {reg.assignedTicketIds && reg.assignedTicketIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {reg.assignedTicketIds.map(id => (
                            <span key={id} className="font-mono font-bold text-[11px] text-[#85362f]">
                              {id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400 font-mono text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {isPending ? (
                        <button
                          onClick={() => onVerify(reg)}
                          className="px-3 py-1.5 rounded-lg bg-[#177f6b] hover:bg-[#136a59] text-white font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify & Issue</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-stone-400">Verified</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
