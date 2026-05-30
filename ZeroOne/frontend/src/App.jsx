import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";
import TickerBar from "./components/TickerBar";
import SideNavBar from "./components/SideNavBar";
import TopNavBar from "./components/TopNavBar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import StockView from "./pages/StockView";
import Sectors from "./pages/Sectors";
import Compare from "./pages/Compare";

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex bg-background min-h-screen overflow-x-hidden font-body-md text-body-md">
      <TickerBar />
      <SideNavBar />

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 md:hidden backdrop-blur-sm" 
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="bg-surface w-64 h-full p-6 flex flex-col justify-between border-r border-outline-variant"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-center mb-8 border-b border-outline-variant pb-4">
                <div>
                  <h1 className="font-headline-lg text-[28px] leading-[36px] font-bold text-primary tracking-tight">ZeroOne</h1>
                  <p className="font-label-caps text-[10px] tracking-[0.08em] text-on-surface-variant mt-0.5 uppercase">Institutional Terminal</p>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-on-surface hover:text-primary hover:bg-surface-container-high rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <ul className="flex flex-col gap-1">
                {[
                  { href: '#/stock/RELIANCE', icon: 'bar_chart',   label: 'Stock Summary'   },
                  { href: '#/dashboard',      icon: 'insights',    label: 'Market Overview' },
                  { href: '#/sectors',        icon: 'grid_view',   label: 'Sector Flow'     },
                  { href: '#/compare',        icon: 'compare_arrows', label: 'Earnings Radar' },
                ].map(({ href, icon, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      <span className="font-title-md text-[14px] font-medium">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 border-t border-outline-variant/30 pt-4">
              <button
                onClick={() => { setMobileMenuOpen(false); }}
                className="w-full bg-primary text-on-primary font-label-caps text-[12px] tracking-[0.06em] uppercase py-2.5 rounded-lg btn-shimmer hover:opacity-95 transition-all"
              >
                Upgrade to Pro
              </button>
              <p className="text-center text-[10px] text-on-surface-variant/40">© 2026 ZERØONE Terminal</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow md:ml-64 mt-[40px] flex flex-col relative min-h-[calc(100vh-40px)]">
        <TopNavBar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-grow bg-background">
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stock/:ticker" element={<StockView />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
