import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// File paths
const LOCAL_CSV_PATH = path.resolve(__dirname, 'All_Ticket_011126.csv');
const PUBLIC_CSV_PATH = path.resolve(__dirname, 'public', 'All_Ticket_011126.csv');

// Dynamic Google Sheet CSV URL (can also be updated at runtime via settings modal)
let GOOGLE_SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL || '';

export interface TicketRecord {
  'Timestamp'?: string;
  'Nama': string;
  'Kategori': string;
  'Email'?: string;
  'No Hp'?: string;
  'Jumlah'?: string;
  'QR Code'?: string;
  'ID Tiket': string;
  'Counter'?: string;
  'Nama Kapital'?: string;
  'Terpakai': string;
  'Status Pembayaran'?: string;
  'Order ID'?: string;
  'Status Pengiriman WA'?: string;
  'Merged Doc ID - Generate dan Kirim Tiket'?: string;
  'Merged Doc URL - Generate dan Kirim Tiket'?: string;
  'Link to merged Doc - Generate dan Kirim Tiket'?: string;
  'Document Merge Status - Generate dan Kirim Tiket'?: string;
  'Status Tiket': string;
  'Waktu Kedatangan'?: string;
  [key: string]: any;
}

let ticketsCache: TicketRecord[] = [];
let csvHeaders: string[] = [];

// Helper: Parse CSV with robust RFC 4180 handling for quoted fields with commas/newlines
function parseCSV(text: string): { headers: string[]; records: TicketRecord[] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.some(col => col.trim() !== '')) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some(col => col.trim() !== '')) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], records: [] };

  const rawHeaders = lines[0].map(h => h.trim());
  const records: TicketRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const obj: any = {};
    for (let h = 0; h < rawHeaders.length; h++) {
      obj[rawHeaders[h]] = (row[h] !== undefined ? row[h].trim() : '');
    }
    if (obj['ID Tiket'] || obj['Nama']) {
      records.push(obj as TicketRecord);
    }
  }

  return { headers: rawHeaders, records };
}

// Helper: Format records back to CSV
function recordsToCSV(records: TicketRecord[], headers: string[]): string {
  if (!records.length) return '';
  const cols = headers.length > 0 ? headers : Object.keys(records[0]);
  
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = cols.map(escapeCell).join(',');
  const rowLines = records.map(rec => cols.map(c => escapeCell(rec[c] || '')).join(','));

  return [headerLine, ...rowLines].join('\n');
}

// Load tickets from remote Google Sheet or local file fallback
async function loadTicketsData(forceRemote = false): Promise<TicketRecord[]> {
  let loadedFromRemote = false;

  // 1. Try Google Sheet if configured
  if (GOOGLE_SHEET_CSV_URL && GOOGLE_SHEET_CSV_URL.startsWith('http')) {
    try {
      const response = await fetch(GOOGLE_SHEET_CSV_URL, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const text = await response.text();
        const parsed = parseCSV(text);
        if (parsed.records.length > 0) {
          csvHeaders = parsed.headers;
          ticketsCache = parsed.records;
          loadedFromRemote = true;
          console.log(`[SYNC] Loaded ${ticketsCache.length} tickets from Google Sheet.`);
        }
      }
    } catch (err: any) {
      console.warn(`[SYNC] Could not fetch Google Sheet, falling back to local CSV:`, err?.message || err);
    }
  }

  // 2. Fallback to local CSV file
  if (!loadedFromRemote && (!ticketsCache.length || forceRemote)) {
    const csvPathToTry = fs.existsSync(LOCAL_CSV_PATH)
      ? LOCAL_CSV_PATH
      : (fs.existsSync(PUBLIC_CSV_PATH) ? PUBLIC_CSV_PATH : null);

    if (csvPathToTry) {
      try {
        const content = fs.readFileSync(csvPathToTry, 'utf-8');
        const parsed = parseCSV(content);
        csvHeaders = parsed.headers;
        ticketsCache = parsed.records;
        console.log(`[STORAGE] Loaded ${ticketsCache.length} tickets from local CSV (${csvPathToTry}).`);
      } catch (err) {
        console.error(`[STORAGE ERROR] Failed reading local CSV:`, err);
      }
    }
  }

  return ticketsCache;
}

// Persist in-memory updates to disk
function saveTicketsToDisk() {
  try {
    const csvContent = recordsToCSV(ticketsCache, csvHeaders);
    if (LOCAL_CSV_PATH) {
      fs.writeFileSync(LOCAL_CSV_PATH, csvContent, 'utf-8');
    }
    if (fs.existsSync(path.dirname(PUBLIC_CSV_PATH))) {
      fs.writeFileSync(PUBLIC_CSV_PATH, csvContent, 'utf-8');
    }
  } catch (err) {
    console.error('[STORAGE SAVE ERROR]', err);
  }
}

// Initial dataset load
loadTicketsData();

// ==========================================
// API ENDPOINTS
// ==========================================

// GET /api/tickets: Fetches live records
app.get('/api/tickets', async (_req: Request, res: Response) => {
  if (ticketsCache.length === 0) {
    await loadTicketsData();
  }
  res.json({
    tickets: ticketsCache,
    total: ticketsCache.length,
    syncSource: GOOGLE_SHEET_CSV_URL ? 'Google Sheet Live Sync' : 'Local Master File',
    googleSheetUrl: GOOGLE_SHEET_CSV_URL,
    lastUpdated: new Date().toISOString()
  });
});

// POST /api/checkin: Validates ticket status and records check-in
app.post('/api/checkin', (req: Request, res: Response) => {
  const { id_tiket } = req.body || {};
  if (!id_tiket || typeof id_tiket !== 'string') {
    res.status(400).json({ success: false, error: 'ID Tiket is required.' });
    return;
  }

  const cleanId = id_tiket.trim();
  const ticket = ticketsCache.find(
    t => (t['ID Tiket'] || '').toLowerCase() === cleanId.toLowerCase()
  );

  if (!ticket) {
    res.status(404).json({
      success: false,
      status: 'NOT_FOUND',
      error: `Ticket '${cleanId}' was not found in the registry.`
    });
    return;
  }

  const statusTiket = (ticket['Status Tiket'] || '').toLowerCase();
  const terpakai = (ticket['Terpakai'] || '').toLowerCase();
  const isUsed = statusTiket === 'terpakai' || terpakai === 'terpakai';

  if (isUsed) {
    res.status(409).json({
      success: false,
      status: 'ALREADY_USED',
      message: 'Ticket has already been scanned and checked in.',
      ticket,
      checked_in_at: ticket['Waktu Kedatangan'] || 'Previously checked in'
    });
    return;
  }

  // Format current local time HH:MM:SS
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });

  // Update record fields
  ticket['Status Tiket'] = 'Terpakai';
  ticket['Terpakai'] = 'Terpakai';
  ticket['Waktu Kedatangan'] = timeStr;

  saveTicketsToDisk();

  res.json({
    success: true,
    status: 'SUCCESS',
    message: `Attendee ${ticket['Nama'] || ticket['Nama Kapital']} checked in successfully.`,
    ticket,
    checked_in_at: timeStr
  });
});

// POST /api/manual-toggle: Gate staff manual override
app.post('/api/manual-toggle', (req: Request, res: Response) => {
  const { id_tiket, target_status } = req.body || {};
  if (!id_tiket) {
    res.status(400).json({ success: false, error: 'ID Tiket required.' });
    return;
  }

  const ticket = ticketsCache.find(
    t => (t['ID Tiket'] || '').toLowerCase() === String(id_tiket).trim().toLowerCase()
  );

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found.' });
    return;
  }

  if (target_status === 'Tersedia') {
    ticket['Status Tiket'] = 'Tersedia';
    ticket['Terpakai'] = 'Belum';
    ticket['Waktu Kedatangan'] = '';
  } else {
    ticket['Status Tiket'] = 'Terpakai';
    ticket['Terpakai'] = 'Terpakai';
    ticket['Waktu Kedatangan'] = new Date().toLocaleTimeString('id-ID', { hour12: false });
  }

  saveTicketsToDisk();
  res.json({ success: true, ticket });
});

// GET /api/export: Generates and downloads current checked-in dataset as CSV
app.get('/api/export', (_req: Request, res: Response) => {
  if (ticketsCache.length === 0) {
    res.status(404).send('No ticket data loaded');
    return;
  }

  const csvOutput = recordsToCSV(ticketsCache, csvHeaders);
  const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `PasarMalam2026_Checkin_Export_${nowStr}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvOutput);
});

// POST /api/sync: Force sync from remote or reload local CSV
app.post('/api/sync', async (req: Request, res: Response) => {
  const newUrl = req.body?.googleSheetUrl;
  if (typeof newUrl === 'string') {
    GOOGLE_SHEET_CSV_URL = newUrl.trim();
  }
  const loaded = await loadTicketsData(true);
  res.json({
    success: true,
    total: loaded.length,
    syncSource: GOOGLE_SHEET_CSV_URL ? 'Google Sheet Live Sync' : 'Local Master File',
    googleSheetUrl: GOOGLE_SHEET_CSV_URL
  });
});

// POST /api/reset-demo: Reset all tickets back to original state for testing
app.post('/api/reset-demo', (_req: Request, res: Response) => {
  // Reload from original attachment
  const originalPath = path.resolve(__dirname, 'public', 'assets', 'aistudio', 'All_Ticket_011126_bdc9b2ac');
  if (fs.existsSync(originalPath)) {
    const content = fs.readFileSync(originalPath, 'utf-8');
    const parsed = parseCSV(content);
    csvHeaders = parsed.headers;
    ticketsCache = parsed.records;
    saveTicketsToDisk();
  }
  res.json({ success: true, message: 'Registry reset to initial event manifest.', count: ticketsCache.length });
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Pasar Malam 2026 Gate Scanner] Running at http://localhost:${PORT}`);
  });
}

startServer();
