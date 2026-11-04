"""
Pasar Malam 2026 Gate Scanner - Flask Backend
Event Gate Check-in & QR Ticket Validation System

Endpoints:
  GET  /                          - Serves the Single Page Application index
  GET  /api/tickets               - Fetches ticket dataset (Google Sheet CSV or local fallback)
  POST /api/checkin               - Validates and checks in attendee by id_tiket
  POST /api/checkin-batch         - Validates and checks in group of tickets by id_tikets
  POST /api/attendees/add         - Registers on-site walk-in attendee
  POST /api/attendees/update-ticket-id - Operator updates ticket numbers
  GET  /api/export                - Generates & downloads current updated CSV dataset
  POST /api/sync                  - Forces a re-fetch from the configured Google Sheet CSV URL
"""

import os
import csv
import io
import random
import string
from datetime import datetime
from flask import Flask, jsonify, request, send_file, send_from_directory

# ==============================================================================
# CONFIGURATION
# Set your published Google Sheet CSV Export URL below in CODE (not via UI):
# e.g.: "https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:csv&sheet=All%20Tickets"
# ==============================================================================
GOOGLE_SHEET_CSV_URL = os.environ.get(
    "GOOGLE_SHEET_CSV_URL",
    "https://docs.google.com/spreadsheets/d/19wpQ8x0ux3rUsOc4HjUi3xXW7ZldWWZntiVP_97iMJk/gviz/tq?tqx=out:csv&sheet=All%20Tickets"
)
GOOGLE_SHEET_WEBHOOK_URL = os.environ.get("GOOGLE_SHEET_WEBHOOK_URL", "")
LOCAL_CSV_PATH = os.path.join(os.path.dirname(__file__), "All_Ticket_011126.csv")
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "dist")

def forward_to_google_sheet(payload):
    """Sends asynchronous/background update to Google Apps Script Webhook if configured."""
    if not GOOGLE_SHEET_WEBHOOK_URL or not GOOGLE_SHEET_WEBHOOK_URL.startswith("http"):
        return
    try:
        import requests
        requests.post(GOOGLE_SHEET_WEBHOOK_URL, json=payload, timeout=3)
    except Exception as e:
        print(f"[SHEETS SYNC WARNING] Failed forwarding to Google Sheet: {e}")

app = Flask(__name__, static_folder=STATIC_FOLDER if os.path.exists(STATIC_FOLDER) else "static")

# In-memory ticket storage & cache
tickets_cache = []
tickets_by_id = {}
fieldnames = []

def parse_csv_stream(csv_text):
    """Parses raw CSV string into list of dicts while preserving column headers."""
    global fieldnames
    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    records = []
    for row in reader:
        records.append(dict(row))
    return records

def load_data():
    """Loads tickets from Google Sheet CSV or falls back to local CSV."""
    global tickets_cache, tickets_by_id
    records = []

    # 1. Remote fetch if Google Sheet URL is set in code
    if GOOGLE_SHEET_CSV_URL and GOOGLE_SHEET_CSV_URL.strip().startswith("http"):
        try:
            import requests
            resp = requests.get(GOOGLE_SHEET_CSV_URL.strip(), timeout=8)
            if resp.status_code == 200 and resp.text:
                records = parse_csv_stream(resp.text)
                print(f"[SYNC] Successfully loaded {len(records)} tickets from Google Sheet.")
        except Exception as e:
            print(f"[SYNC WARNING] Failed fetching Google Sheet, using local fallback: {e}")

    # 2. Local fallback if remote failed or not configured
    if not records and os.path.exists(LOCAL_CSV_PATH):
        try:
            with open(LOCAL_CSV_PATH, mode="r", encoding="utf-8") as f:
                records = parse_csv_stream(f.read())
            print(f"[FALLBACK] Loaded {len(records)} tickets from local CSV: {LOCAL_CSV_PATH}")
        except Exception as e:
            print(f"[ERROR] Could not load local CSV: {e}")

    tickets_cache = records
    tickets_by_id = {row.get("ID Tiket", "").strip().lower(): row for row in tickets_cache if row.get("ID Tiket")}
    return tickets_cache

def save_local_tickets():
    """Writes updated dataset back to local CSV."""
    if not tickets_cache or not fieldnames:
        return
    try:
        with open(LOCAL_CSV_PATH, mode="w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(tickets_cache)
    except Exception as e:
        print(f"[SAVE ERROR] Could not persist local CSV: {e}")

def get_next_ticket_number():
    max_num = 161
    for t in tickets_cache:
        raw_id = t.get("ID Tiket", "")
        if "PM2026-" in raw_id:
            try:
                num = int(raw_id.split("PM2026-")[-1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return max_num + 1

load_data()

@app.route("/")
def index():
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({
        "message": "Pasar Malam 2026 Gate Scanner API running.",
        "endpoints": ["/api/tickets", "/api/checkin", "/api/checkin-batch", "/api/attendees/add", "/api/export"]
    })

@app.route("/<path:path>")
def static_proxy(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    if not tickets_cache:
        load_data()
    return jsonify({
        "tickets": tickets_cache,
        "total": len(tickets_cache),
        "syncSource": "Google Sheet Live Sync" if GOOGLE_SHEET_CSV_URL else "Local Master Manifest",
        "lastUpdated": datetime.now().isoformat()
    })

@app.route("/api/checkin", methods=["POST"])
def checkin():
    data = request.get_json(force=True, silent=True) or {}
    id_tiket = data.get("id_tiket", "").strip()

    if not id_tiket:
        return jsonify({"success": False, "error": "ID Tiket is required."}), 400

    ticket = tickets_by_id.get(id_tiket.lower())
    if not ticket:
        return jsonify({
            "success": False,
            "status": "NOT_FOUND",
            "error": f"Ticket '{id_tiket}' was not found in registry."
        }), 404

    current_status = ticket.get("Status Tiket", "").strip().lower()
    is_used = ticket.get("Terpakai", "").strip().lower() == "terpakai" or current_status == "terpakai"

    if is_used:
        return jsonify({
            "success": False,
            "status": "ALREADY_USED",
            "message": "Ticket has already been used.",
            "ticket": ticket,
            "checked_in_at": ticket.get("Waktu Kedatangan", "")
        }), 409

    now_str = datetime.now().strftime("%H:%M:%S")
    ticket["Status Tiket"] = "Terpakai"
    ticket["Terpakai"] = "Terpakai"
    ticket["Waktu Kedatangan"] = now_str

    save_local_tickets()

    forward_to_google_sheet({
        "action": "checkin",
        "id_tiket": ticket.get("ID Tiket"),
        "target_status": "Terpakai",
        "waktu_kedatangan": now_str
    })

    return jsonify({
        "success": True,
        "status": "SUCCESS",
        "message": f"Successfully checked in {ticket.get('Nama', 'Attendee')}.",
        "ticket": ticket,
        "checked_in_at": now_str
    })

@app.route("/api/checkin-batch", methods=["POST"])
def checkin_batch():
    data = request.get_json(force=True, silent=True) or {}
    id_tikets = data.get("id_tikets", [])
    if not isinstance(id_tikets, list) or not id_tikets:
        return jsonify({"success": False, "error": "id_tikets array required"}), 400

    now_str = datetime.now().strftime("%H:%M:%S")
    updated = []

    for raw_id in id_tikets:
        t = tickets_by_id.get(str(raw_id).strip().lower())
        if t:
            t["Status Tiket"] = "Terpakai"
            t["Terpakai"] = "Terpakai"
            if not t.get("Waktu Kedatangan"):
                t["Waktu Kedatangan"] = now_str
            updated.append(t)

    save_local_tickets()

    forward_to_google_sheet({
        "action": "checkin_batch",
        "id_tikets": [t.get("ID Tiket") for t in updated if t.get("ID Tiket")],
        "waktu_kedatangan": now_str
    })

    return jsonify({
        "success": True,
        "count": len(updated),
        "tickets": updated,
        "checked_in_at": now_str
    })

@app.route("/api/attendees/add", methods=["POST"])
def add_attendee():
    data = request.get_json(force=True, silent=True) or {}
    nama = (data.get("nama") or "").strip()
    kategori = (data.get("kategori") or "Non-Member").strip()
    jumlah = max(1, int(data.get("jumlah") or 1))
    email = (data.get("email") or "").strip()
    no_hp = (data.get("no_hp") or "").strip()

    if not nama:
        return jsonify({"success": False, "error": "Nama is required"}), 400

    now = datetime.now()
    timestamp_str = now.strftime("%m/%d/%Y %H:%M:%S")
    random_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    order_id = f"ORD-WK{random_suffix}"

    start_num = get_next_ticket_number()
    created = []

    for i in range(1, jumlah + 1):
        id_tiket = f"PM2026-{str(start_num).zfill(4)}"
        start_num += 1

        rec = {
            "Timestamp": timestamp_str,
            "Nama": nama,
            "Kategori": kategori,
            "Email": email,
            "No Hp": no_hp,
            "Jumlah": str(jumlah),
            "QR Code": f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={id_tiket}",
            "ID Tiket": id_tiket,
            "Counter": str(i),
            "Nama Kapital": nama.upper(),
            "Terpakai": "Belum",
            "Status Pembayaran": "Lunas",
            "Order ID": order_id,
            "Status Pengiriman WA": "ON-SITE",
            "Merged Doc ID - Generate dan Kirim Tiket": "",
            "Merged Doc URL - Generate dan Kirim Tiket": "",
            "Link to merged Doc - Generate dan Kirim Tiket": f"Tiket Pasar Malam 2026 - {nama}",
            "Document Merge Status - Generate dan Kirim Tiket": "On-Site Registration",
            "Status Tiket": "Tersedia",
            "Waktu Kedatangan": ""
        }
        tickets_cache.append(rec)
        tickets_by_id[id_tiket.lower()] = rec
        created.append(rec)

    save_local_tickets()

    forward_to_google_sheet({
        "action": "add_attendee",
        "tickets": created
    })

    return jsonify({
        "success": True,
        "message": f"Registered {jumlah} tickets for {nama}.",
        "orderId": order_id,
        "tickets": created
    })

@app.route("/api/attendees/update-ticket-id", methods=["POST"])
def update_ticket_id():
    data = request.get_json(force=True, silent=True) or {}
    updates = data.get("updates", [])
    mark_as_checked_in = bool(data.get("mark_as_checked_in", False))

    now_str = datetime.now().strftime("%H:%M:%S")
    modified = []

    for item in updates:
        old_id = str(item.get("old_id", "")).strip().lower()
        new_id = str(item.get("new_id", "")).strip()
        if not old_id or not new_id:
            continue

        t = tickets_by_id.get(old_id)
        if t:
            # remove old map key
            del tickets_by_id[old_id]
            t["ID Tiket"] = new_id
            t["QR Code"] = f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={new_id}"
            if mark_as_checked_in:
                t["Status Tiket"] = "Terpakai"
                t["Terpakai"] = "Terpakai"
                t["Waktu Kedatangan"] = now_str
            tickets_by_id[new_id.lower()] = t
            modified.append(t)

    save_local_tickets()
    return jsonify({"success": True, "tickets": modified})

@app.route("/api/export", methods=["GET"])
def export_csv():
    if not tickets_cache:
        load_data()
    output = io.StringIO()
    headers = fieldnames if fieldnames else list(tickets_cache[0].keys())
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(tickets_cache)
    mem = io.BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)
    filename = f"PasarMalam2026_Checkin_Export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return send_file(mem, mimetype="text/csv", as_attachment=True, download_name=filename)

@app.route("/api/sync", methods=["POST"])
def force_sync():
    data = load_data()
    return jsonify({"success": True, "count": len(data), "source": "Google Sheet" if GOOGLE_SHEET_CSV_URL else "Local CSV"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=True)
