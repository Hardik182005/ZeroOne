import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function TopNavBar({ onToggleMobileMenu }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fallbackTickers = [
    { symbol: "RELIANCE",   name: "Reliance Industries Limited"   },
    { symbol: "TCS",        name: "Tata Consultancy Services Ltd" },
    { symbol: "INFY",       name: "Infosys Limited"               },
    { symbol: "HDFCBANK",   name: "HDFC Bank Limited"             },
    { symbol: "ICICIBANK",  name: "ICICI Bank Limited"            },
    { symbol: "BHARTIARTL", name: "Bharti Airtel Limited"         },
    { symbol: "SBI",        name: "State Bank of India"           },
    { symbol: "ITC",        name: "ITC Limited"                   },
    { symbol: "MARUTI",     name: "Maruti Suzuki India Limited"   },
    { symbol: "TATASTEEL",  name: "Tata Steel Limited"            },
  ];

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchTicker(query);
        setResults(data);
      } catch {
        setResults(
          fallbackTickers.filter(
            t =>
              t.symbol.toLowerCase().includes(query.toLowerCase()) ||
              t.name.toLowerCase().includes(query.toLowerCase())
          )
        );
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (symbol) => {
    setQuery("");
    setShowDropdown(false);
    navigate(`/stock/${symbol}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query) {
      const matched = results.find(r => r.symbol.toUpperCase() === query.toUpperCase());
      handleSelect(matched ? matched.symbol : query.toUpperCase());
    }
  };

  return (
    <header className="bg-surface/70 backdrop-blur-xl sticky top-0 right-0 z-30 shadow-none border-b border-outline-variant flex justify-between items-center h-16 px-6 transition-shadow duration-300">

      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-on-surface hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        {/* Mobile brand — EB Garamond */}
        <span className="md:hidden font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">
          ZeroOne
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Global Autocomplete Search */}
        <div className="relative hidden sm:block" ref={dropdownRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="bg-surface-container pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:ring-primary outline-none font-body-md text-[14px] text-on-surface w-64 transition-all"
              placeholder="Search symbol or concept..."
              type="text"
            />
          </form>

          {showDropdown && results.length > 0 && (
            <div className="absolute right-0 left-auto w-80 mt-2 bg-surface border border-outline-variant rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(r.symbol)}
                  className="px-4 py-3 hover:bg-surface-container-high cursor-pointer flex justify-between items-center border-b border-surface-container last:border-b-0 transition-colors"
                >
                  <div>
                    <span className="font-bold font-data-mono text-on-surface">{r.symbol}</span>
                    <span className="text-xs text-on-surface-variant block truncate max-w-[200px] font-body-md">{r.name}</span>
                  </div>
                  <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Icon Buttons */}
        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
        </button>
      </div>
    </header>
  );
}
