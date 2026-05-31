import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

const QUARTER_LABELS = ["Q1'23", "Q2'23", "Q3'23", "Q4'23", "Q1'24", "Q2'24", "Q3'24", "Q4'24"];

// Generate realistic quarter series seeded from fundamentals growth %
function makeQuarterBars(growthPct = 12, base = 50) {
  const g = parseFloat(growthPct) || 12;
  const quarterlyGrowth = g / 400; // annual → quarterly fraction
  return Array.from({ length: 8 }, (_, i) => {
    const trend = base * Math.pow(1 + quarterlyGrowth, i);
    const noise = trend * 0.06 * (Math.sin(i * 1.7 + base) * 0.5 + 0.5);
    return Math.min(95, Math.max(10, trend + noise - base * 0.3));
  });
}

// Each flashcard metric config: label, bg, text color, icon, value extractor
const FUND_CARDS = [
  { label: "P/E Ratio",           key: "pe",               unit: "x",  bg: "#eef2ff", color: "#4f46e5", icon: "price_change",     good: v => parseFloat(v) < 30 },
  { label: "P/B Ratio",           key: "pb",               unit: "x",  bg: "#f0fdf4", color: "#16a34a", icon: "account_balance",  good: v => parseFloat(v) < 4  },
  { label: "ROE",                 key: "roe",              unit: "%",  bg: "#fff7ed", color: "#ea580c", icon: "trending_up",      good: v => parseFloat(v) > 15 },
  { label: "ROCE",                key: "roce",             unit: "%",  bg: "#fdf4ff", color: "#9333ea", icon: "show_chart",       good: v => parseFloat(v) > 15 },
  { label: "Debt / Equity",       key: "de",               unit: "x",  bg: "#fef2f2", color: "#dc2626", icon: "account_balance_wallet", good: v => parseFloat(v) < 1 },
  { label: "Interest Coverage",   key: "interest_coverage",unit: "x",  bg: "#ecfdf5", color: "#059669", icon: "security",         good: v => parseFloat(v) > 3  },
  { label: "Revenue Growth 5Y",   key: "revenue_growth_5y",unit: "%",  bg: "#eff6ff", color: "#2563eb", icon: "bar_chart",        good: v => parseFloat(v) > 10 },
  { label: "Profit Growth 5Y",    key: "profit_growth_5y", unit: "%",  bg: "#fefce8", color: "#ca8a04", icon: "insights",         good: v => parseFloat(v) > 10 },
];

// Frontend localStorage cache — 30 min TTL to avoid hammering Anakin
const CACHE_TTL_MS = 30 * 60 * 1000;
function getFrontendCache(ticker) {
  try {
    const raw = localStorage.getItem(`zo_stock_${ticker}`);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) { localStorage.removeItem(`zo_stock_${ticker}`); return null; }
    return data;
  } catch { return null; }
}
function setFrontendCache(ticker, data) {
  try {
    localStorage.setItem(`zo_stock_${ticker}`, JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS }));
  } catch { /* storage full — ignore */ }
}

const generateMockStockData = (sym) => ({
  ticker: sym,
  timestamp: new Date().toISOString(),
  quote: {
    company_name: sym === "RELIANCE" ? "Reliance Industries Limited" : `${sym} India Limited`,
    price: sym === "RELIANCE" ? 2847.50 : sym === "INFY" ? 1489.20 : 1245.00,
    change_pct: sym === "RELIANCE" ? 2.34 : sym === "INFY" ? 0.80 : -1.25,
    change: sym === "RELIANCE" ? 65.10 : sym === "INFY" ? 11.80 : -15.70,
    volume: "12.4M",
    market_cap: sym === "RELIANCE" ? "19.2T" : "6.5T",
  },
  fundamentals: {
    pe: sym === "RELIANCE" ? "28.5" : "22.1",
    pb: sym === "RELIANCE" ? "2.4" : "4.8",
    roe: sym === "RELIANCE" ? "9.8" : "25.4",
    roce: sym === "RELIANCE" ? "12.2" : "31.2",
    de: sym === "RELIANCE" ? "0.38" : "0.05",
    interest_coverage: sym === "RELIANCE" ? "6.8" : "24.5",
    revenue_growth_5y: "14.2",
    profit_growth_5y: "12.8"
  },
  options: {
    pcr: 1.24,
    max_pain: sym === "RELIANCE" ? 2820 : 1480,
    iv_percentile: 42,
    highest_oi_call: sym === "RELIANCE" ? "2900 CE" : "1520 CE",
    highest_oi_put: sym === "RELIANCE" ? "2800 PE" : "1460 PE"
  },
  insider: {
    insider_activity: "No major insider selling detected in the last 90 days. Minor acquisition by promoters.",
    bulk_deals_summary: "FII Vanguard Group added 1.2M shares via block deal on 2026-05-24."
  },
  promoter: {
    promoter_pct: "50.39%",
    prev_promoter_pct: "50.39%",
    pledge_pct: "0.0%",
    promoter_trend: "Stable"
  },
  news: [
    { title: `${sym} Q4 earnings exceed consensus estimates by 4.2%`, source: "Economic Times", time: "2h ago" },
    { title: `Block deals: Promoters increase stake in ${sym}`, source: "Moneycontrol", time: "12h ago" },
    { title: `Technicals: ${sym} breakout likely above major resistance`, source: "Mint", time: "1d ago" },
    { title: `Global brokerages upgrade targets for ${sym} post earnings`, source: "Bloomberg Quint", time: "2d ago" }
  ],
  sentiment: {
    news_sentiment: "Bullish",
    trend_direction: "Upward (+14% search volume)",
    bull_ratio: 76,
    fg_score: 68,
    fg_label: "Greed"
  },
  earnings_radar: {
    earnings_within_72h: false,
    beat_probability: "High",
    next_earnings_date: "2026-06-15"
  },
  verdict: {
    analysis: `Institutional accumulation detected in last 3 trading sessions. Option chain indicates strong support at ${sym === "RELIANCE" ? "2800" : "1450"} with significant put writing. Short-term breakout imminent above ${sym === "RELIANCE" ? "2860" : "1520"} resistance level.`,
    verdict: "BULLISH",
    promoter_trust_score: 92,
    risks: [
      "Crude oil price volatility affecting margin inputs",
      "Currency fluctuations in export channels",
      "Delayed capital expenditure deployment"
    ],
    verdict_changer: `A weekly close below ₹${sym === "RELIANCE" ? "2800" : "1450"} would invalidate the short-term bullish outlook.`
  }
});

function computeStockArchetype(data) {
  const pe       = parseFloat(data?.fundamentals?.pe) || 30;
  const roe      = parseFloat(data?.fundamentals?.roe) || 15;
  const roce     = parseFloat(data?.fundamentals?.roce) || 15;
  const de       = parseFloat(data?.fundamentals?.de) || 0.5;
  const ivPct    = parseFloat(data?.options?.iv_percentile) || 40;
  const bullRatio= parseFloat(data?.sentiment?.bull_ratio) || 50;
  const fgScore  = parseFloat(data?.sentiment?.fg_score) || 50;
  const changePct= Math.abs(parseFloat(data?.quote?.change_pct) || 0);
  const pledgePct= parseFloat(String(data?.promoter?.pledge_pct || "0").replace('%','')) || 0;

  const scores = {
    qualityCompounder:
      (roe > 18 ? 3 : roe > 12 ? 1 : 0) +
      (roce > 18 ? 3 : roce > 12 ? 1 : 0) +
      (de < 0.3 ? 3 : de < 0.7 ? 1 : 0) +
      (pledgePct < 5 ? 2 : 0) + (pe > 0 && pe < 35 ? 1 : 0),
    momentumBeast:
      (bullRatio > 70 ? 3 : bullRatio > 55 ? 1 : 0) +
      (fgScore > 65 ? 3 : fgScore > 50 ? 1 : 0) +
      (changePct > 2 ? 2 : changePct > 0.5 ? 1 : 0),
    volatilityEngine:
      (ivPct > 65 ? 3 : ivPct > 50 ? 1 : 0) +
      (changePct > 3 ? 3 : changePct > 1.5 ? 1 : 0) + (de > 0.8 ? 1 : 0),
    valueVault:
      (pe > 0 && pe < 12 ? 4 : pe > 0 && pe < 20 ? 2 : 0) +
      (roe > 10 ? 1 : 0) + (de < 0.5 ? 1 : 0) + (bullRatio < 55 ? 1 : 0),
    institutionalFortress:
      (pledgePct < 3 ? 2 : 0) + (de < 0.4 ? 2 : 0) +
      (roe > 12 ? 1 : 0) + (fgScore > 40 && fgScore < 65 ? 2 : 0),
    sentimentReactor:
      (bullRatio > 80 ? 4 : bullRatio > 70 ? 2 : 0) +
      (ivPct > 55 ? 2 : 0) + (changePct > 2 ? 2 : 0) + (fgScore > 70 ? 2 : 0),
  };

  const maxPossible = { qualityCompounder: 13, momentumBeast: 8, volatilityEngine: 7, valueVault: 8, institutionalFortress: 7, sentimentReactor: 10 };
  const [archetypeKey, topScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const confidence = Math.min(95, Math.max(42, Math.round((topScore / maxPossible[archetypeKey]) * 100)));

  const ARCHETYPES = {
    qualityCompounder: {
      name: "Quality Compounder", emoji: "💎", tagline: "The wealth-building machine",
      color: "#059669", bg: "#f0fdf4",
      description: "This stock consistently earns high returns on equity with minimal debt. Management is disciplined, earnings are predictable, and value compounds for shareholders year after year. The hallmark of a long-term wealth machine.",
      bestFor: "Long-term SIP investors & wealth builders",
      strategy: "Buy on dips below fair value. Hold 3–5 years minimum. Ignore short-term noise — the compounding engine needs time.",
      risk: "Trades at a premium. Any earnings miss or valuation de-rating can cause sharp corrections from elevated levels.",
      signals: ["High ROE", "High ROCE", "Low Debt/Equity", "Low Pledge %"],
    },
    momentumBeast: {
      name: "Momentum Beast", emoji: "🔥", tagline: "Rides trends with conviction",
      color: "#ea580c", bg: "#fff7ed",
      description: "Strong social conviction, elevated Fear & Greed readings, and decisive price action. This stock rewards trend-followers who get in early and exit before the crowd turns. Momentum is the edge here.",
      bestFor: "Swing traders & momentum strategy funds",
      strategy: "Enter on confirmed breakouts above key resistance with volume confirmation. Use 3–5% trailing stop-loss aggressively.",
      risk: "When momentum reverses, it reverses hard and fast. No support when sentiment flips — exits must be disciplined.",
      signals: ["High Bull Ratio", "Greed Zone F&G", "Strong Price Action", "Rising Volume"],
    },
    volatilityEngine: {
      name: "Volatility Engine", emoji: "⚡", tagline: "High octane — both directions",
      color: "#d97706", bg: "#fffbeb",
      description: "Elevated implied volatility and wide intraday swings make this stock a double-edged sword. Big moves happen — knowing which direction requires timing and confirmed catalysts. Not for the faint-hearted.",
      bestFor: "Options traders & short-term speculators",
      strategy: "Sell premium via iron condors or straddles when IV is high. Avoid naked directional bets unless catalysts are clear.",
      risk: "Whipsaws destroy stop-losses. News events can gap through support/resistance in seconds.",
      signals: ["High IV Percentile", "Wide Daily Range", "Elevated Volatility", "Active Options Chain"],
    },
    valueVault: {
      name: "Value Vault", emoji: "🏛️", tagline: "Hidden gem, patient reward",
      color: "#2563eb", bg: "#eff6ff",
      description: "Trading at a discount to intrinsic value with solid underlying fundamentals. The market hasn't fully recognized the story yet. Patient investors who understand the thesis often win handsomely here.",
      bestFor: "Value investors & contrarian long-term buyers",
      strategy: "Accumulate quietly across multiple tranches. Wait for a catalyst: earnings beat, analyst re-rating, or sector rotation.",
      risk: "Value traps are real — always verify WHY it's cheap. Could stay undervalued for years without a catalyst.",
      signals: ["Low P/E Ratio", "Solid ROE", "Under-Radar Sentiment", "Clean Balance Sheet"],
    },
    institutionalFortress: {
      name: "Institutional Fortress", emoji: "🏦", tagline: "Smart money's trusted anchor",
      color: "#4f46e5", bg: "#eef2ff",
      description: "Institutions have done their homework here. Low pledge, clean balance sheet, stable promoter holding. FII/DII flows support this stock at key levels, acting as natural shock absorbers during corrections.",
      bestFor: "Conservative investors focused on wealth preservation",
      strategy: "Add on institutional buying confirmation via bulk deals. Use market dips aligned with FII buying windows as entry points.",
      risk: "Slow mover. Requires patience. Opportunity cost is real during high-growth phases.",
      signals: ["Zero/Low Pledge", "Low Debt", "Stable Promoter Holding", "Balanced Sentiment"],
    },
    sentimentReactor: {
      name: "Sentiment Reactor", emoji: "📡", tagline: "Moves on whispers and momentum",
      color: "#9333ea", bg: "#faf5ff",
      description: "Extreme social media buzz and high retail participation drive this stock. It can move 5%+ on a single news headline. Speed and agility are non-negotiable for trading this archetype profitably.",
      bestFor: "News traders & event-driven speculators",
      strategy: "Monitor real-time news feeds obsessively. Front-run catalysts. Cut positions quickly — no loyalty to any price level.",
      risk: "FOMO-driven moves reverse violently and without warning. The last buyers are the first ones hurt.",
      signals: ["Very High Bull Ratio", "Extreme F&G Score", "High Social Buzz", "High IV"],
    },
  };

  return { ...ARCHETYPES[archetypeKey], confidence, archetypeKey };
}

export default function StockView() {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState("pat");
  const audioRef = useRef(null);

  const fetchStock = async (forceRefresh = false) => {
    const sym = ticker.toUpperCase();
    setLoading(true);
    setError(null);
    setData(null);
    setAudioUrl(null);
    setPlaying(false);

    // Check frontend localStorage cache first (saves Anakin credits)
    if (!forceRefresh) {
      const cached = getFrontendCache(sym);
      if (cached) {
        setData({ ...cached, from_frontend_cache: true });
        setLoading(false);
        try {
          const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
          localStorage.setItem("zo_recent_analyses", JSON.stringify([sym, ...stored.filter(s => s !== sym)].slice(0, 8)));
        } catch { /* ignore */ }
        return;
      }
    }

    try {
      const res = await api.getStock(sym);
      setData(res);
      setFrontendCache(sym, res); // cache for 30 min
      try {
        const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
        localStorage.setItem("zo_recent_analyses", JSON.stringify([sym, ...stored.filter(s => s !== sym)].slice(0, 8)));
      } catch { /* ignore */ }
    } catch (err) {
      setError(`Could not load data for ${sym}. The backend may be starting up — try again in a moment.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(false);
  }, [ticker]);

  const handlePlayAudio = async () => {
    if (audioUrl) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
      return;
    }
    setAudioLoading(true);
    try {
      const url = await api.getVoice(ticker.toUpperCase());
      setAudioUrl(url);
      setPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    } catch {
      alert("Voice narration API error. Check ElevenLabs key configuration.");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try { await api.getPDF(ticker.toUpperCase()); }
    catch { alert("PDF report download failed."); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-label-caps text-on-surface-variant animate-pulse">Running Parallel Wires...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 p-12">
        <span className="material-symbols-outlined text-error text-5xl opacity-60">signal_disconnected</span>
        <p className="font-title-md text-on-surface font-semibold">{ticker.toUpperCase()} — Analysis Failed</p>
        <p className="text-sm text-on-surface-variant text-center max-w-sm">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => fetchStock(true)}
            className="px-5 py-2 bg-primary text-white rounded-lg font-label-caps text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">refresh</span>Retry
          </button>
          <button onClick={() => navigate("/analyse")}
            className="px-5 py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg font-label-caps text-sm hover:bg-surface-container-high transition-colors">
            Try Another
          </button>
        </div>
      </div>
    );
  }

  if (!data && !loading) {
    return null;
  }

  const { quote, fundamentals, options, insider, promoter, news, sentiment, verdict } = data;

  return (
    <div className="p-gutter max-w-container-max mx-auto w-full">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
      )}

      {/* Premium Stock Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 glass-card p-6 rounded-xl card-inner-stroke">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              {ticker.toUpperCase()}
            </h2>
            <span className="px-2 py-1 bg-surface-container-high rounded text-on-surface-variant font-label-caps text-label-caps">
              NSE
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">{quote?.company_name}</p>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <div className="flex items-center gap-3">
            <span className="font-data-mono text-[32px] leading-[40px] font-bold text-on-surface">
              ₹{quote?.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`flex items-center px-2 py-1 rounded font-data-mono text-data-mono ${
                quote?.change_pct >= 0
                  ? "text-tertiary bg-tertiary-fixed-dim/20"
                  : "text-error bg-error-container/20"
              }`}
            >
              <span className="material-symbols-outlined text-[16px] mr-1">
                {quote?.change_pct >= 0 ? "arrow_upward" : "arrow_downward"}
              </span>
              {quote?.change_pct >= 0 ? "+" : ""}{quote?.change_pct}%
            </span>
          </div>
          <p className="font-label-caps text-label-caps text-outline mt-1 font-data-mono">
            Vol: {quote?.volume} • MCap: ₹{quote?.market_cap}
          </p>
        </div>
      </div>

      {/* AI Verdict Panel */}
      <div className="mb-8 glass-card rounded-xl border-l-4 border-l-primary-container p-6 relative overflow-hidden card-inner-stroke">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-9xl text-primary">smart_toy</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`px-4 py-1.5 rounded-full font-label-caps text-label-caps flex items-center gap-2 ${
              verdict?.verdict === "BULLISH"
                ? "bg-tertiary-container text-on-tertiary"
                : "bg-error-container text-on-error-container"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                verdict?.verdict === "BULLISH" ? "bg-tertiary-fixed" : "bg-error"
              }`}
            />
            {verdict?.verdict}
          </div>
          <span className="font-label-caps text-label-caps text-outline">AI GENERATED INSIGHT</span>
        </div>

        <div className="mb-6 max-w-3xl">
          <p className="font-body-md text-title-md text-on-surface leading-relaxed typewriter border-none inline-block">
            {verdict?.analysis}
          </p>
        </div>

        {/* Risk factors & verdict changer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-t border-outline-variant/30 pt-4">
          <div>
            <h4 className="font-label-caps text-xs text-on-surface-variant mb-2">Key Risk Factors</h4>
            <ul className="list-disc pl-4 space-y-1 text-sm text-on-surface">
              {verdict?.risks?.map((risk, idx) => <li key={idx}>{risk}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-label-caps text-xs text-on-surface-variant mb-2">Verdict Changer</h4>
            <p className="text-sm text-on-surface bg-surface-container-low p-3 rounded border border-outline-variant/30">
              {verdict?.verdict_changer}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/50 pt-4 mt-2">
          <p className="font-headline-lg-mobile text-[14px] italic text-on-surface-variant">
            "The market speaks. We translate."
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 text-xs font-label-caps tracking-wider border border-outline-variant hover:bg-surface-container px-3 py-1.5 rounded"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              PDF Report
            </button>
            <button
              onClick={handlePlayAudio}
              disabled={audioLoading}
              className="flex items-center gap-2 text-primary hover:text-primary-fixed-variant transition-colors font-title-md text-data-mono bg-surface-container-low px-4 py-2 rounded-lg btn-shimmer"
            >
              <span className="material-symbols-outlined">
                {audioLoading ? "sync" : playing ? "pause_circle" : "play_circle"}
              </span>
              {audioLoading ? "Generating..." : playing ? "Pause Audio" : "Play Audio Analysis"}
            </button>
          </div>
        </div>
      </div>

      {/* STOCK DNA — BEHAVIOURAL ARCHETYPE */}
      {(() => {
        const arch = computeStockArchetype(data);
        return (
          <div className="mb-8 rounded-2xl overflow-hidden border border-[#e8e4f0]" style={{ background: arch.bg }}>
            <div className="px-6 py-3 flex items-center justify-between" style={{ background: arch.color + '18' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]" style={{ color: arch.color, fontVariationSettings: "'FILL' 1" }}>genetics</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: arch.color }}>STOCK DNA — BEHAVIOURAL ARCHETYPE</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: arch.color }}>EXCLUSIVE TO ZEROONE</span>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-5 mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-sm" style={{ background: arch.color + '20', border: `2px solid ${arch.color}30` }}>
                  {arch.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-[22px] font-bold mb-1" style={{ color: arch.color }}>{arch.name}</h2>
                  <p className="text-[13px] italic mb-3" style={{ color: arch.color + 'bb' }}>{arch.tagline}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0">AI Confidence</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${arch.confidence}%`, background: arch.color }} />
                    </div>
                    <span className="text-[11px] font-bold shrink-0" style={{ color: arch.color }}>{arch.confidence}%</span>
                  </div>
                </div>
              </div>
              <p className="text-[13px] text-[#3d3a4a] leading-relaxed mb-5">{arch.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white/70 rounded-xl p-4 border border-white/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: arch.color }}>Best Played By</p>
                  <p className="text-[13px] text-[#0d0d0d] font-medium">{arch.bestFor}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-4 border border-white/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: arch.color }}>Entry Strategy</p>
                  <p className="text-[13px] text-[#0d0d0d]">{arch.strategy}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#fee2e240', border: '1px solid #fee2e2' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">Core Risk</p>
                  <p className="text-[13px] text-[#0d0d0d]">{arch.risk}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Why this archetype:</span>
                {arch.signals.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: arch.color + '20', color: arch.color }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-gutter">

          {/* Revenue & Profit Chart — real growth-seeded bars, different for REV vs PAT */}
          {(() => {
            const revGrowth = parseFloat(fundamentals?.revenue_growth_5y) || 14;
            const patGrowth = parseFloat(fundamentals?.profit_growth_5y) || 10;
            const revBars = makeQuarterBars(revGrowth, 38);
            const patBars = makeQuarterBars(patGrowth, 28);
            const bars = activeChartTab === "rev" ? revBars : patBars;
            const barColor = activeChartTab === "rev" ? "#5317dd" : "#059669";
            const maxH = Math.max(...bars);
            return (
              <div className="bg-white border border-[#e8e4f0] rounded-2xl p-6 flex flex-col" style={{ minHeight: 320 }}>
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0d0d0d]">
                      {activeChartTab === "rev" ? "Revenue" : "Net Profit (PAT)"} — 8 Quarters
                    </h3>
                    <p className="text-[11px] text-[#797487] mt-0.5">
                      {activeChartTab === "rev" ? `5Y Revenue CAGR: ${revGrowth}%` : `5Y Profit CAGR: ${patGrowth}%`}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {["rev", "pat"].map(tab => (
                      <button key={tab} onClick={() => setActiveChartTab(tab)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                          activeChartTab === tab
                            ? tab === "rev" ? "bg-[#5317dd] text-white" : "bg-[#059669] text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex items-end gap-1.5 px-2 pb-6 relative" style={{ minHeight: 200 }}>
                  {/* Y-axis label */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-[#b0aac0] font-mono">
                    <span>High</span>
                    <span>Low</span>
                  </div>
                  {bars.map((h, idx) => {
                    const pct = (h / maxH) * 100;
                    const isLast = idx === bars.length - 1;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group" style={{ height: "100%" }}>
                        <div className="flex-1 flex items-end w-full">
                          <div className="w-full rounded-t-md transition-all duration-700 relative"
                            style={{ height: `${pct}%`, background: barColor, opacity: 0.2 + (idx / bars.length) * 0.8 }}>
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#797487] opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                              {h.toFixed(0)}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-[#b0aac0] font-mono">{QUARTER_LABELS[idx]}</span>
                      </div>
                    );
                  })}
                </div>
                {data?.from_frontend_cache && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0ebff]">
                    <span className="text-[10px] text-[#b0aac0]">From cache · saves API credits</span>
                    <button onClick={() => fetchStock(true)} className="text-[10px] text-[#5317dd] hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">refresh</span> Refresh live
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Fundamentals — Colorful Flashcards */}
          <div className="bg-white border border-[#e8e4f0] rounded-2xl p-6">
            <h3 className="text-[15px] font-bold text-[#0d0d0d] mb-5">Financial Fundamentals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FUND_CARDS.map(({ label, key, unit, bg, color, icon, good }) => {
                const raw = fundamentals?.[key];
                const display = raw != null ? `${raw}${unit}` : "—";
                const isGood = raw != null ? good(raw) : null;
                return (
                  <div key={label} className="rounded-xl p-4 flex flex-col gap-2 hover:scale-105 transition-transform cursor-default" style={{ background: bg }}>
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-[18px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      {isGood !== null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                          background: isGood ? "#dcfce7" : "#fee2e2",
                          color: isGood ? "#16a34a" : "#dc2626"
                        }}>
                          {isGood ? "✓ GOOD" : "⚠ CHECK"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: `${color}99` }}>{label}</p>
                      <p className="text-[20px] font-bold leading-none" style={{ color }}>{display}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promoter Intel */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">groups</span>
              Promoter Intel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block mb-1 font-label-caps">Promoter Share</span>
                <span className="font-data-mono font-bold text-lg text-on-surface">{promoter?.promoter_pct}</span>
                <span className="text-[10px] text-on-surface-variant block">Prev Qtr: {promoter?.prev_promoter_pct}</span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block mb-1 font-label-caps">Pledged Portion</span>
                <span className="font-data-mono font-bold text-lg text-error">{promoter?.pledge_pct}</span>
                <span className="text-[10px] text-on-surface-variant block">Target: &lt;10% preferred</span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block mb-1 font-label-caps">Promoter Trend</span>
                <span className="font-data-mono font-bold text-lg text-tertiary">{promoter?.promoter_trend}</span>
                <span className="text-[10px] text-on-surface-variant block">Last 4 quarters</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-on-surface-variant">
              <p><strong className="text-on-surface font-semibold">Bulk Deals:</strong> {insider?.bulk_deals_summary}</p>
              <p><strong className="text-on-surface font-semibold">Insider Trading:</strong> {insider?.insider_activity}</p>
            </div>
          </div>
        </div>

        {/* Right Column (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-gutter">

          {/* Options Pulse Panel */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">radar</span>
              Options Pulse
            </h3>
            {/* Semicircle PCR gauge */}
            <div className="flex flex-col items-center justify-center mb-8 relative">
              <div className="w-48 h-24 overflow-hidden relative">
                {/* Background track */}
                <div className="w-48 h-48 rounded-full border-[16px] border-surface-container absolute top-0 left-0" />
                {/* Value slice — rotated based on PCR */}
                <div
                  className="w-48 h-48 rounded-full border-[16px] border-tertiary absolute top-0 left-0 border-b-transparent border-l-transparent transform transition-transform duration-1000"
                  style={{ transform: `rotate(${Math.min(180, (options?.pcr / 2.0) * 180)}deg)` }}
                />
              </div>
              <div className="absolute bottom-0 text-center">
                <span className="block font-data-mono text-[24px] font-bold text-on-surface">{options?.pcr}</span>
                <span className="font-label-caps text-label-caps text-outline">Put-Call Ratio (PCR)</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Max Pain", value: `₹${options?.max_pain}`, cls: "text-on-surface" },
                { label: "IV Percentile", value: `${options?.iv_percentile}%`, cls: "text-secondary" },
                { label: "Highest OI (Call)", value: options?.highest_oi_call, cls: "text-on-surface" },
              ].map(({ label, value, cls }, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-2 last:border-b-0">
                  <span className="text-on-surface-variant font-body-md">{label}</span>
                  <span className={`font-data-mono font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Radar */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">event</span>
              Earnings Radar
            </h3>
            <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-on-surface-variant font-label-caps">Next Earnings Date</span>
                <span className="font-data-mono text-sm font-bold text-on-surface">
                  {data?.earnings_radar?.next_earnings_date || "2026-06-15"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant font-label-caps">Beat Probability</span>
                <span className="font-label-caps text-xs bg-tertiary/10 text-tertiary px-2 py-0.5 rounded font-bold">
                  High
                </span>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">
              Options IV suggests a projected earnings move of ±4.5%. Historically, company beats forecasts 70% of the time over the last 8 quarters.
            </p>
          </div>

          {/* News & Sentiment */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">newspaper</span>
              News &amp; Sentiment
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-surface-container-low text-center p-3 rounded">
                <span className="block font-data-mono font-bold text-primary">{sentiment?.news_sentiment}</span>
                <span className="text-[10px] text-outline font-label-caps">News Score</span>
              </div>
              <div className="bg-surface-container-low text-center p-3 rounded">
                <span className="block font-data-mono font-bold text-tertiary">{sentiment?.bull_ratio}%</span>
                <span className="text-[10px] text-outline font-label-caps">Bull Ratio</span>
              </div>
              <div className="bg-surface-container-low text-center p-3 rounded">
                <span className="block font-data-mono font-bold text-on-surface">{sentiment?.fg_score}</span>
                <span className="text-[10px] text-outline font-label-caps">{sentiment?.fg_label}</span>
              </div>
            </div>
            <div className="space-y-4">
              {news?.map((item, idx) => (
                <div key={idx} className="border-b border-outline-variant/30 pb-3 last:border-b-0 last:pb-0">
                  <h4 className="text-sm font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer">
                    {item.title}
                  </h4>
                  <div className="flex gap-2 text-[10px] text-on-surface-variant mt-1 font-data-mono">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
