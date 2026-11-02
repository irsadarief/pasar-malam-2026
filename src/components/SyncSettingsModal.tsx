import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  X,
} from 'lucide-react';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleSheetUrl: string;
  onSaveGoogleSheetUrl: (url: string) => Promise<void>;
  onExportCSV: () => void;
  onResetManifest: () => Promise<void>;
  syncSource: string;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  googleSheetUrl,
  onSaveGoogleSheetUrl,
  onExportCSV,
  onResetManifest,
  syncSource,
}) => {
  const [urlInput, setUrlInput] = useState<string>(googleSheetUrl);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setUrlInput(googleSheetUrl);
  }, [googleSheetUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSaveGoogleSheetUrl(urlInput.trim());
      setSaveMessage('Google Sheet URL saved & live registry synced successfully!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (e: any) {
      setSaveMessage(e?.message || 'Error syncing from Google Sheet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-5 sm:p-6 text-slate-100 focus:outline-none max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <Dialog.Title className="text-base sm:text-lg font-bold">
                Gate Data & Sheet Sync
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 py-4 text-xs">
            {/* Current Sync Status Card */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Active Data Source</span>
                <span className="font-semibold text-slate-200 text-sm">
                  {syncSource}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online & Ready
              </span>
            </div>

            {/* Google Sheet URL Configuration */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Published Google Sheet CSV Export URL:
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../gviz/tq?tqx=out:csv&sheet=All%20Tickets"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty to use local fallback <span className="font-mono text-amber-400">All_Ticket_011126.csv</span>.
              </p>
            </div>

            {/* How to publish Google Sheet Guide */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                How to obtain the live CSV URL from Google Sheets:
              </span>
              <p>1. Open your ticket master Google Sheet.</p>
              <p>2. Click <strong>File → Share → Publish to web</strong>.</p>
              <p>3. Select sheet &quot;All Tickets&quot; and format as <strong>Comma-separated values (.csv)</strong>.</p>
              <p>4. Paste the published CSV link above and click Save &amp; Sync.</p>
            </div>

            {saveMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            {/* Export & Reset Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onExportCSV}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Updated CSV</span>
              </button>

              <button
                onClick={onResetManifest}
                className="py-2 px-3 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-300 border border-red-500/30 font-medium flex items-center justify-center gap-1.5 transition-colors"
                title="Reset attendee status back to initial event manifest"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Manifest</span>
              </button>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Dialog.Close asChild>
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save &amp; Sync Now</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
