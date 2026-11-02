import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, Search, Sparkles, UploadCloud, Zap, ZapOff, CheckCircle2, AlertTriangle, XCircle, FlipHorizontal } from 'lucide-react';
import { Ticket, ScanResult } from '../types';

interface ScannerProps {
  onScan: (scannedText: string) => void;
  allTickets: Ticket[];
  scanResult: ScanResult | null;
  autoCheckIn: boolean;
  onToggleAutoCheckIn: () => void;
  isProcessing: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({
  onScan,
  allTickets,
  scanResult,
  autoCheckIn,
  onToggleAutoCheckIn,
  isProcessing,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'qr-reader-container';

  // Last scanned text debounce to prevent rapid duplicate triggers
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/rear camera for gate scanners
          const backCam = devices.find(
            d => d.label.toLowerCase().includes('back') ||
                 d.label.toLowerCase().includes('rear') ||
                 d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch(err => {
        console.warn('Could not enumerate cameras:', err);
      });

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (cameraIdToUse?: string) => {
    try {
      setCameraError(null);
      const camId = cameraIdToUse || selectedCameraId;

      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const cameraConfig = camId ? { deviceId: { exact: camId } } : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame parse failure - ignore normal per-frame misses
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message || 'Unable to access camera. Please allow camera permissions or upload QR image.'
      );
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    if (isScanning) {
      startCamera(nextCam.id);
    }
  };

  const handleSuccessfulScan = (text: string) => {
    const now = Date.now();
    const cleanText = text.trim();
    // Debounce: ignore same code scanned within 2.5 seconds
    if (cleanText === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScanTimeRef.current = now;
    lastScannedCodeRef.current = cleanText;
    onScan(cleanText);
  };

  // Image file upload fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError(null);
      const tempScanner = new Html5Qrcode('qr-file-helper');
      const result = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      if (result) {
        handleSuccessfulScan(result);
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setCameraError('Could not detect a valid QR Code in the uploaded image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter autocomplete suggestions for manual search
  const filteredSuggestions = searchQuery.trim().length >= 1
    ? allTickets
        .filter(t => {
          const q = searchQuery.toLowerCase();
          return (
            (t['ID Tiket'] || '').toLowerCase().includes(q) ||
            (t['Nama'] || '').toLowerCase().includes(q) ||
            (t['Nama Kapital'] || '').toLowerCase().includes(q) ||
            (t['Order ID'] || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Manual Lookup Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleSuccessfulScan(searchQuery.trim());
                setIsSearchFocused(false);
              }
            }}
            placeholder="Type Ticket ID (e.g. PM2026-0003), Attendee Name, or Order ID..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-11 pr-24 py-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                handleSuccessfulScan(searchQuery.trim());
                setIsSearchFocused(false);
              }}
              className="absolute right-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
            >
              Check In
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchFocused && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-800">
            {filteredSuggestions.map((ticket) => {
              const isUsed = (ticket['Status Tiket'] || '').toLowerCase() === 'terpakai';
              return (
                <button
                  key={ticket['ID Tiket']}
                  onMouseDown={() => {
                    handleSuccessfulScan(ticket['ID Tiket']);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {ticket['ID Tiket']}
                      </span>
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {ticket.Nama || ticket['Nama Kapital']}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{ticket.Kategori || 'Non-Member'}</span>
                      <span>·</span>
                      <span className="font-mono">{ticket['Order ID']}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        isUsed
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isUsed ? 'Terpakai' : 'Tersedia'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Camera Viewport Container */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        {/* Aspect Ratio Box */}
        <div className="relative w-full aspect-square max-h-[420px] mx-auto flex items-center justify-center bg-black/60">
          {/* HTML5 QR code video container */}
          <div
            id={readerElementId}
            className={`w-full h-full overflow-hidden ${!isScanning ? 'hidden' : 'block'}`}
          />

          {/* Hidden helper for file scanner */}
          <div id="qr-file-helper" className="hidden" />

          {/* Offline / Idle Camera Placeholder */}
          {!isScanning && (
            <div className="flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-black/50">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                Live QR Gate Camera
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 mb-5">
                Start camera to validate attendee tickets instantly with real-time audio and visual status.
              </p>
              <button
                onClick={() => startCamera()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera Scanner</span>
              </button>
            </div>
          )}

          {/* Active Live Reticle Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer dimmed mask */}
              <div className="relative w-[240px] h-[240px] sm:w-[270px] sm:h-[270px] rounded-2xl border-2 border-amber-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></span>
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></span>
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></span>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></span>

                {/* Animated Laser Scanning Beam */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-scan-laser" />

                {/* Center Subtext */}
                <div className="absolute -bottom-9 left-0 right-0 text-center">
                  <span className="text-[11px] font-medium text-amber-300/90 bg-slate-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
                    Align QR Ticket inside box
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner if camera failed */}
          {cameraError && (
            <div className="absolute inset-x-4 top-4 z-30 p-3 bg-red-950/90 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2 shadow-xl backdrop-blur-md">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Camera Access Notice</p>
                <p className="text-[11px] text-red-300 mt-0.5">{cameraError}</p>
              </div>
              <button
                onClick={() => setCameraError(null)}
                className="text-red-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-200">Verifying Ticket...</span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Control Footer Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {isScanning ? (
              <button
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-medium flex items-center gap-1.5 transition-colors"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => startCamera()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            )}

            {isScanning && cameras.length > 1 && (
              <button
                onClick={switchCamera}
                title="Switch Camera (Front / Rear)"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}

            {isScanning && hasTorch && (
              <button
                onClick={toggleTorch}
                title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Torch</span>
              </button>
            )}

            {/* Image Upload Scan button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload QR Image File"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Upload Image</span>
            </button>
          </div>

          {/* Mode Switch: Auto Check-In Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoCheckIn}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                autoCheckIn
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoCheckIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{autoCheckIn ? 'Auto Check-In: ON' : 'Inspect Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Test Shortcuts (Ensures anyone can test instantly with 1-click) */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1 font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Tickets (Demo Simulation)
          </span>
          <span className="text-[11px] text-slate-500">Click to scan without camera</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleSuccessfulScan('PM2026-0001')}
            className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 text-[11px] font-mono transition-colors"
          >
            PM2026-0001 (Already Used)
          </button>
          <button
            onClick={() => handleSuccessfulScan('PM2026-0003')}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono transition-colors"
          >
            PM2026-0003 (SIS Tersedia)
          </button>
          <button
            onClick={() => handleSuccessfulScan('PM2026-0013')}
            className="px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-blue-300 text-[11px] font-mono transition-colors"
          >
            PM2026-0013 (PPI Tersedia)
          </button>
          <button
            onClick={() => handleSuccessfulScan('PM2026-0014')}
            className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-[11px] font-mono transition-colors"
          >
            PM2026-0014 (Non-Member)
          </button>
          <button
            onClick={() => handleSuccessfulScan('INVALID-TICKET-999')}
            className="px-2.5 py-1 rounded-lg bg-yellow-950/40 hover:bg-yellow-900/50 border border-yellow-500/30 text-yellow-300 text-[11px] font-mono transition-colors"
          >
            Fake QR (Not Found)
          </button>
        </div>
      </div>

      {/* Live Toast Banner Notification */}
      {scanResult && scanResult.status !== 'IDLE' && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            scanResult.status === 'SUCCESS'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
              : scanResult.status === 'ALREADY_USED'
              ? 'bg-red-950/80 border-red-500/50 text-red-100'
              : 'bg-amber-950/80 border-amber-500/50 text-amber-100'
          }`}
        >
          {scanResult.status === 'SUCCESS' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {scanResult.status === 'ALREADY_USED' && (
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          {scanResult.status === 'NOT_FOUND' && (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm">
                {scanResult.status === 'SUCCESS'
                  ? 'Ticket Valid & Tersedia'
                  : scanResult.status === 'ALREADY_USED'
                  ? 'Peringatan: Tiket Sudah Terpakai!'
                  : 'Tiket Tidak Ditemukan'}
              </span>
              <span className="font-mono text-xs opacity-80">
                {scanResult.timestamp}
              </span>
            </div>
            <p className="text-xs mt-1 opacity-90">{scanResult.message}</p>
            {scanResult.checkedInAt && (
              <p className="text-xs mt-1 font-mono font-medium text-amber-300">
                Check-in sebelumnya: {scanResult.checkedInAt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
