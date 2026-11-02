import React from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  QrCode,
  RotateCcw,
  Sparkles,
  Ticket as TicketIcon,
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

  // Category Badge Styling: PPI: Blue, SIS: Green, Non-Member: Purple
  const getCategoryBadgeClass = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('ppi')) {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
    }
    if (c.includes('sis')) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
    }
    return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
  };

  const paymentStatus = ticket['Status Pembayaran'] || 'Lunas';
  const isPaid = paymentStatus.toLowerCase() === 'lunas';

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xl overflow-hidden ${
        isUsed
          ? 'bg-slate-900/90 border-red-500/40'
          : 'bg-slate-900 border-amber-500/50 shadow-amber-500/5'
      }`}
    >
      {/* Status Header Banner */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
          isUsed
            ? 'bg-red-950/40 border-red-900/50 text-red-200'
            : 'bg-amber-950/30 border-amber-900/50 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {isUsed ? (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="font-bold text-sm tracking-wide">
            {isUsed ? 'STATUS: TERPAKAI' : 'STATUS: TERSEDIA (READY TO CHECK IN)'}
          </span>
        </div>

        {ticket['Waktu Kedatangan'] && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-black/40 px-2.5 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Checked in: {ticket['Waktu Kedatangan']}</span>
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
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}
              >
                {paymentStatus}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight pt-1">
              {ticket.Nama || ticket['Nama Kapital']}
            </h2>

            {ticket['Nama Kapital'] && ticket['Nama Kapital'] !== ticket.Nama && (
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                {ticket['Nama Kapital']}
              </p>
            )}
          </div>

          {/* Ticket Key Identifier */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 shrink-0 sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ID Tiket</span>
            <span className="font-mono text-lg font-bold text-amber-400 block">
              {ticket['ID Tiket']}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Order: {ticket['Order ID'] || 'N/A'}
            </span>
          </div>
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Ticket Sequence</span>
            <span className="font-bold text-slate-200 font-mono text-sm">
              Ticket {ticket.Counter || '1'} of {ticket.Jumlah || '1'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total in Order</span>
            <span className="font-medium text-slate-200 font-mono text-sm">
              {ticket.Jumlah || '1'} Pax
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Email</span>
            <span className="font-medium text-slate-300 truncate block" title={ticket.Email || 'No email'}>
              {ticket.Email ? (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{ticket.Email}</span>
                </span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Phone / WhatsApp</span>
            <span className="font-medium text-slate-300 font-mono truncate block">
              {ticket['No Hp'] ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{ticket['No Hp']}</span>
                </span>
              ) : (
                <span className="text-slate-500">—</span>
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
              className="w-full sm:flex-1 h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isCheckingIn ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5 stroke-[3]" />
              )}
              <span>MARK AS CHECKED IN</span>
            </button>
          ) : (
            <div className="w-full sm:flex-1 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between gap-2 text-xs text-red-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Ticket verified as used at {ticket['Waktu Kedatangan'] || 'an earlier time'}.</span>
              </div>
              <button
                onClick={() => onManualToggle(ticket['ID Tiket'], 'Tersedia')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors shrink-0"
                title="Supervisor Override: Reset status to Available"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Tersedia</span>
              </button>
            </div>
          )}

          {/* Quick PDF / QR preview link */}
          {ticket['Merged Doc URL - Generate dan Kirim Tiket'] && (
            <a
              href={ticket['Merged Doc URL - Generate dan Kirim Tiket']}
              target="_blank"
              rel="noopener noreferrer"
              className="h-13 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
              title="Open Official Issued PDF Ticket"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>PDF E-Ticket</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
