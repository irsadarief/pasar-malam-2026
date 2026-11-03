import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  CheckCheck,
  Ticket as TicketIcon,
  Users,
  X,
} from 'lucide-react';
import { Ticket } from '../types';

interface GroupCheckinModalProps {
  isOpen: boolean;
  scannedTicket: Ticket | null;
  relatedTickets: Ticket[];
  onCheckInAll: (tickets: Ticket[]) => void;
  onCheckInSingle: (ticket: Ticket) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const GroupCheckinModal: React.FC<GroupCheckinModalProps> = ({
  isOpen,
  scannedTicket,
  relatedTickets,
  onCheckInAll,
  onCheckInSingle,
  onCancel,
  isProcessing,
}) => {
  if (!scannedTicket) return null;

  const availableInGroup = relatedTickets.filter(t => {
    const status = (t['Status Tiket'] || '').toLowerCase();
    const terpakai = (t['Terpakai'] || '').toLowerCase();
    return status !== 'terpakai' && terpakai !== 'terpakai';
  });

  const attendeeName = scannedTicket.Nama || scannedTicket['Nama Kapital'] || 'Attendee';
  const orderId = scannedTicket['Order ID'] || 'N/A';
  const phone = scannedTicket['No Hp'];
  const email = scannedTicket.Email;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-white border-2 border-[#85362f] rounded-2xl shadow-2xl z-50 p-5 sm:p-6 text-stone-900 focus:outline-none max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e0cf]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#85362f] text-[#fcc844] flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base sm:text-lg font-extrabold text-stone-900">
                  Group Order Detected
                </Dialog.Title>
                <p className="text-xs text-stone-500">
                  Multiple tickets share this attendee&apos;s identity
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-8 h-8 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors font-bold"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="py-4 space-y-4 text-xs">
            {/* Identity Badge */}
            <div className="p-3.5 bg-[#f8f8ec] rounded-xl border border-[#e2e0cf] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm sm:text-base text-[#85362f]">
                  {attendeeName}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white border border-[#e2e0cf] text-stone-700">
                  {orderId}
                </span>
              </div>
              <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-3 gap-y-1">
                {phone && <span>WhatsApp: <strong className="text-stone-900">{phone}</strong></span>}
                {email && <span>Email: <strong className="text-stone-900">{email}</strong></span>}
              </div>
            </div>

            {/* Prompt Notification */}
            <div className="p-3 bg-[#fcc844]/25 border border-[#fcc844]/60 rounded-xl text-stone-900">
              <p className="text-xs font-bold leading-relaxed">
                This identity is linked to <strong>{relatedTickets.length} ticket(s)</strong> in total{' '}
                ({availableInGroup.length} currently available / ready to check in).
              </p>
              <p className="text-[11px] text-stone-700 mt-1 font-medium">
                Do you want to register everyone with the same identity together?
              </p>
            </div>

            {/* Ticket List in this Group */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {relatedTickets.map((t) => {
                const isThisScanned = (t['ID Tiket'] || '').toLowerCase() === (scannedTicket['ID Tiket'] || '').toLowerCase();
                const isUsed = (t['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                               (t['Terpakai'] || '').toLowerCase() === 'terpakai';
                return (
                  <div
                    key={t['ID Tiket']}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isThisScanned
                        ? 'bg-[#85362f]/10 border-[#85362f]'
                        : isUsed
                        ? 'bg-stone-100 border-[#e2e0cf] opacity-75'
                        : 'bg-[#f8f8ec] border-[#e2e0cf]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TicketIcon className={`w-4 h-4 shrink-0 ${isThisScanned ? 'text-[#85362f]' : 'text-stone-500'}`} />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900">
                          <span>{t['ID Tiket']}</span>
                          {isThisScanned && (
                            <span className="text-[10px] font-sans font-bold bg-[#85362f] text-white px-1.5 py-0.2 rounded">
                              Scanned
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-600 font-sans">
                          Ticket {t.Counter || '1'} of {t.Jumlah || '1'} · {t.Kategori || 'Non-Member'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                        isUsed
                          ? 'bg-[#85362f]/15 text-[#85362f] border border-[#85362f]/30'
                          : 'bg-[#177f6b]/15 text-[#177f6b] border border-[#177f6b]/30'
                      }`}
                    >
                      {isUsed ? `Used (${t['Waktu Kedatangan'] || 'Checked'})` : 'Tersedia'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Accept / Reject Buttons */}
            <div className="pt-2 border-t border-[#e2e0cf] flex flex-col gap-2">
              <button
                type="button"
                disabled={isProcessing || availableInGroup.length === 0}
                onClick={() => onCheckInAll(availableInGroup)}
                className="w-full py-3 px-4 rounded-xl bg-[#177f6b] hover:bg-[#136a59] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#177f6b]/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                )}
                <span>
                  Accept: Register Everyone ({availableInGroup.length} Tickets)
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onCheckInSingle(scannedTicket)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#f8f8ec] hover:bg-stone-200 text-stone-900 border border-[#e2e0cf] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4 text-[#85362f]" />
                <span>
                  Reject: Check In Only This Ticket ({scannedTicket['ID Tiket']})
                </span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full py-1.5 text-center text-stone-500 hover:text-stone-800 text-xs font-semibold transition-colors"
              >
                Cancel / Dismiss
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
