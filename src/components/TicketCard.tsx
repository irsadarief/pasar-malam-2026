import React from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  RotateCcw,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { Ticket } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  onCheckIn: (idTiket: string) => void;
  onManualToggle: (idTiket: string, targetStatus: 'Tersedia' | 'Terpakai') => void;
  isCheckingIn: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onCheckIn,
  onManualToggle,
  isCheckingIn,
}) => {
  const isUsed = (ticket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                 (ticket['Terpakai'] || '').toLowerCase() === 'terpakai';

  const category = ticket.Kategori || 'Non-Member';

  // Category Badge Styling
  const getCategoryBadgeClass = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('ppi')) {
      return 'bg-[#85362f]/10 border-[#85362f]/30 text-[#85362f] font-bold';
    }
    if (c.includes('sis')) {
      return 'bg-[#177f6b]/10 border-[#177f6b]/30 text-[#177f6b] font-bold';
    }
    return 'bg-[#fcc844]/25 border-[#fcc844]/60 text-stone-900 font-bold';
  };

  const paymentStatus = ticket['Status Pembayaran'] || 'Lunas';
  const isPaid = paymentStatus.toLowerCase() === 'lunas';

  return (
    <div
      className={`rounded-2xl border transition-all shadow-md overflow-hidden ${
        isUsed
          ? 'bg-white border-[#85362f]/40'
          : 'bg-white border-[#177f6b]/50'
      }`}
    >
      {/* Status Header Banner */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
          isUsed
            ? 'bg-[#85362f]/10 border-[#85362f]/20 text-[#85362f]'
            : 'bg-[#177f6b]/10 border-[#177f6b]/20 text-[#177f6b]'
        }`}
      >
        <div className="flex items-center gap-2">
          {isUsed ? (
            <XCircle className="w-5 h-5 text-[#85362f] shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#177f6b] shrink-0" />
          )}
          <span className="font-extrabold text-xs sm:text-sm tracking-wide">
            {isUsed ? 'STATUS: TERPAKAI (ALREADY USED)' : 'STATUS: TERSEDIA (READY TO CHECK IN)'}
          </span>
        </div>

        {ticket['Waktu Kedatangan'] && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#85362f] bg-white px-2.5 py-1 rounded-md border border-[#85362f]/20 shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Checked: {ticket['Waktu Kedatangan']}</span>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Attendee Name & Primary Details */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryBadgeClass(category)}`}>
                {category}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  isPaid
                    ? 'bg-[#177f6b]/10 text-[#177f6b] border border-[#177f6b]/20'
                    : 'bg-[#fcc844]/20 text-stone-900 border border-[#fcc844]/40'
                }`}
              >
                {paymentStatus}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight pt-1">
              {ticket.Nama || ticket['Nama Kapital']}
            </h2>

            {ticket['Nama Kapital'] && ticket['Nama Kapital'] !== ticket.Nama && (
              <p className="text-xs text-stone-500 uppercase tracking-wider font-mono">
                {ticket['Nama Kapital']}
              </p>
            )}
          </div>

          {/* Ticket Key Identifier */}
          <div className="bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl p-3 shrink-0 sm:text-right shadow-2xs">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">ID Tiket</span>
            <span className="font-mono text-lg font-black text-[#85362f] block">
              {ticket['ID Tiket']}
            </span>
            <span className="text-xs text-stone-600 font-mono">
              Order: {ticket['Order ID'] || 'N/A'}
            </span>
          </div>
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 pt-4 border-t border-[#e2e0cf] text-xs">
          <div>
            <span className="text-stone-500 block text-[11px]">Ticket Sequence</span>
            <span className="font-bold text-stone-900 font-mono text-sm">
              Ticket {ticket.Counter || '1'} of {ticket.Jumlah || '1'}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[11px]">Total in Order</span>
            <span className="font-bold text-stone-900 font-mono text-sm">
              {ticket.Jumlah || '1'} Pax
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[11px]">Email</span>
            <span className="font-medium text-stone-800 truncate block" title={ticket.Email || 'No email'}>
              {ticket.Email ? (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                  <span className="truncate">{ticket.Email}</span>
                </span>
              ) : (
                <span className="text-stone-400">—</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block text-[11px]">Phone / WhatsApp</span>
            <span className="font-bold text-stone-800 font-mono truncate block">
              {ticket['No Hp'] ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{ticket['No Hp']}</span>
                </span>
              ) : (
                <span className="text-stone-400">—</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {!isUsed ? (
            <button
              onClick={() => onCheckIn(ticket['ID Tiket'])}
              disabled={isCheckingIn}
              className="w-full sm:flex-1 h-13 rounded-xl bg-[#177f6b] hover:bg-[#136a59] text-white font-black text-base flex items-center justify-center gap-2 shadow-md shadow-[#177f6b]/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isCheckingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5 stroke-[3]" />
              )}
              <span>MARK AS CHECKED IN</span>
            </button>
          ) : (
            <div className="w-full sm:flex-1 p-3 rounded-xl bg-[#85362f]/10 border border-[#85362f]/30 flex items-center justify-between gap-2 text-xs text-[#85362f]">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">Ticket used at {ticket['Waktu Kedatangan'] || 'an earlier time'}.</span>
              </div>
              <button
                onClick={() => onManualToggle(ticket['ID Tiket'], 'Tersedia')}
                className="px-2.5 py-1 bg-white hover:bg-[#f8f8ec] text-stone-800 rounded-lg text-xs font-bold border border-[#e2e0cf] flex items-center gap-1 transition-colors shrink-0 shadow-2xs"
                title="Supervisor Override: Reset status to Available"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#85362f]" />
                <span>Reset to Tersedia</span>
              </button>
            </div>
          )}

          {/* Quick PDF link if available */}
          {ticket['Merged Doc URL - Generate dan Kirim Tiket'] && (
            <a
              href={ticket['Merged Doc URL - Generate dan Kirim Tiket']}
              target="_blank"
              rel="noopener noreferrer"
              className="h-13 px-4 rounded-xl bg-white hover:bg-[#f8f8ec] text-stone-800 border border-[#e2e0cf] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
              title="Open Official Issued PDF Ticket"
            >
              <ExternalLink className="w-4 h-4 text-stone-500" />
              <span>PDF E-Ticket</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
