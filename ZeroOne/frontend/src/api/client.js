// frontend/src/api/client.js

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const api = {
  searchTicker: (q) =>
    fetch(`${API_BASE}/api/tickers/search?q=${q}`).then(r => {
      if (!r.ok) throw new Error("Search failed");
      return r.json();
    }),

  getStock: (ticker) =>
    fetch(`${API_BASE}/api/stock/${ticker}`, { method: "POST" })
      .then(r => {
        if (!r.ok) throw new Error("Fetch stock details failed");
        return r.json();
      }),

  getSectors: () =>
    fetch(`${API_BASE}/api/sectors`).then(r => {
      if (!r.ok) throw new Error("Fetch sectors failed");
      return r.json();
    }),

  compareStocks: (ticker1, ticker2) =>
    fetch(`${API_BASE}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker1, ticker2 })
    }).then(r => {
      if (!r.ok) throw new Error("Compare failed");
      return r.json();
    }),

  getVoice: (ticker) =>
    fetch(`${API_BASE}/api/voice/${ticker}`, { method: "POST" })
      .then(r => {
        if (!r.ok) throw new Error("Fetch voice failed");
        return r.blob();
      })
      .then(blob => URL.createObjectURL(blob)),

  getMorningBriefing: (tickers) =>
    fetch(`${API_BASE}/api/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers })
    }).then(r => {
      if (!r.ok) throw new Error("Fetch briefing failed");
      return r.blob();
    })
      .then(blob => URL.createObjectURL(blob)),

  getPDF: (ticker) =>
    fetch(`${API_BASE}/api/pdf/${ticker}`)
      .then(r => {
        if (!r.ok) throw new Error("Fetch PDF failed");
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ZeroOne_${ticker}_Report.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }),

  getTickerTape: () =>
    fetch(`${API_BASE}/api/ticker-tape`).then(r => {
      if (!r.ok) throw new Error("Fetch ticker tape failed");
      return r.json();
    }),

  getMarketStatus: () =>
    fetch(`${API_BASE}/api/market-status`).then(r => {
      if (!r.ok) throw new Error("Fetch market status failed");
      return r.json();
    }),
}
