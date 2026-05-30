import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

const QUARTER_HEIGHTS = ["30%", "45%", "35%", "55%", "50%", "70%", "65%", "85%"];
const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"];

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

export default function StockView() {
  const { ticker } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState("pat");
  const audioRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAudioUrl(null);
    setPlaying(false);
    const fetchStock = async () => {
      try {
        const res = await api.getStock(ticker);
        if (active) setData(res);
      } catch {
        if (active) setData(generateMockStockData(ticker.toUpperCase()));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStock();
    return () => { active = false; };
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

  if (!data) {
    return (
      <div className="text-center p-12">
        <p className="text-error font-bold">Failed to load stock data.</p>
      </div>
    );
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

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-gutter">

          {/* Revenue & Profit Chart (Faux bars matching Stitch) */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-title-md text-title-md text-on-surface">Revenue &amp; Profit (8 Quarters)</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveChartTab("rev")}
                  className={`px-3 py-1 text-xs font-label-caps rounded transition-colors ${
                    activeChartTab === "rev"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  REV
                </button>
                <button
                  onClick={() => setActiveChartTab("pat")}
                  className={`px-3 py-1 text-xs font-label-caps rounded transition-colors ${
                    activeChartTab === "pat"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  PAT
                </button>
              </div>
            </div>
            {/* Faux bar chart — exact Stitch design */}
            <div className="flex-1 w-full bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex items-end justify-between p-4 relative">
              {QUARTER_LABELS.map((label, idx) => {
                const opacity = (idx + 1) / QUARTER_LABELS.length;
                return (
                  <div
                    key={label}
                    className="relative group flex flex-col items-center flex-1 mx-1"
                    style={{ height: "100%" }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 font-data-mono text-on-surface-variant whitespace-nowrap">
                      {label}
                    </span>
                    <div
                      className="w-full rounded-t-sm transition-colors hover:opacity-80 absolute bottom-0"
                      style={{
                        height: QUARTER_HEIGHTS[idx],
                        backgroundColor: `rgba(83, 23, 221, ${0.2 + opacity * 0.8})`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fundamentals Grid */}
          <div className="glass-card rounded-xl p-6 card-inner-stroke">
            <h3 className="font-title-md text-title-md text-on-surface mb-6">Financial Fundamentals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "P/E Ratio", value: fundamentals?.pe },
                { label: "P/B Ratio", value: fundamentals?.pb },
                { label: "ROE", value: `${fundamentals?.roe}%` },
                { label: "ROCE", value: `${fundamentals?.roce}%` },
                { label: "Debt/Equity", value: fundamentals?.de },
                { label: "Interest Coverage", value: `${fundamentals?.interest_coverage}x` },
                { label: "Revenue Growth (5Y)", value: `${fundamentals?.revenue_growth_5y}%` },
                { label: "Profit Growth (5Y)", value: `${fundamentals?.profit_growth_5y}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/30">
                  <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">{label}</span>
                  <span className="font-data-mono text-lg font-bold text-on-surface">{value}</span>
                </div>
              ))}
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
