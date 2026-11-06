export interface Ticket {
  Timestamp?: string;
  Nama: string;
  Kategori: string;
  Email?: string;
  'No Hp'?: string;
  Jumlah?: string;
  'QR Code'?: string;
  'ID Tiket': string;
  Counter?: string;
  'Nama Kapital'?: string;
  Terpakai: string;
  'Status Pembayaran'?: string;
  'Order ID'?: string;
  'Status Pengiriman WA'?: string;
  'Merged Doc ID - Generate dan Kirim Tiket'?: string;
  'Merged Doc URL - Generate dan Kirim Tiket'?: string;
  'Link to merged Doc - Generate dan Kirim Tiket'?: string;
  'Document Merge Status - Generate dan Kirim Tiket'?: string;
  'Status Tiket': string;
  'Waktu Kedatangan'?: string;
}

export type ScanStatus = 'IDLE' | 'SUCCESS' | 'ALREADY_USED' | 'NOT_FOUND' | 'ERROR';

export interface ScanResult {
  status: ScanStatus;
  ticket?: Ticket;
  message?: string;
  scannedCode: string;
  timestamp: string;
  checkedInAt?: string;
}

export interface WalkInItem {
  category: 'PPI/SIS' | 'Reduced' | 'Adult';
  count: number;
  pricePerTicket: number;
}

export interface WalkInRegistration {
  id: string; // e.g. WI-1700000000000
  nama: string;
  phone?: string;
  email?: string;
  items: WalkInItem[];
  totalTickets: number;
  totalCostSEK: number;
  createdAt: string; // ISO or local formatted
  status: 'PENDING_PAYMENT' | 'APPROVED';
  orderId?: string;
  assignedTicketIds?: string[];
  approvedAt?: string;
}

export interface GateMetrics {
  total: number;
  checkedIn: number;
  remaining: number;
  ppi: { total: number; checkedIn: number };
  sis: { total: number; checkedIn: number };
  nonMember: { total: number; checkedIn: number };
  other: { total: number; checkedIn: number };
}
