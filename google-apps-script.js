/**
 * Fart for Good — Google Apps Script Logger
 *
 * ── SETUP (one-time, ~5 minutes) ──────────────────────────────────────────
 *
 * 1. Create a new Google Sheet at sheets.google.com
 *    - Name it "Fart for Good"
 *    - Copy the Sheet ID from the URL:
 *      https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
 *
 * 2. Open the script editor:
 *    Extensions → Apps Script
 *
 * 3. Delete everything in the editor and paste this entire file.
 *    Replace YOUR_GOOGLE_SHEET_ID_HERE with the ID you copied.
 *
 * 4. Deploy as a web app:
 *    Deploy → New deployment → Web app
 *    - Description: "Fart Logger"
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    → Click Deploy → Copy the Web App URL
 *
 * 5. Add the URL to fart-for-good/.env.local:
 *    VITE_SHEET_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 *
 * 6. Restart the dev server (npm run dev) — done!
 *    For Netlify: add VITE_SHEET_URL as an environment variable in the dashboard.
 *
 * ── RE-DEPLOYING ──────────────────────────────────────────────────────────
 * After any code changes: Deploy → Manage deployments → Edit (pencil) →
 * Version: New version → Deploy
 * ─────────────────────────────────────────────────────────────────────────
 */

var SHEET_ID   = "YOUR_GOOGLE_SHEET_ID_HERE"; // ← replace this
var SHEET_NAME = "Fart Log";

function doGet(e) {
  try {
    var params       = e.parameter;
    var charity      = params.charity      || "unknown";
    var amount       = parseFloat(params.amount)      || 0.001;
    var date         = params.date         || new Date().toISOString().slice(0, 10);
    var globalFarts  = parseInt(params.globalFarts)   || 0;
    var timestamp    = new Date().toISOString();

    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers on first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      var header = sheet.getRange(1, 1, 1, 5);
      header.setValues([["Timestamp", "Date", "Charity", "Amount ($)", "Global Farts"]]);
      header.setFontWeight("bold").setBackground("#0f47ff").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 200);
      sheet.setColumnWidth(2, 120);
      sheet.setColumnWidth(3, 150);
    }

    sheet.appendRow([timestamp, date, charity, amount, globalFarts]);

    return ContentService.createTextOutput("ok");

  } catch (err) {
    // Log the error but don't surface it to the client
    console.error("Fart log error:", err);
    return ContentService.createTextOutput("error");
  }
}

// ── Test function ─────────────────────────────────────────────────────────
// Run this from the Apps Script editor (▶ Run) to verify everything works.
function testLog() {
  doGet({
    parameter: {
      charity:     "freshlife",
      amount:      "0.001",
      date:        new Date().toISOString().slice(0, 10),
      globalFarts: "1",
    }
  });
  Logger.log("Test row written — check your sheet!");
}
