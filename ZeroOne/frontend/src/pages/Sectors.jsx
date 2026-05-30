import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Sectors() {
  const [loading, setLoading] = useState(false);
  const [sectorsData, setSectorsData] = useState({
    sectors: [
      { name: "IT", change: 1.2, fii_flow: 450, dii_flow: 120, top_stock: "INFY" },
      { name: "BANK", change: -0.8, fii_flow: -780, dii_flow: 310, top_stock: "KOTAKBANK" },
      { name: "AUTO", change: 2.1, fii_flow: 350, dii_flow: 90, top_stock: "MARUTI" },
      { name: "FMCG", change: 0.1, fii_flow: -40, dii_flow: 85, top_stock: "ITC" },
      { name: "PHARMA", change: 0.5, fii_flow: 120, dii_flow: -20, top_stock: "SUNPHARMA" },
      { name: "METAL", change: -1.5, fii_flow: -320, dii_flow: 150, top_stock: "JINDALSTEL" },
      { name: "REALTY", change: -0.3, fii_flow: -90, dii_flow: 65, top_stock: "DLF" },
      { name: "MEDIA", change: 0.0, fii_flow: 15, dii_flow: -5, top_stock: "ZEEL" },
      { name: "ENERGY", change: 1.8, fii_flow: 620, dii_flow: 110, top_stock: "RELIANCE" },
      { name: "INFRA", change: 0.4, fii_flow: 80, dii_flow: 45, top_stock: "LT" },
      { name: "PSU", change: -0.7, fii_flow: -180, dii_flow: 220, top_stock: "SBIN" },
      { name: "MNCS", change: 0.2, fii_flow: 30, dii_flow: 10, top_stock: "NESTLEIND" }
    ],
    fii_total: -125,
    dii_total: 820
  });

  useEffect(() => {
    let active = true;
    const fetchSectors = async () => {
      setLoading(true);
      try {
        const res = await api.getSectors();
        if (res && active) {
          setSectorsData(res);
        }
      } catch (err) {
        console.warn("Failed to load sectors from API, using default/mock state.", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSectors();
    return () => {
      active = false;
    };
  }, []);

  const getHeatmapColor = (change) => {
    if (change > 1.5) return "bg-tertiary/40 border-tertiary/50 text-white";
    if (change > 0.5) return "bg-tertiary/20 border-tertiary/30 text-on-surface";
    if (change > 0) return "bg-tertiary/10 border-tertiary/20 text-on-surface";
    if (change === 0) return "bg-surface-container border-outline-variant text-on-surface-variant";
    if (change > -0.5) return "bg-primary/10 border-primary/20 text-on-surface";
    if (change > -1.5) return "bg-primary/20 border-primary/30 text-primary";
    return "bg-primary/40 border-primary/50 text-on-primary";
  };

  return (
    <div className="p-gutter max-w-container-max mx-auto w-full">
      <div className="mb-8 glass-card p-6 rounded-xl card-inner-stroke flex justify-between items-center relative overflow-hidden">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Sector Rotation</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Analyze institutional FII/DII inflows and sector rotations</p>
        </div>
        <div className="flex gap-4 font-data-mono text-sm">
          <div className="bg-surface-container-low px-4 py-2 rounded border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block font-label-caps">FII Daily Net</span>
            <span className={sectorsData.fii_total >= 0 ? "text-tertiary font-bold" : "text-error font-bold"}>
              ₹{sectorsData.fii_total >= 0 ? "+" : ""}{sectorsData.fii_total} Cr
            </span>
          </div>
          <div className="bg-surface-container-low px-4 py-2 rounded border border-outline-variant/30">
            <span className="text-xs text-on-surface-variant block font-label-caps">DII Daily Net</span>
            <span className={sectorsData.dii_total >= 0 ? "text-tertiary font-bold" : "text-error font-bold"}>
              ₹{sectorsData.dii_total >= 0 ? "+" : ""}{sectorsData.dii_total} Cr
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-8">
        {/* Flows Chart */}
        <div className="lg:col-span-8 glass-card p-6 rounded-xl card-inner-stroke">
          <h3 className="font-title-md text-title-md text-on-surface mb-6">Institutional Net Flow by Sector (₹ Crores)</h3>
          <div className="h-80 w-full bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorsData.sectors}>
                <XAxis dataKey="name" stroke="#797487" fontSize={10} />
                <YAxis stroke="#797487" fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="fii_flow" fill="#6c3ff5" name="FII Flow" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dii_flow" fill="#005a3e" name="DII Flow" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="lg:col-span-4 glass-card p-6 rounded-xl card-inner-stroke flex flex-col justify-between">
          <div>
            <h3 className="font-title-md text-title-md text-on-surface mb-4">Heatmap</h3>
            <p className="text-xs text-on-surface-variant mb-6">Visual representation of daily price moves across sectors</p>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-grow mb-6">
            {sectorsData.sectors.map((sec) => (
              <div
                key={sec.name}
                className={`rounded flex flex-col items-center justify-center p-3 text-center border cursor-default transition-all hover:scale-105 ${getHeatmapColor(
                  sec.change
                )}`}
              >
                <span className="font-label-caps text-[10px] font-bold">{sec.name}</span>
                <span className="font-data-mono text-xs font-semibold">
                  {sec.change >= 0 ? "+" : ""}
                  {sec.change}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-xs font-label-caps text-on-surface-variant border-t border-outline-variant/30 pt-4">
            <span>Outflow</span>
            <div className="h-1 flex-1 mx-2 rounded-full bg-gradient-to-r from-primary via-surface-container to-tertiary"></div>
            <span>Inflow</span>
          </div>
        </div>
      </div>

      {/* Sector Wires Details Table */}
      <div className="glass-card p-6 rounded-xl card-inner-stroke">
        <h3 className="font-title-md text-title-md text-on-surface mb-6">Sector Rotation Flow Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-label-caps text-label-caps">
                <th className="pb-3 pr-4 font-normal">Sector</th>
                <th className="pb-3 px-4 font-normal text-right">Daily Change</th>
                <th className="pb-3 px-4 font-normal text-right">FII Net Flow</th>
                <th className="pb-3 px-4 font-normal text-right">DII Net Flow</th>
                <th className="pb-3 pl-4 font-normal">Top Symbol</th>
              </tr>
            </thead>
            <tbody className="font-data-mono text-data-mono text-sm">
              {sectorsData.sectors.map((sec) => (
                <tr key={sec.name} className="border-b border-surface-container hover:bg-surface-container-low transition-colors">
                  <td className="py-3 pr-4 font-bold text-on-surface">{sec.name}</td>
                  <td className={`py-3 px-4 text-right ${sec.change >= 0 ? "positive" : "negative"}`}>
                    {sec.change >= 0 ? "+" : ""}{sec.change}%
                  </td>
                  <td className={`py-3 px-4 text-right ${sec.fii_flow >= 0 ? "positive" : "negative"}`}>
                    {sec.fii_flow >= 0 ? "+" : ""}{sec.fii_flow} Cr
                  </td>
                  <td className={`py-3 px-4 text-right ${sec.dii_flow >= 0 ? "positive" : "negative"}`}>
                    {sec.dii_flow >= 0 ? "+" : ""}{sec.dii_flow} Cr
                  </td>
                  <td className="py-3 pl-4 text-on-surface hover:text-primary transition-colors font-bold cursor-pointer">
                    {sec.top_stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
