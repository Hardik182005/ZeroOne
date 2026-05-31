import React, { useState, useEffect } from "react";
import { api } from "../api/client";

const POPULAR = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BAJFINANCE", "SBIN", "TATAMOTORS"];

// ── News Sentiment Analyser ──────────────────────────────────────────────────
const BULLISH_WORDS = [
  "beat", "beats", "surge", "surges", "rises", "gains", "strong", "upgrade",
  "growth", "profit", "record", "high", "positive", "bullish", "accumulate",
  "outperform", "rally", "breakout", "buy", "exceeds", "exceed", "upside",
  "increases", "increase", "stake", "dividend", "expansion", "partnership",
];
const BEARISH_WORDS = [
  "miss", "misses", "fall", "falls", "decline", "weak", "downgrade", "sell",
  "loss", "losses", "cut", "negative", "bearish", "concern", "risk", "drop",
  "slump", "crash", "warning", "below", "slow", "slowdown", "default", "fraud",
  "pledge", "debt", "lawsuit", "probe", "investigation",
];

function analyzeHeadline(title) {
  const t = title.toLowerCase();
  const bull = BULLISH_WORDS.filter(w => t.includes(w)).length;
  const bear = BEARISH_WORDS.filter(w => t.includes(w)).length;
  if (bull > bear) return { label: "Bullish", score: 1,  color: "#15803d", bg: "#f0fdf4", icon: "trending_up"   };
  if (bear > bull) return { label: "Bearish", score: -1, color: "#b91c1c", bg: "#fff1f2", icon: "trending_down" };
  return              { label: "Neutral", score: 0,  color: "#854d0e", bg: "#fefce8", icon: "trending_flat" };
}

function computeNewsSentiment(news = []) {
  if (!news.length) return { bullPct: 50, label: "Neutral", items: [] };
  const items = news.map(n => ({ ...n, ...analyzeHeadline(n.title) }));
  const bull  = items.filter(i => i.score > 0).length;
  const bullPct = Math.round((bull / items.length) * 100);
  return { bullPct, label: bullPct >= 60 ? "Bullish" : bullPct <= 40 ? "Bearish" : "Neutral", items };
}

// ── Multi-factor Prediction Engine ──────────────────────────────────────────
function computePrediction(data) {
  const price       = parseFloat(data?.quote?.price)                   || 1000;
  const pe          = parseFloat(data?.fundamentals?.pe)                || 30;
  const roe         = parseFloat(data?.fundamentals?.roe)               || 15;
  const de          = parseFloat(data?.fundamentals?.de)                || 0.5;
  const revGrowth   = parseFloat(data?.fundamentals?.revenue_growth_5y) || 12;
  const profGrowth  = parseFloat(data?.fundamentals?.profit_growth_5y)  || 10;
  const pcr         = parseFloat(data?.options?.pcr)                    || 1.2;
  const ivPct       = parseFloat(data?.options?.iv_percentile)          || 40;
  const maxPain     = parseFloat(data?.options?.max_pain)               || price;
  const bullRatio   = parseFloat(data?.sentiment?.bull_ratio)           || 50;
  const fgScore     = parseFloat(data?.sentiment?.fg_score)             || 50;
  const changePct   = parseFloat(data?.quote?.change_pct)              || 0;
  const week52High  = parseFloat(data?.quote?.week52_high)              || price * 1.2;
  const week52Low   = parseFloat(data?.quote?.week52_low)               || price * 0.8;
  const pledgePct   = parseFloat(String(data?.promoter?.pledge_pct  || "0").replace('%', '')) || 0;
  const promoterPct = parseFloat(String(data?.promoter?.promoter_pct|| "50").replace('%', '')) || 50;
  const promoTrend  = data?.promoter?.promoter_trend || "Stable";
  const newsSentiment = computeNewsSentiment(data?.news || []);

  const fundamentalScore = Math.min(100, Math.max(0,
    (roe       > 20 ? 25 : roe       > 15 ? 18 : roe       > 10 ? 10 : 3) +
    (revGrowth > 20 ? 25 : revGrowth > 15 ? 18 : revGrowth > 10 ? 10 : 3) +
    (profGrowth> 20 ? 25 : profGrowth> 15 ? 18 : profGrowth> 10 ? 10 : 3) +
    (de        < 0.3? 25 : de        < 0.7? 18 : de        < 1.0? 10 : 2) +
    (pe > 0 && pe < 20 ? 5 : pe < 35 ? 0 : -10)
  ));

  const optionsScore = Math.min(100, Math.max(0,
    (pcr  > 1.3 ? 40 : pcr  > 1.0 ? 28 : pcr  > 0.7 ? 14 : 5) +
    (ivPct< 30  ? 30 : ivPct< 50  ? 22 : ivPct< 70  ? 12 : 5) +
    (price > maxPain ? 8 : 28)
  ));

  const sentimentScore = Math.min(100, Math.max(0,
    (bullRatio > 70 ? 35 : bullRatio > 55 ? 22 : bullRatio > 40 ? 10 : 0) +
    (fgScore > 70 ? 18 : fgScore > 50 ? 28 : fgScore > 30 ? 18 : 8) +
    (changePct > 1 ? 22 : changePct > 0 ? 14 : changePct > -1 ? 8 : 0) + 12
  ));

  const insiderScore = Math.min(100, Math.max(0,
    (pledgePct   <  1 ? 35 : pledgePct   <  5 ? 25 : pledgePct   < 15 ? 10 : 0) +
    (promoterPct > 50 ? 35 : promoterPct > 40 ? 25 : promoterPct > 30 ? 15 : 5) +
    (promoTrend === "Increasing" ? 30 : promoTrend === "Stable" ? 20 : 5)
  ));

  const technicalScore = Math.min(100, Math.max(0, (() => {
    const range = week52High - week52Low;
    if (!range) return 50;
    const pos = (price - week52Low) / range;
    const posScore = pos > 0.4 && pos < 0.7 ? 40 : pos > 0.3 && pos < 0.8 ? 25 : pos < 0.3 ? 35 : 15;
    return posScore + (changePct > 0 ? 28 : changePct > -1 ? 18 : 8) + 12;
  })()));

  // News score: 0-100% bullish → 30-100 signal score
  const newsScore = Math.round(30 + newsSentiment.bullPct * 0.7);

  const factors = [fundamentalScore, optionsScore, sentimentScore, insiderScore, technicalScore];
  const dot = (w) => factors.reduce((s, f, i) => s + f * w[i], 0);

  // Horizon-specific weights — near-term is news/options heavy, long-term is fundamentals heavy
  const c1d  = newsScore * 0.50 + optionsScore * 0.25 + technicalScore * 0.25;
  const c7d  = newsScore * 0.35 + dot([0.10, 0.20, 0.20, 0.00, 0.15]);
  const c30d = dot([0.30, 0.20, 0.20, 0.15, 0.15]);
  const c90d = dot([0.40, 0.10, 0.15, 0.25, 0.10]);

  const toR = (c, maxPct) => ((c - 50) / 50) * maxPct;
  const r1d  = toR(c1d,  0.025);
  const r7d  = toR(c7d,  0.08);
  const r30d = toR(c30d, 0.18);
  const r90d = toR(c90d, 0.35);
  const fmt  = (r) => Math.round(price * (1 + r));

  // Daily range from IV (options pricing formula)
  const dailyMove = price * (ivPct / 100) / Math.sqrt(252);

  // Entry verdict — news is the dominant driver for "buy now" decision
  const entryScore = newsScore * 0.40 + optionsScore * 0.25 + sentimentScore * 0.20 + technicalScore * 0.15;

  const verdict =
    entryScore >= 65 ?
      { label: "BUY NOW",           days: 0,  color: "#15803d", bg: "from-[#f0fdf4] to-[#dcfce7]", border: "#86efac", icon: "thumb_up",       sub: "Multiple signals align — this is a strong entry window." } :
    entryScore >= 50 ?
      { label: "BUY ON SMALL DIPS", days: 2,  color: "#16a34a", bg: "from-[#ecfdf5] to-[#d1fae5]", border: "#6ee7b7", icon: "price_check",    sub: "Lean bullish — wait for a 1-2% pullback for better risk-reward." } :
    entryScore >= 38 ?
      { label: "WAIT 3-5 DAYS",     days: 4,  color: "#854d0e", bg: "from-[#fefce8] to-[#fef9c3]", border: "#fde047", icon: "hourglass_empty", sub: "Mixed signals — let news sentiment clarify before committing capital." } :
      { label: "AVOID THIS WEEK",   days: -1, color: "#b91c1c", bg: "from-[#fff1f2] to-[#fee2e2]", border: "#fca5a5", icon: "warning",         sub: "Bearish headwinds dominate — protect capital, re-evaluate next week." };

  return {
    currentPrice: price,
    ticker: data?.ticker || "",
    company: data?.quote?.company_name || "",
    verdict,
    entryScore: Math.round(entryScore),
    newsSentiment,
    dailyRange: {
      low:        Math.round(price - dailyMove * 1.2),
      high:       Math.round(price + dailyMove * 1.2),
      idealEntry: Math.round(price - dailyMove * 0.4),
      stopLoss:   Math.round(price - dailyMove * 2.8),
    },
    predictions: {
      "Tomorrow": { target: fmt(r1d),  returnPct: +(r1d  * 100).toFixed(2), score: Math.round(c1d)  },
      "7 Days":   { target: fmt(r7d),  returnPct: +(r7d  * 100).toFixed(2), score: Math.round(c7d)  },
      "30 Days":  { target: fmt(r30d), returnPct: +(r30d * 100).toFixed(2), score: Math.round(c30d) },
      "90 Days":  { target: fmt(r90d), returnPct: +(r90d * 100).toFixed(2), score: Math.round(c90d) },
    },
    factors: {
      "News Sentiment":   newsScore,
      "Options Chain":    optionsScore,
      Sentiment:          sentimentScore,
      "Insider/Promoter": insiderScore,
      Fundamentals:       fundamentalScore,
      Technical:          technicalScore,
    },
  };
}

const FACTOR_META = {
  "News Sentiment":   { icon: "newspaper",       color: "#7c3aed" },
  "Options Chain":    { icon: "radar",            color: "#0891b2" },
  Sentiment:          { icon: "mood",             color: "#059669" },
  "Insider/Promoter": { icon: "groups",           color: "#9333ea" },
  Fundamentals:       { icon: "account_balance",  color: "#4f46e5" },
  Technical:          { icon: "show_chart",       color: "#ea580c" },
};

function FactorBar({ label, score }) {
  const meta   = FACTOR_META[label] || { icon: "bar_chart", color: "#5317dd" };
  const signal = score >= 65 ? { txt: "BULLISH", bg: "#dcfce7", c: "#15803d" }
               : score >= 45 ? { txt: "NEUTRAL",  bg: "#fef9c3", c: "#854d0e" }
               :               { txt: "BEARISH",  bg: "#fee2e2", c: "#b91c1c" };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#f5f3ff] last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + "18" }}>
        <span className="material-symbols-outlined text-[14px]" style={{ color: meta.color, fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[12px] font-semibold text-[#0d0d0d]">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: signal.bg, color: signal.c }}>{signal.txt}</span>
            <span className="text-[11px] font-bold font-mono w-6 text-right" style={{ color: meta.color }}>{score}</span>
          </div>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, background: `linear-gradient(90deg,${meta.color}66,${meta.color})` }} />
        </div>
      </div>
    </div>
  );
}

export default function Predict() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [showDD, setShowDD]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [pred, setPred]       = useState(null);
  const [error, setError]     = useState(null);
  const [active, setActive]   = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const d = await api.searchTicker(query); setResults(d || []); setShowDD(true); }
      catch { setResults([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const run = async (sym) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true); setError(null); setPred(null); setActive(s);
    setVisible(false); setQuery(s); setShowDD(false);
    try {
      const data = await api.getStock(s);
      setPred(computePrediction(data));
      setTimeout(() => setVisible(true), 80);
    } catch {
      setError(`Could not fetch live data for ${s}. Start the local backend for real predictions.`);
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sym = results[0]?.symbol || query.trim().toUpperCase();
    if (sym) run(sym);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] px-5 pb-20 pt-8" style={{ background: "#faf9fe" }}>
      <div className="max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5317dd]/10 mb-3">
            <span className="material-symbols-outlined text-[#5317dd] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="text-[10px] font-bold text-[#5317dd] uppercase tracking-widest">ZeroOne Oracle</span>
          </div>
          <h1 className="text-[30px] font-bold text-[#0d0d0d] tracking-tight mb-2">
            Should I buy this stock?
          </h1>
          <p className="text-[13px] text-[#797487] max-w-lg mx-auto">
            News sentiment analysis + options signals + multi-factor model → clear verdict: <strong>Buy Now</strong>, <strong>Wait</strong>, or <strong>Avoid</strong> — across 4 time horizons.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto relative mb-8">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0aac0] text-[20px] pointer-events-none">search</span>
              <input
                autoFocus value={query}
                onChange={e => { setQuery(e.target.value.toUpperCase()); setShowDD(true); }}
                onFocus={() => query && setShowDD(true)}
                onBlur={() => setTimeout(() => setShowDD(false), 150)}
                placeholder="Enter stock symbol — e.g. RELIANCE"
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-[#e8e4f0] bg-white text-[#0d0d0d] placeholder-[#b0aac0] text-[14px] focus:outline-none focus:border-[#5317dd] transition-colors"
              />
              {showDD && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e4f0] rounded-xl shadow-lg z-50 overflow-hidden">
                  {results.slice(0, 6).map(r => (
                    <button key={r.symbol} onMouseDown={() => run(r.symbol)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#faf9ff] text-left border-b border-[#f5f3ff] last:border-0">
                      <span className="font-bold text-[#0d0d0d] text-[13px]">{r.symbol}</span>
                      <span className="text-[11px] text-[#797487] truncate max-w-[160px]">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit"
              className="px-5 py-3 bg-[#5317dd] text-white rounded-xl font-bold text-[13px] hover:bg-[#4311b8] transition-colors shrink-0 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Predict
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5 mt-2.5 justify-center">
            {POPULAR.map(s => (
              <button key={s} onMouseDown={() => run(s)}
                className="px-2.5 py-1 text-[10px] font-bold text-[#5317dd] bg-[#5317dd]/8 rounded-full hover:bg-[#5317dd]/15 transition-colors uppercase tracking-wide">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-14 gap-4">
            <div className="relative w-14 h-14">
              <div className="w-14 h-14 border-4 border-[#5317dd]/15 rounded-full" />
              <div className="w-14 h-14 border-4 border-[#5317dd] border-t-transparent rounded-full animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#5317dd] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-[#0d0d0d] mb-1">Oracle reading signals for {active}…</p>
              <p className="text-[12px] text-[#797487]">News sentiment · options chain · fundamentals · insider activity</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-red-400 text-4xl mb-3 block">signal_disconnected</span>
            <p className="text-[14px] font-semibold text-[#0d0d0d] mb-1">{active} — Fetch failed</p>
            <p className="text-[12px] text-[#797487] max-w-sm mx-auto">{error}</p>
          </div>
        )}

        {/* Results */}
        {pred && !loading && (
          <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

            {/* Identity */}
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <h2 className="text-[20px] font-bold text-[#0d0d0d]">{pred.ticker}</h2>
                <p className="text-[12px] text-[#797487]">{pred.company}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#b0aac0] uppercase tracking-wider mb-0.5">Current Price</p>
                <p className="text-[22px] font-bold text-[#0d0d0d] font-mono">
                  ₹{pred.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* ── VERDICT HERO ─────────────────────────────────────────── */}
            <div className={`bg-gradient-to-br ${pred.verdict.bg} border-2 rounded-2xl p-6 mb-5 flex flex-col md:flex-row md:items-center gap-5`}
              style={{ borderColor: pred.verdict.border }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: pred.verdict.color + "20" }}>
                <span className="material-symbols-outlined text-[32px]" style={{ color: pred.verdict.color, fontVariationSettings: "'FILL' 1" }}>{pred.verdict.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: pred.verdict.color }}>ZeroOne Oracle Verdict</p>
                <h2 className="text-[28px] md:text-[32px] font-black tracking-tight leading-none mb-2" style={{ color: pred.verdict.color }}>
                  {pred.verdict.label}
                </h2>
                <p className="text-[13px] text-[#3d3a4a]">{pred.verdict.sub}</p>
              </div>
              {/* Entry score ring */}
              <div className="flex flex-col items-center shrink-0">
                <svg width="76" height="76" viewBox="0 0 76 76">
                  <circle cx="38" cy="38" r="30" fill="none" stroke="#e8e4f0" strokeWidth="7" />
                  <circle cx="38" cy="38" r="30" fill="none" stroke={pred.verdict.color} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${(pred.entryScore / 100) * 188.5} 188.5`}
                    transform="rotate(-90 38 38)" />
                  <text x="38" y="43" textAnchor="middle" fontSize="17" fontWeight="800" fill={pred.verdict.color}>{pred.entryScore}</text>
                </svg>
                <p className="text-[9px] text-[#797487] mt-1 uppercase tracking-wide">Entry Score</p>
              </div>
            </div>

            {/* ── ENTRY LEVELS ─────────────────────────────────────────── */}
            <div className="bg-white border border-[#e8e4f0] rounded-2xl p-5 mb-5">
              <h3 className="text-[13px] font-bold text-[#0d0d0d] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5317dd] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>price_check</span>
                Tomorrow's Expected Range &amp; Entry Levels
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Expected Low",  value: pred.dailyRange.low,        color: "#b91c1c", bg: "#fff1f2" },
                  { label: "Expected High", value: pred.dailyRange.high,       color: "#15803d", bg: "#f0fdf4" },
                  { label: "Ideal Entry",   value: pred.dailyRange.idealEntry, color: "#1d4ed8", bg: "#eff6ff" },
                  { label: "Stop Loss",     value: pred.dailyRange.stopLoss,   color: "#9a3412", bg: "#fff7ed" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="rounded-xl p-4 text-center" style={{ background: bg }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>{label}</p>
                    <p className="text-[18px] font-bold font-mono" style={{ color }}>₹{value.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#b0aac0] mt-3 leading-relaxed">
                Range estimated using options IV-implied daily move. Ideal entry is a slight intraday dip from current. Stop loss is 2.8× the expected daily move.
              </p>
            </div>

            {/* ── 4 HORIZON PREDICTIONS ────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {Object.entries(pred.predictions).map(([label, p]) => {
                const up = p.returnPct >= 0;
                const c  = up ? "#15803d" : "#b91c1c";
                return (
                  <div key={label} className="rounded-2xl p-4 border border-white/80" style={{ background: up ? "#f0fdf4" : "#fff1f2" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: c }}>{label}</p>
                    <p className="text-[20px] font-bold font-mono leading-none" style={{ color: c }}>
                      ₹{p.target.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: c }}>
                      {up ? "+" : ""}{p.returnPct}%
                    </p>
                    <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: c + "22" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: c }} />
                    </div>
                    <p className="text-[9px] mt-1" style={{ color: c }}>Signal {p.score}/100</p>
                  </div>
                );
              })}
            </div>

            {/* ── BOTTOM 2-COL ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* News Sentiment (3/5) */}
              <div className="lg:col-span-3 bg-white border border-[#e8e4f0] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-[#0d0d0d] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7c3aed] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>newspaper</span>
                    News Sentiment Analysis
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-14 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full rounded-full bg-[#15803d]" style={{ width: `${pred.newsSentiment.bullPct}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-[#15803d]">{pred.newsSentiment.bullPct}% Bullish</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {pred.newsSentiment.items.length > 0
                    ? pred.newsSentiment.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: item.bg }}>
                        <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" style={{ color: item.color, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-[#0d0d0d] leading-snug">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#797487]">{item.source} · {item.time}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: item.color + "25", color: item.color }}>{item.label}</span>
                          </div>
                        </div>
                      </div>
                    ))
                    : <p className="text-[12px] text-[#797487] py-4 text-center">No news data — connect backend for live headlines.</p>
                  }
                </div>
              </div>

              {/* Factor Signals (2/5) */}
              <div className="lg:col-span-2 bg-white border border-[#e8e4f0] rounded-2xl p-6">
                <h3 className="text-[14px] font-bold text-[#0d0d0d] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5317dd] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                  Signal Breakdown
                </h3>
                {Object.entries(pred.factors).map(([label, score]) => (
                  <FactorBar key={label} label={label} score={score} />
                ))}
                <p className="text-[10px] text-[#b0aac0] mt-4 leading-relaxed">
                  News sentiment has highest weight for tomorrow/7-day verdict. Fundamentals dominate 90-day targets.
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0">info</span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                <strong>Not financial advice.</strong> Oracle is a quantitative research tool. Predictions are probabilistic estimates based on available signals, not guarantees. Always consult a SEBI-registered advisor before investing.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!pred && !loading && !error && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-[#5317dd]/8 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[#5317dd] text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <h3 className="text-[17px] font-bold text-[#0d0d0d] mb-2">Search any NSE stock to get Oracle's verdict</h3>
            <p className="text-[12px] text-[#797487] mb-6 max-w-sm mx-auto">
              Oracle scores 6 signal streams and gives you a clear answer: <strong>Buy Now</strong>, <strong>Wait X days</strong>, or <strong>Avoid this week</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
              {[
                { icon: "newspaper",       title: "News Sentiment",       desc: "Each headline scored Bullish/Bearish — drives the short-term verdict",     color: "#7c3aed" },
                { icon: "radar",           title: "Options Intelligence",  desc: "PCR, IV percentile & max pain pinpoint institutional positioning",         color: "#0891b2" },
                { icon: "account_balance", title: "Fundamentals",         desc: "PE, ROE, growth & debt anchor the 30-day and 90-day price targets",        color: "#4f46e5" },
              ].map(({ icon, title, desc, color }) => (
                <div key={title} className="bg-white border border-[#e8e4f0] rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5" style={{ background: color + "15" }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#0d0d0d] mb-1">{title}</p>
                  <p className="text-[11px] text-[#797487] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
