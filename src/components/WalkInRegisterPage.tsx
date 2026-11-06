import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { WalkInItem, WalkInRegistration } from '../types';

interface PriceCategory {
  key: 'PPI/SIS' | 'Reduced' | 'Adult';
  name: string;
  desc: string;
  price: number;
  badge: string;
}

const CATEGORIES: PriceCategory[] = [
  {
    key: 'PPI/SIS',
    name: 'PPI Students & SIS Members',
    desc: 'Member PPI Sweden / Stockholm & SIS cardholders',
    price: 40,
    badge: 'bg-[#177f6b]/10 text-[#177f6b] border-[#177f6b]/20',
  },
  {
    key: 'Reduced',
    name: 'Children >12, Intl Students, Seniors (>67)',
    desc: 'Children 13+, International students, and Senior citizens',
    price: 50,
    badge: 'bg-[#85362f]/10 text-[#85362f] border-[#85362f]/20',
  },
  {
    key: 'Adult',
    name: 'Adult (18 - 67 years old)',
    desc: 'General admission adult visitor ticket',
    price: 90,
    badge: 'bg-stone-100 text-stone-800 border-stone-200',
  },
];

export const WalkInRegisterPage: React.FC = () => {
  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({
    'PPI/SIS': 0,
    'Reduced': 0,
    'Adult': 1, // default 1 adult
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedData, setSubmittedData] = useState<WalkInRegistration | null>(null);

  // Compute totals
  const { totalTickets, totalCostSEK } = useMemo(() => {
    let t = 0;
    let c = 0;
    for (const cat of CATEGORIES) {
      const cnt = counts[cat.key] || 0;
      t += cnt;
      c += cnt * cat.price;
    }
    return { totalTickets: t, totalCostSEK: c };
  }, [counts]);

  const updateCount = (key: string, delta: number) => {
    setCounts(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(20, (prev[key] || 0) + delta)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMessage('Please enter your full name (Nama pengunjung).');
      return;
    }

    if (totalTickets <= 0) {
      setErrorMessage('Please choose at least 1 ticket.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const items: WalkInItem[] = CATEGORIES.filter(c => (counts[c.key] || 0) > 0).map(c => ({
        category: c.key,
        count: counts[c.key],
        pricePerTicket: c.price,
      }));

      const res = await fetch('/api/walkin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          phone: phone.trim(),
          email: email.trim(),
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedData(data.registration);
      } else {
        setErrorMessage(data.error || 'Failed to submit registration.');
      }
    } catch (err: any) {
      setErrorMessage('Network connection error. Please notify gate staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Swish payment deep-link construction
  // Destination phone number: 0769577521
  // Format: swish://payment?data={"version":1,"payee":{"value":"0769577521"},"amount":{"value":1},"message":{"value":"Name - PM2026 Ticket"}}
  const swishPayee = '1236730527';
  const attendeeName = (submittedData ? submittedData.nama : nama.trim()) || 'Visitor';
  const swishMessage = `${attendeeName} - PM2026 Ticket`;
  const swishAmount = submittedData ? submittedData.totalCostSEK : totalCostSEK;

  const handleOpenSwish = () => {
    const swishData = {
      version: 1,
      payee: {
        value: swishPayee,
      },
      amount: {
        value: swishAmount,
      },
      message: {
        value: swishMessage,
      },
    };

    const swishUrl = `swish://payment?data=${encodeURIComponent(JSON.stringify(swishData))}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = swishUrl;
      // Fallback if app doesn't open
      setTimeout(() => {
        // Keeps user informed if Swish is not installed or opened
      }, 1500);
    } else {
      // On desktop, also attempt the deep link or alert information
      window.location.href = swishUrl;
      setTimeout(() => {
        alert(
          `Swish Payment Details:\n• Payee: ${swishPayee}\n• Amount: ${swishAmount} SEK\n• Message: "${swishMessage}"`
        );
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8ec] text-stone-900 font-sans selection:bg-[#fcc844] selection:text-stone-900 flex flex-col justify-between">
      {/* Top Banner & Header */}
      <header className="border-b border-[#e2e0cf] bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/LED_Template__1__3621e6db.png"
                alt="Pasar Malam 2026"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-sm text-stone-900 leading-tight">
                Pasar Malam 2026
              </div>
              <div className="text-[10px] text-[#85362f] font-bold uppercase tracking-wide">
                Walk-In Ticket Entry
              </div>
            </div>
          </div>

          <a
            href="/"
            className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-[#f8f8ec] px-3 py-1.5 rounded-lg border border-[#e2e0cf] flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Gate App</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full px-4 py-5 flex-1">
        {submittedData ? (
          /* ============================================================== */
          /* SUCCESS & SWISH PAYMENT STEP                                    */
          /* ============================================================== */
          <div className="bg-white border border-[#e2e0cf] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Success icon & title */}
            <div className="text-center">
              <div className="w-12 h-12 bg-[#177f6b]/15 text-[#177f6b] rounded-full flex items-center justify-center mx-auto mb-2.5">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900">
                Registration Submitted!
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Please complete the payment with Swish and show this screen to the gate staff.
              </p>
            </div>

            {/* Bill & Summary Box */}
            <div className="bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e0cf]">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase block">Visitor</span>
                  <span className="text-sm font-extrabold text-stone-900">{submittedData.nama}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-stone-500 uppercase block">Ref ID</span>
                  <span className="text-xs font-mono font-bold text-[#85362f]">{submittedData.id}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5 text-xs">
                {submittedData.items.map(it => {
                  const cat = CATEGORIES.find(c => c.key === it.category);
                  return (
                    <div key={it.category} className="flex items-center justify-between">
                      <span className="text-stone-700">
                        {it.count}x {cat?.name || it.category} (@{it.pricePerTicket} SEK)
                      </span>
                      <span className="font-mono font-bold text-stone-900">
                        {it.count * it.pricePerTicket} SEK
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total Row */}
              <div className="pt-2 border-t border-[#e2e0cf] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-700">Total to Pay</span>
                  <span className="text-[11px] text-stone-500 block">({submittedData.totalTickets} tickets)</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#85362f] font-mono">
                  {submittedData.totalCostSEK} SEK
                </div>
              </div>
            </div>

            {/* Swish Payment Instructions */}
            <div className="bg-[#177f6b]/10 border border-[#177f6b]/20 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#177f6b] text-white flex items-center justify-center shrink-0 font-black text-xs">
                SWISH
              </div>
              <div className="text-xs text-stone-800 leading-relaxed flex-1 space-y-1">
                <div>
                  <span className="text-stone-500 font-bold">Payee (Number): </span>
                  <strong className="font-mono text-stone-900 bg-white px-1.5 py-0.5 rounded border border-[#177f6b]/30">0769577521</strong>
                </div>
                <div>
                  <span className="text-stone-500 font-bold">Amount: </span>
                  <strong className="font-mono text-[#85362f]">{submittedData.totalCostSEK} SEK</strong>
                </div>
                <div>
                  <span className="text-stone-500 font-bold">Payment Message: </span>
                  <strong className="bg-white px-1.5 py-0.5 rounded border border-[#177f6b]/30 font-mono text-stone-900">
                    {submittedData.nama} - PM2026 Ticket
                  </strong>
                </div>
              </div>
            </div>

            {/* Direct Redirect to Swish Button */}
            <button
              onClick={handleOpenSwish}
              className="w-full py-3 px-4 rounded-xl bg-[#177f6b] hover:bg-[#136a59] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Swish App ({submittedData.totalCostSEK} SEK)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Operator verification notice */}
            <div className="text-center pt-2 border-t border-[#e2e0cf]">
              <p className="text-xs text-stone-500">
                Gate operators will verify your payment in their console and issue your numbered wristbands / tickets.
              </p>
              <button
                onClick={() => {
                  setSubmittedData(null);
                  setNama('');
                  setPhone('');
                  setEmail('');
                  setCounts({ 'PPI/SIS': 0, 'Reduced': 0, 'Adult': 1 });
                }}
                className="mt-3 text-xs text-[#85362f] font-bold hover:underline"
              >
                + Register Another Walk-in
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* WALK-IN REGISTRATION FORM                                      */
          /* ============================================================== */
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#e2e0cf] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-5"
          >
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight">
                Walk-In Ticket Purchase
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Calculate ticket prices, pay via Swish, and get verified at the entry gate.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#85362f]/10 border border-[#85362f]/30 text-xs font-semibold text-[#85362f]">
                {errorMessage}
              </div>
            )}

            {/* 1. Attendee Personal Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Name / Nama Lengkap <span className="text-[#85362f]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f] focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Phone / No. WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 073 123 4567"
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f] focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. budi@example.com"
                    className="w-full bg-[#f8f8ec] border border-[#e2e0cf] rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Ticket Categories & Counts */}
            <div className="space-y-2 pt-2 border-t border-[#e2e0cf]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-stone-800">Select Ticket Quantities</span>
                <span className="text-[11px] text-stone-500">Multiple categories allowed</span>
              </div>

              {CATEGORIES.map((cat) => {
                const count = counts[cat.key] || 0;
                return (
                  <div
                    key={cat.key}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      count > 0 ? 'bg-[#f8f8ec]/90 border-[#85362f]/40 shadow-xs' : 'bg-white border-[#e2e0cf]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-stone-900">
                          {cat.name}
                        </span>
                        <span className="text-xs font-mono font-black text-[#85362f]">
                          {cat.price} SEK
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-1">
                        {cat.desc}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCount(cat.key, -1)}
                        disabled={count <= 0}
                        className="w-8 h-8 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-800 font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCount(cat.key, 1)}
                        className="w-8 h-8 rounded-lg bg-[#f8f8ec] hover:bg-stone-200 border border-[#e2e0cf] text-stone-800 font-bold text-sm flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Live Price Calculation Summary */}
            <div className="p-3.5 bg-[#f8f8ec] rounded-xl border border-[#e2e0cf] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Total Tickets</span>
                <span className="text-base font-extrabold text-stone-900 font-mono">
                  {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-stone-500 uppercase block">Total Cost</span>
                <span className="text-xl sm:text-2xl font-black text-[#85362f] font-mono">
                  {totalCostSEK} SEK
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting || totalTickets <= 0}
              className="w-full py-3 px-4 rounded-xl bg-[#85362f] hover:bg-[#6e2b25] disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Submitting Registration...</span>
              ) : (
                <>
                  <span>Proceed to Swish Payment ({totalCostSEK} SEK)</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e0cf] py-3 text-center text-[11px] text-stone-400">
        Pasar Malam 2026 • Stockholm, Sweden • SIS X PPI Stockholm
      </footer>
    </div>
  );
};
