import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  CheckCircle2,
  Plus,
  Ticket as TicketIcon,
  User,
  X,
} from 'lucide-react';
import { Ticket } from '../types';

interface AddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendeeAdded: () => void;
}

export const AddAttendeeModal: React.FC<AddAttendeeModalProps> = ({
  isOpen,
  onClose,
  onAttendeeAdded,
}) => {
  const [step, setStep] = useState<'FORM' | 'UPDATE_TICKETS'>('FORM');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Non-Member');
  const [jumlah, setJumlah] = useState(1);
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createdTickets, setCreatedTickets] = useState<Ticket[]>([]);
  const [ticketNumberEdits, setTicketNumberEdits] = useState<{ old_id: string; new_id: string }[]>([]);

  const resetForm = () => {
    setStep('FORM');
    setNama('');
    setKategori('Non-Member');
    setJumlah(1);
    setNoHp('');
    setEmail('');
    setErrorMessage(null);
    setCreatedTickets([]);
    setTicketNumberEdits([]);
  };

  const handleCreateAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMessage('Please enter the attendee name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/attendees/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          kategori,
          jumlah,
          no_hp: noHp.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register attendee.');
      }

      const tickets: Ticket[] = data.tickets || [];
      setCreatedTickets(tickets);
      setTicketNumberEdits(
        tickets.map(t => ({ old_id: t['ID Tiket'], new_id: t['ID Tiket'] }))
      );
      setStep('UPDATE_TICKETS');
      onAttendeeAdded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating attendee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicketNumbers = async (markCheckedIn: boolean) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/attendees/update-ticket-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: ticketNumberEdits,
          mark_as_checked_in: markCheckedIn,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update ticket numbers.');
      }

      onAttendeeAdded();
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating ticket numbers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-white border border-[#e2e0cf] rounded-2xl shadow-2xl z-50 p-5 sm:p-6 text-stone-900 focus:outline-none max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e0cf]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#85362f] text-[#fcc844] flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <Dialog.Title className="text-base sm:text-lg font-extrabold text-stone-900">
                {step === 'FORM' ? 'Add Walk-in Attendee' : 'Confirm & Update Ticket Numbers'}
              </Dialog.Title>
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

          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-[#85362f]/10 border border-[#85362f]/30 text-[#85362f] text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {step === 'FORM' ? (
            <form onSubmit={handleCreateAttendee} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nama Lengkap (Full Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="e.g. Budi Santoso"
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg pl-9 pr-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Kategori (Category) *
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg px-3 py-2 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#85362f]"
                  >
                    <option value="Non-Member">Non-Member</option>
                    <option value="SIS">SIS</option>
                    <option value="PPI">PPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Jumlah Tiket (How Many) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setJumlah(j => Math.max(1, j - 1))}
                      className="w-9 h-9 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-800 font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={jumlah}
                      onChange={(e) => setJumlah(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      className="w-16 text-center bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg py-1.5 text-sm font-bold text-[#85362f]"
                    />
                    <button
                      type="button"
                      onClick={() => setJumlah(j => Math.min(20, j + 1))}
                      className="w-9 h-9 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-800 font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    No. WhatsApp / Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="e.g. 46734123456"
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. attendee@email.com"
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-lg px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e0cf] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 rounded-xl bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#85362f] hover:bg-[#702d27] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Register &amp; Next</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-[#177f6b]/10 border border-[#177f6b]/30 rounded-xl text-[#177f6b]">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#177f6b]" />
                  Attendee successfully registered!
                </p>
                <p className="text-[11px] text-stone-700 mt-1">
                  Default ticket numbers generated for <strong>{nama}</strong> ({createdTickets.length} ticket{createdTickets.length > 1 ? 's' : ''}). Update the ticket numbers below if physical wristbands were handed out:
                </p>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {ticketNumberEdits.map((item, index) => (
                  <div
                    key={item.old_id}
                    className="p-3 bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#85362f] text-[#fcc844] flex items-center justify-center font-bold text-[11px]">
                        #{index + 1}
                      </div>
                      <div>
                        <span className="text-stone-500 text-[10px] block">Ticket Sequence</span>
                        <span className="font-bold text-stone-900">Ticket {index + 1} of {ticketNumberEdits.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-600 font-bold">Assigned Number:</span>
                      <input
                        type="text"
                        value={item.new_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTicketNumberEdits(prev =>
                            prev.map((it, idx) => idx === index ? { ...it, new_id: val } : it)
                          );
                        }}
                        className="w-36 bg-white border border-[#85362f] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#85362f] focus:outline-none focus:ring-1 focus:ring-[#85362f]"
                        placeholder="e.g. PM2026-0162"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#e2e0cf] flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleUpdateTicketNumbers(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#f8f8ec] hover:bg-stone-200 text-stone-800 border border-[#e2e0cf] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <TicketIcon className="w-3.5 h-3.5 text-[#85362f]" />
                  <span>Save as Tersedia (Unchecked)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleUpdateTicketNumbers(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#177f6b] hover:bg-[#136a59] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#177f6b]/20 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save &amp; Check In Now</span>
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
