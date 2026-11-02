"""
Pasar Malam 2026 Gate Scanner - Flask Backend
Event Gate Check-in & QR Ticket Validation System

Endpoints:
  GET  /             - Serves the Single Page Application index
  GET  /api/tickets  - Fetches ticket dataset (Google Sheet CSV or local fallback)
  POST /api/checkin  - Validates and checks in attendee by id_tiket
  GET  /api/export   - Generates & downloads current updated CSV dataset
  POST /api/sync     - Forces a re-fetch from the configured Google Sheet CSV URL
"""

import os
import csv
import io
from datetime import datetime
from flask import Flask, jsonify, request, send_file, send_from_directory

# ==============================================================================
# CONFIGURATION
# Set your published Google Sheet CSV Export URL below to enable dynamic live sync.
# e.g.: "https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/gviz/tq?tqx=out:csv&sheet=All%20Tickets"
# ==============================================================================
GOOGLE_SHEET_CSV_URL = os.environ.get("GOOGLE_SHEET_CSV_URL", "")
LOCAL_CSV_PATH = os.path.join(os.path.dirname(__file__), "All_Ticket_011126.csv")
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "dist")

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
        # Standardize ticket ID key if needed
        records.append(dict(row))
    return records

def load_data():
    """Loads tickets from Google Sheet CSV or falls back to local CSV."""
    global tickets_cache, tickets_by_id
    records = []

    # 1. Attempt remote fetch if Google Sheet URL is set
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

    # Populate cache structures
    tickets_cache = records
    tickets_by_id = {row.get("ID Tiket", "").strip(): row for row in tickets_cache if row.get("ID Tiket")}
    return tickets_cache

# Initial load
load_data()

@app.route("/")
def index():
    """Serves the single page application index."""
    if os.path.exists(os.path.join(app.static_folder, "index.html")):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({
        "message": "Pasar Malam 2026 Gate Scanner API running.",
        "endpoints": ["/api/tickets", "/api/checkin", "/api/export", "/api/sync"]
    })

@app.route("/<path:path>")
def static_proxy(path):
    """Serves static frontend assets."""
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    """Returns all ticket records."""
    if not tickets_cache:
        load_data()
    return jsonify(tickets_cache)

@app.route("/api/checkin", methods=["POST"])
def checkin():
    """Validates and performs ticket check-in."""
    data = request.get_json(force=True, silent=True) or {}
    id_tiket = data.get("id_tiket", "").strip()

    if not id_tiket:
        return jsonify({"success": False, "error": "ID Tiket is required."}), 400

    ticket = tickets_by_id.get(id_tiket)
    if not ticket:
        # Case-insensitive search fallback
        for key, item in tickets_by_id.items():
            if key.lower() == id_tiket.lower():
                ticket = item
                break

    if not ticket:
        return jsonify({
            "success": False,
            "status": "NOT_FOUND",
            "error": f"Ticket '{id_tiket}' was not found in the registry."
        }), 404

    current_status = ticket.get("Status Tiket", "").strip()
    is_used = ticket.get("Terpakai", "").strip().lower() == "terpakai" or current_status.lower() == "terpakai"

    if is_used:
        return jsonify({
            "success": False,
            "status": "ALREADY_USED",
            "message": "Ticket has already been used.",
            "ticket": ticket,
            "checked_in_at": ticket.get("Waktu Kedatangan", "")
        }), 409

    # Check in: Record current time (HH:MM:SS format)
    now_str = datetime.now().strftime("%H:%M:%S")
    ticket["Status Tiket"] = "Terpakai"
    ticket["Terpakai"] = "Terpakai"
    ticket["Waktu Kedatangan"] = now_str

    # Persist in local file if available
    save_local_tickets()

    return jsonify({
        "success": True,
        "status": "SUCCESS",
        "message": f"Successfully checked in {ticket.get('Nama', 'Attendee')}.",
        "ticket": ticket,
        "checked_in_at": now_str
    })

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

@app.route("/api/export", methods=["GET"])
def export_csv():
    """Generates and downloads the current checked-in dataset as an updated CSV."""
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
    return send_file(
        mem,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename
    )

@app.route("/api/sync", methods=["POST"])
def force_sync():
    """Forces re-fetch from Google Sheet or reloads local CSV."""
    data = load_data()
    return jsonify({
        "success": True,
        "count": len(data),
        "source": "Google Sheet" if GOOGLE_SHEET_CSV_URL else "Local CSV"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=True)
