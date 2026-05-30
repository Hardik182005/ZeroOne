import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/stock/RELIANCE", icon: "bar_chart",   label: "Stock Summary"   },
  { to: "/dashboard",      icon: "insights",    label: "Market Overview" },
  { to: "/sectors",        icon: "group_work",  label: "Sector Flow"     },
  { to: "/compare",        icon: "event_note",  label: "Earnings Radar"  },
];

export default function SideNavBar() {
  const navigate = useNavigate();

  return (
    <nav className="bg-surface fixed left-0 top-[40px] h-[calc(100vh-40px)] w-64 border-r border-outline-variant shadow-sm flex flex-col p-8 z-40 md:flex hidden">

      {/* Brand */}
      <div className="mb-10">
        <h1 className="font-headline-lg text-[32px] leading-[40px] font-bold text-primary tracking-tight">
          ZeroOne
        </h1>
        <p className="font-label-caps text-[11px] tracking-[0.08em] text-on-surface-variant mt-1 uppercase">
          Institutional Terminal
        </p>
      </div>

      {/* Nav Links */}
      <ul className="flex flex-col gap-1 flex-grow">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ease-in-out hover:translate-x-1 group ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span className="font-title-md text-[14px] font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto">
        <button
          onClick={() => navigate("/compare")}
          className="w-full bg-primary text-on-primary font-label-caps text-[12px] tracking-[0.06em] uppercase py-3 rounded-lg btn-shimmer hover:opacity-95 transition-all shadow-sm"
        >
          Upgrade to Pro
        </button>
      </div>
    </nav>
  );
}
