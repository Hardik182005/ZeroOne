import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

const BREADCRUMBS = {
  "/analyse":     ["Dashboard", "Analyse"],
  "/dashboard":   ["Dashboard"],
  "/marketpulse": ["Dashboard", "Pulse"],
  "/sectors":     ["Dashboard", "Sectors"],
  "/compare":     ["Dashboard", "Compare"],
  "/assistant":   ["Dashboard", "AI Chat"],
  "/settings":    ["Dashboard", "Settings"],
};

function getBreadcrumb(pathname) {
  if (pathname.startsWith("/stock/")) {
    const ticker = pathname.split("/stock/")[1]?.toUpperCase() || "";
    return ["Dashboard", "Analyse", ticker];
  }
  return BREADCRUMBS[pathname] || ["Dashboard"];
}

export default function TopNavBar({ onToggleMobileMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [prefs, setPrefs] = useState({ name: "User" });
  const dropRef = useRef(null);

  const crumbs = getBreadcrumb(location.hash?.replace("#", "") || location.pathname);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("zo_prefs") || "{}");
      if (p.name) setPrefs(p);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults((await api.searchTicker(query)) || []); setShowDrop(true); }
      catch { setResults([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goTo = (symbol) => {
    setQuery(""); setShowDrop(false);
    try {
      const stored = JSON.parse(localStorage.getItem("zo_recent_analyses") || "[]");
      localStorage.setItem("zo_recent_analyses", JSON.stringify([symbol, ...stored.filter(s => s !== symbol)].slice(0, 8)));
    } catch { /* ignore */ }
    navigate(`/stock/${symbol}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sym = results[0]?.symbol || query.trim().toUpperCase();
    if (sym) goTo(sym);
  };

  const initial = (prefs.name || "U").charAt(0).toUpperCase();

  return (
    <header className="bg-white h-[60px] flex items-center px-6 gap-4 sticky top-0 z-30" style={{ borderBottom: "1px solid #e5e7eb" }}>

      {/* Mobile hamburger */}
      <button onClick={onToggleMobileMenu} className="md:hidden text-gray-500 hover:text-gray-800 mr-1">
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 text-[13px] text-gray-400 shrink-0">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-gray-300">›</span>}
            <span className={i === crumbs.length - 1 ? "text-gray-700 font-semibold" : "text-gray-400"}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Center search */}
      <div className="flex-1 max-w-[480px] mx-auto relative" ref={dropRef}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">search</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value.toUpperCase()); setShowDrop(true); }}
              onFocus={() => query && setShowDrop(true)}
              placeholder="Search stocks, symbols... (e.g. RELIANCE)"
              className="w-full bg-gray-50 border border-gray-200 focus:border-[#6434ed] rounded-lg pl-9 pr-4 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6434ed]/10 transition-all"
            />
          </div>
        </form>

        {showDrop && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {results.slice(0, 6).map((r, i) => (
              <button key={i} type="button" onMouseDown={() => goTo(r.symbol)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 text-left transition-colors">
                <div>
                  <span className="font-bold text-[13px] text-gray-900 font-mono">{r.symbol}</span>
                  <span className="text-[11px] text-gray-400 block">{r.name}</span>
                </div>
                <span className="material-symbols-outlined text-[14px] text-[#6434ed]">arrow_forward</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <button onClick={() => navigate("/settings")} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
        <button onClick={() => navigate("/settings")}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ml-1">
          <span className="text-[12px] font-semibold text-gray-600 hidden sm:block">Pro Tier</span>
          <div className="w-6 h-6 rounded-full bg-[#6434ed] flex items-center justify-center text-white text-[11px] font-bold">
            {initial}
          </div>
        </button>
      </div>
    </header>
  );
}
