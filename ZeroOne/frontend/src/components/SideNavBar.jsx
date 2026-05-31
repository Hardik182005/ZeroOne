import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/client";

const NAV_ITEMS = [
  { to: "/analyse",     icon: "search",         label: "Analyse"      },
  { to: "/dashboard",   icon: "grid_view",      label: "Dashboard"    },
  { to: "/marketpulse", icon: "ssid_chart",     label: "Pulse"        },
  { to: "/sectors",     icon: "donut_small",    label: "Sectors"      },
  { to: "/compare",     icon: "compare_arrows", label: "Compare"      },
  { to: "/assistant",   icon: "smart_toy",      label: "AI Chat"      },
];

export default function SideNavBar() {
  const navigate = useNavigate();
  const [marketStatus, setMarketStatus] = useState({ is_open: false, session: "closed" });
  const [prefs, setPrefs] = useState({ name: "User", email: "" });

  useEffect(() => {
    api.getMarketStatus().then(d => setMarketStatus(d)).catch(() => {});
    try {
      const p = JSON.parse(localStorage.getItem("zo_prefs") || "{}");
      if (p.name || p.email) setPrefs({ name: p.name || "User", email: p.email || "" });
    } catch { /* ignore */ }
  }, []);

  const initial = (prefs.name || "U").charAt(0).toUpperCase();

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-white flex-col z-40"
      style={{ borderRight: "1px solid #e5e7eb" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px]" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="w-8 h-8 rounded-lg bg-[#6434ed] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900 leading-tight">ZeroOne</p>
          <p className="text-[11px] text-gray-400 leading-none">Market Intelligence</p>
        </div>
      </div>

      {/* Market status pill */}
      <div className="px-4 pt-3 pb-1">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          marketStatus.is_open
            ? "bg-green-50 text-green-700"
            : marketStatus.session === "pre-open"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-gray-100 text-gray-500"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            marketStatus.is_open ? "bg-green-500 animate-pulse" : marketStatus.session === "pre-open" ? "bg-yellow-400" : "bg-gray-400"
          }`} />
          {marketStatus.is_open ? "NSE Open" : marketStatus.session === "pre-open" ? "Pre-Open" : "NSE Closed"}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-[#6434ed] bg-[#f5f3ff] border-l-[3px] border-[#6434ed] rounded-r-lg rounded-l-none mb-0.5 transition-all"
                : "flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg mb-0.5 transition-all border-l-[3px] border-transparent"
            }
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 mt-auto" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="pt-3 mb-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-[#6434ed] bg-[#f5f3ff] border-l-[3px] border-[#6434ed] rounded-r-lg rounded-l-none transition-all mb-0.5"
                : "flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg border-l-[3px] border-transparent transition-all mb-0.5"
            }
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Settings
          </NavLink>
          <button className="flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg w-full text-left border-l-[3px] border-transparent transition-all">
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            Support
          </button>
        </div>

        {/* Upgrade button — black like DealRadar */}
        <button
          onClick={() => navigate("/settings")}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-bold py-2.5 rounded-lg transition-colors mb-3"
        >
          Upgrade Plan
        </button>

        {/* User profile row */}
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#6434ed] flex items-center justify-center text-white text-[12px] font-bold shrink-0">
            {initial}
          </div>
          <div className="text-left min-w-0">
            <p className="text-[12px] font-semibold text-gray-800 truncate">{prefs.name || "User"}</p>
            {prefs.email && <p className="text-[10px] text-gray-400 truncate">{prefs.email}</p>}
          </div>
        </button>
      </div>
    </aside>
  );
}
