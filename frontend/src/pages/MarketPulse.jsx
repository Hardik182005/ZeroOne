import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { api } from "../api/client";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function SignalBadge({ score }) {
  if (score >= 8) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-label-caps bg-tertiary/20 text-tertiary border border-tertiary/30">
      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
      {score}/10 FRESH
    </span>
  );
  if (score >= 6) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-label-caps bg-secondary/20 text-secondary border border-secondary/30">
      {score}/10 PARTIAL
    </span>
  );
  if (score >= 4) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-label-caps bg-on-surface-variant/10 text-on-surface-variant border border-outline-variant">
      {score}/10 PRICED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-label-caps bg-error/10 text-error border border-error/20">
      {score}/10 OLD
    </span>
  );
}

function SentimentChip({ sentiment }) {
  const map = {
    Bullish: "bg-tertiary/10 text-tertiary border-tertiary/20",
    Cautious: "bg-primary/10 text-primary border-primary/20",
    Neutral: "bg-on-surface-variant/10 text-on-surface-variant border-outline-variant",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-label-caps border ${map[sentiment] || map.Neutral}`}>
      {sentiment}
    </span>
  );
}

function NarrativeCard({ narrative, onClick }) {
  const { headline, topic, affected_tickers = [], signal_noise_score, sentiment, summary, sources = [], timestamp } = narrative;
  const timeAgo = timestamp ? (() => {
    try {
      const diff = Date.now() - new Date(timestamp).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return h > 0 ? `${h}h ago` : `${m}m ago`;
    } catch { return ""; }
  })() : "";

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl p-5 card-inner-stroke hover:border-primary/30 transition-all cursor-pointer flex flex-col gap-3 group border border-outline-variant/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wide">
          {topic}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <SentimentChip sentiment={sentiment} />
          <SignalBadge score={signal_noise_score} />
        </div>
      </div>

      <h3 className="font-title-md text-[14px] font-semibold text-on-surface leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {headline}
      </h3>

      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{summary}</p>

      <div className="flex flex-wrap gap-1 mt-1">
        {affected_tickers.slice(0, 4).map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-surface-container-high rounded text-[11px] font-data-mono text-on-surface hover:bg-primary hover:text-white transition-colors"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30 text-[10px] text-on-surface-variant font-data-mono">
        <span>{sources.slice(0, 2).join(" · ")}{sources.length > 2 ? ` +${sources.length - 2}` : ""}</span>
        <span>{timeAgo}</span>
      </div>
    </div>
  );
}

function FearGreedGauge({ score = 55, label = "Neutral" }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? "#005a3e" : pct >= 55 ? "#4caf50" : pct >= 45 ? "#ff9800" : pct >= 25 ? "#f44336" : "#9c27b0";
  const rotation = -90 + (pct / 100) * 180;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-18 overflow-hidden mb-2">
        <svg viewBox="0 0 120 60" className="w-36 h-18">
          <path d="M10 55 A50 50 0 0 1 110 55" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round" />
          <path
            d="M10 55 A50 50 0 0 1 110 55"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 157} 157`}
          />
          <line
            x1="60" y1="55"
            x2={60 + 35 * Math.cos(((rotation - 90) * Math.PI) / 180)}
            y2={55 + 35 * Math.sin(((rotation - 90) * Math.PI) / 180)}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="60" cy="55" r="4" fill={color} />
        </svg>
      </div>
      <div className="font-data-mono text-2xl font-bold" style={{ color }}>{score}</div>
      <div className="font-label-caps text-[11px] text-on-surface-variant mt-0.5">{label}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container border border-outline-variant rounded-lg p-3 text-xs shadow-lg">
      <p className="font-label-caps text-on-surface-variant mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-data-mono" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function PlaybackTimeline({ snapshots, currentIndex, onSelect }) {
  if (!snapshots?.length) return null;
  const snap = snapshots[currentIndex];
  const narrative = snap?.narratives?.[0];
  const ts = snap?.timestamp ? new Date(snap.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="glass-card rounded-xl p-6 card-inner-stroke">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">history</span>
          Narrative Playback — Last {snapshots.length}h
        </h3>
        <span className="font-data-mono text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded">
          {ts}
        </span>
      </div>

      {/* Timeline scrubber */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => onSelect(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>

        <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
          {snapshots.map((s, i) => {
            const label = s.timestamp ? new Date(s.timestamp).getHours() + "h" : `T${i}`;
            const isActive = i === currentIndex;
            const score = s.narratives?.[0]?.signal_noise_score ?? 5;
            const barH = Math.round((score / 10) * 32);
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                title={label}
                className={`flex flex-col items-center gap-1 shrink-0 transition-all ${isActive ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
              >
                <div
                  className={`w-4 rounded-sm transition-colors ${isActive ? "bg-primary" : "bg-surface-container-high"}`}
                  style={{ height: `${barH}px`, minHeight: "4px" }}
                />
                <span className={`text-[9px] font-data-mono ${isActive ? "text-primary" : "text-on-surface-variant"}`}>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onSelect(Math.min(snapshots.length - 1, currentIndex + 1))}
          disabled={currentIndex === snapshots.length - 1}
          className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      {/* Snapshot card */}
      {narrative && (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{narrative.topic}</span>
            <div className="flex gap-2">
              <SentimentChip sentiment={narrative.sentiment} />
              <SignalBadge score={narrative.signal_noise_score} />
            </div>
          </div>
          <p className="text-sm font-medium text-on-surface mb-2 leading-snug">{narrative.headline}</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">{narrative.summary}</p>
          <div className="flex gap-1 mt-3">
            {(narrative.affected_tickers || []).slice(0, 4).map((t) => (
              <span key={t} className="px-2 py-0.5 bg-surface-container rounded text-[11px] font-data-mono text-on-surface">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketPulse() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getMarketPulse();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("MarketPulse API unavailable, showing mock data.", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const res = await api.getMarketPulseSnapshots();
      if (res?.snapshots?.length) {
        setSnapshots(res.snapshots);
        setPlaybackIndex(res.snapshots.length - 1);
      }
    } catch {
      // silence — synthetic fallback shown
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadSnapshots();
    const interval = setInterval(() => loadData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData, loadSnapshots]);

  // Auto-play playback
  useEffect(() => {
    if (autoPlay && snapshots.length > 0) {
      autoPlayRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    } else {
      clearInterval(autoPlayRef.current);
    }
    return () => clearInterval(autoPlayRef.current);
  }, [autoPlay, snapshots.length]);

  const narratives = data?.narratives || [];
  const fearGreed = data?.fear_greed || { fg_score: 55, fg_label: "Neutral" };
  const sentimentHistory = data?.sentiment_history || [];
  const trendingSymbols = data?.trending_symbols || [];
  const fiiDii = data?.fii_dii || {};

  const divergencePoints = sentimentHistory.filter(
    (d) => Math.abs(d.retail_sentiment - d.institutional_sentiment) > 15
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-label-caps text-on-surface-variant animate-pulse">Scanning Narratives...</p>
      </div>
    );
  }

  return (
    <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">

      {/* ── Header ── */}
      <section className="glass-card rounded-xl p-6 card-inner-stroke flex flex-col md:flex-row gap-4 justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">MarketPulse</h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-tertiary/10 border border-tertiary/30 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              <span className="font-label-caps text-[10px] text-tertiary">LIVE</span>
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Real-time narrative tracker — detect when market stories shift before prices do.
          </p>
          {lastRefreshed && (
            <p className="text-[10px] text-on-surface-variant/60 font-data-mono mt-1">
              Refreshed {lastRefreshed.toLocaleTimeString("en-IN")} · Auto-updates every 15 min
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setPlaybackActive((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-caps text-xs transition-all border ${
              playbackActive
                ? "bg-primary text-white border-primary"
                : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{playbackActive ? "stop_circle" : "history"}</span>
            {playbackActive ? "Exit Playback" : "Playback Mode"}
          </button>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-label-caps text-xs bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      {/* ── Narrative Cards ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">campaign</span>
            Active Narratives
            <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">{narratives.length} DETECTED</span>
          </h3>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-data-mono">
            <span>Signal score: 1 = priced in → 10 = fresh</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {narratives.map((n) => (
            <NarrativeCard
              key={n.id}
              narrative={n}
              onClick={() => n.affected_tickers?.[0] && navigate(`/stock/${n.affected_tickers[0]}`)}
            />
          ))}
        </div>
      </section>

      {/* ── Sentiment Delta Chart + Fear & Greed ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

        {/* Sentiment Delta */}
        <div className="lg:col-span-8 glass-card rounded-xl p-6 card-inner-stroke">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">ssid_chart</span>
              Sentiment Delta — Retail vs Institutional (24h)
            </h3>
            {divergencePoints.length > 0 && (
              <span className="font-label-caps text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full animate-pulse">
                {divergencePoints.length} DIVERGENCE SIGNALS
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mb-4">
            Gaps between retail and institutional sentiment historically signal contrarian opportunities.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  stroke="#797487"
                  fontSize={9}
                  interval={3}
                  tick={{ fill: "#797487" }}
                />
                <YAxis stroke="#797487" fontSize={9} domain={[0, 100]} tick={{ fill: "#797487" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                  formatter={(v) => <span style={{ color: "#9B97A6", fontSize: "10px" }}>{v}</span>}
                />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="retail_sentiment"
                  name="Retail Sentiment"
                  stroke="#6c3ff5"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="institutional_sentiment"
                  name="Institutional"
                  stroke="#005a3e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="fear_greed"
                  name="Fear & Greed"
                  stroke="#ff9800"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right panel — Fear & Greed + Trending + FII */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">

          {/* Fear & Greed */}
          <div className="glass-card rounded-xl p-5 card-inner-stroke flex flex-col items-center">
            <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-3 w-full">FEAR & GREED INDEX</h4>
            <FearGreedGauge score={fearGreed.fg_score} label={fearGreed.fg_label} />
            <div className="mt-4 w-full grid grid-cols-3 text-center text-[10px] text-on-surface-variant font-label-caps gap-1">
              <span className="text-error">Extreme Fear</span>
              <span>Neutral</span>
              <span className="text-tertiary">Extreme Greed</span>
            </div>
          </div>

          {/* FII/DII */}
          {(fiiDii.fii_net !== undefined) && (
            <div className="glass-card rounded-xl p-5 card-inner-stroke">
              <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-3">TODAY'S FLOW</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">FII Net</span>
                  <span className={`font-data-mono text-sm font-bold ${fiiDii.fii_net >= 0 ? "positive" : "negative"}`}>
                    {fiiDii.fii_net >= 0 ? "+" : ""}₹{fiiDii.fii_net} Cr
                  </span>
                </div>
                {fiiDii.dii_net !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">DII Net</span>
                    <span className={`font-data-mono text-sm font-bold ${fiiDii.dii_net >= 0 ? "positive" : "negative"}`}>
                      {fiiDii.dii_net >= 0 ? "+" : ""}₹{fiiDii.dii_net} Cr
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trending Symbols */}
          {trendingSymbols.length > 0 && (
            <div className="glass-card rounded-xl p-5 card-inner-stroke">
              <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">trending_up</span>
                TRENDING ON SOCIAL
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {trendingSymbols.slice(0, 8).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => navigate(`/stock/${sym}`)}
                    className="px-2.5 py-1 bg-surface-container rounded font-data-mono text-xs text-on-surface hover:bg-primary hover:text-white transition-colors"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Playback Mode ── */}
      {playbackActive && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">replay</span>
              Narrative Evolution Playback
            </h3>
            <button
              onClick={() => { setAutoPlay((v) => !v); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-caps text-xs transition-all border ${
                autoPlay
                  ? "bg-error text-white border-error"
                  : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{autoPlay ? "pause" : "play_arrow"}</span>
              {autoPlay ? "Pause" : "Auto Play"}
            </button>
          </div>
          {snapshotsLoading ? (
            <div className="glass-card rounded-xl p-8 card-inner-stroke flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-on-surface-variant font-label-caps text-xs">Loading snapshots...</span>
            </div>
          ) : (
            <PlaybackTimeline
              snapshots={snapshots}
              currentIndex={playbackIndex}
              onSelect={setPlaybackIndex}
            />
          )}
        </section>
      )}

      {/* ── What is this? ── */}
      <section className="glass-card rounded-xl p-5 card-inner-stroke border-l-4 border-l-secondary">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">info</span>
          <div>
            <p className="font-title-md text-[13px] font-semibold text-on-surface mb-1">How MarketPulse Works</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">Narrative Detection:</strong> Wire pulls headlines from Economic Times, Moneycontrol, and Reuters India simultaneously. AI extracts the dominant story and maps it to affected tickers. &nbsp;
              <strong className="text-on-surface">Signal vs Noise:</strong> A 1–10 score tells you whether the news is already priced into the stock (1) or is genuinely fresh market-moving information (10). &nbsp;
              <strong className="text-on-surface">Sentiment Delta:</strong> StockTwits retail sentiment vs FII institutional flow — when they diverge by 15+ points, that gap is historically the clearest contrarian signal. &nbsp;
              <strong className="text-on-surface">Playback Mode:</strong> Scrub through 48 hours of narrative snapshots to see exactly how a story evolved before the price moved.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
