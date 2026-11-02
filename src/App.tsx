import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  ListFilter,
  RefreshCw,
  Search,
  Sparkles,
  Ticket as TicketIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Header } from './components/Header';
import { Scanner } from './components/Scanner';
import { TicketCard } from './components/TicketCard';
import { AttendeeList } from './components/AttendeeList';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { GateMetrics, ScanResult, Ticket } from './types';
import { playErrorTone, playSuccessBeep, playWarningTone } from './utils/audio';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSource, setSyncSource] = useState<string>('Local Master File');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoCheckIn, setAutoCheckIn] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'scanner' | 'attendees'>('scanner');

  // Fetch tickets manifest from backend API
  const fetchTickets = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setSyncSource(data.syncSource || 'Local Master File');
        if (data.googleSheetUrl !== undefined) {
          setGoogleSheetUrl(data.googleSheetUrl);
        }
        // If an attendee was selected, refresh their record
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
  }, [fetchTickets]);

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

  // Perform Check In POST request
  const handleCheckIn = async (idTiket: string) => {
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

        // Trigger confetti celebration
        try {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#10b981', '#f59e0b', '#3b82f6'],
          });
        } catch {
          // Ignore if canvas-confetti is not loaded
        }

        setSelectedTicket(data.ticket);
        setScanResult({
          status: 'SUCCESS',
          ticket: data.ticket,
          message: data.message || `Checked in ${data.ticket?.Nama || 'Attendee'}.`,
          scannedCode: idTiket,
          timestamp: timeStr,
          checkedInAt: data.checked_in_at,
        });

        // Update in local state array immediately
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
    }
  };

  // Handle scanned QR code string (either full URL or raw ID)
  const handleScan = (scannedRaw: string) => {
    let cleanCode = scannedRaw.trim();

    // If QR contains full qrserver link or URL, extract data parameter
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

    // Find ticket in local registry
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

    const isUsed = (foundTicket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                   (foundTicket['Terpakai'] || '').toLowerCase() === 'terpakai';

    setSelectedTicket(foundTicket);

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
    } else {
      // If Auto Check-In mode is ON, immediately execute check-in!
      if (autoCheckIn) {
        handleCheckIn(foundTicket['ID Tiket']);
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

  // Keyboard shortcut listener (Press Enter to check in active ticket)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedTicket) {
        const isUsed = (selectedTicket['Status Tiket'] || '').toLowerCase() === 'terpakai' ||
                       (selectedTicket['Terpakai'] || '').toLowerCase() === 'terpakai';
        if (!isUsed && !isProcessing) {
          handleCheckIn(selectedTicket['ID Tiket']);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicket, isProcessing]);

  // Export CSV handler
  const handleExportCSV = () => {
    window.location.href = '/api/export';
  };

  // Save Google Sheet URL and trigger sync
  const handleSaveGoogleSheetUrl = async (url: string) => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleSheetUrl: url }),
    });
    if (!res.ok) throw new Error('Failed to sync from Google Sheet');
    await fetchTickets();
  };

  // Reset demo manifest handler
  const handleResetManifest = async () => {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (res.ok) {
      await fetchTickets();
      setSelectedTicket(null);
      setScanResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 lg:pb-8 selection:bg-amber-500 selection:text-black">
      {/* Top Header & Metrics Dashboard */}
      <Header
        metrics={metrics}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(v => !v)}
        syncSource={syncSource}
        onOpenSyncModal={() => setIsSettingsOpen(true)}
        onExportCSV={handleExportCSV}
        isSyncing={isSyncing}
        onSyncNow={fetchTickets}
      />

      {/* Main Responsive Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading Pasar Malam 2026 Ticket Manifest...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Scanner & Search (Mobile visible when mobileTab === 'scanner') */}
            <div className={`lg:col-span-5 flex flex-col gap-5 ${mobileTab === 'scanner' ? 'block' : 'hidden lg:flex'}`}>
              <Scanner
                onScan={handleScan}
                allTickets={tickets}
                scanResult={scanResult}
                autoCheckIn={autoCheckIn}
                onToggleAutoCheckIn={() => setAutoCheckIn(v => !v)}
                isProcessing={isProcessing}
              />

              {/* On Mobile: If a ticket is selected, show ticket card right below scanner */}
              {selectedTicket && (
                <div className="lg:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Active Scanned Ticket</span>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                  <TicketCard
                    ticket={selectedTicket}
                    onCheckIn={handleCheckIn}
                    onManualToggle={handleManualToggle}
                    isCheckingIn={isProcessing}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Ticket Validation Card (Desktop) & Attendee Registry */}
            <div className={`lg:col-span-7 flex flex-col gap-5 ${mobileTab === 'attendees' ? 'block' : 'hidden lg:flex'}`}>
              {/* Desktop Active Scanned Ticket Card */}
              {selectedTicket ? (
                <div className="hidden lg:block">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Active Scanned Ticket Validation
                    </span>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Dismiss Card
                    </button>
                  </div>
                  <TicketCard
                    ticket={selectedTicket}
                    onCheckIn={handleCheckIn}
                    onManualToggle={handleManualToggle}
                    isCheckingIn={isProcessing}
                  />
                </div>
              ) : (
                <div className="hidden lg:flex p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 items-center justify-center text-center">
                  <div className="space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400 mb-2">
                      <TicketIcon className="w-5 h-5 text-amber-400/80" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">No Ticket Selected</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Scan a QR code or click any attendee in the manifest below to inspect details and validate entry.
                    </p>
                  </div>
                </div>
              )}

              {/* Attendee Manifest List & Searchable Tabs */}
              <AttendeeList
                tickets={tickets}
                onSelectTicket={(ticket) => {
                  setSelectedTicket(ticket);
                  if (mobileTab === 'attendees') {
                    // Switch to scanner view to view validation card
                    setMobileTab('scanner');
                  }
                }}
                onCheckIn={handleCheckIn}
                onManualToggle={handleManualToggle}
              />
            </div>
          </div>
        )}
      </main>

      {/* Fixed Mobile Bottom Tab Bar (Ergonomic Thumb-Zone Navigation) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 h-14 flex items-center justify-around px-4">
        <button
          onClick={() => setMobileTab('scanner')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            mobileTab === 'scanner' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Gate Scanner</span>
        </button>

        <button
          onClick={() => setMobileTab('attendees')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            mobileTab === 'attendees' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Attendee Log</span>
          <span className="absolute top-1.5 right-6 px-1 rounded-full text-[9px] bg-slate-800 text-slate-300 tabular-nums">
            {metrics.total}
          </span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Sync &amp; Export</span>
        </button>
      </nav>

      {/* Google Sheet Sync & Export Modal */}
      <SyncSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        googleSheetUrl={googleSheetUrl}
        onSaveGoogleSheetUrl={handleSaveGoogleSheetUrl}
        onExportCSV={handleExportCSV}
        onResetManifest={handleResetManifest}
        syncSource={syncSource}
      />
    </div>
  );
}
