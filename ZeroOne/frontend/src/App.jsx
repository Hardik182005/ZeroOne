import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import SideNavBar from "./components/SideNavBar";
import TopNavBar from "./components/TopNavBar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import StockView from "./pages/StockView";
import Sectors from "./pages/Sectors";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import MarketPulse from "./pages/MarketPulse";
import Analyse from "./pages/Analyse";
import AIAssistant from "./pages/AIAssistant";
import Predict from "./pages/Predict";

function MobileDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const NAV = [
    { href: '#/analyse',     icon: 'search',         label: 'Analyse Stock'  },
    { href: '#/dashboard',   icon: 'grid_view',      label: 'Dashboard'      },
    { href: '#/marketpulse', icon: 'ssid_chart',     label: 'Pulse'          },
    { href: '#/sectors',     icon: 'donut_small',    label: 'Sectors'        },
    { href: '#/compare',     icon: 'compare_arrows', label: 'Compare'        },
    { href: '#/assistant',   icon: 'smart_toy',      label: 'AI Assistant'   },
    { href: '#/settings',    icon: 'settings',       label: 'Settings'       },
  ];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={onClose}>
      <div className="bg-white w-[240px] h-full flex flex-col border-r border-gray-100 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
            </div>
            <span className="font-bold text-[14px] text-gray-900">ZeroOne Terminal</span>
          </div>
          <button onClick={onClose}><span className="material-symbols-outlined text-gray-400">close</span></button>
        </div>
        <ul className="flex flex-col gap-0.5 p-3 flex-grow">
          {NAV.map(({ href, icon, label }) => (
            <li key={href}>
              <a href={href} onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:text-primary hover:bg-purple-50 transition-all text-[13px] font-medium">
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { navigate("/analyse"); onClose(); }}
            className="w-full bg-gray-900 text-white text-[13px] font-bold py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fcf9f8]">
      {/* Sidebar */}
      <SideNavBar />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main panel */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <TopNavBar onToggleMobileMenu={() => setMobileOpen(v => !v)} />
        <main className="flex-1 bg-[#fcf9f8]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/analyse"      element={<Analyse />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/stock/:ticker" element={<StockView />} />
          <Route path="/sectors"      element={<Sectors />} />
          <Route path="/compare"      element={<Compare />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/marketpulse"  element={<MarketPulse />} />
          <Route path="/predict"      element={<Predict />} />
          <Route path="/assistant"    element={<AIAssistant />} />
          <Route path="*"             element={<Navigate to="/analyse" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
