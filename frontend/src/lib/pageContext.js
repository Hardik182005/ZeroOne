// Lightweight global store describing what the user is currently viewing, so
// the AI assistant (page + orb) can answer with full context of the page —
// especially the stock the user just analysed. Plain module singleton; no
// provider/wrapping needed.

let _context = "";

export function setPageContext(ctx) {
  _context = (ctx || "").toString().slice(0, 2000);
}

export function clearPageContext() {
  _context = "";
}

export function getPageContext() {
  return _context;
}

// Build a rich context string from a stock analysis payload.
export function buildStockContext(ticker, data) {
  if (!data) return "";
  const q = data.quote || {};
  const f = data.fundamentals || {};
  const v = data.verdict || {};
  const news = (data.news || []).slice(0, 3).map((n) => n.title).filter(Boolean);
  return [
    `The user is currently viewing the ZeroOne analysis page for ${data.ticker || ticker}` +
      (q.company_name ? ` (${q.company_name})` : "") + ".",
    `Price: ₹${q.price} (${q.change_pct}% today). Market cap: ${q.market_cap}. Sector: ${q.sector}.`,
    `Fundamentals — P/E: ${f.pe}, P/B: ${f.pb}, ROE: ${f.roe}, ROCE: ${f.roce}, D/E: ${f.de}.`,
    v.verdict ? `ZeroOne AI verdict: ${v.verdict}. ${v.analysis || ""}` : "",
    news.length ? `Recent headlines: ${news.join("; ")}.` : "",
    "Answer the user's question using this context when relevant.",
  ].filter(Boolean).join(" ");
}
