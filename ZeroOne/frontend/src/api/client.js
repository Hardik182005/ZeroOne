// frontend/src/api/client.js

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

// ── Mock data fallback — used when backend is offline ────────────────────────
const PRICE_MAP = {
  RELIANCE: 2847.50, TCS: 3980.15, INFY: 1489.20, HDFCBANK: 1532.10,
  ICICIBANK: 1110.20, BAJFINANCE: 7234.80, SBIN: 810.50, TATAMOTORS: 985.30,
  WIPRO: 452.10, AXISBANK: 1089.40, MARUTI: 12450.00, SUNPHARMA: 1654.20,
  LT: 3567.80, BHARTIARTL: 1678.90, TITAN: 3421.60, KOTAKBANK: 1876.50,
  ADANIENT: 2456.70, NTPC: 374.50, HINDUNILVR: 2345.80, POWERGRID: 298.40,
};

function mockStock(sym) {
  const price = PRICE_MAP[sym] || Math.round(800 + ((sym.charCodeAt(0) * 53 + (sym.charCodeAt(1) || 7) * 19) % 3000));
  const changePct = parseFloat(((Math.sin(sym.charCodeAt(0)) * 3)).toFixed(2));
  return {
    ticker: sym,
    timestamp: new Date().toISOString(),
    demo_mode: true,
    quote: {
      company_name: sym === "RELIANCE" ? "Reliance Industries Ltd" : `${sym} India Limited`,
      price,
      change_pct: changePct,
      change: parseFloat((price * changePct / 100).toFixed(2)),
      volume: "12.4M",
      market_cap: sym === "RELIANCE" ? "19.2T" : "6.5T",
      week52_high: parseFloat((price * 1.18).toFixed(2)),
      week52_low:  parseFloat((price * 0.78).toFixed(2)),
      sector: "Diversified",
    },
    fundamentals: {
      pe: "24.5", pb: "2.4", roe: "18.2", roce: "22.1",
      de: "0.35", interest_coverage: "8.6",
      revenue_growth_5y: "14.2", profit_growth_5y: "12.8",
    },
    options: {
      pcr: 1.24,
      max_pain: Math.round(price * 0.985),
      iv_percentile: 42,
      highest_oi_call: `${Math.round(price * 1.02)} CE`,
      highest_oi_put:  `${Math.round(price * 0.98)} PE`,
    },
    insider: {
      insider_activity: "No major insider selling detected in the last 90 days.",
      bulk_deals_summary: "FII Vanguard Group added 1.2M shares via block deal.",
    },
    promoter: {
      promoter_pct: "50.39%", prev_promoter_pct: "50.39%",
      pledge_pct: "0.0%", promoter_trend: "Stable",
    },
    news: [
      { title: `${sym} Q4 earnings exceed consensus estimates by 4.2%`, source: "Economic Times", time: "2h ago" },
      { title: `Block deals: Institutional investors increase stake in ${sym}`, source: "Moneycontrol", time: "6h ago" },
      { title: `${sym} technicals: breakout likely above major resistance`, source: "Mint", time: "1d ago" },
      { title: `Global brokerages upgrade price targets for ${sym}`, source: "Bloomberg Quint", time: "2d ago" },
    ],
    sentiment: {
      news_sentiment: "Bullish",
      trend_direction: "Upward (+14% search volume)",
      bull_ratio: 68, fg_score: 62, fg_label: "Greed",
    },
    earnings_radar: {
      earnings_within_72h: false, beat_probability: "High", next_earnings_date: "2026-06-15",
    },
    verdict: {
      analysis: `Institutional accumulation detected in last 3 sessions. Option chain shows strong support at ₹${Math.round(price * 0.98)} with significant put writing. Short-term breakout likely above ₹${Math.round(price * 1.01)} resistance.`,
      verdict: "BULLISH",
      promoter_trust_score: 88,
      risks: [
        "Global macro headwinds affecting sector sentiment",
        "Currency fluctuations in export channels",
        "Delayed capital expenditure deployment",
      ],
      verdict_changer: `A weekly close below ₹${Math.round(price * 0.97)} would invalidate the bullish thesis.`,
    },
    peers: [],
    financials: [],
    sector: { name: "Diversified", fii_flow: 450, dii_flow: 820 },
  };
}

// ── Safe fetch wrapper — never throws, returns null on failure ────────────────
async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const api = {
  searchTicker: (q) =>
    fetch(`${API_BASE}/api/tickers/search?q=${q}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => []),

  // getStock NEVER throws — falls back to mock data silently
  getStock: async (ticker) => {
    try {
      const r = await fetch(`${API_BASE}/api/stock/${ticker}`, { method: "POST" });
      if (r.ok) {
        const data = await r.json();
        return data;
      }
    } catch { /* backend offline */ }
    return mockStock(ticker.toUpperCase());
  },

  getSectors: () =>
    fetch(`${API_BASE}/api/sectors`).then(r => r.ok ? r.json() : null).catch(() => null),

  compareStocks: (ticker1, ticker2) =>
    fetch(`${API_BASE}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker1, ticker2 })
    }).then(r => r.ok ? r.json() : null).catch(() => null),

  getVoice: (ticker) =>
    fetch(`${API_BASE}/api/voice/${ticker}`, { method: "POST" })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => URL.createObjectURL(blob)),

  getMorningBriefing: (tickers) =>
    fetch(`${API_BASE}/api/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers })
    }).then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => URL.createObjectURL(blob)),

  getPDF: (ticker) =>
    fetch(`${API_BASE}/api/pdf/${ticker}`)
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `ZeroOne_${ticker}_Report.pdf`; a.click();
        URL.revokeObjectURL(url);
      }),

  getTickerTape: () =>
    fetch(`${API_BASE}/api/ticker-tape`).then(r => r.ok ? r.json() : null).catch(() => null),

  getMarketMovers: () =>
    fetch(`${API_BASE}/api/ticker-tape/movers`).then(r => r.ok ? r.json() : null).catch(() => null),

  getMarketStatus: () =>
    fetch(`${API_BASE}/api/market-status`).then(r => r.ok ? r.json() : null).catch(() => null),

  chat: (message, context = "") =>
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context })
    }).then(r => r.json()).catch(() => ({ reply: "AI assistant unavailable — backend offline." })),

  getMarketPulse: () =>
    fetch(`${API_BASE}/api/marketpulse`).then(r => r.ok ? r.json() : null).catch(() => null),

  getMarketPulseSnapshots: () =>
    fetch(`${API_BASE}/api/marketpulse/snapshots`).then(r => r.ok ? r.json() : null).catch(() => null),

  triggerMarketPulseSnapshot: () =>
    fetch(`${API_BASE}/api/marketpulse/snapshot`, { method: "POST" })
      .then(r => r.json()).catch(() => null),

  health: () =>
    fetch(`${API_BASE}/api/health`).then(r => r.ok ? r.json() : null).catch(() => null),
}
