import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-surface-container-high rounded ${className}`} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("gainers");

  const [sectors, setSectors]         = useState(null);
  const [movers, setMovers]           = useState(null);
  const [signals, setSignals]         = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [indices, setIndices]         = useState(null);

  useEffect(() => {
    // Load recent history from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
      setRecentHistory(stored.slice(0, 8));
    } catch { /* ignore */ }

    let active = true;

    const loadAll = async () => {
      setLoading(true);
      await Promise.allSettled([
        api.getSectors().then(d => { if (active && d?.sectors?.length) setSectors(d); }).catch(() => {}),
        api.getMarketMovers().then(d => { if (active && d) setMovers(d); }).catch(() => {}),
        api.getMarketPulse().then(d => {
          if (!active || !d?.narratives?.length) return;
          setSignals(d.narratives.slice(0, 3).map(n => ({
            symbol: n.affected_tickers?.[0] || "NIFTY",
            verdict: n.sentiment === "Bullish" ? "BULLISH" : n.sentiment === "Cautious" ? "CAUTIOUS" : "NEUTRAL",
            time: (() => {
              try {
                const diff = Date.now() - new Date(n.timestamp).getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                return h > 0 ? `${h}h ago` : `${m}m ago`;
              } catch { return "live"; }
            })(),
            text: n.summary || n.headline,
            topic: n.topic,
          })));
        }).catch(() => {}),
        api.getMarketStatus().then(d => { if (active && d) setMarketStatus(d); }).catch(() => {}),
        api.getTickerTape().then(d => {
          if (active && d) {
            const nifty = d.find(x => x.symbol === "NIFTY 50");
            const sensex = d.find(x => x.symbol === "SENSEX");
            if (nifty || sensex) {
              setIndices({ nifty, sensex });
            }
          }
        }).catch(() => {}),
      ]);
      if (active) setLoading(false);
    };

    loadAll();
    return () => { active = false; };
  }, []);

  const handleRowClick = (symbol) => {
    try {
      const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
      const updated = [symbol, ...stored.filter(s => s !== symbol)].slice(0, 8);
      localStorage.setItem("zo_recent_analyses", JSON.stringify(updated));
      setRecentHistory(updated);
    } catch { /* ignore */ }
    navigate(`/stock/${symbol}`);
  };

  const getHeatColor = (change) => {
    if (change > 1.5)  return "bg-tertiary/40 border-tertiary/50";
    if (change > 0.5)  return "bg-tertiary/20 border-tertiary/30";
    if (change > 0)    return "bg-tertiary/10 border-tertiary/20";
    if (change === 0)  return "bg-surface-container border-outline-variant";
    if (change > -0.5) return "bg-primary/10 border-primary/20";
    if (change > -1.5) return "bg-primary/20 border-primary/30";
    return "bg-primary/40 border-primary/50";
  };

  const getHeatText = (change) => {
    if (change > 0) return "positive";
    if (change < 0) return "text-primary";
    return "text-on-surface-variant";
  };

  const gainers = movers?.gainers || [];
  const losers  = movers?.losers  || [];
  const sectorList = sectors?.sectors || [];

  return (
    <div className="p-gutter flex-1 grid grid-cols-1 lg:grid-cols-12 gap-gutter auto-rows-min max-w-container-max mx-auto w-full">

      {/* ── Market Pulse Header ── */}
      <section className="lg:col-span-12 glass-card rounded-xl p-6 card-inner-stroke flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none" />
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Market Pulse</h2>
            {marketStatus && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label-caps border ${
                marketStatus.is_open
                  ? "bg-tertiary/10 border-tertiary/30 text-tertiary"
                  : "bg-surface-container border-outline-variant text-on-surface-variant"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.is_open ? "bg-tertiary animate-pulse" : "bg-on-surface-variant"}`} />
                {marketStatus.session === "live" ? "MARKET OPEN" : marketStatus.session === "pre-open" ? "PRE-OPEN" : "MARKET CLOSED"}
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Live overview · NSE/BSE</p>
        </div>
        <div className="flex gap-6 w-full md:w-auto">
          {["NIFTY 50", "SENSEX"].map((idx, i) => {
            const item = i === 0 ? indices?.nifty : indices?.sensex;
            const price = item?.price ?? (i === 0 ? "22,514.65" : "74,227.63");
            const change_pct = item?.change_pct ?? (i === 0 ? 0.45 : 0.51);
            const isUp = change_pct >= 0;
            return (
              <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex-1 min-w-[180px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">{idx}</span>
                  <span className={`material-symbols-outlined ${isUp ? "positive" : "negative"} text-sm`}>
                    {isUp ? "trending_up" : "trending_down"}
                  </span>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-28 mb-1" />
                ) : (
                  <>
                    <div className="font-data-mono text-2xl font-bold">{price}</div>
                    <div className={`font-data-mono ${isUp ? "positive" : "negative"} text-sm mt-1`}>
                      {isUp ? "+" : ""}{change_pct}%
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Market Movers ── */}
      <section className="lg:col-span-8 glass-card rounded-xl p-6 card-inner-stroke">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-title-md text-title-md text-on-surface">Market Movers</h3>
          <div className="flex gap-2">
            {["gainers", "losers"].map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded font-label-caps text-label-caps transition ${activeTab === tab ? "bg-surface-container text-on-surface" : "text-on-surface-variant hover:bg-surface-container"}`}
              >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (gainers.length === 0 && losers.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl opacity-40">show_chart</span>
            <p className="text-sm">Market data loading…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-label-caps text-label-caps">
                  <th className="pb-3 pr-4 font-normal">Symbol</th>
                  <th className="pb-3 px-4 font-normal text-right">LTP</th>
                  <th className="pb-3 px-4 font-normal text-right">Chg</th>
                  <th className="pb-3 px-4 font-normal text-right">% Chg</th>
                  <th className="pb-3 pl-4 font-normal text-right">Vol</th>
                </tr>
              </thead>
              <tbody className="font-data-mono text-data-mono text-sm">
                {(activeTab === "gainers" ? gainers : losers).map(s => (
                  <tr key={s.symbol} onClick={() => handleRowClick(s.symbol)}
                    className="border-b border-surface-container hover:bg-surface-container-low transition-colors cursor-pointer">
                    <td className="py-3 pr-4 font-bold text-on-surface">{s.symbol}</td>
                    <td className="py-3 px-4 text-right text-on-surface">{s.ltp}</td>
                    <td className={`py-3 px-4 text-right ${String(s.chg).startsWith("+") ? "positive" : "negative"}`}>{s.chg}</td>
                    <td className={`py-3 px-4 text-right ${String(s.pct).startsWith("+") ? "positive" : "negative"}`}>{s.pct}</td>
                    <td className="py-3 pl-4 text-right text-on-surface-variant">{s.vol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Sector Heatmap ── */}
      <section className="lg:col-span-4 glass-card rounded-xl p-6 card-inner-stroke flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-title-md text-title-md text-on-surface">Sector Flow</h3>
          <button onClick={() => navigate("/sectors")} className="text-xs text-primary hover:underline font-label-caps">View All</button>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 flex-1">
            {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : sectorList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Loading sectors…</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 flex-1">
            {sectorList.map(sec => (
              <div key={sec.name}
                onClick={() => sec.top_stock && navigate(`/stock/${sec.top_stock}`)}
                className={`rounded flex flex-col items-center justify-center p-2 text-center border cursor-pointer hover:scale-105 transition-transform ${getHeatColor(sec.change)}`}>
                <span className="font-label-caps text-[10px] text-on-surface">{sec.name}</span>
                <span className={`font-data-mono text-xs font-semibold ${getHeatText(sec.change)}`}>
                  {sec.change >= 0 ? "+" : ""}{sec.change}%
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-between items-center text-xs font-label-caps text-on-surface-variant">
          <span>Outflow</span>
          <div className="h-1 flex-1 mx-2 rounded-full bg-gradient-to-r from-primary via-surface-container to-tertiary" />
          <span>Inflow</span>
        </div>
      </section>

      {/* ── Recent History ── */}
      {recentHistory.length > 0 && (
        <section className="lg:col-span-12 glass-card rounded-xl p-6 card-inner-stroke">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">history</span>
              Recent Analyses
            </h3>
            <button
              onClick={() => { localStorage.removeItem("zo_recent_analyses"); setRecentHistory([]); }}
              className="text-xs font-label-caps text-on-surface-variant hover:text-error transition-colors"
            >
              Clear History
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {recentHistory.map(sym => (
              <button
                key={sym}
                onClick={() => handleRowClick(sym)}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-outline-variant rounded-lg hover:border-primary hover:bg-primary/5 transition-all font-data-mono text-sm text-on-surface group"
              >
                <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">trending_up</span>
                <span className="font-bold">{sym}</span>
                <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── AI Intelligence Signals ── */}
      <section className="lg:col-span-12 glass-card rounded-xl p-6 card-inner-stroke border-l-4 border-l-primary relative">
        <div className="absolute top-6 right-6">
          <span className="material-symbols-outlined text-primary opacity-20 text-4xl">smart_toy</span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI Intelligence Signals
          </h3>
          <button onClick={() => navigate("/marketpulse")}
            className="text-xs font-label-caps text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">campaign</span>
            Full MarketPulse →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : !signals ? (
          <div className="flex items-center justify-center py-8 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined opacity-40">smart_toy</span>
            <p className="text-sm">AI signals loading…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map((sig, idx) => (
              <div key={idx} onClick={() => handleRowClick(sig.symbol)}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-data-mono font-bold text-on-surface">{sig.symbol}</span>
                    <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded ${
                      sig.verdict === "BULLISH" ? "bg-tertiary/10 text-tertiary"
                      : sig.verdict === "CAUTIOUS" ? "bg-primary/10 text-primary"
                      : "bg-secondary/10 text-secondary"
                    }`}>{sig.verdict}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant font-data-mono">{sig.time}</span>
                </div>
                {sig.topic && <p className="text-[10px] font-label-caps text-on-surface-variant mb-1">{sig.topic}</p>}
                <p className="text-sm text-on-surface-variant line-clamp-2">{sig.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
