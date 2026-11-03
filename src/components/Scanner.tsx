import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Search,
  UploadCloud,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FlipHorizontal,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { Ticket, ScanResult } from '../types';

interface ScannerProps {
  onScan: (scannedText: string) => void;
  allTickets: Ticket[];
  scanResult: ScanResult | null;
  autoCheckIn: boolean;
  onToggleAutoCheckIn: () => void;
  isProcessing: boolean;
  compactMode?: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({
  onScan,
  allTickets,
  scanResult,
  autoCheckIn,
  onToggleAutoCheckIn,
  isProcessing,
  compactMode = false,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  const handleSuccessfulScan = useCallback((text: string) => {
    const now = Date.now();
    const cleanText = text.trim();
    if (cleanText === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2200) {
      return;
    }
    lastScanTimeRef.current = now;
    lastScannedCodeRef.current = cleanText;
    onScan(cleanText);
  }, [onScan]);

  // Stop video stream and scanning loop
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Frame processing loop: Uses native BarcodeDetector if available, otherwise fast jsQR
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    if (!canvasRef.current) {
      canvasRef.current = canvas;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth > 0 && videoHeight > 0) {
      // 1. Try native hardware BarcodeDetector (iOS 17+ and modern Android)
      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      if (hasBarcodeDetector) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          detector.detect(video)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue || barcodes[0].displayValue;
                if (raw) handleSuccessfulScan(raw);
              }
            })
            .catch(() => {});
        } catch {}
      }

      // 2. jsQR software fallback for 100% universal support
      canvas.width = Math.min(videoWidth, 640);
      canvas.height = Math.min(videoHeight, 640 * (videoHeight / videoWidth));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            handleSuccessfulScan(code.data);
          }
        } catch {}
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [handleSuccessfulScan]);

  // Start mobile video stream
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment. Please use the "Snap Photo" button.');
      }

      // First attempt with facingMode ideal for mobile rear camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (firstErr: any) {
        console.warn('First camera attempt failed, trying basic fallback:', firstErr);
        // Fallback: request any available camera without specific constraints
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        await video.play();
      }

      setIsScanning(true);
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setIsScanning(false);
      setCameraError(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera permissions in your mobile browser settings, or use "Snap Photo".'
          : (err?.message || 'Could not access device camera. Please use the "Snap Photo" option.')
      );
    }
  };

  const flipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isScanning) {
      startCamera(nextFacing);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  // Decode QR code from file or camera snapshot
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError(null);
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(imageBitmap, 0, 0);

      // Try BarcodeDetector first
      let detected = false;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue || barcodes[0].displayValue;
            if (raw) {
              handleSuccessfulScan(raw);
              detected = true;
            }
          }
        } catch {}
      }

      if (!detected) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          handleSuccessfulScan(code.data);
          detected = true;
        }
      }

      if (!detected) {
        setCameraError('No QR Code found in the captured image. Please hold the ticket closer or in better light.');
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setCameraError('Unable to process image. Please try again.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Autocomplete search suggestions
  const filteredSuggestions = searchQuery.trim().length >= 1
    ? allTickets
        .filter(t => {
          const q = searchQuery.toLowerCase();
          return (
            (t['ID Tiket'] || '').toLowerCase().includes(q) ||
            (t['Nama'] || '').toLowerCase().includes(q) ||
            (t['Nama Kapital'] || '').toLowerCase().includes(q) ||
            (t['Order ID'] || '').toLowerCase().includes(q) ||
            (t['No Hp'] || '').includes(q)
          );
        })
        .slice(0, 6)
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-stone-500 pointer-events-none" />
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
            placeholder="Search Ticket ID, Attendee Name, or Order ID..."
            className="w-full bg-white border border-[#e2e0cf] focus:border-[#85362f] rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#85362f] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                handleSuccessfulScan(searchQuery.trim());
                setIsSearchFocused(false);
              }}
              className="absolute right-2 px-3 py-1 bg-[#85362f] hover:bg-[#702d27] text-white font-bold text-xs rounded-lg transition-colors"
            >
              Scan
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchFocused && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#e2e0cf] rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-stone-100">
            {filteredSuggestions.map((ticket) => {
              const isUsed = (ticket['Status Tiket'] || '').toLowerCase() === 'terpakai';
              return (
                <button
                  key={ticket['ID Tiket']}
                  onMouseDown={() => {
                    handleSuccessfulScan(ticket['ID Tiket']);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f8f8ec] flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#85362f]">
                        {ticket['ID Tiket']}
                      </span>
                      <span className="text-xs font-medium text-stone-900 truncate">
                        {ticket.Nama || ticket['Nama Kapital']}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2">
                      <span>{ticket.Kategori || 'Non-Member'}</span>
                      <span>·</span>
                      <span className="font-mono">{ticket['Order ID']}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                      isUsed
                        ? 'bg-[#85362f]/10 text-[#85362f] border border-[#85362f]/20'
                        : 'bg-[#177f6b]/10 text-[#177f6b] border border-[#177f6b]/20'
                    }`}
                  >
                    {isUsed ? 'Terpakai' : 'Tersedia'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Camera Viewport Container */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-900 border border-[#e2e0cf] shadow-md">
        <div className="relative w-full aspect-square max-h-[380px] sm:max-h-[420px] mx-auto flex items-center justify-center bg-stone-950 overflow-hidden">
          {/* Native HTML5 Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isScanning ? 'hidden' : 'block'}`}
          />

          {/* Idle Camera Placeholder */}
          {!isScanning && (
            <div className="flex flex-col items-center justify-center p-6 text-center z-10 w-full">
              <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-[#fcc844] mb-3 shadow-lg">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">
                Live QR Gate Scanner
              </h3>
              <p className="text-xs text-stone-300 max-w-xs mt-1 mb-4 leading-relaxed">
                Direct camera scanning for smartphones. If live camera permission is restricted, tap &quot;Snap Photo&quot; to scan with your phone camera.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => startCamera('environment')}
                  className="px-5 py-2.5 bg-[#fcc844] hover:bg-[#ebd539] text-stone-900 font-bold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4 text-stone-900" />
                  <span>Start Live Camera</span>
                </button>

                {/* Mobile Direct Camera Capture Snapshot Input */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileScan}
                  className="hidden"
                />
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#177f6b] hover:bg-[#136a59] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                  title="Take photo directly using your phone's camera"
                >
                  <UploadCloud className="w-4 h-4 text-[#fcc844]" />
                  <span>Snap Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Live Reticle Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[230px] h-[230px] sm:w-[260px] sm:h-[260px] rounded-2xl border-2 border-[#fcc844]/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#fcc844] rounded-tl-lg"></span>
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#fcc844] rounded-tr-lg"></span>
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#fcc844] rounded-bl-lg"></span>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#fcc844] rounded-br-lg"></span>

                {/* Animated Laser Scanning Beam */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#fcc844] to-transparent shadow-[0_0_12px_rgba(252,200,68,0.9)] animate-scan-laser" />

                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <span className="text-[10px] font-bold text-stone-900 bg-[#fcc844] px-2.5 py-0.5 rounded-full shadow-sm">
                    Hold QR code inside frame
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner if camera failed */}
          {cameraError && (
            <div className="absolute inset-x-3 top-3 z-30 p-3.5 bg-white border border-[#85362f]/40 rounded-xl text-stone-900 text-xs shadow-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#85362f] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-[#85362f]">Camera Notice</p>
                <p className="text-[11px] text-stone-700 mt-0.5 leading-relaxed">{cameraError}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => startCamera()}
                    className="px-2.5 py-1 bg-[#85362f] hover:bg-[#702d27] rounded text-[11px] font-bold text-white transition-colors"
                  >
                    Retry Live Camera
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-2.5 py-1 bg-[#177f6b] hover:bg-[#136a59] rounded text-[11px] font-bold text-white transition-colors"
                  >
                    Use Snap Photo
                  </button>
                </div>
              </div>
              <button onClick={() => setCameraError(null)} className="text-stone-400 hover:text-stone-700 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Active Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-sm z-30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 p-4 bg-white border border-[#e2e0cf] rounded-2xl shadow-xl">
                <div className="w-8 h-8 border-3 border-[#85362f] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-stone-900">Validating Ticket...</span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Control Footer Bar */}
        <div className="p-2.5 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {isScanning ? (
              <button
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-lg bg-[#85362f]/20 hover:bg-[#85362f]/30 text-[#fcc844] border border-[#85362f]/40 font-bold flex items-center gap-1.5 transition-colors"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={() => startCamera()}
                className="px-3 py-1.5 rounded-lg bg-[#fcc844] hover:bg-[#ebd539] text-stone-900 font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            )}

            {isScanning && (
              <button
                onClick={flipCamera}
                title="Switch Front / Rear Camera"
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1 transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-[#fcc844]" />
                <span className="text-[11px]">{facingMode === 'environment' ? 'Rear' : 'Front'}</span>
              </button>
            )}

            {isScanning && hasTorch && (
              <button
                onClick={toggleTorch}
                title="Toggle Torch Light"
                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                  torchOn
                    ? 'bg-[#fcc844] text-stone-900 border-[#fcc844] font-bold'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                }`}
              >
                {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Photo from gallery */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileScan}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Pick QR image from phone album"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1 transition-colors text-[11px]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
              <span>Gallery</span>
            </button>
          </div>

          {/* Auto Check-In Mode Switch */}
          <button
            onClick={onToggleAutoCheckIn}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              autoCheckIn
                ? 'bg-[#177f6b]/20 border-[#177f6b]/40 text-[#177f6b]'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoCheckIn ? 'bg-[#177f6b] animate-pulse' : 'bg-stone-500'
              }`}
            />
            <span>{autoCheckIn ? 'Auto Check: ON' : 'Inspect Mode'}</span>
          </button>
        </div>
      </div>

      {/* Live Toast Banner Notification */}
      {scanResult && scanResult.status !== 'IDLE' && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all text-xs shadow-md ${
            scanResult.status === 'SUCCESS'
              ? 'bg-[#177f6b]/15 border-[#177f6b]/40 text-[#177f6b]'
              : scanResult.status === 'ALREADY_USED'
              ? 'bg-[#85362f]/15 border-[#85362f]/40 text-[#85362f]'
              : 'bg-[#fcc844]/20 border-[#fcc844]/60 text-stone-800'
          }`}
        >
          {scanResult.status === 'SUCCESS' && (
            <CheckCircle2 className="w-4 h-4 text-[#177f6b] shrink-0 mt-0.5" />
          )}
          {scanResult.status === 'ALREADY_USED' && (
            <XCircle className="w-4 h-4 text-[#85362f] shrink-0 mt-0.5" />
          )}
          {scanResult.status === 'NOT_FOUND' && (
            <AlertTriangle className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs">
                {scanResult.status === 'SUCCESS'
                  ? 'Ticket Valid & Tersedia'
                  : scanResult.status === 'ALREADY_USED'
                  ? 'Tiket Sudah Terpakai!'
                  : 'Tiket Tidak Ditemukan'}
              </span>
              <span className="font-mono text-[10px] opacity-80">
                {scanResult.timestamp}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 text-stone-800 font-medium">{scanResult.message}</p>
            {scanResult.checkedInAt && (
              <p className="text-[11px] mt-0.5 font-mono font-bold text-[#85362f]">
                Check-in: {scanResult.checkedInAt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
