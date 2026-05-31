import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const DEFAULT_PREFS = {
  name: "",
  email: "",
  defaultTicker: "RELIANCE",
  refreshInterval: "15",
  notifications: true,
  earningsAlerts: true,
  priceAlerts: false,
  voiceEnabled: false,
  watchlist: ["RELIANCE", "INFY", "HDFCBANK", "TCS", "TATAMOTORS"],
};

function Section({ title, icon, children }) {
  return (
    <div className="glass-card rounded-xl card-inner-stroke overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        <h3 className="font-title-md text-[15px] font-semibold text-on-surface">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? "bg-primary" : "bg-surface-container-high"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [apiStatus, setApiStatus] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);

  // Load saved prefs
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("zo_prefs") || "{}");
      setPrefs(p => ({ ...p, ...stored }));
    } catch { /* ignore */ }

    // Check backend health
    api.health().then(d => {
      setApiStatus(d);
      setApiLoading(false);
    }).catch(() => {
      setApiStatus(null);
      setApiLoading(false);
    });
  }, []);

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const saveAll = () => {
    try {
      localStorage.setItem("zo_prefs", JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
  };

  const addToWatchlist = () => {
    const sym = watchlistInput.trim().toUpperCase();
    if (!sym || prefs.watchlist.includes(sym)) { setWatchlistInput(""); return; }
    set("watchlist", [...prefs.watchlist, sym]);
    setWatchlistInput("");
  };

  const removeFromWatchlist = (sym) => {
    set("watchlist", prefs.watchlist.filter(s => s !== sym));
  };

  const clearHistory = () => {
    localStorage.removeItem("zo_recent_analyses");
  };

  const nameInitial = prefs.name ? prefs.name.charAt(0).toUpperCase() : "Z";

  return (
    <div className="p-gutter max-w-container-max mx-auto w-full space-y-6">

      {/* ── Header ── */}
      <div className="glass-card rounded-xl p-6 card-inner-stroke flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl shrink-0">
            {nameInitial}
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Settings</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {prefs.name || "Your Name"} · {prefs.email || "your@email.com"}
            </p>
          </div>
        </div>
        <button
          onClick={saveAll}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-label-caps text-sm font-bold transition-all ${
            saved
              ? "bg-tertiary text-white"
              : "bg-primary text-white hover:opacity-90"
          }`}
        >
          <span className="material-symbols-outlined text-sm">{saved ? "check_circle" : "save"}</span>
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Profile ── */}
        <Section title="Profile" icon="person">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5">Display Name</label>
              <input
                value={prefs.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Your Name"
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5">Email Address</label>
              <input
                value={prefs.email}
                onChange={e => set("email", e.target.value)}
                placeholder="your@email.com"
                type="email"
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5">Default Ticker</label>
              <input
                value={prefs.defaultTicker}
                onChange={e => set("defaultTicker", e.target.value.toUpperCase())}
                placeholder="RELIANCE"
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2.5 text-sm font-data-mono text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-on-surface-variant mt-1">Opens when you click Stock Intelligence in the nav</p>
            </div>
          </div>
        </Section>

        {/* ── Notifications & Alerts ── */}
        <Section title="Notifications & Alerts" icon="notifications">
          <div>
            <Toggle
              label="Push Notifications"
              description="Get alerts for major market moves"
              value={prefs.notifications}
              onChange={v => set("notifications", v)}
            />
            <Toggle
              label="Earnings Radar Alerts"
              description="Alert when a watched stock reports in 72h"
              value={prefs.earningsAlerts}
              onChange={v => set("earningsAlerts", v)}
            />
            <Toggle
              label="Price Movement Alerts"
              description="Alert on ±5% intraday moves"
              value={prefs.priceAlerts}
              onChange={v => set("priceAlerts", v)}
            />
            <Toggle
              label="AI Voice Narration"
              description="Enable ElevenLabs voice on stock reports"
              value={prefs.voiceEnabled}
              onChange={v => set("voiceEnabled", v)}
            />
          </div>
        </Section>

        {/* ── Data Preferences ── */}
        <Section title="Data Preferences" icon="tune">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5">MarketPulse Refresh Interval</label>
              <select
                value={prefs.refreshInterval}
                onChange={e => set("refreshInterval", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes (default)</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
              </select>
            </div>
            <div className="pt-2 border-t border-outline-variant/30">
              <p className="text-sm font-medium text-on-surface mb-1">Browser History</p>
              <p className="text-xs text-on-surface-variant mb-3">Stores your recently analysed stocks locally in this browser.</p>
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-lg text-xs font-label-caps hover:bg-error/20 transition-colors"
              >
                Clear Recent Analyses
              </button>
            </div>
          </div>
        </Section>

        {/* ── Watchlist ── */}
        <Section title="My Watchlist" icon="bookmarks">
          <div>
            <div className="flex gap-2 mb-4">
              <input
                value={watchlistInput}
                onChange={e => setWatchlistInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && addToWatchlist()}
                placeholder="Add ticker (e.g. WIPRO)"
                className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-sm font-data-mono text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={addToWatchlist}
                disabled={!watchlistInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-label-caps disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
            {prefs.watchlist.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">No stocks in watchlist yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {prefs.watchlist.map(sym => (
                  <div key={sym}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg group"
                  >
                    <button
                      onClick={() => navigate(`/stock/${sym}`)}
                      className="font-data-mono text-sm font-bold text-on-surface hover:text-primary transition-colors"
                    >{sym}</button>
                    <button
                      onClick={() => removeFromWatchlist(sym)}
                      className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

      </div>

      {/* ── System & API Status ── */}
      <Section title="System Status" icon="monitor_heart">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Backend */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${apiLoading ? "bg-yellow-500 animate-pulse" : apiStatus ? "bg-tertiary" : "bg-error"}`} />
              <span className="font-label-caps text-[10px] text-on-surface-variant">BACKEND</span>
            </div>
            <p className="font-data-mono text-sm text-on-surface font-bold">
              {apiLoading ? "Checking…" : apiStatus ? "Online" : "Offline"}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1">FastAPI · Cloud Run</p>
          </div>

          {/* AI Stack */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span className="font-label-caps text-[10px] text-on-surface-variant">AI ENGINE</span>
            </div>
            <p className="font-data-mono text-sm text-on-surface font-bold">Groq Llama 3.3</p>
            <p className="text-[10px] text-on-surface-variant mt-1">Fallback: Gemini Flash</p>
          </div>

          {/* Data */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-caps text-[10px] text-on-surface-variant">DATA WIRES</span>
            </div>
            <p className="font-data-mono text-sm text-on-surface font-bold">8 Connectors</p>
            <p className="text-[10px] text-on-surface-variant mt-1">NSE · BSE · Screener · ET</p>
          </div>

          {/* Voice */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-label-caps text-[10px] text-on-surface-variant">VOICE TTS</span>
            </div>
            <p className="font-data-mono text-sm text-on-surface font-bold">ElevenLabs</p>
            <p className="text-[10px] text-on-surface-variant mt-1">eleven_multilingual_v2</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center justify-between">
          <div className="text-xs text-on-surface-variant font-data-mono">
            ZeroOne v1.0 · The market speaks. We translate.
          </div>
          <button
            onClick={() => navigate("/assistant")}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-label-caps"
          >
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            Open AI Assistant
          </button>
        </div>
      </Section>

    </div>
  );
}
