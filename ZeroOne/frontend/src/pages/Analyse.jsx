import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const POPULAR = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "BHARTIARTL", "SBIN", "TATAMOTORS", "BAJFINANCE", "WIPRO",
  "AXISBANK", "MARUTI", "LT", "SUNPHARMA", "TITAN",
];

export default function Analyse() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
      setRecent(stored.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api.searchTicker(query);
        setResults(data || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const goTo = (symbol) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    try {
      const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
      const updated = [sym, ...stored.filter(s => s !== sym)].slice(0, 8);
      localStorage.setItem("zo_recent_analyses", JSON.stringify(updated));
    } catch { /* ignore */ }
    navigate(`/stock/${sym}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sym = results[0]?.symbol || query.trim().toUpperCase();
    if (sym) goTo(sym);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 pb-20" style={{ background: "#fcf9f8" }}>

      {/* Centered hero */}
      <div className="w-full max-w-xl text-center mb-8">
        <h1 className="text-[32px] font-bold text-[#1a1a2e] mb-2 tracking-tight">
          Analyse any stock
        </h1>
        <p className="text-[15px] text-[#6c6885]">
          ZeroOne scans 8 data sources simultaneously — options, fundamentals, insider activity, sentiment.
        </p>
      </div>

      {/* Search box */}
      <div className="w-full max-w-xl relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#b0aac0] text-xl pointer-events-none">search</span>
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value.toUpperCase()); setShowDropdown(true); }}
              onFocus={() => query && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search symbol or company — e.g. RELIANCE"
              className="w-full border border-[#dcd6f7] focus:border-primary rounded-xl pl-12 pr-4 py-3.5 text-[15px] text-[#1a1a2e] placeholder-[#b0aac0] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white shadow-sm"
            />
            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#EDE9FF] rounded-xl shadow-lg z-50 overflow-hidden">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => goTo(r.symbol)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f4f2ff] transition-colors border-b border-[#f0edec] last:border-b-0 text-left"
                  >
                    <div>
                      <span className="font-bold text-[14px] text-[#1a1a2e] font-mono">{r.symbol}</span>
                      <span className="text-[12px] text-[#6c6885] block">{r.name}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-6 py-3.5 bg-primary text-white font-bold text-[14px] rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm shrink-0"
          >
            Analyse
          </button>
        </form>

        {/* Try these */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-[#b0aac0] font-semibold uppercase tracking-wider mb-3">Try these</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR.slice(0, 8).map(sym => (
              <button
                key={sym}
                onClick={() => goTo(sym)}
                className="px-3.5 py-1.5 border border-[#dcd6f7] rounded-full text-[13px] text-[#4a4560] hover:bg-primary hover:text-white hover:border-primary transition-all font-medium"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-[#b0aac0] font-semibold uppercase tracking-wider">Recent Analyses</p>
            <button
              onClick={() => { localStorage.removeItem("zo_recent_analyses"); setRecent([]); }}
              className="text-[11px] text-[#b0aac0] hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map(sym => (
              <button
                key={sym}
                onClick={() => goTo(sym)}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#EDE9FF] rounded-lg text-[13px] text-[#4a4560] hover:border-primary hover:text-primary bg-white transition-all font-mono font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">history</span>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
