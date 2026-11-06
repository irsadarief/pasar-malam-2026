import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  ListFilter,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Ticket as TicketIcon,
  Users,
} from 'lucide-react';
import { Header } from './components/Header';
import { Scanner } from './components/Scanner';
import { TicketCard } from './components/TicketCard';
import { AttendeeList } from './components/AttendeeList';
import { AddAttendeeModal } from './components/AddAttendeeModal';
import { GroupCheckinModal } from './components/GroupCheckinModal';
import { PasswordGate } from './components/PasswordGate';
import { WalkInRegisterPage } from './components/WalkInRegisterPage';
import { WalkInQueueTable } from './components/WalkInQueueTable';
import { VerifyWalkInModal } from './components/VerifyWalkInModal';
import { GateMetrics, ScanResult, Ticket, WalkInRegistration } from './types';
import { playErrorTone, playSuccessBeep, playWarningTone } from './utils/audio';

export default function App() {
  // Gatekeeper access password protection ("Alvik711")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('pm2026_auth') === 'authenticated';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSource, setSyncSource] = useState<string>('Local Master Manifest');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoCheckIn, setAutoCheckIn] = useState<boolean>(false);

  // Interface mode: 'mobile' (scanner-focused) or 'desktop' (attendee log & manifest console)
  const [interfaceMode, setInterfaceMode] = useState<'mobile' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 ? 'mobile' : 'desktop';
    }
    return 'mobile';
  });

  // Add Attendee Modal State
  const [isAddAttendeeOpen, setIsAddAttendeeOpen] = useState<boolean>(false);

  // Walk-in queue state & modal
  const [walkIns, setWalkIns] = useState<WalkInRegistration[]>([]);
  const [isWalkInLoading, setIsWalkInLoading] = useState<boolean>(false);
  const [activeVerifyingWalkIn, setActiveVerifyingWalkIn] = useState<WalkInRegistration | null>(null);
  const [showWalkInQueue, setShowWalkInQueue] = useState<boolean>(false);

  // Group Check-In Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [groupScannedTicket, setGroupScannedTicket] = useState<Ticket | null>(null);
  const [groupRelatedTickets, setGroupRelatedTickets] = useState<Ticket[]>([]);

  // Fetch walk-in registrations
  const fetchWalkIns = useCallback(async () => {
    try {
      setIsWalkInLoading(true);
      const res = await fetch('/api/walkin/list');
      if (res.ok) {
        const data = await res.json();
        setWalkIns(data.registrations || []);
      }
    } catch (e) {
      console.warn('Failed fetching walk-ins:', e);
    } finally {
      setIsWalkInLoading(false);
    }
  }, []);

  // Fetch tickets manifest from backend API
  const fetchTickets = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setSyncSource(data.syncSource || 'Local Master Manifest');
        // Refresh currently active selected ticket
        setSelectedTicket(prev => {
          if (!prev) return null;
          const fresh = (data.tickets || []).find(
            (t: Ticket) => (t['ID Tiket'] || '').toLowerCase() === (prev['ID Tiket'] || '').toLowerCase()
          );
          return fresh || prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchWalkIns();

    // Poll every 10 seconds for new walk-in submissions from /register
    const timer = setInterval(() => {
      fetchWalkIns();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchTickets, fetchWalkIns]);

  // Compute live gate metrics
  const metrics: GateMetrics = useMemo(() => {
    let checkedIn = 0;
    const ppi = { total: 0, checkedIn: 0 };
    const sis = { total: 0, checkedIn: 0 };
    const nonMember = { total: 0, checkedIn: 0 };
    const other = { total: 0, checkedIn: 0 };

    for (const t of tickets) {
      const isUsed = (t['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                     (t['Terpakai'] || '').toLowerCase() === 'terpakai';
      if (isUsed) checkedIn++;

      const cat = (t.Kategori || '').toLowerCase();
      if (cat.includes('ppi')) {
        ppi.total++;
        if (isUsed) ppi.checkedIn++;
      } else if (cat.includes('sis')) {
        sis.total++;
        if (isUsed) sis.checkedIn++;
      } else if (cat.includes('non-member') || cat.includes('non member')) {
        nonMember.total++;
        if (isUsed) nonMember.checkedIn++;
      } else {
        other.total++;
        if (isUsed) other.checkedIn++;
      }
    }

    return {
      total: tickets.length,
      checkedIn,
      remaining: Math.max(0, tickets.length - checkedIn),
      ppi,
      sis,
      nonMember,
      other,
    };
  }, [tickets]);

  // Helper: Find all tickets belonging to the same person / identity
  const findRelatedTickets = useCallback((targetTicket: Ticket): Ticket[] => {
    const targetName = (targetTicket.Nama || targetTicket['Nama Kapital'] || '').trim().toLowerCase();
    const targetOrderId = (targetTicket['Order ID'] || '').trim().toLowerCase();
    const targetPhone = (targetTicket['No Hp'] || '').trim();
    const targetEmail = (targetTicket.Email || '').trim().toLowerCase();

    return tickets.filter(t => {
      const name = (t.Nama || t['Nama Kapital'] || '').trim().toLowerCase();
      const orderId = (t['Order ID'] || '').trim().toLowerCase();
      const phone = (t['No Hp'] || '').trim();
      const email = (t.Email || '').trim().toLowerCase();

      // Check matches
      const matchOrderId = targetOrderId && orderId && targetOrderId === orderId;
      const matchName = targetName && name && targetName === name;
      const matchPhone = targetPhone.length >= 6 && phone.length >= 6 && targetPhone === phone;
      const matchEmail = targetEmail.includes('@') && email.includes('@') && targetEmail === email;

      return matchOrderId || matchName || matchPhone || matchEmail;
    });
  }, [tickets]);

  // Check In a Single Ticket
  const handleCheckInSingle = async (idTiket: string) => {
    if (!idTiket) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_tiket: idTiket }),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });

      if (res.ok && data.success) {
        if (soundEnabled) playSuccessBeep();

        try {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#177f6b', '#fcc844', '#85362f'],
          });
        } catch {}

        setSelectedTicket(data.ticket);
        setScanResult({
          status: 'SUCCESS',
          ticket: data.ticket,
          message: data.message || `Checked in ${data.ticket?.Nama || 'Attendee'}.`,
          scannedCode: idTiket,
          timestamp: timeStr,
          checkedInAt: data.checked_in_at,
        });

        setTickets(prev =>
          prev.map(t =>
            (t['ID Tiket'] || '').toLowerCase() === idTiket.toLowerCase() ? data.ticket : t
          )
        );
      } else if (data.status === 'ALREADY_USED') {
        if (soundEnabled) playWarningTone();
        setSelectedTicket(data.ticket);
        setScanResult({
          status: 'ALREADY_USED',
          ticket: data.ticket,
          message: data.message || 'Ticket has already been used.',
          scannedCode: idTiket,
          timestamp: timeStr,
          checkedInAt: data.checked_in_at,
        });
      } else {
        if (soundEnabled) playErrorTone();
        setScanResult({
          status: 'NOT_FOUND',
          message: data.error || `Ticket '${idTiket}' not found in registry.`,
          scannedCode: idTiket,
          timestamp: timeStr,
        });
      }
    } catch (err: any) {
      if (soundEnabled) playErrorTone();
      setScanResult({
        status: 'ERROR',
        message: err?.message || 'Network error while checking in ticket.',
        scannedCode: idTiket,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      });
    } finally {
      setIsProcessing(false);
      setIsGroupModalOpen(false);
    }
  };

  // Batch Check In All Tickets in a Group (Accelerated Check-in)
  const handleCheckInBatch = async (groupTickets: Ticket[]) => {
    if (!groupTickets || groupTickets.length === 0) return;
    setIsProcessing(true);

    try {
      const idTikets = groupTickets.map(t => t['ID Tiket']);
      const res = await fetch('/api/checkin-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_tikets: idTikets }),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });

      if (res.ok && data.success) {
        if (soundEnabled) playSuccessBeep();

        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#177f6b', '#fcc844', '#85362f'],
          });
        } catch {}

        const updatedMap = new Map<string, Ticket>();
        for (const t of data.tickets || []) {
          updatedMap.set((t['ID Tiket'] || '').toLowerCase(), t);
        }

        setTickets(prev =>
          prev.map(t => {
            const key = (t['ID Tiket'] || '').toLowerCase();
            return updatedMap.has(key) ? updatedMap.get(key)! : t;
          })
        );

        const primaryTicket = groupTickets[0];
        setSelectedTicket(updatedMap.get((primaryTicket['ID Tiket'] || '').toLowerCase()) || primaryTicket);

        setScanResult({
          status: 'SUCCESS',
          ticket: primaryTicket,
          message: `Checked in all ${data.count} tickets for ${primaryTicket.Nama || 'Attendee Group'}.`,
          scannedCode: primaryTicket['ID Tiket'],
          timestamp: timeStr,
          checkedInAt: data.checked_in_at,
        });
      }
    } catch (err: any) {
      if (soundEnabled) playErrorTone();
      console.error('Batch checkin error:', err);
    } finally {
      setIsProcessing(false);
      setIsGroupModalOpen(false);
    }
  };

  // Handle scanned QR code string
  const handleScan = (scannedRaw: string) => {
    let cleanCode = scannedRaw.trim();

    // Extract data param if it was a full QR URL
    if (cleanCode.includes('data=')) {
      try {
        const url = new URL(cleanCode);
        const dataParam = url.searchParams.get('data');
        if (dataParam) cleanCode = dataParam.trim();
      } catch {
        const match = cleanCode.match(/[?&]data=([^&]+)/);
        if (match) cleanCode = decodeURIComponent(match[1]).trim();
      }
    }

    const foundTicket = tickets.find(
      t => (t['ID Tiket'] || '').toLowerCase() === cleanCode.toLowerCase()
    );

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });

    if (!foundTicket) {
      if (soundEnabled) playErrorTone();
      setScanResult({
        status: 'NOT_FOUND',
        message: `Ticket '${cleanCode}' was not found in the manifest.`,
        scannedCode: cleanCode,
        timestamp: timeStr,
      });
      return;
    }

    setSelectedTicket(foundTicket);

    const isUsed = (foundTicket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                   (foundTicket['Terpakai'] || '').toLowerCase() === 'terpakai';

    if (isUsed) {
      if (soundEnabled) playWarningTone();
      setScanResult({
        status: 'ALREADY_USED',
        ticket: foundTicket,
        message: `Ticket has already been used by ${foundTicket.Nama || foundTicket['Nama Kapital']}.`,
        scannedCode: cleanCode,
        timestamp: timeStr,
        checkedInAt: foundTicket['Waktu Kedatangan'] || 'Previously checked in',
      });
      return;
    }

    // Check if same identity (Name, Order ID, Phone, Email) has multiple tickets in total!
    const related = findRelatedTickets(foundTicket);
    const uncheckInRelated = related.filter(t => {
      const s = (t['Status Tiket'] || '').toLowerCase();
      const p = (t['Terpakai'] || '').toLowerCase();
      return s !== 'terpakai' && p !== 'terpakai';
    });

    if (related.length > 1 && uncheckInRelated.length > 1) {
      if (soundEnabled) playSuccessBeep();
      setGroupScannedTicket(foundTicket);
      setGroupRelatedTickets(related);
      setIsGroupModalOpen(true);
      return;
    }

    // Single ticket or remaining 1 ticket in order
    if (autoCheckIn) {
      handleCheckInSingle(foundTicket['ID Tiket']);
    } else {
      if (soundEnabled) playSuccessBeep();
      setScanResult({
        status: 'SUCCESS',
        ticket: foundTicket,
        message: `Ticket valid! Ready to check in ${foundTicket.Nama || foundTicket['Nama Kapital']}.`,
        scannedCode: cleanCode,
        timestamp: timeStr,
      });
    }
  };

  // Supervisor Manual Override toggle
  const handleManualToggle = async (idTiket: string, targetStatus: 'Tersedia' | 'Terpakai') => {
    try {
      const res = await fetch('/api/manual-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_tiket: idTiket, target_status: targetStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev =>
          prev.map(t =>
            (t['ID Tiket'] || '').toLowerCase() === idTiket.toLowerCase() ? data.ticket : t
          )
        );
        if (selectedTicket && (selectedTicket['ID Tiket'] || '').toLowerCase() === idTiket.toLowerCase()) {
          setSelectedTicket(data.ticket);
        }
      }
    } catch (e) {
      console.error('Manual toggle error:', e);
    }
  };

  // Keyboard shortcut listener: Press Enter to check in active ticket
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedTicket && !isGroupModalOpen && !isAddAttendeeOpen) {
        const isUsed = (selectedTicket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                       (selectedTicket['Terpakai'] || '').toLowerCase() === 'terpakai';
        if (!isUsed && !isProcessing) {
          handleCheckInSingle(selectedTicket['ID Tiket']);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicket, isProcessing, isGroupModalOpen, isAddAttendeeOpen]);

  // Approve Walk-in Registration (Verify Swish & Issue Tickets)
  const handleApproveWalkIn = async (
    registrationId: string,
    customTicketIds: string[],
    markAsCheckedIn: boolean
  ) => {
    try {
      const res = await fetch('/api/walkin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          customTicketIds,
          markAsCheckedIn,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        playSuccessBeep();
        // Refresh both tickets and walk-in lists
        await fetchTickets();
        await fetchWalkIns();
      } else {
        alert(data.error || 'Failed to approve walk-in.');
      }
    } catch (e: any) {
      alert(`Error approving walk-in: ${e?.message || e}`);
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    window.location.href = '/api/export';
  };

  // 1. PUBLIC VISITOR REGISTRATION ROUTE (/register)
  // Check if current URL pathname is /register
  const isRegisterRoute = typeof window !== 'undefined' &&
    (window.location.pathname === '/register' || window.location.pathname.startsWith('/register'));

  if (isRegisterRoute) {
    return <WalkInRegisterPage />;
  }

  // 2. ADMIN GATEKEEPER PASSCODE PROTECTION ("Alvik711")
  if (!isAuthenticated) {
    return <PasswordGate onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f8ec] text-stone-900 flex flex-col font-sans selection:bg-[#fcc844] selection:text-stone-900">
      {/* Minimized Single-Row Top Toolbar */}
      <Header
        metrics={metrics}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(v => !v)}
        syncSource={syncSource}
        onExportCSV={handleExportCSV}
        isSyncing={isSyncing}
        onSyncNow={fetchTickets}
        onOpenAddAttendee={() => setIsAddAttendeeOpen(true)}
        interfaceMode={interfaceMode}
        onToggleInterfaceMode={(mode) => setInterfaceMode(mode)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#85362f] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs sm:text-sm text-stone-600 font-bold">
              Loading Pasar Malam 2026 Ticket Manifest...
            </p>
          </div>
        ) : interfaceMode === 'mobile' ? (
          /* ================================================================= */
          /* MOBILE INTERFACE: Focused on Camera Scanner, Rapid Validation     */
          /* ================================================================= */
          <div className="max-w-md mx-auto flex flex-col gap-4 pb-8">
            {/* Live Camera Scanner */}
            <Scanner
              onScan={handleScan}
              allTickets={tickets}
              scanResult={scanResult}
              autoCheckIn={autoCheckIn}
              onToggleAutoCheckIn={() => setAutoCheckIn(v => !v)}
              isProcessing={isProcessing}
            />

            {/* Validation Card for Currently Scanned / Selected Attendee */}
            {selectedTicket && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#85362f] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#fcc844]" />
                    Validation Card
                  </span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs text-stone-500 hover:text-stone-900 font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
                <TicketCard
                  ticket={selectedTicket}
                  onCheckIn={handleCheckInSingle}
                  onManualToggle={handleManualToggle}
                  isCheckingIn={isProcessing}
                />
              </div>
            )}

            {/* Quick Switch Button to Attendee Log */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setInterfaceMode('desktop')}
                className="text-xs text-stone-600 hover:text-[#85362f] font-bold transition-colors flex items-center justify-center gap-1.5 mx-auto py-2"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Switch to Desktop Attendee Console</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* DESKTOP INTERFACE: Focused on Attendee Log, Search, & Operations  */
          /* ================================================================= */
          <div className="flex flex-col gap-5">
            {/* Top Quick Status & Search Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-[#e2e0cf] rounded-xl shadow-2xs">
                <span className="text-[11px] text-stone-500 block font-bold">Total Registry</span>
                <span className="text-2xl font-black text-stone-900 font-mono tabular-nums">{metrics.total}</span>
              </div>
              <div className="p-3 bg-white border border-[#e2e0cf] rounded-xl shadow-2xs">
                <span className="text-[11px] text-[#177f6b] block font-bold">Checked In Attendees</span>
                <span className="text-2xl font-black text-[#177f6b] font-mono tabular-nums">{metrics.checkedIn}</span>
              </div>
              <div className="p-3 bg-white border border-[#e2e0cf] rounded-xl shadow-2xs">
                <span className="text-[11px] text-[#85362f] block font-bold">Remaining Pending</span>
                <span className="text-2xl font-black text-[#85362f] font-mono tabular-nums">{metrics.remaining}</span>
              </div>
              <div className="p-3 bg-white border border-[#e2e0cf] rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block font-bold">Walk-in Swish Queue</span>
                  <div className="mt-0.5">
                    <span className="font-extrabold text-xs text-stone-900">
                      {walkIns.filter(w => w.status === 'PENDING_PAYMENT').length} Pending
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowWalkInQueue(v => !v)}
                    className={`px-3 py-2 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border shadow-xs ${
                      showWalkInQueue
                        ? 'bg-[#85362f] text-white border-[#85362f]'
                        : 'bg-white hover:bg-[#f8f8ec] text-stone-800 border-[#e2e0cf]'
                    }`}
                  >
                    <span>{showWalkInQueue ? 'Hide Queue' : 'View Queue'}</span>
                    {walkIns.filter(w => w.status === 'PENDING_PAYMENT').length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Walk-in Swish Queue Table (shown when toggled or when pending entries exist) */}
            {showWalkInQueue && (
              <WalkInQueueTable
                registrations={walkIns}
                isLoading={isWalkInLoading}
                onRefresh={fetchWalkIns}
                onVerify={reg => setActiveVerifyingWalkIn(reg)}
              />
            )}

            {/* Split Grid: Left Side Inspector & Right Side Attendee Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (4 cols): Quick Inspector Card or Camera Scanner */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {selectedTicket ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#85362f] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#fcc844]" />
                        Selected Attendee
                      </span>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-xs text-stone-500 hover:text-stone-900 font-bold"
                      >
                        Clear
                      </button>
                    </div>
                    <TicketCard
                      ticket={selectedTicket}
                      onCheckIn={handleCheckInSingle}
                      onManualToggle={handleManualToggle}
                      isCheckingIn={isProcessing}
                    />
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl border border-dashed border-[#e2e0cf] bg-white text-center shadow-2xs">
                    <TicketIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-stone-800">No Attendee Selected</h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Click any row in the registry on the right to inspect or check in the attendee.
                    </p>
                  </div>
                )}

                {/* Optional Mini Scanner for Desktop webcam operators */}
                <div className="bg-white border border-[#e2e0cf] rounded-2xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-[#85362f]" />
                      Desktop QR Scanner
                    </span>
                    <button
                      onClick={() => setInterfaceMode('mobile')}
                      className="text-[11px] text-[#85362f] font-bold hover:underline"
                    >
                      Full Mobile View
                    </button>
                  </div>
                  <Scanner
                    onScan={handleScan}
                    allTickets={tickets}
                    scanResult={scanResult}
                    autoCheckIn={autoCheckIn}
                    onToggleAutoCheckIn={() => setAutoCheckIn(v => !v)}
                    isProcessing={isProcessing}
                    compactMode
                  />
                </div>
              </div>

              {/* Right Column (8 cols): Full Attendee Manifest Table */}
              <div className="lg:col-span-8">
                <AttendeeList
                  tickets={tickets}
                  onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                  onCheckIn={handleCheckInSingle}
                  onManualToggle={handleManualToggle}
                  onOpenAddAttendee={() => setIsAddAttendeeOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Walk-in Button on Mobile */}
      {interfaceMode === 'mobile' && (
        <button
          onClick={() => setIsAddAttendeeOpen(true)}
          className="fixed bottom-4 right-4 z-30 px-4 py-2.5 rounded-full bg-[#177f6b] hover:bg-[#136a59] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-[#177f6b]/25 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Attendee</span>
        </button>
      )}

      {/* Add Attendee Modal */}
      <AddAttendeeModal
        isOpen={isAddAttendeeOpen}
        onClose={() => setIsAddAttendeeOpen(false)}
        onAttendeeAdded={fetchTickets}
      />

      {/* Group Check-In Modal (Triggered when 1 ticket of a group order is scanned) */}
      <GroupCheckinModal
        isOpen={isGroupModalOpen}
        scannedTicket={groupScannedTicket}
        relatedTickets={groupRelatedTickets}
        onCheckInAll={handleCheckInBatch}
        onCheckInSingle={(ticket) => handleCheckInSingle(ticket['ID Tiket'])}
        onCancel={() => setIsGroupModalOpen(false)}
        isProcessing={isProcessing}
      />

      {/* Verify Swish Walk-In Modal */}
      <VerifyWalkInModal
        registration={activeVerifyingWalkIn}
        isOpen={Boolean(activeVerifyingWalkIn)}
        onClose={() => setActiveVerifyingWalkIn(null)}
        onApprove={handleApproveWalkIn}
        nextSuggestedNumber={tickets.length + 1}
      />
    </div>
  );
}
