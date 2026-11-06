import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, Clock, Hash, Smartphone, User, X } from 'lucide-react';
import { WalkInRegistration } from '../types';

interface VerifyWalkInModalProps {
  registration: WalkInRegistration | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (registrationId: string, customTicketIds: string[], markAsCheckedIn: boolean) => Promise<void>;
  nextSuggestedNumber: number;
}

export const VerifyWalkInModal: React.FC<VerifyWalkInModalProps> = ({
  registration,
  isOpen,
  onClose,
  onApprove,
  nextSuggestedNumber,
}) => {
  if (!registration) return null;

  const [useAutoIncrement, setUseAutoIncrement] = useState(true);
  const [customIds, setCustomIds] = useState<string[]>(() => {
    return Array.from({ length: registration.totalTickets }).map((_, idx) =>
      `PM2026-${String(nextSuggestedNumber + idx).padStart(4, '0')}`
    );
  });
  const [markAsCheckedIn, setMarkAsCheckedIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When toggle between auto and manual
  const handleAutoToggle = (auto: boolean) => {
    setUseAutoIncrement(auto);
    if (auto) {
      setCustomIds(
        Array.from({ length: registration.totalTickets }).map((_, idx) =>
          `PM2026-${String(nextSuggestedNumber + idx).padStart(4, '0')}`
        )
      );
    }
  };

  const handleIdChange = (idx: number, val: string) => {
    setCustomIds(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onApprove(registration.id, customIds, markAsCheckedIn);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl border border-[#e2e0cf] shadow-2xl z-50 p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e0cf]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#177f6b]/15 text-[#177f6b] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-extrabold text-stone-900 leading-tight">
                  Verify Swish & Issue Tickets
                </Dialog.Title>
                <div className="text-[11px] text-stone-500">
                  Walk-in Ref: <span className="font-mono font-bold text-[#85362f]">{registration.id}</span>
                </div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-stone-400 hover:text-stone-700 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* Attendee Info Card */}
            <div className="bg-[#f8f8ec] p-3.5 rounded-xl border border-[#e2e0cf] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Visitor Name:</span>
                <span className="font-extrabold text-stone-900 text-sm">{registration.nama}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Swish Payment Expected:</span>
                <span className="font-mono font-black text-sm text-[#85362f]">
                  {registration.totalCostSEK} SEK
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>Total Tickets:</span>
                <span>{registration.totalTickets} ticket(s)</span>
              </div>
              {registration.phone && (
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Phone:</span>
                  <span className="font-mono">{registration.phone}</span>
                </div>
              )}
            </div>

            {/* Ticket Assignment Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-stone-800">Assign Ticket Numbers (ID Tiket):</label>
                <div className="flex items-center gap-1 bg-[#f8f8ec] p-0.5 rounded-lg border border-[#e2e0cf]">
                  <button
                    type="button"
                    onClick={() => handleAutoToggle(true)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      useAutoIncrement ? 'bg-[#85362f] text-white shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Auto-increment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoToggle(false)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      !useAutoIncrement ? 'bg-[#85362f] text-white shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Custom Input
                  </button>
                </div>
              </div>

              {/* Input list for tickets */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customIds.map((idVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-stone-500 w-16 shrink-0">
                      Ticket #{idx + 1}:
                    </span>
                    <input
                      type="text"
                      disabled={useAutoIncrement}
                      value={idVal}
                      onChange={e => handleIdChange(idx, e.target.value)}
                      placeholder="e.g. PM2026-0200"
                      className="flex-1 bg-[#f8f8ec] disabled:bg-stone-100 border border-[#e2e0cf] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#85362f]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Check-in checkbox */}
            <div className="pt-2 border-t border-[#e2e0cf]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsCheckedIn}
                  onChange={e => setMarkAsCheckedIn(e.target.checked)}
                  className="w-4 h-4 accent-[#177f6b] rounded"
                />
                <span className="font-bold text-stone-800">
                  Mark as Checked In Immediately (Terpakai)
                </span>
              </label>
              <p className="text-[11px] text-stone-500 ml-6">
                Uncheck if the visitor will scan their QR code ticket later at the door.
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-[#e2e0cf] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-700 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#177f6b] hover:bg-[#136a59] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting ? 'Processing...' : `Confirm Payment & Issue ${registration.totalTickets} Ticket(s)`}
                </span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
