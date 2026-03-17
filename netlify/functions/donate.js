// Placeholder donate endpoint — logs farts and forwards to Google Sheets if configured.
// Set GOOGLE_SHEET_URL env var in Netlify to a deployed Google Apps Script Web App URL.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { charity, amount, date, globalFarts } = body;
  console.log("Fart for Good — donation request (prototype):", { charity, amount, date, globalFarts });

  // Forward to Google Sheets via Apps Script (fire-and-forget)
  if (process.env.GOOGLE_SHEET_URL) {
    fetch(process.env.GOOGLE_SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charity, amount, date, globalFarts, timestamp: new Date().toISOString() }),
    }).catch((err) => console.error("Google Sheets log failed:", err));
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      prototype: true,
      message: "No real donation made — this is a prototype",
      charity,
      amount,
    }),
  };
};
