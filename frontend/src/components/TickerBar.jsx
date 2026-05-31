import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const DEFAULT_TICKS = [
  { symbol: "NIFTY 50", price: "22,514.65", change_pct: 0.45 },
  { symbol: "SENSEX", price: "74,227.63", change_pct: 0.51 },
  { symbol: "BANKNIFTY", price: "48,159.00", change_pct: -0.12 },
  { symbol: "RELIANCE", price: "2,934.50", change_pct: 1.20 },
  { symbol: "HDFCBANK", price: "1,532.10", change_pct: -0.40 },
  { symbol: "INFY", price: "1,489.20", change_pct: 0.80 },
  { symbol: "TCS", price: "3,980.15", change_pct: 1.15 },
  { symbol: "BHARTIARTL", price: "1,215.60", change_pct: 0.95 },
  { symbol: "ITC", price: "435.20", change_pct: 0.81 }
];

export default function TickerBar() {
  const [ticks, setTicks] = useState(DEFAULT_TICKS);

  useEffect(() => {
    let active = true;
    let es = null;
    let pollInterval = null;

    const applyData = (data) => {
      if (active && Array.isArray(data) && data.length > 0) setTicks(data);
    };

    const fetchTape = async () => {
      try { applyData(await api.getTickerTape()); } catch { /* keep last ticks */ }
    };

    const startPolling = () => {
      if (pollInterval) return;
      fetchTape();
      pollInterval = setInterval(fetchTape, 15000);
    };

    // Prefer a live SSE stream; fall back to polling if it errors or is
    // unsupported (e.g. backend offline / old revision).
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        es = new EventSource(api.tickerStreamUrl());
        es.onmessage = (e) => { try { applyData(JSON.parse(e.data)); } catch { /* ignore */ } };
        es.onerror = () => {
          // EventSource auto-reconnects, but if it can't connect at all, also
          // run polling so the bar still updates.
          if (!pollInterval) startPolling();
        };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    // Always do one immediate fetch so the bar fills instantly.
    fetchTape();

    return () => {
      active = false;
      if (es) es.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-[40px] bg-purple-night text-[#e9e1ff] z-50 flex items-center px-4 overflow-hidden border-b border-purple-night font-data-mono text-data-mono shadow-md">
      {/* Scanline overlay */}
      <div className="absolute inset-0 w-1/4 bg-gradient-to-r from-white/10 to-transparent opacity-20 animate-scanline pointer-events-none" />

      {/* Marquee scroll — duplicate list for seamless loop */}
      <div className="flex whitespace-nowrap animate-marquee items-center gap-8">
        {/* First copy */}
        <div className="flex items-center gap-8">
          {ticks.map((t, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <span className="text-[#e9e1ff]/70">{t.symbol}:</span>
              <span className="font-bold text-white">{t.price}</span>
              <span className={t.change_pct >= 0 ? "text-[#63fcc0]" : "text-[#ffdad6]"}>
                {t.change_pct >= 0 ? "+" : ""}{t.change_pct}%
              </span>
            </span>
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-8">
          {ticks.map((t, idx) => (
            <span key={`dup-${idx}`} className="flex items-center gap-1.5">
              <span className="text-[#e9e1ff]/70">{t.symbol}:</span>
              <span className="font-bold text-white">{t.price}</span>
              <span className={t.change_pct >= 0 ? "text-[#63fcc0]" : "text-[#ffdad6]"}>
                {t.change_pct >= 0 ? "+" : ""}{t.change_pct}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
