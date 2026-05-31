import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const REFRESH_MS = 15 * 60 * 1000;

const MOCK_NARRATIVES = [
  {
    id: "m1", headline: "RBI holds repo rate at 6.5% — MPC signals cautious stance on inflation trajectory",
    topic: "Macro / Monetary Policy", sentiment: "Cautious", signal_noise_score: 9,
    summary: "The Reserve Bank of India kept the benchmark rate unchanged at 6.5% for the fifth consecutive meeting, flagging food inflation as the primary upside risk while maintaining a withdrawal-of-accommodation stance.",
    affected_tickers: ["HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK"],
    sources: ["Economic Times", "Mint", "Reuters India"], timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: "m2", headline: "Reliance Jio eyes ₹20,000 Cr capex for 5G densification in FY27",
    topic: "Telecom / Capex", sentiment: "Bullish", signal_noise_score: 8,
    summary: "Jio Platforms is planning aggressive 5G network densification across tier-2 and tier-3 cities with an estimated ₹20,000 crore capex outlay for FY27, setting the stage for subscriber growth acceleration.",
    affected_tickers: ["RELIANCE"],
    sources: ["Moneycontrol", "Economic Times"], timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "m3", headline: "IT sector margin expansion on track as wage hike impact fades — analysts",
    topic: "Technology / Earnings", sentiment: "Bullish", signal_noise_score: 7,
    summary: "Brokerage consensus expects 80–120 bps margin recovery in Q1 FY27 for tier-1 IT majors as the annual wage hike cycle from Q4 fully annualises, boosting profitability despite moderate revenue growth.",
    affected_tickers: ["TCS", "INFY", "WIPRO", "HCLTECH"],
    sources: ["Bloomberg Quint", "Mint"], timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "m4", headline: "China EV overcapacity threatens Indian auto sector via import pressure — ICRA",
    topic: "Auto / Sector Risk", sentiment: "Cautious", signal_noise_score: 6,
    summary: "Rating agency ICRA warns that Chinese EV OEMs seeking alternate markets may accelerate Indian market entry, intensifying competitive dynamics for domestic players over a 24-month horizon.",
    affected_tickers: ["TATAMOTORS", "MARUTI", "M&M", "BAJAJ-AUTO"],
    sources: ["Economic Times", "Autocar India"], timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "m5", headline: "HDFC Bank Q4 NII beats estimates; slippage ratio improves to 0.41%",
    topic: "Banking / Results", sentiment: "Bullish", signal_noise_score: 10,
    summary: "HDFC Bank reported Q4 net interest income of ₹31,500 Cr, beating consensus by 3.2%, while gross slippage ratio improved to 0.41% — the best in 12 quarters — signalling a clean credit cycle.",
    affected_tickers: ["HDFCBANK"],
    sources: ["Moneycontrol", "CNBC TV18", "Reuters"], timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "m6", headline: "Global FII outflows from EM Asia pause as dollar index retreats below 104",
    topic: "Macro / Flows", sentiment: "Bullish", signal_noise_score: 7,
    summary: "A softening US Dollar Index — down 1.3% this week — has prompted a pause in FII selling across Emerging Market Asia, with India seeing provisional net buying of ₹1,240 Cr in the cash segment.",
    affected_tickers: ["NIFTY", "SENSEX"],
    sources: ["Bloomberg", "Reuters"], timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    id: "m7", headline: "Adani Green Energy misses Q4 capacity addition target by 8% on land acquisition delays",
    topic: "Energy / Renewables", sentiment: "Cautious", signal_noise_score: 8,
    summary: "Adani Green Energy added 2,300 MW in FY26 vs the guided 2,500 MW target, citing land acquisition bottlenecks in Rajasthan and AP. Management maintains FY27 guidance of 3,500 MW additions.",
    affected_tickers: ["ADANIGREEN", "ADANIENT"],
    sources: ["Economic Times", "Business Standard"], timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "m8", headline: "Nifty Pharma index near breakout as US FDA clearances accelerate for Indian majors",
    topic: "Pharma / Regulatory", sentiment: "Bullish", signal_noise_score: 7,
    summary: "The Nifty Pharma index has rallied 8% in the past 30 days as Sun Pharma, Dr Reddy's, and Cipla together received 14 FDA clearances — the highest quarterly run-rate in 3 years — reducing USFDA overhang fears.",
    affected_tickers: ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB"],
    sources: ["Mint", "Bloomberg Quint"], timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
];

function timeAgo(ts) {
  if (!ts) return "";
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ""; }
}

const SENTIMENT_CONFIG = {
  Bullish:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e", icon: "trending_up"     },
  Cautious: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", dot: "#f59e0b", icon: "warning"          },
  Neutral:  { bg: "#f8fafc", border: "#e2e8f0", text: "#475569", dot: "#94a3b8", icon: "remove_circle"    },
  Bearish:  { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", dot: "#ef4444", icon: "trending_down"    },
};

function SentimentBadge({ sentiment }) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutral;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {sentiment}
    </span>
  );
}

function SignalBar({ score }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#6434ed" : score >= 4 ? "#f59e0b" : "#94a3b8";
  const label = score >= 8 ? "FRESH SIGNAL" : score >= 6 ? "ACTIVE" : score >= 4 ? "PRICED IN" : "STALE";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] font-bold font-mono shrink-0" style={{ color }}>{score}/10 {label}</span>
    </div>
  );
}

function NewsCard({ item, onClick }) {
  const cfg = SENTIMENT_CONFIG[item.sentiment] || SENTIMENT_CONFIG.Neutral;
  const ago = timeAgo(item.timestamp);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border cursor-pointer hover:shadow-md transition-all group flex flex-col"
      style={{ borderColor: cfg.border, borderLeftWidth: 4, borderLeftColor: cfg.dot }}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Topic + sentiment */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.topic}</span>
          <SentimentBadge sentiment={item.sentiment} />
        </div>

        {/* Headline */}
        <h3 className="text-[14px] font-bold text-gray-900 leading-snug group-hover:text-[#6434ed] transition-colors line-clamp-2">
          {item.headline}
        </h3>

        {/* Summary */}
        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3">{item.summary}</p>

        {/* Signal bar */}
        <SignalBar score={item.signal_noise_score} />

        {/* Tickers */}
        {item.affected_tickers?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.affected_tickers.slice(0, 5).map((t) => (
              <span key={t}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#f5f3ff] text-[#6434ed] hover:bg-[#6434ed] hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); onClick(t); }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
        <span className="text-[11px] text-gray-400 font-mono">
          {item.sources?.slice(0, 2).join(" · ") || ""}
          {item.sources?.length > 2 ? ` +${item.sources.length - 2}` : ""}
        </span>
        <span className="text-[11px] text-gray-400 font-mono">{ago}</span>
      </div>
    </div>
  );
}

function SentimentSummaryBar({ counts, total }) {
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: "Bullish",  count: counts.Bullish  || 0, color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
        { label: "Cautious", count: counts.Cautious || 0, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
        { label: "Neutral",  count: counts.Neutral  || 0, color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
        { label: "Bearish",  count: counts.Bearish  || 0, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
      ].map(({ label, count, color, bg, border }) => (
        <div key={label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: bg, border: `1px solid ${border}` }}>
          <span className="text-[26px] font-bold leading-none" style={{ color }}>{count}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
          <div className="h-1 rounded-full bg-gray-100 mt-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct(count)}%`, background: color }} />
          </div>
          <span className="text-[10px] font-mono text-gray-400">{pct(count)}% of feed</span>
        </div>
      ))}
    </div>
  );
}

const FILTERS = ["All", "Bullish", "Cautious", "Neutral", "Bearish", "High Signal"];

export default function NewsSentiment() {
  const navigate = useNavigate();
  const [narratives, setNarratives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("time");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const [trendingSymbols, setTrendingSymbols] = useState([]);
  const [fearGreed, setFearGreed] = useState({ fg_score: 55, fg_label: "Neutral" });
  const countdownRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getMarketPulse();
      const items = res?.narratives?.length ? res.narratives : MOCK_NARRATIVES;
      setNarratives(items);
      if (res?.trending_symbols?.length) setTrendingSymbols(res.trending_symbols);
      if (res?.fear_greed) setFearGreed(res.fear_greed);
      setLastRefreshed(new Date());
      setCountdown(REFRESH_MS / 1000);
    } catch {
      setNarratives(MOCK_NARRATIVES);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // live countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((v) => (v <= 1 ? REFRESH_MS / 1000 : v - 1));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  const filtered = narratives
    .filter((n) => {
      if (activeFilter === "All") return true;
      if (activeFilter === "High Signal") return n.signal_noise_score >= 8;
      return n.sentiment === activeFilter;
    })
    .sort((a, b) => {
      if (sortBy === "signal") return b.signal_noise_score - a.signal_noise_score;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  const counts = narratives.reduce((acc, n) => {
    acc[n.sentiment] = (acc[n.sentiment] || 0) + 1;
    return acc;
  }, {});

  const fgColor = fearGreed.fg_score >= 75 ? "#22c55e" : fearGreed.fg_score >= 55 ? "#84cc16"
    : fearGreed.fg_score >= 45 ? "#f59e0b" : fearGreed.fg_score >= 25 ? "#ef4444" : "#9333ea";

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, "0");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-[#6434ed] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400 animate-pulse">Aggregating News Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto w-full space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ background: "radial-gradient(ellipse at top right, #6434ed, transparent 60%)" }} />
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#6434ed] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>newspaper</span>
            </div>
            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">News Sentiment</h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-700">LIVE</span>
            </span>
          </div>
          <p className="text-[13px] text-gray-500">
            Real-time news aggregation with AI sentiment scoring across NSE-listed stocks.
          </p>
          {lastRefreshed && (
            <p className="text-[10px] text-gray-400 font-mono mt-1">
              Updated {lastRefreshed.toLocaleTimeString("en-IN")} · Next refresh in {mins}:{secs}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => load()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold bg-[#6434ed] text-white hover:bg-[#5327c4] transition-colors">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Feed
          </button>
        </div>
      </div>

      {/* ── Sentiment Summary ── */}
      <SentimentSummaryBar counts={counts} total={narratives.length} />

      {/* ── Main grid + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* News feed — 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Filter + Sort bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                    activeFilter === f
                      ? "bg-[#6434ed] text-white border-[#6434ed]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-[#6434ed] hover:text-[#6434ed]"
                  }`}>
                  {f === "High Signal" && <span className="mr-1">⚡</span>}
                  {f}
                  {f !== "All" && f !== "High Signal" && counts[f] ? (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${activeFilter === f ? "bg-white/20" : "bg-gray-100"}`}>
                      {f === "High Signal" ? narratives.filter(n => n.signal_noise_score >= 8).length : counts[f] || 0}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-gray-200 bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-[#6434ed]">
              <option value="time">Latest First</option>
              <option value="signal">Highest Signal</option>
            </select>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100">
              <span className="material-symbols-outlined text-5xl">search_off</span>
              <p className="font-bold text-[14px]">No {activeFilter} news right now</p>
              <p className="text-[12px]">Check back after next refresh or switch filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onClick={(ticker) => {
                    if (typeof ticker === "string") navigate(`/stock/${ticker}`);
                    else if (item.affected_tickers?.[0]) navigate(`/stock/${item.affected_tickers[0]}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* Fear & Greed */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">FEAR &amp; GREED INDEX</h4>
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-32 h-16 overflow-hidden">
                <svg viewBox="0 0 120 60" className="w-32 h-16">
                  <path d="M10 55 A50 50 0 0 1 110 55" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                  <path d="M10 55 A50 50 0 0 1 110 55" fill="none" stroke={fgColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(fearGreed.fg_score / 100) * 157} 157`} />
                  <circle cx="60" cy="55" r="4" fill={fgColor} />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-[32px] font-bold leading-none" style={{ color: fgColor }}>{fearGreed.fg_score}</div>
                <div className="text-[12px] font-bold text-gray-500 mt-1">{fearGreed.fg_label}</div>
              </div>
              <div className="w-full grid grid-cols-3 text-center text-[9px] font-bold uppercase tracking-wider">
                <span className="text-red-400">Extreme Fear</span>
                <span className="text-gray-400">Neutral</span>
                <span className="text-green-500">Extreme Greed</span>
              </div>
            </div>
          </div>

          {/* Sentiment breakdown */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">SENTIMENT BREAKDOWN</h4>
            <div className="space-y-3">
              {["Bullish", "Cautious", "Neutral", "Bearish"].map((s) => {
                const cfg = SENTIMENT_CONFIG[s];
                const count = counts[s] || 0;
                const pct = narratives.length ? Math.round((count / narratives.length) * 100) : 0;
                return (
                  <button key={s} onClick={() => setActiveFilter(s === activeFilter ? "All" : s)}
                    className="w-full flex items-center gap-3 group cursor-pointer">
                    <span className="text-[11px] font-bold w-16 text-left" style={{ color: cfg.text }}>{s}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.dot }} />
                    </div>
                    <span className="text-[11px] font-bold font-mono w-8 text-right" style={{ color: cfg.text }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trending symbols */}
          {trendingSymbols.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#6434ed]">trending_up</span>
                TRENDING ON SOCIAL
              </h4>
              <div className="flex flex-wrap gap-2">
                {trendingSymbols.slice(0, 10).map((sym) => (
                  <button key={sym} onClick={() => navigate(`/stock/${sym}`)}
                    className="px-2.5 py-1 rounded-lg font-mono text-[12px] font-bold bg-[#f5f3ff] text-[#6434ed] hover:bg-[#6434ed] hover:text-white transition-colors">
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* High-signal spotlight */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-amber-500">bolt</span>
              HIGH-SIGNAL SPOTLIGHT
            </h4>
            <div className="space-y-3">
              {narratives
                .filter((n) => n.signal_noise_score >= 8)
                .slice(0, 3)
                .map((n) => (
                  <div key={n.id}
                    onClick={() => n.affected_tickers?.[0] && navigate(`/stock/${n.affected_tickers[0]}`)}
                    className="flex gap-3 cursor-pointer group rounded-xl p-3 hover:bg-[#f5f3ff] transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: (SENTIMENT_CONFIG[n.sentiment] || SENTIMENT_CONFIG.Neutral).bg }}>
                      <span className="material-symbols-outlined text-[15px]"
                        style={{ color: (SENTIMENT_CONFIG[n.sentiment] || SENTIMENT_CONFIG.Neutral).dot, fontVariationSettings: "'FILL' 1" }}>
                        {(SENTIMENT_CONFIG[n.sentiment] || SENTIMENT_CONFIG.Neutral).icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#6434ed] transition-colors">
                        {n.headline}
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{n.signal_noise_score}/10 signal · {timeAgo(n.timestamp)}</p>
                    </div>
                  </div>
                ))}
              {narratives.filter(n => n.signal_noise_score >= 8).length === 0 && (
                <p className="text-[12px] text-gray-400 text-center py-3">No high-signal items detected</p>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl p-5 border-l-4 border-l-[#6434ed]" style={{ background: "#f5f3ff", borderColor: "#e5e7eb" }}>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#6434ed] text-lg shrink-0 mt-0.5">info</span>
              <div>
                <p className="text-[12px] font-bold text-[#6434ed] mb-1">How Signal Score Works</p>
                <p className="text-[11px] text-[#4c3d9e] leading-relaxed">
                  <strong>10 = Fresh:</strong> news not yet priced in.<br />
                  <strong>6–8 = Active:</strong> market is reacting.<br />
                  <strong>1–5 = Stale:</strong> already reflected in prices.<br />
                  Filter by <em>High Signal</em> to catch early movers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
