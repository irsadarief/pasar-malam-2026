import React from 'react';
import {
  Download,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { GateMetrics } from '../types';

interface HeaderProps {
  metrics: GateMetrics;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  syncSource: string;
  onExportCSV: () => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  onOpenAddAttendee: () => void;
  interfaceMode: 'mobile' | 'desktop';
  onToggleInterfaceMode: (mode: 'mobile' | 'desktop') => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  syncSource,
  onExportCSV,
  isSyncing,
  onSyncNow,
  onOpenAddAttendee,
  interfaceMode,
  onToggleInterfaceMode,
}) => {
  return (
    <header className="border-b border-[#e2e0cf] bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-13 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-10 flex items-center justify-center shrink-0">
            <img
              src="/assets/aistudio/LED_Template__1__3621e6db.png"
              alt="Pasar Malam 2026 Logo"
              className="h-10 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight whitespace-nowrap">
                Pasar Malam 2026
              </span>
              <span className="text-[10px] uppercase font-bold text-[#85362f] bg-[#85362f]/10 px-1.5 py-0.2 rounded hidden xs:inline-block">
                GATE
              </span>
            </div>
            <div className="text-[10px] text-stone-500 font-semibold tracking-wider uppercase hidden sm:block">
              The Sundanese
            </div>
          </div>
        </div>

        {/* Central Compact Metrics */}
        <div className="hidden sm:flex items-center gap-3 text-xs bg-[#f8f8ec] border border-[#e2e0cf] px-3 py-1 rounded-full text-stone-600 font-mono shadow-inner">
          <span>
            <strong className="text-stone-900 tabular-nums">{metrics.total}</strong> Total
          </span>
          <span className="text-stone-300">·</span>
          <span>
            <strong className="text-[#177f6b] tabular-nums font-bold">{metrics.checkedIn}</strong> In
          </span>
          <span className="text-stone-300">·</span>
          <span>
            <strong className="text-[#85362f] tabular-nums font-bold">{metrics.remaining}</strong> Left
          </span>
        </div>

        {/* Action Controls & Mode Switch */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Interface Mode Switcher: Mobile Scanner vs Desktop Console */}
          <div className="flex items-center bg-[#f8f8ec] p-0.5 rounded-lg border border-[#e2e0cf]">
            <button
              onClick={() => onToggleInterfaceMode('mobile')}
              title="Mobile Scanner Interface"
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                interfaceMode === 'mobile'
                  ? 'bg-[#85362f] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
            <button
              onClick={() => onToggleInterfaceMode('desktop')}
              title="Desktop Command Console"
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                interfaceMode === 'desktop'
                  ? 'bg-[#85362f] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </button>
          </div>

          {/* + Add Attendee Button */}
          <button
            onClick={onOpenAddAttendee}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#177f6b] hover:bg-[#136a59] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            title="Register new walk-in attendee"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Add Attendee</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            title={`Sync dataset (${syncSource})`}
            className="w-8 h-8 rounded-lg bg-white hover:bg-[#f8f8ec] border border-[#e2e0cf] text-stone-700 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#177f6b] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export CSV button */}
          <button
            onClick={onExportCSV}
            title="Download Updated CSV Manifest"
            className="w-8 h-8 rounded-lg bg-[#fcc844] hover:bg-[#ebd539] text-stone-900 flex items-center justify-center transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
