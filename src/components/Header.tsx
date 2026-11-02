import React from 'react';
import { Download, RefreshCw, Volume2, VolumeX, ShieldCheck, Settings, Users } from 'lucide-react';
import { GateMetrics } from '../types';

interface HeaderProps {
  metrics: GateMetrics;
  soundEnabled: boolean;
  onToggleSound: () => void;
  syncSource: string;
  onOpenSyncModal: () => void;
  onExportCSV: () => void;
  isSyncing: boolean;
  onSyncNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  soundEnabled,
  onToggleSound,
  syncSource,
  onOpenSyncModal,
  onExportCSV,
  isSyncing,
  onSyncNow,
}) => {
  const percentCheckedIn = metrics.total > 0
    ? Math.round((metrics.checkedIn / metrics.total) * 100)
    : 0;

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 transition-all">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0 font-bold">
            <ShieldCheck className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Pasar Malam 2026
              </h1>
              <span className="text-[11px] font-medium tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md hidden xs:inline-block">
                GATE SCANNER
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <span>Gate Entrance Validation</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400 truncate max-w-[130px] sm:max-w-xs">{syncSource}</span>
            </p>
          </div>
        </div>

        {/* Quick Operational Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Scan Audio' : 'Unmute Scan Audio'}
            className={`min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            <span className="hidden md:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            title="Refresh / Sync Tickets Dataset"
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
          </button>

          <button
            onClick={onExportCSV}
            title="Export Checked-in Manifest as CSV"
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onOpenSyncModal}
            title="Gate & Google Sheet Sync Settings"
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Live Dashboard Strip & Breakdown */}
      <div className="bg-slate-950/60 border-t border-slate-800/60 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Main Counters */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-slate-800/80">
            <div className="pr-2">
              <span className="text-slate-400 text-[11px] block">Total Manifest</span>
              <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
                {metrics.total}
              </span>
            </div>
            <div className="px-2">
              <span className="text-emerald-400 text-[11px] block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Checked In
              </span>
              <span className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">
                {metrics.checkedIn}
              </span>
            </div>
            <div className="pl-2">
              <span className="text-amber-400 text-[11px] block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                Remaining
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
                {metrics.remaining}
              </span>
            </div>
          </div>

          {/* Progress Bar & Category Counts */}
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between mb-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Attendance Progress</span>
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {percentCheckedIn}% ({metrics.checkedIn}/{metrics.total})
              </span>
            </div>
            
            {/* Visual multi-segmented progress bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${percentCheckedIn}%` }}
                title={`${percentCheckedIn}% Checked In`}
              />
            </div>

            {/* Category breakdown (PPI: Blue, SIS: Green, Non-Member: Purple) */}
            <div className="flex items-center gap-3 sm:gap-4 mt-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span className="text-slate-400">PPI:</span>
                <span className="font-medium text-slate-200 tabular-nums">
                  {metrics.ppi.checkedIn}/{metrics.ppi.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-slate-400">SIS:</span>
                <span className="font-medium text-slate-200 tabular-nums">
                  {metrics.sis.checkedIn}/{metrics.sis.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                <span className="text-slate-400">Non-Member:</span>
                <span className="font-medium text-slate-200 tabular-nums">
                  {metrics.nonMember.checkedIn}/{metrics.nonMember.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
