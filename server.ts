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

// Configurable Google Sheet CSV URL (configured ONLY via code / environment variable)
// e.g.: "https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:csv&sheet=All%20Tickets"
const GOOGLE_SHEET_CSV_URL =
  process.env.GOOGLE_SHEET_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/19wpQ8x0ux3rUsOc4HjUi3xXW7ZldWWZntiVP_97iMJk/gviz/tq?tqx=out:csv&sheet=All%20Tickets';

// Optional Google Apps Script Webhook URL for real-time two-way sync
// (Set in .env or paste directly here once deployed from google_apps_script.js)
const GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxPDWieLAMlpKqAlwQefYqTtQ8AYhp1RGvjmeC-yWZgyVmqS7pSdM0_tuqp1FeNdNwg_g/exec';

// Asynchronously forward real-time write operations to Google Sheet Webhook if configured
async function forwardToGoogleSheet(payload: any) {
  if (!GOOGLE_SHEET_WEBHOOK_URL || !GOOGLE_SHEET_WEBHOOK_URL.startsWith('http')) {
    return;
  }
  try {
    const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[SHEETS SYNC] Forwarded ${payload.action} to Google Sheet Webhook (status: ${res.status}).`);
  } catch (err: any) {
    console.warn(`[SHEETS SYNC WARNING] Failed forwarding to Google Sheet Webhook:`, err?.message || err);
  }
}

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

export interface WalkInItem {
  category: 'PPI/SIS' | 'Reduced' | 'Adult';
  count: number;
  pricePerTicket: number;
}

export interface WalkInRegistration {
  id: string;
  nama: string;
  phone?: string;
  email?: string;
  items: WalkInItem[];
  totalTickets: number;
  totalCostSEK: number;
  createdAt: string;
  status: 'PENDING_PAYMENT' | 'APPROVED';
  orderId?: string;
  assignedTicketIds?: string[];
  approvedAt?: string;
}

const WALKIN_JSON_PATH = path.resolve(__dirname, 'walkin_registrations.json');
let walkInRegistrations: WalkInRegistration[] = [];

// Load walk-in registrations from disk if exists
try {
  if (fs.existsSync(WALKIN_JSON_PATH)) {
    const raw = fs.readFileSync(WALKIN_JSON_PATH, 'utf-8');
    walkInRegistrations = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[WALKIN] Failed to load walkin_registrations.json:', e);
}

function saveWalkInRegistrations() {
  try {
    fs.writeFileSync(WALKIN_JSON_PATH, JSON.stringify(walkInRegistrations, null, 2), 'utf-8');
  } catch (e) {
    console.error('[WALKIN] Failed to save walkin_registrations.json:', e);
  }
}

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

  // 1. Try Google Sheet if configured in code
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

// Helper: Calculate next PM2026-XXXX sequence number
function getNextTicketIdNumber(): number {
  let maxNum = 161; // base count from manifest
  for (const t of ticketsCache) {
    const id = t['ID Tiket'] || '';
    const match = id.match(/PM2026-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return maxNum + 1;
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
    syncSource: GOOGLE_SHEET_CSV_URL ? 'Google Sheet Live Sync' : 'Local Master Manifest',
    lastUpdated: new Date().toISOString()
  });
});

// POST /api/checkin: Validates ticket status and records check-in for a single ticket
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

  // Real-time synchronization to Google Sheet via Webhook if configured
  forwardToGoogleSheet({
    action: 'checkin',
    id_tiket: ticket['ID Tiket'],
    target_status: 'Terpakai',
    waktu_kedatangan: timeStr,
  });

  res.json({
    success: true,
    status: 'SUCCESS',
    message: `Attendee ${ticket['Nama'] || ticket['Nama Kapital']} checked in successfully.`,
    ticket,
    checked_in_at: timeStr
  });
});

// POST /api/checkin-batch: Checks in multiple tickets with the same identity
app.post('/api/checkin-batch', (req: Request, res: Response) => {
  const { id_tikets } = req.body || {};
  if (!Array.isArray(id_tikets) || id_tikets.length === 0) {
    res.status(400).json({ success: false, error: 'id_tikets array is required.' });
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
  const updatedTickets: TicketRecord[] = [];

  for (const rawId of id_tikets) {
    const cleanId = String(rawId).trim().toLowerCase();
    const ticket = ticketsCache.find(
      t => (t['ID Tiket'] || '').toLowerCase() === cleanId
    );
    if (ticket) {
      ticket['Status Tiket'] = 'Terpakai';
      ticket['Terpakai'] = 'Terpakai';
      if (!ticket['Waktu Kedatangan']) {
        ticket['Waktu Kedatangan'] = timeStr;
      }
      updatedTickets.push(ticket);
    }
  }

  saveTicketsToDisk();

  // Real-time batch synchronization to Google Sheet
  forwardToGoogleSheet({
    action: 'checkin_batch',
    id_tikets: updatedTickets.map(t => t['ID Tiket']),
    waktu_kedatangan: timeStr,
  });

  res.json({
    success: true,
    count: updatedTickets.length,
    tickets: updatedTickets,
    checked_in_at: timeStr
  });
});

// POST /api/attendees/add: Register new attendant (Name, Category, How many)
app.post('/api/attendees/add', (req: Request, res: Response) => {
  const { nama, kategori, jumlah, no_hp, email } = req.body || {};

  if (!nama || typeof nama !== 'string' || !nama.trim()) {
    res.status(400).json({ success: false, error: 'Attendee Name is required.' });
    return;
  }

  const count = Math.max(1, parseInt(jumlah || '1', 10));
  const categoryClean = (kategori || 'Non-Member').trim();
  const namaClean = nama.trim();
  const namaKapital = namaClean.toUpperCase();
  const now = new Date();
  const timestampStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;
  
  // Generate random order suffix e.g. ORD-W123
  const orderId = `ORD-WK${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  let startNum = getNextTicketIdNumber();
  const newTickets: TicketRecord[] = [];

  for (let i = 1; i <= count; i++) {
    const idTiket = `PM2026-${String(startNum).padStart(4, '0')}`;
    startNum++;

    const ticket: TicketRecord = {
      Timestamp: timestampStr,
      Nama: namaClean,
      Kategori: categoryClean,
      Email: email ? String(email).trim() : '',
      'No Hp': no_hp ? String(no_hp).trim() : '',
      Jumlah: String(count),
      'QR Code': `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${idTiket}`,
      'ID Tiket': idTiket,
      Counter: String(i),
      'Nama Kapital': namaKapital,
      Terpakai: 'Belum',
      'Status Pembayaran': 'Lunas',
      'Order ID': orderId,
      'Status Pengiriman WA': 'ON-SITE',
      'Merged Doc ID - Generate dan Kirim Tiket': '',
      'Merged Doc URL - Generate dan Kirim Tiket': '',
      'Link to merged Doc - Generate dan Kirim Tiket': `Tiket Pasar Malam 2026 - ${namaClean}`,
      'Document Merge Status - Generate dan Kirim Tiket': 'On-Site Gate Registration',
      'Status Tiket': 'Tersedia',
      'Waktu Kedatangan': ''
    };

    ticketsCache.push(ticket);
    newTickets.push(ticket);
  }

  saveTicketsToDisk();

  // Real-time synchronization to Google Sheet
  forwardToGoogleSheet({
    action: 'add_attendee',
    tickets: newTickets,
  });

  res.json({
    success: true,
    message: `Registered ${count} ticket(s) for ${namaClean}.`,
    orderId,
    tickets: newTickets
  });
});

// POST /api/attendees/update-ticket-id: Operator updates assigned ticket number(s)
app.post('/api/attendees/update-ticket-id', (req: Request, res: Response) => {
  const { updates, mark_as_checked_in } = req.body || {};
  // updates is array of { old_id: string, new_id: string }
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ success: false, error: 'Updates array required.' });
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
  const modified: TicketRecord[] = [];

  for (const item of updates) {
    const oldId = String(item.old_id || '').trim().toLowerCase();
    const newId = String(item.new_id || '').trim();

    if (!oldId || !newId) continue;

    const ticket = ticketsCache.find(
      t => (t['ID Tiket'] || '').toLowerCase() === oldId
    );

    if (ticket) {
      ticket['ID Tiket'] = newId;
      ticket['QR Code'] = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${newId}`;
      if (mark_as_checked_in) {
        ticket['Status Tiket'] = 'Terpakai';
        ticket['Terpakai'] = 'Terpakai';
        ticket['Waktu Kedatangan'] = timeStr;
      }
      modified.push(ticket);
    }
  }

  saveTicketsToDisk();

  // Sync update to Google Sheet
  if (modified.length > 0) {
    forwardToGoogleSheet({
      action: 'checkin_batch',
      id_tikets: modified.filter(m => m['Status Tiket'] === 'Terpakai').map(m => m['ID Tiket']),
      waktu_kedatangan: timeStr,
    });
  }

  res.json({
    success: true,
    message: `Updated ${modified.length} ticket number(s).`,
    tickets: modified
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

  const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });
  if (target_status === 'Tersedia') {
    ticket['Status Tiket'] = 'Tersedia';
    ticket['Terpakai'] = 'Belum';
    ticket['Waktu Kedatangan'] = '';
  } else {
    ticket['Status Tiket'] = 'Terpakai';
    ticket['Terpakai'] = 'Terpakai';
    ticket['Waktu Kedatangan'] = nowTime;
  }

  saveTicketsToDisk();

  forwardToGoogleSheet({
    action: 'toggle',
    id_tiket: ticket['ID Tiket'],
    target_status: ticket['Status Tiket'],
    waktu_kedatangan: ticket['Waktu Kedatangan'] || '',
  });
  res.json({ success: true, ticket });
});

// ==========================================
// WALKIN SELF-REGISTRATION & APPROVAL API
// ==========================================

// POST /api/walkin/register: Public endpoint for visitors at /register
app.post('/api/walkin/register', (req: Request, res: Response) => {
  const { nama, phone, email, items } = req.body || {};

  if (!nama || typeof nama !== 'string' || !nama.trim()) {
    res.status(400).json({ success: false, error: 'Nama pengunjung wajib diisi.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'Pilih minimal 1 kategori tiket.' });
    return;
  }

  const PRICING: Record<string, number> = {
    'PPI/SIS': 40,
    'Reduced': 50,
    'Adult': 90,
  };

  const parsedItems: WalkInItem[] = [];
  let totalTickets = 0;
  let totalCostSEK = 0;

  for (const it of items) {
    const cat = it.category;
    const count = Math.max(0, parseInt(it.count || '0', 10));
    if (count > 0 && PRICING[cat] !== undefined) {
      const price = PRICING[cat];
      parsedItems.push({
        category: cat,
        count,
        pricePerTicket: price,
      });
      totalTickets += count;
      totalCostSEK += count * price;
    }
  }

  if (totalTickets <= 0) {
    res.status(400).json({ success: false, error: 'Jumlah tiket harus lebih dari 0.' });
    return;
  }

  const now = new Date();
  const regId = `WI-${Date.now()}`;
  const record: WalkInRegistration = {
    id: regId,
    nama: nama.trim(),
    phone: phone ? String(phone).trim() : '',
    email: email ? String(email).trim() : '',
    items: parsedItems,
    totalTickets,
    totalCostSEK,
    createdAt: now.toISOString(),
    status: 'PENDING_PAYMENT',
  };

  walkInRegistrations.unshift(record);
  saveWalkInRegistrations();

  res.json({
    success: true,
    message: 'Registrasi walk-in berhasil diajukan.',
    registration: record,
  });
});

// GET /api/walkin/list: Get all walk-in submissions for admin panel
app.get('/api/walkin/list', (_req: Request, res: Response) => {
  res.json({
    success: true,
    registrations: walkInRegistrations,
    pendingCount: walkInRegistrations.filter(r => r.status === 'PENDING_PAYMENT').length,
    approvedCount: walkInRegistrations.filter(r => r.status === 'APPROVED').length,
  });
});

// POST /api/walkin/approve: Admin checks payment and assigns ticket IDs (bulk with custom or auto-increment)
app.post('/api/walkin/approve', (req: Request, res: Response) => {
  const { registrationId, customTicketIds, markAsCheckedIn } = req.body || {};

  const record = walkInRegistrations.find(r => r.id === registrationId);
  if (!record) {
    res.status(404).json({ success: false, error: 'Registrasi walk-in tidak ditemukan.' });
    return;
  }

  if (record.status === 'APPROVED') {
    res.status(400).json({ success: false, error: 'Registrasi ini sudah diverifikasi sebelumnya.' });
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
  const timestampStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;
  const orderId = `ORD-SWISH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Determine ticket IDs: use customTicketIds array if provided, otherwise auto-increment
  let startNum = getNextTicketIdNumber();
  const assignedIds: string[] = [];
  const createdTickets: TicketRecord[] = [];

  let ticketIndex = 1;
  for (const item of record.items) {
    // Map item category label to dataset Kategori
    let categoryLabel = 'Non-Member';
    if (item.category === 'PPI/SIS') categoryLabel = 'PPI/SIS Member';
    else if (item.category === 'Reduced') categoryLabel = 'Reduced (Child/Intl/Senior)';
    else categoryLabel = 'Adult (18-67)';

    for (let c = 0; c < item.count; c++) {
      let ticketId = '';
      if (Array.isArray(customTicketIds) && customTicketIds[assignedIds.length]) {
        ticketId = String(customTicketIds[assignedIds.length]).trim();
      } else {
        ticketId = `PM2026-${String(startNum).padStart(4, '0')}`;
        startNum++;
      }

      assignedIds.push(ticketId);

      const isCheckedIn = Boolean(markAsCheckedIn);
      const newTicket: TicketRecord = {
        Timestamp: timestampStr,
        Nama: record.nama,
        Kategori: categoryLabel,
        Email: record.email || '',
        'No Hp': record.phone || '',
        Jumlah: String(record.totalTickets),
        'QR Code': `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${ticketId}`,
        'ID Tiket': ticketId,
        Counter: String(ticketIndex),
        'Nama Kapital': record.nama.toUpperCase(),
        Terpakai: isCheckedIn ? 'Terpakai' : 'Belum',
        'Status Pembayaran': 'Lunas (Swish Walk-in)',
        'Order ID': orderId,
        'Status Pengiriman WA': 'ON-SITE-SWISH',
        'Merged Doc ID - Generate dan Kirim Tiket': '',
        'Merged Doc URL - Generate dan Kirim Tiket': '',
        'Link to merged Doc - Generate dan Kirim Tiket': `Tiket Pasar Malam 2026 - ${record.nama}`,
        'Document Merge Status - Generate dan Kirim Tiket': 'Swish Walk-In Verified',
        'Status Tiket': isCheckedIn ? 'Terpakai' : 'Tersedia',
        'Waktu Kedatangan': isCheckedIn ? timeStr : '',
      };

      createdTickets.push(newTicket);
      ticketsCache.push(newTicket);
      ticketIndex++;
    }
  }

  // Update record state
  record.status = 'APPROVED';
  record.orderId = orderId;
  record.assignedTicketIds = assignedIds;
  record.approvedAt = now.toISOString();

  saveWalkInRegistrations();
  saveTicketsToDisk();

  // Forward to Google Sheet
  forwardToGoogleSheet({
    action: 'add_attendee',
    tickets: createdTickets,
  });

  res.json({
    success: true,
    message: `Berhasil verifikasi pembayaran Swish dan menerbitkan ${assignedIds.length} tiket untuk ${record.nama}.`,
    registration: record,
    createdTickets,
  });
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

// POST /api/sync: Reloads / syncs from Google Sheet if configured in code or local disk
app.post('/api/sync', async (_req: Request, res: Response) => {
  const loaded = await loadTicketsData(true);
  res.json({
    success: true,
    total: loaded.length,
    syncSource: GOOGLE_SHEET_CSV_URL ? 'Google Sheet Live Sync' : 'Local Master Manifest'
  });
});

// POST /api/reset-demo: Reset all tickets back to original state for testing
app.post('/api/reset-demo', (_req: Request, res: Response) => {
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
