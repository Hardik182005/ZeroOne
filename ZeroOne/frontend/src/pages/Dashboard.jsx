import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("gainers");
  const [sectors, setSectors] = useState([
    { name: "IT", change: 1.2 },
    { name: "BANK", change: -0.8 },
    { name: "AUTO", change: 2.1 },
    { name: "FMCG", change: 0.1 },
    { name: "PHARMA", change: 0.5 },
    { name: "METAL", change: -1.5 },
    { name: "REALTY", change: -0.3 },
    { name: "MEDIA", change: 0.0 },
    { name: "ENERGY", change: 1.8 },
    { name: "INFRA", change: 0.4 },
    { name: "PSU", change: -0.7 },
    { name: "MNCS", change: 0.2 }
  ]);

  const [gainers] = useState([
    { symbol: "RELIANCE", ltp: "2,934.50", chg: "+34.80", pct: "+1.20%", vol: "12.4M" },
    { symbol: "TCS", ltp: "3,980.15", chg: "+45.20", pct: "+1.15%", vol: "3.2M" },
    { symbol: "BHARTIARTL", ltp: "1,215.60", chg: "+11.40", pct: "+0.95%", vol: "8.1M" },
    { symbol: "ITC", ltp: "435.20", chg: "+3.50", pct: "+0.81%", vol: "15.6M" },
    { symbol: "INFY", ltp: "1,489.20", chg: "+11.80", pct: "+0.80%", vol: "5.4M" }
  ]);

  const [losers] = useState([
    { symbol: "HDFCBANK", ltp: "1,532.10", chg: "-18.50", pct: "-1.19%", vol: "9.2M" },
    { symbol: "ICICIBANK", ltp: "1,110.20", chg: "-10.80", pct: "-0.96%", vol: "6.8M" },
    { symbol: "SBI", ltp: "825.40", chg: "-6.20", pct: "-0.75%", vol: "11.1M" },
    { symbol: "AXISBANK", ltp: "1,154.00", chg: "-5.80", pct: "-0.50%", vol: "4.5M" },
    { symbol: "LT", ltp: "3,480.00", chg: "-15.00", pct: "-0.43%", vol: "2.1M" }
  ]);

  const [signals] = useState([
    { symbol: "TATASTEEL", verdict: "BULLISH", time: "10m ago", text: "Strong breakout above 200 DMA with heavy volume accumulation pattern detected in last 3 trading sessions." },
    { symbol: "HDFCBANK", verdict: "AVOID", time: "45m ago", text: "NIM compression concerns persisting. FII outflow detected in pre-market block deals. Support at 1500 vulnerable." },
    { symbol: "MARUTI", verdict: "BULLISH", time: "1h ago", text: "Rural demand recovery indicators aligning with favorable yen depreciation. Target upgrade likely from major brokerages." }
  ]);

  useEffect(() => {
    let active = true;
    const loadDashboardData = async () => {
      try {
        const sectorData = await api.getSectors();
        if (sectorData && active) {
          if (sectorData.sectors) setSectors(sectorData.sectors);
        }
      } catch (err) {
        // silently use defaults
      }
    };
    loadDashboardData();
    return () => { active = false; };
  }, []);

  const handleRowClick = (symbol) => navigate(`/stock/${symbol}`);

  const getHeatmapColor = (change) => {
    if (change > 1.5) return "bg-tertiary/40 border-tertiary/50";
    if (change > 0.5) return "bg-tertiary/20 border-tertiary/30";
    if (change > 0) return "bg-tertiary/10 border-tertiary/20";
    if (change === 0) return "bg-surface-container border-outline-variant";
    if (change > -0.5) return "bg-primary/10 border-primary/20";
    if (change > -1.5) return "bg-primary/20 border-primary/30";
    return "bg-primary/40 border-primary/50";
  };

  const getHeatmapTextColor = (change) => {
    if (change > 0) return "positive";
    if (change < 0) return "text-primary";
    return "text-on-surface-variant";
  };

  return (
    <div className="p-gutter flex-1 grid grid-cols-1 lg:grid-cols-12 gap-gutter auto-rows-min max-w-container-max mx-auto w-full">

      {/* 1. Market Pulse Header (Span 12) */}
      <section className="lg:col-span-12 glass-card rounded-xl p-6 card-inner-stroke flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none" />
        <div className="flex-1 w-full">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Market Pulse</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Live overview of major indices.</p>
        </div>
        <div className="flex gap-6 w-full md:w-auto">
          {/* NIFTY 50 Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex-1 min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-caps text-label-caps text-on-surface-variant">NIFTY 50</span>
              <span className="material-symbols-outlined positive text-sm">trending_up</span>
            </div>
            <div className="font-data-mono text-data-mono text-2xl font-bold">22,514.65</div>
            <div className="font-data-mono text-data-mono positive text-sm mt-1">+101.20 (0.45%)</div>
            <div className="h-8 mt-2 w-full bg-surface-container rounded overflow-hidden relative">
              <div className="absolute bottom-0 left-0 h-full w-full bg-[linear-gradient(90deg,transparent_0%,rgba(0,90,62,0.1)_50%,transparent_100%)] animate-[pulse_2s_ease-in-out_infinite]" />
            </div>
          </div>
          {/* SENSEX Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex-1 min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-caps text-label-caps text-on-surface-variant">SENSEX</span>
              <span className="material-symbols-outlined positive text-sm">trending_up</span>
            </div>
            <div className="font-data-mono text-data-mono text-2xl font-bold">74,227.63</div>
            <div className="font-data-mono text-data-mono positive text-sm mt-1">+350.80 (0.51%)</div>
            <div className="h-8 mt-2 w-full bg-surface-container rounded overflow-hidden relative">
              <div className="absolute bottom-0 left-0 h-full w-full bg-[linear-gradient(90deg,transparent_0%,rgba(0,90,62,0.1)_50%,transparent_100%)] animate-[pulse_2s_ease-in-out_infinite_0.5s]" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Market Movers (Span 8) */}
      <section className="lg:col-span-8 glass-card rounded-xl p-6 card-inner-stroke">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-title-md text-title-md text-on-surface">Market Movers</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("gainers")}
              className={`px-3 py-1 rounded font-label-caps text-label-caps transition ${
                activeTab === "gainers"
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              Gainers
            </button>
            <button
              onClick={() => setActiveTab("losers")}
              className={`px-3 py-1 rounded font-label-caps text-label-caps transition ${
                activeTab === "losers"
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              Losers
            </button>
          </div>
        </div>
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
              {(activeTab === "gainers" ? gainers : losers).map((stock) => (
                <tr
                  key={stock.symbol}
                  onClick={() => handleRowClick(stock.symbol)}
                  className="border-b border-surface-container hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-4 font-bold text-on-surface">{stock.symbol}</td>
                  <td className="py-3 px-4 text-right text-on-surface">{stock.ltp}</td>
                  <td className={`py-3 px-4 text-right ${stock.chg.startsWith("+") ? "positive" : "negative"}`}>
                    {stock.chg}
                  </td>
                  <td className={`py-3 px-4 text-right ${stock.pct.startsWith("+") ? "positive" : "negative"}`}>
                    {stock.pct}
                  </td>
                  <td className="py-3 pl-4 text-right text-on-surface-variant">{stock.vol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Sector Rotation Heatmap (Span 4) */}
      <section className="lg:col-span-4 glass-card rounded-xl p-6 card-inner-stroke flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-title-md text-title-md text-on-surface">Sector Flow</h3>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">info</span>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {sectors.map((sec) => (
            <div
              key={sec.name}
              className={`rounded flex flex-col items-center justify-center p-2 text-center border ${getHeatmapColor(sec.change)}`}
            >
              <span className="font-label-caps text-[10px] text-on-surface">{sec.name}</span>
              <span className={`font-data-mono text-xs font-semibold ${getHeatmapTextColor(sec.change)}`}>
                {sec.change >= 0 ? "+" : ""}{sec.change}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between items-center text-xs font-label-caps text-on-surface-variant">
          <span>Outflow</span>
          <div className="h-1 flex-1 mx-2 rounded-full bg-gradient-to-r from-primary via-surface-container to-tertiary" />
          <span>Inflow</span>
        </div>
      </section>

      {/* 4. Active AI Verdicts (Span 12) */}
      <section className="lg:col-span-12 glass-card rounded-xl p-6 card-inner-stroke border-l-4 border-l-primary relative">
        <div className="absolute top-6 right-6">
          <span className="material-symbols-outlined text-primary opacity-20 text-4xl">smart_toy</span>
        </div>
        <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Claude AI Intelligence Signals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((sig, idx) => (
            <div
              key={idx}
              onClick={() => handleRowClick(sig.symbol)}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-data-mono font-bold text-on-surface">{sig.symbol}</span>
                  <span
                    className={`font-label-caps text-[10px] px-2 py-0.5 rounded ml-2 ${
                      sig.verdict === "BULLISH"
                        ? "bg-tertiary/10 text-tertiary"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    {sig.verdict}
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant font-data-mono">{sig.time}</span>
              </div>
              <p className="text-sm text-on-surface-variant line-clamp-2">{sig.text}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
