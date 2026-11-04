/**
 * Google Apps Script for Pasar Malam 2026 Gate Scanner
 * ----------------------------------------------------
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/19wpQ8x0ux3rUsOc4HjUi3xXW7ZldWWZntiVP_97iMJk
 * 2. In the menu, go to: Extensions > Apps Script
 * 3. Replace any existing code with this script.
 * 4. Click "Deploy" (top right) > "New deployment".
 * 5. Select type: "Web app".
 * 6. Execute as: "Me" (your email).
 * 7. Who has access: "Anyone".
 * 8. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...).
 * 9. Paste this URL into your environment variable GOOGLE_SHEET_WEBHOOK_URL or in server.ts / app.py!
 */

const SHEET_NAME = "All Tickets";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Pasar Malam 2026 Google Sheet Webhook is active."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(rawData);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Sheet is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0];
    const colIdTiket = headers.indexOf("ID Tiket");
    const colStatusTiket = headers.indexOf("Status Tiket");
    const colTerpakai = headers.indexOf("Terpakai");
    const colWaktu = headers.indexOf("Waktu Kedatangan");

    const action = data.action || "checkin";
    const nowTime = data.waktu_kedatangan || Utilities.formatDate(new Date(), "GMT+1", "HH:mm:ss");

    // 1. Single Ticket Check-in or Status Toggle
    if (action === "checkin" || action === "toggle") {
      const targetId = String(data.id_tiket || "").trim().toLowerCase();
      const targetStatus = data.target_status || "Terpakai";
      let updatedRow = -1;

      for (let i = 1; i < values.length; i++) {
        const rowId = String(values[i][colIdTiket] || "").trim().toLowerCase();
        if (rowId === targetId) {
          const rowNum = i + 1;
          if (colStatusTiket !== -1) sheet.getRange(rowNum, colStatusTiket + 1).setValue(targetStatus);
          if (colTerpakai !== -1) sheet.getRange(rowNum, colTerpakai + 1).setValue(targetStatus === "Tersedia" ? "Belum" : "Terpakai");
          if (colWaktu !== -1) sheet.getRange(rowNum, colWaktu + 1).setValue(targetStatus === "Tersedia" ? "" : nowTime);
          updatedRow = rowNum;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: updatedRow !== -1,
        id_tiket: data.id_tiket,
        row: updatedRow,
        status: targetStatus,
        waktu_kedatangan: targetStatus === "Tersedia" ? "" : nowTime
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Batch Check-in (Group)
    if (action === "checkin_batch") {
      const targetIds = (data.id_tikets || []).map(id => String(id).trim().toLowerCase());
      const updatedRows = [];

      for (let i = 1; i < values.length; i++) {
        const rowId = String(values[i][colIdTiket] || "").trim().toLowerCase();
        if (targetIds.includes(rowId)) {
          const rowNum = i + 1;
          if (colStatusTiket !== -1) sheet.getRange(rowNum, colStatusTiket + 1).setValue("Terpakai");
          if (colTerpakai !== -1) sheet.getRange(rowNum, colTerpakai + 1).setValue("Terpakai");
          if (colWaktu !== -1) sheet.getRange(rowNum, colWaktu + 1).setValue(nowTime);
          updatedRows.push(rowNum);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: updatedRows.length,
        waktu_kedatangan: nowTime
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Add New Walk-in Attendee Rows
    if (action === "add_attendee") {
      const tickets = data.tickets || [];
      const newRows = [];

      for (let k = 0; k < tickets.length; k++) {
        const t = tickets[k];
        const row = [];
        for (let c = 0; c < headers.length; c++) {
          const colName = headers[c];
          row.push(t[colName] !== undefined ? t[colName] : "");
        }
        newRows.push(row);
      }

      if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        added: newRows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
